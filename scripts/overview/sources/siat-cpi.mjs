import { basename } from 'node:path'
import { fetchJsonWithRetry } from './http.mjs'
import { roundTo } from './math.mjs'
import { ManualRequiredError } from './siat-trade.mjs'

export const SIAT_CPI_MOM_METRIC_IDS = ['cpi_mom']
export const SIAT_CPI_MOM_SOURCE_URL = 'https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_4585.json'
export const SIAT_CPI_MOM_INDICATOR_CODE = '1.11.01.0026'

const CYRILLIC_MONTH_PERIOD_PATTERN = /^(\d{4})-\u041c(0[1-9]|1[0-2])$/
const VALUE_PREFERENCE_KEYS = ['value_en', 'value_ru', 'value_uz', 'value_uzc']
const NAME_KEYS = ['name_en', 'name_ru', 'name_uz', 'name_uzc']
const MONTH_INDEX_BY_NAME = new Map(
  [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ].map((name, index) => [name, index + 1]),
)

function manualRequired(reason, details = {}) {
  throw new ManualRequiredError(reason, details)
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function sourceIdFromUrl(sourceUrl) {
  return basename(new URL(sourceUrl).pathname, '.json')
}

function validateOfficialSourceUrl(sourceUrl) {
  let url
  try {
    url = new URL(sourceUrl)
  } catch {
    manualRequired('siat_cpi_mom_source_url_unresolved', { sourceUrl })
  }

  if (!['api.siat.stat.uz', 'stat.uz'].includes(url.hostname)) {
    manualRequired('siat_cpi_mom_source_host_not_official', { sourceUrl })
  }
  if (sourceUrl !== SIAT_CPI_MOM_SOURCE_URL) {
    manualRequired('siat_cpi_mom_source_url_unresolved', { sourceUrl })
  }
}

function readDataset(json, sourceUrl) {
  if (!Array.isArray(json) || json.length !== 1 || !isRecord(json[0])) {
    manualRequired('siat_cpi_mom_schema_mismatch', { sourceUrl })
  }
  const dataset = json[0]
  if (!Array.isArray(dataset.metadata) || !Array.isArray(dataset.data)) {
    manualRequired('siat_cpi_mom_schema_mismatch', { sourceUrl })
  }
  return dataset
}

function metadataNameMatches(record, predicate) {
  return NAME_KEYS.some((key) => predicate(record[key], key, record))
}

function findMetadataRecord(metadata, predicate) {
  if (!Array.isArray(metadata)) manualRequired('siat_cpi_mom_missing_metadata')
  return metadata.find((record) => isRecord(record) && metadataNameMatches(record, predicate)) ?? null
}

export function findMetadataValue(metadata, predicate) {
  const record = findMetadataRecord(metadata, predicate)
  if (!record) return null
  for (const key of VALUE_PREFERENCE_KEYS) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function requireMetadataValue(metadata, predicate, reason) {
  const value = findMetadataValue(metadata, predicate)
  if (!value) manualRequired(reason)
  return value
}

function normalizeUnit(value) {
  const text = normalizeText(value)
  if (/^percent$|^процент$|^foiz$|\u0444\u043e\u0438\u0437/.test(text)) return 'percent'
  return text
}

function normalizePeriodicity(value) {
  const text = normalizeText(value)
  if (/monthly|ежемесячный|oylik|\u043e\u0439\u043b\u0438\u043a/.test(text)) return 'monthly'
  return text
}

function indicatorNameProvesPriorMonthIndex(value) {
  const text = normalizeText(value)
  const hasIndexToken = /index|\u0438\u043d\u0434\u0435\u043a\u0441|indeks/.test(text)
  const hasPriorMonthToken =
    /previous month|\u043f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0435\u043c\u0443 \u043c\u0435\u0441\u044f\u0446\u0443|o['\u2019]?tgan oy/.test(
      text,
    )
  return hasIndexToken && hasPriorMonthToken
}

function validateMetadata(metadata, sourceUrl) {
  const indicatorCode = requireMetadataValue(
    metadata,
    (name, key) => key === 'name_en' && name === 'Indicator identification number (code)',
    'siat_cpi_mom_indicator_code_missing',
  )
  if (indicatorCode !== SIAT_CPI_MOM_INDICATOR_CODE) {
    manualRequired('siat_cpi_mom_indicator_code_mismatch', {
      expected: SIAT_CPI_MOM_INDICATOR_CODE,
      actual: indicatorCode,
      sourceUrl,
    })
  }

  const unit = requireMetadataValue(
    metadata,
    (name) => normalizeText(name) === 'unit of measurement' || /единица измерения/i.test(String(name ?? '')),
    'siat_cpi_mom_unit_not_proven',
  )
  if (normalizeUnit(unit) !== 'percent') {
    manualRequired('siat_cpi_mom_unit_not_proven', { unit, sourceUrl })
  }

  const periodicity = requireMetadataValue(
    metadata,
    (name) => normalizeText(name) === 'periodicity' || /периодичность/i.test(String(name ?? '')),
    'siat_cpi_mom_frequency_not_proven',
  )
  if (normalizePeriodicity(periodicity) !== 'monthly') {
    manualRequired('siat_cpi_mom_frequency_not_proven', { periodicity, sourceUrl })
  }

  const indicatorName = requireMetadataValue(
    metadata,
    (name) => normalizeText(name) === 'indicator name' || /имя индикатора/i.test(String(name ?? '')),
    'siat_cpi_mom_representation_not_proven',
  )
  const indicatorNameRecord = findMetadataRecord(
    metadata,
    (name) => normalizeText(name) === 'indicator name' || /имя индикатора/i.test(String(name ?? '')),
  )
  const indicatorNameProven = VALUE_PREFERENCE_KEYS.some((key) =>
    indicatorNameProvesPriorMonthIndex(indicatorNameRecord?.[key]),
  )
  if (!indicatorNameProven) {
    manualRequired('siat_cpi_mom_representation_not_proven', { indicatorName, sourceUrl })
  }

  const lastModifiedDate = requireMetadataValue(
    metadata,
    (name) => normalizeText(name) === 'last modified date' || /дата последнего изменения/i.test(String(name ?? '')),
    'siat_cpi_mom_last_modified_date_missing',
  )

  return {
    indicatorCode,
    unit: 'percent',
    periodicity: 'monthly',
    indicatorName,
    observedAt: normalizeObservedAt(lastModifiedDate),
  }
}

function normalizeObservedAt(value) {
  const text = String(value ?? '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) manualRequired('siat_cpi_mom_last_modified_date_invalid', { value })
  return `${match[1]}-${match[2]}-${match[3]}T00:00:00Z`
}

function rowAggregateLabelMatches(row) {
  const labels = [
    row.Klassifikator_en,
    row.Klassifikator_ru,
    row.Klassifikator,
    row.Klassifikator_uz,
    row.Klassifikator_uzc,
  ].map(normalizeText)

  return labels.some(
    (label) =>
      label === 'composite index' ||
      label === '\u0441\u0432\u043e\u0434\u043d\u044b\u0439 \u0438\u043d\u0434\u0435\u043a\u0441' ||
      label === 'yig\u02bbma indeks' ||
      label === '\u0439\u0438\u0493\u043c\u0430 \u0438\u043d\u0434e\u043a\u0441',
  )
}

export function selectAggregateRow(rows) {
  if (!Array.isArray(rows)) manualRequired('siat_cpi_mom_schema_mismatch')
  const matches = rows.filter((row) => isRecord(row) && row.Code === '1' && rowAggregateLabelMatches(row))
  if (matches.length !== 1) {
    manualRequired('siat_cpi_mom_aggregate_row_match_count', { matches: matches.length })
  }
  return matches[0]
}

function parsePeriodKey(key) {
  const match = CYRILLIC_MONTH_PERIOD_PATTERN.exec(key)
  if (!match) return null
  return { key, year: Number(match[1]), month: Number(match[2]) }
}

function comparePeriod(left, right) {
  return left.year - right.year || left.month - right.month
}

function previousMonth(period) {
  if (period.month === 1) return { year: period.year - 1, month: 12 }
  return { year: period.year, month: period.month - 1 }
}

function samePeriod(left, right) {
  return left.year === right.year && left.month === right.month
}

function periodKey(period) {
  return `${period.year}-\u041c${String(period.month).padStart(2, '0')}`
}

function monthName(month) {
  return new Date(Date.UTC(2026, month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  })
}

function formatPeriodLabel(period) {
  return `${monthName(period.month)} ${period.year}`
}

function parseHumanMonthPeriod(label, path) {
  const match = /^([A-Za-z]+) (\d{4})$/.exec(String(label ?? '').trim())
  if (!match) manualRequired('siat_cpi_mom_snapshot_period_unparseable', { path, label })
  const month = MONTH_INDEX_BY_NAME.get(match[1].toLowerCase())
  if (!month) {
    manualRequired('siat_cpi_mom_snapshot_period_unparseable', { path, label })
  }
  return { year: Number(match[2]), month }
}

function asStrictNumber(value, path) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') manualRequired('siat_cpi_mom_non_numeric_value', { path, value })
  const text = value.trim()
  if (text.includes(',') || !/^-?\d+(\.\d+)?$/.test(text)) {
    manualRequired('siat_cpi_mom_numeric_parsing_ambiguous', { path, value })
  }
  const number = Number(text)
  if (!Number.isFinite(number)) manualRequired('siat_cpi_mom_non_numeric_value', { path, value })
  return number
}

function readAggregatePeriods(row) {
  const periods = Object.keys(row)
    .map(parsePeriodKey)
    .filter(Boolean)
    .sort(comparePeriod)

  if (periods.length === 0) {
    manualRequired('siat_cpi_mom_no_cyrillic_period_keys')
  }
  return periods
}

function validateIndexValue(value, path) {
  if (value === 0) manualRequired('siat_cpi_mom_zero_sentinel_on_aggregate', { path })
  if (Math.abs(value - 100) > 5) {
    manualRequired('siat_cpi_mom_sanity_bound_failed', { path, value })
  }
}

export function parseSiatCpiMomDataset(json, options = {}) {
  const sourceUrl = options.sourceUrl ?? SIAT_CPI_MOM_SOURCE_URL
  validateOfficialSourceUrl(sourceUrl)
  const dataset = readDataset(json, sourceUrl)
  const metadata = validateMetadata(dataset.metadata, sourceUrl)
  const aggregateRow = selectAggregateRow(dataset.data)
  const periods = readAggregatePeriods(aggregateRow)
  const current = periods.at(-1)
  const prior = previousMonth(current)
  if (!periods.some((period) => samePeriod(period, prior))) {
    manualRequired('siat_cpi_mom_previous_month_missing', { current: periodKey(current), previous: periodKey(prior) })
  }

  const currentIndex = asStrictNumber(aggregateRow[periodKey(current)], `aggregate.${periodKey(current)}`)
  const priorIndex = asStrictNumber(aggregateRow[periodKey(prior)], `aggregate.${periodKey(prior)}`)
  validateIndexValue(currentIndex, `aggregate.${periodKey(current)}`)
  validateIndexValue(priorIndex, `aggregate.${periodKey(prior)}`)

  return {
    sourceUrl,
    datasetId: sourceIdFromUrl(sourceUrl),
    metadata,
    current: {
      ...current,
      periodKey: periodKey(current),
      periodLabel: formatPeriodLabel(current),
      indexValue: currentIndex,
      value: roundTo(currentIndex - 100, 2),
    },
    previous: {
      ...prior,
      periodKey: periodKey(prior),
      periodLabel: formatPeriodLabel(prior),
      indexValue: priorIndex,
      value: roundTo(priorIndex - 100, 2),
    },
  }
}

function findMetric(snapshot, metricId) {
  return snapshot?.metrics?.find((metric) => metric.metric_id === metricId)
}

function validateNotOlderThanSnapshot(dataset, snapshot) {
  const metric = findMetric(snapshot, 'cpi_mom')
  if (!metric) manualRequired('siat_cpi_mom_snapshot_metric_missing')
  const snapshotPeriod = parseHumanMonthPeriod(metric.source_period, 'cpi_mom.source_period')
  if (comparePeriod(dataset.current, snapshotPeriod) < 0) {
    manualRequired('siat_cpi_mom_source_older_than_snapshot', {
      sourcePeriod: dataset.current.periodLabel,
      snapshotPeriod: metric.source_period,
    })
  }
}

export function buildSiatCpiMomUpdate(dataset, extractedAt) {
  return {
    metric_id: 'cpi_mom',
    value: dataset.current.value,
    previous_value: dataset.previous.value,
    source_label: 'Statistics Agency SIAT CPI data, calculated MoM',
    source_period: dataset.current.periodLabel,
    source_url: dataset.sourceUrl,
    source_reference: `Calculated from SIAT ${dataset.datasetId} aggregate CPI previous-month index for ${dataset.current.periodLabel}: ${dataset.current.indexValue} minus 100. Previous value uses ${dataset.previous.periodLabel} aggregate index ${dataset.previous.indexValue} minus 100.`,
    observed_at: dataset.metadata.observedAt,
    extracted_at: extractedAt,
    validation_status: 'valid',
    caveats: [
      'Monthly inflation can be volatile; do not present as trend alone.',
      `previous_value ${dataset.previous.value} is ${dataset.previous.periodLabel} SIAT 4585 aggregate index ${dataset.previous.indexValue} minus 100.`,
    ],
    warnings: [],
  }
}

export async function fetchSiatCpiMomDataset(options = {}) {
  const sourceUrl = options.sourceUrl ?? SIAT_CPI_MOM_SOURCE_URL
  validateOfficialSourceUrl(sourceUrl)
  const json = options.fetchJson
    ? await options.fetchJson(sourceUrl, 'cpi_mom')
    : await fetchJsonWithRetry(sourceUrl, options.http)
  return parseSiatCpiMomDataset(json, { sourceUrl })
}

export async function buildSiatCpiMetricUpdates(options = {}) {
  const snapshot = options.snapshot
  const extractedAt = options.extractedAt ?? new Date().toISOString()
  const dataset = await fetchSiatCpiMomDataset({
    sourceUrl: options.sourceUrl ?? SIAT_CPI_MOM_SOURCE_URL,
    fetchJson: options.fetchJson,
    http: options.http,
  })
  validateNotOlderThanSnapshot(dataset, snapshot)
  return [buildSiatCpiMomUpdate(dataset, extractedAt)]
}
