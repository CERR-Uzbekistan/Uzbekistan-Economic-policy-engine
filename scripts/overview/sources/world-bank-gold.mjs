import { inflateRawSync } from 'node:zlib'
import { fetchArrayBufferWithRetry } from './http.mjs'
import { percentChange, roundTo } from './math.mjs'
import { ManualRequiredError } from './siat-trade.mjs'

export const WORLD_BANK_GOLD_METRIC_IDS = ['gold_price_level', 'gold_price_change']
export const WORLD_BANK_GOLD_SOURCE_URL =
  'https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx'

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50
const LOCAL_FILE_SIGNATURE = 0x04034b50
const MONTHLY_PRICES_SHEET = 'Monthly Prices'
const GOLD_CODE = 'GOLD'
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const MONTH_INDEX_BY_NAME = new Map(MONTH_NAMES.map((name, index) => [name.toLowerCase(), index + 1]))

function manualRequired(reason, details = {}) {
  throw new ManualRequiredError(reason, details)
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function xmlDecode(value) {
  return String(value ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function stripXmlTags(value) {
  return xmlDecode(String(value ?? '').replace(/<[^>]+>/g, ''))
}

function findEndOfCentralDirectory(buffer) {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) return offset
  }
  manualRequired('world_bank_gold_xlsx_zip_eocd_missing')
}

export function unzipXlsxEntries(bufferLike) {
  const buffer = Buffer.isBuffer(bufferLike) ? bufferLike : Buffer.from(bufferLike)
  const eocdOffset = findEndOfCentralDirectory(buffer)
  const entryCount = buffer.readUInt16LE(eocdOffset + 10)
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16)
  let offset = centralDirectoryOffset
  const entries = new Map()

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== CENTRAL_DIRECTORY_SIGNATURE) {
      manualRequired('world_bank_gold_xlsx_zip_central_directory_invalid', { index })
    }
    const compressionMethod = buffer.readUInt16LE(offset + 10)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const fileNameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const localHeaderOffset = buffer.readUInt32LE(offset + 42)
    const fileName = buffer.toString('utf8', offset + 46, offset + 46 + fileNameLength)

    if (buffer.readUInt32LE(localHeaderOffset) !== LOCAL_FILE_SIGNATURE) {
      manualRequired('world_bank_gold_xlsx_zip_local_file_invalid', { fileName })
    }
    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28)
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize)
    let content
    if (compressionMethod === 0) content = compressed
    else if (compressionMethod === 8) content = inflateRawSync(compressed)
    else manualRequired('world_bank_gold_xlsx_zip_compression_unsupported', { fileName, compressionMethod })
    entries.set(fileName, content.toString('utf8'))

    offset += 46 + fileNameLength + extraLength + commentLength
  }

  return entries
}

function parseSharedStrings(xml) {
  if (!xml) return []
  return [...xml.matchAll(/<si\b[^>]*>(.*?)<\/si>/gis)].map((match) => stripXmlTags(match[1]))
}

function parseAttributes(value) {
  const attrs = {}
  for (const match of String(value ?? '').matchAll(/([A-Za-z_:][\w:.-]*)="([^"]*)"/g)) {
    attrs[match[1]] = xmlDecode(match[2])
  }
  return attrs
}

function parseWorkbookSheets(workbookXml) {
  return [...workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)].map((match) => {
    const attrs = parseAttributes(match[1])
    return {
      name: attrs.name,
      relationshipId: attrs['r:id'],
    }
  })
}

function parseWorkbookRelationships(relsXml) {
  const rels = new Map()
  for (const match of relsXml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const attrs = parseAttributes(match[1])
    if (attrs.Id && attrs.Target) rels.set(attrs.Id, attrs.Target)
  }
  return rels
}

function normalizeWorkbookTarget(target) {
  const clean = String(target ?? '').replace(/^\//, '')
  return clean.startsWith('xl/') ? clean : `xl/${clean}`
}

function parseCellValue(cellBody, attrs, sharedStrings) {
  const inline = /<is\b[^>]*>(.*?)<\/is>/is.exec(cellBody)
  if (inline) return stripXmlTags(inline[1])
  const valueMatch = /<v>(.*?)<\/v>/is.exec(cellBody)
  if (!valueMatch) return null
  const raw = xmlDecode(valueMatch[1])
  if (attrs.t === 's') return sharedStrings[Number(raw)] ?? ''
  if (attrs.t === 'str') return raw
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : raw
}

function parseSheetRows(sheetXml, sharedStrings) {
  const rows = []
  for (const rowMatch of sheetXml.matchAll(/<row\b([^>]*)>(.*?)<\/row>/gis)) {
    const rowAttrs = parseAttributes(rowMatch[1])
    const rowNumber = Number(rowAttrs.r)
    const cells = new Map()
    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*)>(.*?)<\/c>/gis)) {
      const attrs = parseAttributes(cellMatch[1])
      const ref = attrs.r
      const column = /^([A-Z]+)/.exec(ref ?? '')?.[1]
      if (!column) continue
      cells.set(column, parseCellValue(cellMatch[2], attrs, sharedStrings))
    }
    rows.push({ rowNumber, cells })
  }
  return rows
}

function parseWorkbookUpdatedAt(rows) {
  const text = rows
    .slice(0, 8)
    .map((row) => String(row.cells.get('A') ?? ''))
    .find((value) => /^Updated on /i.test(value))
  if (!text) manualRequired('world_bank_gold_workbook_update_date_missing')
  const match = /^Updated on ([A-Za-z]+) (\d{1,2}), (\d{4})$/i.exec(text.trim())
  if (!match) manualRequired('world_bank_gold_workbook_update_date_invalid', { text })
  const month = MONTH_INDEX_BY_NAME.get(match[1].toLowerCase())
  if (!month) manualRequired('world_bank_gold_workbook_update_month_invalid', { text })
  return `${match[3]}-${String(month).padStart(2, '0')}-${String(Number(match[2])).padStart(2, '0')}T00:00:00Z`
}

function parsePeriod(value) {
  const match = /^(\d{4})M(0[1-9]|1[0-2])$/.exec(String(value ?? '').trim())
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    key: `${match[1]}M${match[2]}`,
  }
}

function comparePeriod(left, right) {
  return left.year - right.year || left.month - right.month
}

function formatPeriodLabel(period) {
  return `${MONTH_NAMES[period.month - 1]} ${period.year}`
}

function findGoldColumn(rows) {
  const codeRow = rows.find((row) => [...row.cells.values()].some((value) => value === GOLD_CODE))
  if (!codeRow) manualRequired('world_bank_gold_code_row_missing')
  const matches = [...codeRow.cells.entries()].filter(([, value]) => value === GOLD_CODE)
  if (matches.length !== 1) manualRequired('world_bank_gold_code_column_match_count', { matches: matches.length })
  return matches[0][0]
}

function asStrictNumber(value, path) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') manualRequired('world_bank_gold_non_numeric_value', { path, value })
  const text = value.trim()
  if (text.length === 0 || text === '…') manualRequired('world_bank_gold_blank_period_value', { path })
  if (text.includes(',') || !/^-?\d+(\.\d+)?$/.test(text)) {
    manualRequired('world_bank_gold_numeric_parsing_ambiguous', { path, value })
  }
  const number = Number(text)
  if (!Number.isFinite(number)) manualRequired('world_bank_gold_non_numeric_value', { path, value })
  return number
}

function selectMonthlyPricesSheet(entries) {
  const workbookXml = entries.get('xl/workbook.xml')
  const relsXml = entries.get('xl/_rels/workbook.xml.rels')
  if (!workbookXml || !relsXml) manualRequired('world_bank_gold_workbook_parts_missing')
  const sheets = parseWorkbookSheets(workbookXml)
  const sheet = sheets.find((entry) => entry.name === MONTHLY_PRICES_SHEET)
  if (!sheet?.relationshipId) manualRequired('world_bank_gold_monthly_prices_sheet_missing')
  const rels = parseWorkbookRelationships(relsXml)
  const target = rels.get(sheet.relationshipId)
  if (!target) manualRequired('world_bank_gold_monthly_prices_relationship_missing', { relationshipId: sheet.relationshipId })
  const sheetPath = normalizeWorkbookTarget(target)
  const sheetXml = entries.get(sheetPath)
  if (!sheetXml) manualRequired('world_bank_gold_monthly_prices_sheet_part_missing', { sheetPath })
  return sheetXml
}

export function parseWorldBankGoldWorkbook(entries) {
  if (!(entries instanceof Map)) manualRequired('world_bank_gold_xlsx_entries_invalid')
  const sharedStrings = parseSharedStrings(entries.get('xl/sharedStrings.xml'))
  const sheetXml = selectMonthlyPricesSheet(entries)
  const rows = parseSheetRows(sheetXml, sharedStrings)
  const observedAt = parseWorkbookUpdatedAt(rows)
  const goldColumn = findGoldColumn(rows)
  const observations = rows
    .map((row) => {
      const period = parsePeriod(row.cells.get('A'))
      if (!period) return null
      const rawValue = row.cells.get(goldColumn)
      if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '' || rawValue === '…') return null
      return {
        ...period,
        value: asStrictNumber(rawValue, `${period.key}.${goldColumn}`),
      }
    })
    .filter(Boolean)
    .sort(comparePeriod)

  if (observations.length < 2) manualRequired('world_bank_gold_requires_current_and_previous_observations')
  const current = observations.at(-1)
  const previous = observations.at(-2)
  if (current.value <= 0 || previous.value <= 0) {
    manualRequired('world_bank_gold_non_positive_price', { current: current.value, previous: previous.value })
  }

  return {
    observedAt,
    current: {
      ...current,
      periodLabel: formatPeriodLabel(current),
    },
    previous: {
      ...previous,
      periodLabel: formatPeriodLabel(previous),
    },
  }
}

export function parseWorldBankGoldXlsx(bufferLike) {
  return parseWorldBankGoldWorkbook(unzipXlsxEntries(bufferLike))
}

export async function fetchWorldBankGoldDataset(options = {}) {
  const sourceUrl = options.sourceUrl ?? WORLD_BANK_GOLD_SOURCE_URL
  const arrayBuffer = options.fetchArrayBuffer
    ? await options.fetchArrayBuffer(sourceUrl, 'world-bank-gold')
    : await fetchArrayBufferWithRetry(sourceUrl, options.http)
  return {
    sourceUrl,
    dataset: parseWorldBankGoldXlsx(arrayBuffer),
  }
}

function findMetric(snapshot, metricId) {
  return snapshot?.metrics?.find((metric) => metric.metric_id === metricId)
}

function validateNotOlderThanSnapshot(dataset, snapshot) {
  const metric = findMetric(snapshot, 'gold_price_level')
  if (!metric) manualRequired('world_bank_gold_snapshot_metric_missing')
  const match = /^([A-Za-z]+) (\d{4}) monthly average$/.exec(String(metric.source_period ?? '').trim())
  if (!match) manualRequired('world_bank_gold_snapshot_period_unparseable', { sourcePeriod: metric.source_period })
  const month = MONTH_INDEX_BY_NAME.get(match[1].toLowerCase())
  if (!month) manualRequired('world_bank_gold_snapshot_period_unparseable', { sourcePeriod: metric.source_period })
  const snapshotPeriod = { year: Number(match[2]), month }
  if (comparePeriod(dataset.current, snapshotPeriod) < 0) {
    manualRequired('world_bank_gold_source_older_than_snapshot', {
      sourcePeriod: dataset.current.periodLabel,
      snapshotPeriod: metric.source_period,
    })
  }
}

function buildGoldLevelUpdate(sourceUrl, dataset, extractedAt) {
  return {
    metric_id: 'gold_price_level',
    value: roundTo(dataset.current.value, 2),
    previous_value: roundTo(dataset.previous.value, 2),
    source_label: 'World Bank Pink Sheet gold price',
    source_period: `${dataset.current.periodLabel} monthly average`,
    source_url: sourceUrl,
    source_reference: null,
    observed_at: dataset.observedAt,
    extracted_at: extractedAt,
    validation_status: 'valid',
    caveats: ['External monthly average market price; not a CERR forecast.'],
    warnings: [],
  }
}

function buildGoldChangeUpdate(dataset, extractedAt) {
  return {
    metric_id: 'gold_price_change',
    value: percentChange(dataset.current.value, dataset.previous.value, 2),
    previous_value: null,
    source_label: 'World Bank Pink Sheet gold price, calculated',
    source_period: `${dataset.current.periodLabel} vs ${dataset.previous.periodLabel}`,
    source_url: null,
    source_reference: `Calculated from World Bank Pink Sheet monthly gold prices: ${roundTo(dataset.current.value, 2)} for ${dataset.current.periodLabel} and ${roundTo(dataset.previous.value, 2)} for ${dataset.previous.periodLabel}`,
    observed_at: dataset.observedAt,
    extracted_at: extractedAt,
    validation_status: 'valid',
    caveats: ['Comparison basis is MoM.'],
    warnings: [],
  }
}

export async function buildWorldBankGoldMetricUpdates(options = {}) {
  const extractedAt = options.extractedAt ?? new Date().toISOString()
  const { sourceUrl, dataset } = await fetchWorldBankGoldDataset({
    sourceUrl: options.sourceUrl ?? findMetric(options.snapshot, 'gold_price_level')?.source_url ?? WORLD_BANK_GOLD_SOURCE_URL,
    fetchArrayBuffer: options.fetchArrayBuffer,
    http: options.http,
  })
  validateNotOlderThanSnapshot(dataset, options.snapshot)
  return [buildGoldLevelUpdate(sourceUrl, dataset, extractedAt), buildGoldChangeUpdate(dataset, extractedAt)]
}
