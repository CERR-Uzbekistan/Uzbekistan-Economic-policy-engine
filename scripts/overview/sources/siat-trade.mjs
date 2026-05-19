import { basename } from 'node:path'
import { fetchJsonWithRetry } from './http.mjs'
import { percentChange, roundTo } from './math.mjs'

export const SIAT_TRADE_METRIC_IDS = ['exports_yoy', 'imports_yoy', 'trade_balance']
export const SIAT_TRADE_BALANCE_CAVEAT =
  'Displayed value is in USD billion (negative = goods trade deficit); calculated from SIAT cumulative monthly goods trade levels.'

const FLOW_TO_METRIC = {
  exports: 'exports_yoy',
  imports: 'imports_yoy',
}

const FLOW_LABEL = {
  exports: 'export',
  imports: 'import',
}

const CLAIM_TYPE_WARNING =
  'Owner approved calculated YoY from official observed SIAT levels; current lock still classifies this metric as observed pending later cleanup.'

const TRADE_BALANCE_WARNING =
  'Owner approved calculated trade balance from official observed SIAT export and import levels; current lock unit remains broad pending later cleanup.'

const LIVE_SIAT_TRADE_INDICATOR_CODES = {
  exports: '1.08.02.0003',
  imports: '1.08.03.0006',
}

const VALUE_PREFERENCE_KEYS = ['value_en', 'value_ru', 'value_uz', 'value_uzc']
const NAME_KEYS = ['name_en', 'name_ru', 'name_uz', 'name_uzc']
const LIVE_PERIOD_PATTERN = /^(\d{4})-M(0[1-9]|1[0-2])$/

export class ManualRequiredError extends Error {
  constructor(reason, details = {}) {
    super(reason)
    this.name = 'ManualRequiredError'
    this.code = 'manual_required'
    this.reason = reason
    this.details = details
  }
}

export function isManualRequiredError(error) {
  return error instanceof ManualRequiredError || error?.code === 'manual_required'
}

function manualRequired(reason, details = {}) {
  throw new ManualRequiredError(reason, details)
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeFlow(value) {
  const text = normalizeText(value)
  if (/export|exports|eksport/.test(text)) return 'exports'
  if (/import|imports|importi/.test(text)) return 'imports'
  return text
}

function normalizeUnit(value) {
  const text = normalizeText(value).replace(/\s+/g, ' ')
  if (/usd/.test(text) && /(million|mln|mln\.)/.test(text)) return 'usd_million'
  if (/dollar/.test(text) && /(million|mln|mln\.)/.test(text)) return 'usd_million'
  return text
}

function normalizeWindowSemantics(value) {
  const text = normalizeText(value).replace(/[_-]/g, ' ')
  if (/cumulative/.test(text) && /month/.test(text)) return 'cumulative_monthly'
  if (/year to date|ytd/.test(text)) return 'cumulative_monthly'
  return text
}

function metadataText(metadata) {
  return JSON.stringify(metadata ?? {}).toLowerCase()
}

function normalizeObservedAt(value, reason = 'siat_trade_last_modified_date_invalid') {
  const text = String(value ?? '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) manualRequired(reason, { value })
  return `${match[1]}-${match[2]}-${match[3]}T00:00:00Z`
}

function sourceIdFromUrl(sourceUrl) {
  return basename(new URL(sourceUrl).pathname, '.json')
}

function asFiniteNumber(value, path) {
  const number = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  if (!Number.isFinite(number)) manualRequired('siat_trade_non_numeric_value', { path, value })
  return number
}

function monthName(month) {
  return new Date(Date.UTC(2026, month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  })
}

function formatWindowLabel(window) {
  if (window.startMonth === window.endMonth) return `${monthName(window.endMonth)} ${window.year}`
  return `${monthName(window.startMonth)}-${monthName(window.endMonth)} ${window.year}`
}

function parsePeriodWindow(row, path) {
  const year = Number(row.year ?? row.Year)
  const startMonth = Number(row.start_month ?? row.startMonth ?? row.start_period_month ?? 1)
  const endMonth = Number(row.end_month ?? row.endMonth ?? row.month ?? row.period_month)
  if (Number.isInteger(year) && Number.isInteger(startMonth) && Number.isInteger(endMonth)) {
    return { year, startMonth, endMonth }
  }

  const period = String(row.period ?? row.TIME_PERIOD ?? row.time_period ?? '')
  const range = /^(\d{4})-(\d{2})\/(\d{4})-(\d{2})$/.exec(period)
  if (range) {
    return {
      year: Number(range[3]),
      startMonth: Number(range[2]),
      endMonth: Number(range[4]),
    }
  }
  const monthly = /^(\d{4})-(\d{2})$/.exec(period)
  if (monthly) {
    return {
      year: Number(monthly[1]),
      startMonth: Number(row.start_month ?? 1),
      endMonth: Number(monthly[2]),
    }
  }

  manualRequired('siat_trade_period_window_not_machine_readable', { path, period })
}

function validatePeriodWindow(window, path) {
  if (!Number.isInteger(window.year) || window.year < 2000) {
    manualRequired('siat_trade_invalid_period_year', { path, window })
  }
  if (!Number.isInteger(window.startMonth) || window.startMonth < 1 || window.startMonth > 12) {
    manualRequired('siat_trade_invalid_start_month', { path, window })
  }
  if (!Number.isInteger(window.endMonth) || window.endMonth < 1 || window.endMonth > 12) {
    manualRequired('siat_trade_invalid_end_month', { path, window })
  }
  if (window.startMonth !== 1 || window.endMonth < window.startMonth) {
    manualRequired('siat_trade_reject_mismatched_cumulative_window', { path, window })
  }
}

function readMetadata(json) {
  if (Array.isArray(json) && json.length === 1 && isRecord(json[0]) && Array.isArray(json[0].metadata)) {
    return json[0].metadata
  }
  return json.metadata ?? json.meta ?? json.structure?.metadata ?? json.header ?? null
}

function readObservations(json) {
  if (Array.isArray(json) && json.length === 1 && isRecord(json[0]) && Array.isArray(json[0].data)) {
    return readLiveSiatTradeObservations(json[0].data)
  }
  if (Array.isArray(json.observations)) return json.observations
  if (Array.isArray(json.data)) return json.data
  if (Array.isArray(json.rows)) return json.rows
  manualRequired('siat_trade_observations_not_machine_readable')
}

function validateMetadata(metadata, expectedFlow, sourceUrl) {
  if (Array.isArray(metadata)) return validateLiveMetadata(metadata, expectedFlow, sourceUrl)

  if (!isRecord(metadata)) manualRequired('siat_trade_missing_machine_readable_metadata', { sourceUrl })

  const flow = normalizeFlow(metadata.flow ?? metadata.indicator_flow ?? metadata.trade_flow)
  if (flow !== expectedFlow) manualRequired('siat_trade_flow_mismatch', { expectedFlow, flow, sourceUrl })

  const unit = normalizeUnit(metadata.unit ?? metadata.unit_name ?? metadata.units)
  if (unit !== 'usd_million') manualRequired('siat_trade_unit_mismatch', { expectedUnit: 'usd_million', unit, sourceUrl })

  const semantics = normalizeWindowSemantics(
    metadata.window_semantics ?? metadata.cumulative_window ?? metadata.period_semantics ?? metadata.frequency,
  )
  if (semantics !== 'cumulative_monthly') {
    manualRequired('siat_trade_window_semantics_mismatch', {
      expectedWindowSemantics: 'cumulative_monthly',
      semantics,
      sourceUrl,
    })
  }

  const text = metadataText(metadata)
  if (!/siat|statistics agency|statistical agency|stat\.uz/.test(text)) {
    manualRequired('siat_trade_source_family_not_official_siat', { sourceUrl })
  }
  if (!/trade|foreign trade|goods/.test(text)) {
    manualRequired('siat_trade_family_mismatch', { sourceUrl })
  }

  return { flow, unit, semantics }
}

function metadataNameMatches(record, predicate) {
  return NAME_KEYS.some((key) => predicate(record[key], key, record))
}

function findMetadataRecord(metadata, predicate) {
  if (!Array.isArray(metadata)) manualRequired('siat_trade_missing_machine_readable_metadata')
  return metadata.find((record) => isRecord(record) && metadataNameMatches(record, predicate)) ?? null
}

function findMetadataValue(metadata, predicate) {
  const record = findMetadataRecord(metadata, predicate)
  if (!record) return null
  for (const key of VALUE_PREFERENCE_KEYS) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function requireMetadataValue(metadata, predicate, reason, details = {}) {
  const value = findMetadataValue(metadata, predicate)
  if (!value) manualRequired(reason, details)
  return value
}

function normalizePeriodicity(value) {
  const text = normalizeText(value)
  if (/monthly|ежемесяч|oylik|\u043e\u0439\u043b\u0438\u043a/.test(text)) return 'monthly'
  return text
}

function liveIndicatorNameMatchesFlow(value, expectedFlow) {
  const text = normalizeText(value)
  if (expectedFlow === 'exports') return /export|eksport|\u044d\u043a\u0441\u043f\u043e\u0440\u0442/.test(text)
  return /import|\u0438\u043c\u043f\u043e\u0440\u0442/.test(text)
}

function validateLiveMetadata(metadata, expectedFlow, sourceUrl) {
  const indicatorCode = requireMetadataValue(
    metadata,
    (name) => normalizeText(name) === 'indicator identification number (code)',
    'siat_trade_indicator_code_missing',
    { sourceUrl },
  )
  const expectedCode = LIVE_SIAT_TRADE_INDICATOR_CODES[expectedFlow]
  if (indicatorCode !== expectedCode) {
    manualRequired('siat_trade_indicator_code_mismatch', {
      expected: expectedCode,
      actual: indicatorCode,
      sourceUrl,
    })
  }

  const indicatorNameRecord = findMetadataRecord(
    metadata,
    (name) => normalizeText(name) === 'indicator name' || /имя индикатора/i.test(String(name ?? '')),
  )
  const indicatorName = requireMetadataValue(
    metadata,
    (name) => normalizeText(name) === 'indicator name' || /имя индикатора/i.test(String(name ?? '')),
    'siat_trade_indicator_name_missing',
    { sourceUrl },
  )
  const indicatorNameProvesFlow = VALUE_PREFERENCE_KEYS.some((key) =>
    liveIndicatorNameMatchesFlow(indicatorNameRecord?.[key], expectedFlow),
  )
  if (!indicatorNameProvesFlow) {
    manualRequired('siat_trade_flow_mismatch', { expectedFlow, indicatorName, sourceUrl })
  }

  const unit = requireMetadataValue(
    metadata,
    (name) => normalizeText(name) === 'unit of measurement' || /единица измерения/i.test(String(name ?? '')),
    'siat_trade_unit_mismatch',
    { sourceUrl },
  )
  if (normalizeUnit(unit) !== 'usd_million') {
    manualRequired('siat_trade_unit_mismatch', { expectedUnit: 'usd_million', unit, sourceUrl })
  }

  const periodicity = requireMetadataValue(
    metadata,
    (name) => normalizeText(name) === 'periodicity' || /периодичность/i.test(String(name ?? '')),
    'siat_trade_frequency_not_proven',
    { sourceUrl },
  )
  if (normalizePeriodicity(periodicity) !== 'monthly') {
    manualRequired('siat_trade_frequency_not_proven', { periodicity, sourceUrl })
  }

  const officialPreparer = requireMetadataValue(
    metadata,
    (name) => normalizeText(name) === 'official statistics preparer',
    'siat_trade_source_family_not_official_siat',
    { sourceUrl },
  )
  if (!/statistics|statistika|статист/i.test(officialPreparer)) {
    manualRequired('siat_trade_source_family_not_official_siat', { officialPreparer, sourceUrl })
  }

  const lastModifiedDate = requireMetadataValue(
    metadata,
    (name) => normalizeText(name) === 'last modified date' || /дата последнего изменения/i.test(String(name ?? '')),
    'siat_trade_last_modified_date_missing',
    { sourceUrl },
  )

  return {
    flow: expectedFlow,
    unit: 'usd_million',
    semantics: 'cumulative_monthly',
    indicatorCode,
    indicatorName,
    observedAt: normalizeObservedAt(lastModifiedDate),
  }
}

function parseLivePeriodKey(key) {
  const match = LIVE_PERIOD_PATTERN.exec(key)
  if (!match) return null
  return { key, year: Number(match[1]), startMonth: 1, endMonth: Number(match[2]) }
}

function periodKey(period) {
  return `${period.year}-M${String(period.endMonth).padStart(2, '0')}`
}

function comparePeriod(left, right) {
  return left.year - right.year || left.endMonth - right.endMonth
}

function selectNationalAggregateRow(rows) {
  if (!Array.isArray(rows)) manualRequired('siat_trade_observations_not_machine_readable')
  const matches = rows.filter((row) => {
    if (!isRecord(row)) return false
    if (String(row.Code ?? '') !== '1700') return false
    const labels = [
      row.Klassifikator_en,
      row.Klassifikator_ru,
      row.Klassifikator,
      row.Klassifikator_uz,
      row.Klassifikator_uzc,
    ].map(normalizeText)
    return labels.some(
      (label) =>
        label === 'republic of uzbekistan' ||
        label === 'o‘zbekiston respublikasi' ||
        label === 'oâzbekiston respublikasi' ||
        label === '\u0440\u0435\u0441\u043f\u0443\u0431\u043b\u0438\u043a\u0430 \u0443\u0437\u0431\u0435\u043a\u0438\u0441\u0442\u0430\u043d' ||
        label === '\u045e\u0437\u0431\u0435\u043a\u0438\u0441\u0442\u043e\u043d \u0440\u0435\u0441\u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0441\u0438',
    )
  })
  if (matches.length !== 1) manualRequired('siat_trade_national_row_match_count', { matches: matches.length })
  return matches[0]
}

function asStrictNumber(value, path) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') manualRequired('siat_trade_non_numeric_value', { path, value })
  const text = value.trim()
  if (text.length === 0) manualRequired('siat_trade_blank_period_value', { path })
  if (text.includes(',') || !/^-?\d+(\.\d+)?$/.test(text)) {
    manualRequired('siat_trade_numeric_parsing_ambiguous', { path, value })
  }
  const number = Number(text)
  if (!Number.isFinite(number)) manualRequired('siat_trade_non_numeric_value', { path, value })
  return number
}

function readLivePeriods(row) {
  const periods = Object.keys(row)
    .map(parseLivePeriodKey)
    .filter(Boolean)
    .sort(comparePeriod)

  const observations = []
  for (const period of periods) {
    const value = row[period.key]
    if (value === null || value === undefined || String(value).trim() === '') continue
    const parsedValue = asStrictNumber(value, `national.${period.key}`)
    observations.push({ ...period, value: parsedValue })
  }

  if (observations.length < 2) manualRequired('siat_trade_requires_current_and_prior_year_observations')
  return observations
}

function validateCumulativeWindow(observations) {
  const byYear = new Map()
  for (const entry of observations) {
    const entries = byYear.get(entry.year) ?? []
    entries.push(entry)
    byYear.set(entry.year, entries)
  }

  for (const entries of byYear.values()) {
    entries.sort(comparePeriod)
    for (let index = 1; index < entries.length; index += 1) {
      if (entries[index].value < entries[index - 1].value) {
        manualRequired('siat_trade_cumulative_window_not_proven', {
          previous: { key: periodKey(entries[index - 1]), value: entries[index - 1].value },
          current: { key: periodKey(entries[index]), value: entries[index].value },
        })
      }
    }
  }
}

function readLiveSiatTradeObservations(rows) {
  const nationalRow = selectNationalAggregateRow(rows)
  const observations = readLivePeriods(nationalRow)
  validateCumulativeWindow(observations)
  return observations.map((entry) => ({
    period: `${entry.year}-01/${entry.year}-${String(entry.endMonth).padStart(2, '0')}`,
    period_label: formatWindowLabel(entry),
    year: entry.year,
    start_month: 1,
    end_month: entry.endMonth,
    value: entry.value,
  }))
}

function parseObservation(row, index) {
  if (!isRecord(row)) manualRequired('siat_trade_observation_not_object', { index })
  const path = `observations[${index}]`
  const window = parsePeriodWindow(row, path)
  validatePeriodWindow(window, path)
  const value = asFiniteNumber(row.value ?? row.obs_value ?? row.OBS_VALUE, `${path}.value`)
  const observedAt = row.observed_at ?? row.observedAt ?? row.release_date ?? row.extracted_at
  return {
    ...window,
    period: row.period ?? `${window.year}-${String(window.startMonth).padStart(2, '0')}/${window.year}-${String(window.endMonth).padStart(2, '0')}`,
    periodLabel: row.period_label ?? formatWindowLabel(window),
    value,
    observedAt,
  }
}

function compareObservation(left, right) {
  return left.year - right.year || left.endMonth - right.endMonth || left.startMonth - right.startMonth
}

export function parseSiatTradeDataset(json, options) {
  const { expectedFlow, sourceUrl } = options
  const metadata = validateMetadata(readMetadata(json), expectedFlow, sourceUrl)
  const observations = readObservations(json).map(parseObservation).sort(compareObservation)
  if (observations.length < 2) manualRequired('siat_trade_requires_current_and_prior_year_observations', { sourceUrl })

  const current = observations.at(-1)
  const prior = observations.find(
    (entry) =>
      entry.year === current.year - 1 &&
      entry.startMonth === current.startMonth &&
      entry.endMonth === current.endMonth,
  )
  if (!prior) {
    manualRequired('siat_trade_reject_mismatched_windows', {
      sourceUrl,
      currentWindow: {
        year: current.year,
        startMonth: current.startMonth,
        endMonth: current.endMonth,
      },
    })
  }

  return {
    sourceUrl,
    datasetId: sourceIdFromUrl(sourceUrl),
    flow: expectedFlow,
    unit: 'usd_million',
    windowSemantics: 'cumulative_monthly',
    current: {
      ...current,
      observedAt: current.observedAt ?? metadata.observedAt,
    },
    prior: {
      ...prior,
      observedAt: prior.observedAt ?? metadata.observedAt,
    },
  }
}

export function calculateSiatTradeMetrics(exportsDataset, importsDataset) {
  const currentWindow = exportsDataset.current
  const importsWindow = importsDataset.current
  if (
    currentWindow.year !== importsWindow.year ||
    currentWindow.startMonth !== importsWindow.startMonth ||
    currentWindow.endMonth !== importsWindow.endMonth
  ) {
    manualRequired('siat_trade_reject_export_import_window_mismatch', {
      exportsWindow: currentWindow,
      importsWindow,
    })
  }

  return {
    exportsYoy: percentChange(exportsDataset.current.value, exportsDataset.prior.value, 2),
    importsYoy: percentChange(importsDataset.current.value, importsDataset.prior.value, 2),
    tradeBalance: roundTo((exportsDataset.current.value - importsDataset.current.value) / 1000, 2),
  }
}

function formatUsdMillion(value) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  }).format(value)
}

function buildYoyUpdate(dataset, value, extractedAt) {
  const flowLabel = FLOW_LABEL[dataset.flow]
  return {
    metric_id: FLOW_TO_METRIC[dataset.flow],
    value,
    previous_value: null,
    source_label: 'Statistics Agency SIAT trade data, calculated YoY',
    source_period: dataset.current.periodLabel,
    source_url: dataset.sourceUrl,
    source_reference: `Calculated from SIAT ${dataset.datasetId} cumulative monthly ${flowLabel} levels for ${dataset.current.periodLabel}: USD ${formatUsdMillion(dataset.current.value)} million versus USD ${formatUsdMillion(dataset.prior.value)} million for ${dataset.prior.periodLabel}.`,
    observed_at: dataset.current.observedAt,
    extracted_at: extractedAt,
    validation_status: 'warning',
    caveats: [
      'Trade values can be revised; show latest-vintage status.',
      `YoY rate calculated from official SIAT cumulative monthly ${flowLabel} levels: USD ${formatUsdMillion(dataset.current.value)} million for ${dataset.current.periodLabel} versus USD ${formatUsdMillion(dataset.prior.value)} million for ${dataset.prior.periodLabel}.`,
    ],
    warnings: [CLAIM_TYPE_WARNING],
  }
}

function buildTradeBalanceUpdate(exportsDataset, importsDataset, tradeBalance, extractedAt) {
  return {
    metric_id: 'trade_balance',
    value: tradeBalance,
    previous_value: null,
    source_label: 'Statistics Agency SIAT trade data, calculated',
    source_period: exportsDataset.current.periodLabel,
    source_reference: `Calculated from SIAT cumulative monthly goods trade levels for ${exportsDataset.current.periodLabel}: exports USD ${formatUsdMillion(exportsDataset.current.value)} million from ${exportsDataset.datasetId}, imports USD ${formatUsdMillion(importsDataset.current.value)} million from ${importsDataset.datasetId}. Source URLs: ${exportsDataset.sourceUrl}; ${importsDataset.sourceUrl}.`,
    extracted_at: extractedAt,
    validation_status: 'warning',
    caveats: [
      SIAT_TRADE_BALANCE_CAVEAT,
      'Label goods trade balance if services are excluded.',
    ],
    warnings: [TRADE_BALANCE_WARNING],
  }
}

function findMetric(snapshot, metricId) {
  return snapshot?.metrics?.find((metric) => metric.metric_id === metricId)
}

function seedUrlFromSnapshot(snapshot, metricId) {
  const url = findMetric(snapshot, metricId)?.source_url
  if (typeof url !== 'string' || url.trim().length === 0) {
    manualRequired('siat_trade_missing_seed_url', { metricId })
  }
  return url
}

export async function fetchSiatTradeDataset(flow, options = {}) {
  const sourceUrl = options.sourceUrl
  if (!sourceUrl) manualRequired('siat_trade_missing_source_url', { flow })
  const json = options.fetchJson
    ? await options.fetchJson(sourceUrl, flow)
    : await fetchJsonWithRetry(sourceUrl, options.http)
  return parseSiatTradeDataset(json, { expectedFlow: flow, sourceUrl })
}

export async function buildSiatTradeMetricUpdates(options = {}) {
  const snapshot = options.snapshot
  const extractedAt = options.extractedAt ?? new Date().toISOString()
  const exportsUrl = options.exportsUrl ?? seedUrlFromSnapshot(snapshot, 'exports_yoy')
  const importsUrl = options.importsUrl ?? seedUrlFromSnapshot(snapshot, 'imports_yoy')
  const exportsDataset = await fetchSiatTradeDataset('exports', {
    sourceUrl: exportsUrl,
    fetchJson: options.fetchJson,
    http: options.http,
  })
  const importsDataset = await fetchSiatTradeDataset('imports', {
    sourceUrl: importsUrl,
    fetchJson: options.fetchJson,
    http: options.http,
  })
  const arithmetic = calculateSiatTradeMetrics(exportsDataset, importsDataset)

  return [
    buildYoyUpdate(exportsDataset, arithmetic.exportsYoy, extractedAt),
    buildYoyUpdate(importsDataset, arithmetic.importsYoy, extractedAt),
    buildTradeBalanceUpdate(exportsDataset, importsDataset, arithmetic.tradeBalance, extractedAt),
  ]
}
