import { inflateRawSync } from 'node:zlib'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createHash } from 'node:crypto'

const WORKBOOK_PATH = 'model sources/Fore+Nowcast/DFM/data/data_uzbekistan.xlsx'
const OUTPUT_JSON = 'docs/data-bridge/dfm-transformation-map.json'
const OUTPUT_CSV = 'docs/data-bridge/dfm-transformation-map.csv'

const MONTHLY_SHEET = 'Request Monthly'
const QUARTERLY_SHEET = 'Request Quarterly'

const MODEL_INPUT_RULE =
  'Source R workflow: optional X-13 seasonal adjustment when flagged, then log-difference over non-missing observations; first three rows are dropped so the estimation sample starts at settings.R start_date.'
const MISSING_RULE =
  'Missing observations are retained as NA in the ragged-edge panel. Growth is computed only across non-missing observations, then written back to the original positions; leading/ending all-NA rows are removed before EM estimation and the Kalman filter smooths remaining gaps.'

function readUInt(buffer, offset, length) {
  if (length === 2) return buffer.readUInt16LE(offset)
  if (length === 4) return buffer.readUInt32LE(offset)
  throw new Error(`Unsupported integer width: ${length}`)
}

function readZipEntries(path) {
  const buffer = readFileSync(path)
  let eocd = -1
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error(`Could not find ZIP end record in ${path}`)

  const totalEntries = readUInt(buffer, eocd + 10, 2)
  const centralDirectoryOffset = readUInt(buffer, eocd + 16, 4)
  const entries = new Map()
  let offset = centralDirectoryOffset

  for (let i = 0; i < totalEntries; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid central directory entry ${i}`)
    }
    const method = readUInt(buffer, offset + 10, 2)
    const compressedSize = readUInt(buffer, offset + 20, 4)
    const uncompressedSize = readUInt(buffer, offset + 24, 4)
    const fileNameLength = readUInt(buffer, offset + 28, 2)
    const extraLength = readUInt(buffer, offset + 30, 2)
    const commentLength = readUInt(buffer, offset + 32, 2)
    const localOffset = readUInt(buffer, offset + 42, 4)
    const name = buffer.toString('utf8', offset + 46, offset + 46 + fileNameLength)

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`Invalid local header for ${name}`)
    }
    const localNameLength = readUInt(buffer, localOffset + 26, 2)
    const localExtraLength = readUInt(buffer, localOffset + 28, 2)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize)
    let data
    if (method === 0) {
      data = compressed
    } else if (method === 8) {
      data = inflateRawSync(compressed)
    } else {
      throw new Error(`Unsupported ZIP compression method ${method} for ${name}`)
    }
    if (data.length !== uncompressedSize) {
      throw new Error(`Unexpected uncompressed size for ${name}`)
    }
    entries.set(name, data.toString('utf8'))
    offset += 46 + fileNameLength + extraLength + commentLength
  }

  return entries
}

function xmlDecode(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`))
  return match ? xmlDecode(match[1]) : ''
}

function stripTags(value) {
  return xmlDecode(value.replace(/<[^>]+>/g, ''))
}

function columnLetters(index) {
  let n = index
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

function columnIndex(cellRef) {
  const letters = cellRef.replace(/[0-9]/g, '')
  let n = 0
  for (const letter of letters) {
    n = n * 26 + letter.charCodeAt(0) - 64
  }
  return n
}

function parseSharedStrings(entries) {
  const xml = entries.get('xl/sharedStrings.xml')
  if (!xml) return []
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => {
    const item = match[1]
    const textNodes = [...item.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
    return xmlDecode(textNodes.map((node) => node[1]).join(''))
  })
}

function parseWorkbookSheets(entries) {
  const workbook = entries.get('xl/workbook.xml')
  const rels = entries.get('xl/_rels/workbook.xml.rels')
  if (!workbook || !rels) throw new Error('Workbook metadata is incomplete')

  const relTargets = new Map(
    [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((match) => [
      attr(match[0], 'Id'),
      attr(match[0], 'Target'),
    ]),
  )

  return new Map(
    [...workbook.matchAll(/<sheet\b[^>]*>/g)].map((match) => {
      const tag = match[0]
      const id = attr(tag, 'r:id')
      return [attr(tag, 'name'), `xl/${relTargets.get(id)}`]
    }),
  )
}

function parseSheet(entries, sheetPath, sharedStrings) {
  const xml = entries.get(sheetPath)
  if (!xml) throw new Error(`Missing sheet XML: ${sheetPath}`)
  const rows = []
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = []
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const cellTag = cellMatch[0]
      const cellAttrs = cellMatch[1]
      const cellBody = cellMatch[2]
      const ref = attr(cellTag, 'r')
      const type = attr(`<c ${cellAttrs}>`, 't')
      const vMatch = cellBody.match(/<v[^>]*>([\s\S]*?)<\/v>/)
      let value = ''
      if (type === 's' && vMatch) {
        value = sharedStrings[Number(vMatch[1])] ?? ''
      } else if (type === 'inlineStr') {
        value = stripTags(cellBody)
      } else if (vMatch) {
        value = xmlDecode(vMatch[1])
      } else {
        value = stripTags(cellBody)
      }
      cells[columnIndex(ref) - 1] = value
    }
    rows.push(cells)
  }
  return rows
}

function normalizeHeader(header) {
  return String(header).trim()
}

function rowsToObjects(rows) {
  const headers = rows[0].map(normalizeHeader)
  return rows.slice(1).map((row) => {
    const object = {}
    headers.forEach((header, index) => {
      object[header] = row[index] ?? ''
    })
    return object
  })
}

function sourceColumnFor(rowIndex, frequency) {
  if (frequency === 'Quarterly') return 'B'
  return columnLetters(rowIndex)
}

function modelRole(row) {
  return row['Category'] === 'Target variable' ? 'target_quarterly_gdp' : 'high_frequency_indicator'
}

function transformationReview(row) {
  const id = row['Code key']
  const text = `${id} ${row['Series description']} ${row['Category']} ${row['Unit']}`.toLowerCase()
  if (id === 'gdp') {
    return {
      status: 'accepted_for_target_postprocess_review',
      recommendedTransformation: 'Quarterly GDP level -> log quarter-on-quarter growth for model input; postprocess predicted QoQ path into GDP levels and YoY percent.',
      contributionGuardrail: 'GDP target row is excluded from top high-frequency contribution diagnostics.',
    }
  }
  if (/yoy|mom|grwth|growth|ppy=100|ppy|change ytd|rate|nonperforming|npl|business climate/.test(text)) {
    return {
      status: 'needs_economist_review',
      recommendedTransformation: 'Do not blindly log-difference this source series. Confirm whether it is already a rate, ratio, balance, YoY/MoM growth, or index before production refit.',
      contributionGuardrail: 'Treat latest value and contribution as a standardized DFM signal, not a GDP-growth percentage-point effect.',
    }
  }
  return {
    status: 'provisionally_accepted',
    recommendedTransformation: 'Level or index source series can use log-difference after seasonal adjustment, subject to non-positive value checks.',
    contributionGuardrail: 'Contribution is a standardized common-factor signal, not a direct growth effect.',
  }
}

function hashFile(path) {
  return createHash('md5').update(readFileSync(path)).digest('hex')
}

function csvEscape(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function writeCsv(path, rows) {
  const fields = [
    'source_sheet',
    'source_column',
    'variable_id',
    'label',
    'category',
    'frequency',
    'unit',
    'seasonal_adjustment',
    'transformation',
    'missing_value_rule',
    'model_role',
    'transformation_status',
  ]
  const lines = [fields.join(',')]
  for (const row of rows) {
    lines.push(fields.map((field) => csvEscape(row[field])).join(','))
  }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${lines.join('\n')}\n`)
}

function buildMap() {
  const workbook = resolve(WORKBOOK_PATH)
  if (!existsSync(workbook)) {
    throw new Error(`DFM source workbook not found: ${WORKBOOK_PATH}`)
  }

  const entries = readZipEntries(workbook)
  const sharedStrings = parseSharedStrings(entries)
  const sheetPaths = parseWorkbookSheets(entries)
  const metaRows = rowsToObjects(parseSheet(entries, sheetPaths.get('Series Information'), sharedStrings))
  const monthlyRows = parseSheet(entries, sheetPaths.get(MONTHLY_SHEET), sharedStrings)
  const quarterlyRows = parseSheet(entries, sheetPaths.get(QUARTERLY_SHEET), sharedStrings)
  const monthlyHeaders = monthlyRows[0] ?? []
  const quarterlyHeaders = quarterlyRows[0] ?? []

  const variables = metaRows.map((row, index) => {
    const frequency = row['Frequency']
    const sourceSheet = frequency === 'Quarterly' ? QUARTERLY_SHEET : MONTHLY_SHEET
    const sourceColumn = sourceColumnFor(index + 1, frequency)
    const sourceHeader =
      frequency === 'Quarterly'
        ? quarterlyHeaders[columnIndex(sourceColumn) - 1]
        : monthlyHeaders[columnIndex(sourceColumn) - 1]
    const review = transformationReview(row)
    return {
      source_sheet: sourceSheet,
      source_column: sourceColumn,
      source_header: sourceHeader || row['Series description'],
      variable_id: row['Code key'],
      label: row['Series description'],
      category: row['Category'],
      frequency: String(frequency).toLowerCase(),
      unit: row['Unit'],
      source: row['Source'],
      seasonal_adjustment: row['Seasonal adjustment'] || 'None',
      transformation: MODEL_INPUT_RULE,
      transformation_status: review.status,
      recommended_transformation: review.recommendedTransformation,
      missing_value_rule: MISSING_RULE,
      model_role: modelRole(row),
      contribution_guardrail: review.contributionGuardrail,
    }
  })

  return {
    artifact: {
      id: 'dfm-transformation-map',
      generated_at: new Date().toISOString(),
      source_workbook: WORKBOOK_PATH,
      source_workbook_md5: hashFile(workbook),
      source_scripts: [
        'model sources/Fore+Nowcast/DFM/main.R',
        'model sources/Fore+Nowcast/DFM/functions/prepare_data.R',
        'model sources/Fore+Nowcast/DFM/functions/calculate_growth.R',
        'model sources/Fore+Nowcast/DFM/functions/estimate_dfm.R',
        'model sources/Fore+Nowcast/DFM/functions/predict_dfm.R',
        'model sources/Fore+Nowcast/DFM/functions/postprocess_gdp.R',
      ],
      workbook_sheets: [QUARTERLY_SHEET, MONTHLY_SHEET, 'Series Information'],
      variable_count: variables.length,
      target_count: variables.filter((row) => row.model_role === 'target_quarterly_gdp').length,
      high_frequency_input_count: variables.filter((row) => row.model_role === 'high_frequency_indicator').length,
      transformation_rule: MODEL_INPUT_RULE,
      missing_value_rule: MISSING_RULE,
      production_note:
        'This artifact documents the current source workflow and flags series that need economist review before a production refit. It is not a claim that every source transformation is economically final.',
    },
    variables,
  }
}

const map = buildMap()
mkdirSync(dirname(OUTPUT_JSON), { recursive: true })
writeFileSync(OUTPUT_JSON, `${JSON.stringify(map, null, 2)}\n`)
writeCsv(OUTPUT_CSV, map.variables)
console.log(`[dfm:source-map] wrote ${OUTPUT_JSON}`)
console.log(`[dfm:source-map] wrote ${OUTPUT_CSV}`)
