import { basename } from 'node:path'
import { fetchJsonWithRetry } from './http.mjs'
import { roundTo } from './math.mjs'
import { ManualRequiredError } from './siat-trade.mjs'

export const SIAT_GDP_ANNUAL_METRIC_IDS = ['real_gdp_growth_annual_yoy']
export const SIAT_GDP_ANNUAL_SOURCE_URL = 'https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_582.json'
export const SIAT_GDP_ANNUAL_INDICATOR_CODE = '1.01.01.0009'

const ANNUAL_PERIOD_PATTERN = /^(\d{4})$/
const VALUE_PREFERENCE_KEYS = ['value_en', 'value_ru', 'value_uz', 'value_uzc']
const NAME_KEYS = ['name_en', 'name_ru', 'name_uz', 'name_uzc']
const NATIONAL_LABELS = new Set([
  'republic of uzbekistan',
  'республика узбекистан',
  "o'zbekiston respublikasi",
  'ўзбекистон республикаси',
])

function manualRequired(reason, details = {}) {
  throw new ManualRequiredError(reason, details)
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/\s+/g, ' ')
}

function sourceIdFromUrl(sourceUrl) {
  return basename(new URL(sourceUrl).pathname, '.json')
}

function validateOfficialSourceUrl(sourceUrl) {
  let url
  try {
    url = new URL(sourceUrl)
  } catch {
    manualRequired('siat_gdp_annual_source_url_unresolved', { sourceUrl })
  }

  if (!['api.siat.stat.uz', 'stat.uz'].includes(url.hostname)) {
    manualRequired('siat_gdp_annual_source_host_not_official', { sourceUrl })
  }
  if (sourceUrl !== SIAT_GDP_ANNUAL_SOURCE_URL) {
    manualRequired('siat_gdp_annual_source_url_unresolved', { sourceUrl })
  }
}

function readDataset(json, sourceUrl) {
  if (!Array.isArray(json) || json.length !== 1 || !isRecord(json[0])) {
    manualRequired('siat_gdp_annual_schema_mismatch', { sourceUrl })
  }
  const dataset = json[0]
  if (!Array.isArray(dataset.metadata) || !Array.isArray(dataset.data)) {
    manualRequired('siat_gdp_annual_schema_mismatch', { sourceUrl })
  }
  return dataset
}

function metadataNameMatches(record, predicate) {
  return NAME_KEYS.some((key) => predicate(record[key], key, record))
}

function findMetadataRecord(metadata, predicate) {
  if (!Array.isArray(metadata)) manualRequired('siat_gdp_annual_schema_mismatch')
  return metadata.find((record) => isRecord(record) && metadataNameMatches(record, predicate)) ?? null
}

function findMetadataRecordByEnglishName(metadata, name) {
  return findMetadataRecord(metadata, (recordName, key) => key === 'name_en' && recordName === name)
}

export function findPreferredMetadataValue(record) {
  if (!isRecord(record)) return null
  for (const key of VALUE_PREFERENCE_KEYS) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function requirePreferredMetadataValue(metadata, predicate, reason) {
  const record = findMetadataRecord(metadata, predicate)
  const value = findPreferredMetadataValue(record)
  if (!value) manualRequired(reason)
  return value
}

function optionalPreferredMetadataValue(metadata, predicate) {
  return findPreferredMetadataValue(findMetadataRecord(metadata, predicate))
}

function unitProvesPriorYearIndex(value) {
  const text = normalizeText(value)
  return (
    text === 'as a percentage of the corresponding period of the previous year' ||
    text === 'в процентах к соответствующему периоду предыдущего года' ||
    text === "o'tgan yilning mos davriga nisbatan foizda" ||
    text === 'ўтган йилнинг мос даврига нисбатан фоизда'
  )
}

function normalizeObservedAt(value) {
  const text = String(value ?? '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) manualRequired('siat_gdp_annual_last_modified_missing', { value })
  return `${match[1]}-${match[2]}-${match[3]}T00:00:00Z`
}

function validateMetadata(metadata, sourceUrl) {
  const indicatorCodeRecord = findMetadataRecordByEnglishName(metadata, 'Indicator identification number (code)')
  const indicatorCode = indicatorCodeRecord?.value_en
  if (indicatorCode !== SIAT_GDP_ANNUAL_INDICATOR_CODE) {
    manualRequired('siat_gdp_annual_indicator_code_mismatch', {
      expected: SIAT_GDP_ANNUAL_INDICATOR_CODE,
      actual: indicatorCode ?? null,
      sourceUrl,
    })
  }

  const unit = requirePreferredMetadataValue(
    metadata,
    (name) => normalizeText(name) === 'unit of measurement' || /единица измерения/i.test(String(name ?? '')),
    'siat_gdp_annual_unit_representation_unproven',
  )
  if (!unitProvesPriorYearIndex(unit)) {
    manualRequired('siat_gdp_annual_unit_representation_unproven', { unit, sourceUrl })
  }

  const lastModifiedDate = requirePreferredMetadataValue(
    metadata,
    (name) => normalizeText(name) === 'last modified date' || /дата последнего изменения/i.test(String(name ?? '')),
    'siat_gdp_annual_last_modified_missing',
  )

  const methodologyUrl = optionalPreferredMetadataValue(
    metadata,
    (name) => normalizeText(name) === 'calculation methodology' || /методы расчета/i.test(String(name ?? '')),
  )

  const preliminaryNote = optionalPreferredMetadataValue(
    metadata,
    (name) =>
      normalizeText(name) === 'note' ||
      normalizeText(name) === 'примечание' ||
      normalizeText(name) === 'izoh' ||
      normalizeText(name) === 'изоҳ',
  )

  return {
    indicatorCode,
    unit,
    observedAt: normalizeObservedAt(lastModifiedDate),
    methodologyUrl,
    preliminaryNote,
  }
}

function rowNationalLabelMatches(row) {
  const labels = [
    row.Klassifikator_en,
    row.Klassifikator_ru,
    row.Klassifikator,
    row.Klassifikator_uz,
    row.Klassifikator_uzc,
  ].map(normalizeText)

  return labels.some((label) => NATIONAL_LABELS.has(label))
}

export function selectNationalAggregateRow(rows) {
  if (!Array.isArray(rows)) manualRequired('siat_gdp_annual_schema_mismatch')
  const matches = rows.filter((row) => isRecord(row) && row.Code === '1700' && rowNationalLabelMatches(row))
  if (matches.length === 0) manualRequired('siat_gdp_annual_aggregate_row_missing')
  if (matches.length > 1) manualRequired('siat_gdp_annual_aggregate_row_duplicate', { matches: matches.length })
  return matches[0]
}

function parsePeriodKey(key) {
  const match = ANNUAL_PERIOD_PATTERN.exec(key)
  if (!match) return null
  return { key, year: Number(match[1]) }
}

function comparePeriod(left, right) {
  return left.year - right.year
}

function readAnnualPeriods(row) {
  const periods = Object.keys(row)
    .map(parsePeriodKey)
    .filter(Boolean)
    .sort(comparePeriod)

  if (periods.length === 0) {
    manualRequired('siat_gdp_annual_no_year_period_keys')
  }
  return periods
}

function asStrictNumber(value, path) {
  if (value === null || value === undefined || value === '') {
    manualRequired('siat_gdp_annual_raw_value_missing', { path, value: value ?? null })
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') manualRequired('siat_gdp_annual_non_numeric_value', { path, value })
  const text = value.trim()
  if (text.length === 0) manualRequired('siat_gdp_annual_raw_value_missing', { path, value })
  if (text.includes(',') || !/^-?\d+(\.\d+)?$/.test(text)) {
    manualRequired('siat_gdp_annual_numeric_parsing_ambiguous', { path, value })
  }
  const number = Number(text)
  if (!Number.isFinite(number)) manualRequired('siat_gdp_annual_non_numeric_value', { path, value })
  return number
}

function validateIndexValue(value, path) {
  if (value === 0) manualRequired('siat_gdp_annual_raw_value_missing', { path, value })
  if (value < 50 || value > 150) {
    manualRequired('siat_gdp_annual_sanity_bound_failed', { path, value })
  }
}

export function parseSiatGdpAnnualDataset(json, options = {}) {
  const sourceUrl = options.sourceUrl ?? SIAT_GDP_ANNUAL_SOURCE_URL
  validateOfficialSourceUrl(sourceUrl)
  const dataset = readDataset(json, sourceUrl)
  const metadata = validateMetadata(dataset.metadata, sourceUrl)
  const aggregateRow = selectNationalAggregateRow(dataset.data)
  if (aggregateRow.Code !== '1700') manualRequired('siat_gdp_annual_aggregate_row_missing')

  const periods = readAnnualPeriods(aggregateRow)
  const current = periods.at(-1)
  const previous = { key: String(current.year - 1), year: current.year - 1 }
  if (!periods.some((period) => period.year === previous.year)) {
    manualRequired('siat_gdp_annual_previous_year_missing', {
      current: current.key,
      previous: previous.key,
    })
  }

  const currentIndex = asStrictNumber(aggregateRow[current.key], `aggregate.${current.key}`)
  const previousIndex = asStrictNumber(aggregateRow[previous.key], `aggregate.${previous.key}`)
  validateIndexValue(currentIndex, `aggregate.${current.key}`)
  validateIndexValue(previousIndex, `aggregate.${previous.key}`)

  return {
    sourceUrl,
    datasetId: sourceIdFromUrl(sourceUrl),
    metadata,
    current: {
      ...current,
      periodLabel: current.key,
      indexValue: currentIndex,
      value: roundTo(currentIndex - 100, 2),
    },
    previous: {
      ...previous,
      periodLabel: previous.key,
      indexValue: previousIndex,
      value: roundTo(previousIndex - 100, 2),
    },
  }
}

function findMetric(snapshot, metricId) {
  return snapshot?.metrics?.find((metric) => metric.metric_id === metricId)
}

function parseAnnualSnapshotPeriod(label, path) {
  const match = /^(\d{4})$/.exec(String(label ?? '').trim())
  if (!match) manualRequired('siat_gdp_annual_snapshot_period_unparseable', { path, label })
  return { year: Number(match[1]) }
}

function validateNotOlderThanSnapshot(dataset, snapshot) {
  const metric = findMetric(snapshot, 'real_gdp_growth_annual_yoy')
  if (!metric) manualRequired('siat_gdp_annual_snapshot_metric_missing')
  const snapshotPeriod = parseAnnualSnapshotPeriod(metric.source_period, 'real_gdp_growth_annual_yoy.source_period')
  if (dataset.current.year < snapshotPeriod.year) {
    manualRequired('siat_gdp_annual_source_older_than_snapshot', {
      sourcePeriod: dataset.current.periodLabel,
      snapshotPeriod: metric.source_period,
    })
  }
}

export function buildSiatGdpAnnualUpdate(dataset, extractedAt) {
  const methodology = dataset.metadata.methodologyUrl
    ? ` Methodology: ${dataset.metadata.methodologyUrl}.`
    : ''
  const caveats = [
    'SIAT 582 reports annual GDP growth rates as prior-year=100 index values; Overview stores index minus 100.',
    `previous_value ${dataset.previous.value} is ${dataset.previous.periodLabel} SIAT 582 index ${dataset.previous.indexValue} minus 100.`,
  ]
  if (dataset.metadata.preliminaryNote) {
    caveats.push(`SIAT 582 metadata note: ${dataset.metadata.preliminaryNote}.`)
  }

  return {
    metric_id: 'real_gdp_growth_annual_yoy',
    value: dataset.current.value,
    previous_value: dataset.previous.value,
    source_label: 'Statistics Agency SIAT annual GDP data, calculated YoY',
    source_period: dataset.current.periodLabel,
    source_url: dataset.sourceUrl,
    source_reference: `Calculated from SIAT ${dataset.datasetId} national aggregate Code 1700 annual GDP prior-year index for ${dataset.current.periodLabel}: ${dataset.current.indexValue} minus 100. Previous value uses ${dataset.previous.periodLabel} index ${dataset.previous.indexValue} minus 100.${methodology}`,
    observed_at: dataset.metadata.observedAt,
    extracted_at: extractedAt,
    validation_status: 'valid',
    caveats,
    warnings: [],
  }
}

export async function fetchSiatGdpAnnualDataset(options = {}) {
  const sourceUrl = options.sourceUrl ?? SIAT_GDP_ANNUAL_SOURCE_URL
  validateOfficialSourceUrl(sourceUrl)
  let json
  try {
    json = options.fetchJson
      ? await options.fetchJson(sourceUrl, 'real_gdp_growth_annual_yoy')
      : await fetchJsonWithRetry(sourceUrl, options.http)
  } catch (error) {
    manualRequired('siat_gdp_annual_source_url_unresolved', {
      sourceUrl,
      error: error instanceof Error ? error.message : String(error),
    })
  }
  return parseSiatGdpAnnualDataset(json, { sourceUrl })
}

export async function buildSiatGdpAnnualMetricUpdates(options = {}) {
  const snapshot = options.snapshot
  const extractedAt = options.extractedAt ?? new Date().toISOString()
  const dataset = await fetchSiatGdpAnnualDataset({
    sourceUrl: options.sourceUrl ?? SIAT_GDP_ANNUAL_SOURCE_URL,
    fetchJson: options.fetchJson,
    http: options.http,
  })
  validateNotOlderThanSnapshot(dataset, snapshot)
  return [buildSiatGdpAnnualUpdate(dataset, extractedAt)]
}
