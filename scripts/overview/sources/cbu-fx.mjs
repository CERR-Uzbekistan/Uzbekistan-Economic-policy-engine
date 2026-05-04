import { addUtcMonths, percentChange, roundTo } from './math.mjs'
import { fetchJsonWithRetry } from './http.mjs'

const CBU_USD_BASE = 'https://cbu.uz/en/arkhiv-kursov-valyut/json/USD'
const SIGN_CONVENTION =
  'Positive means USD/UZS is higher, i.e. UZS depreciation against USD; negative means USD/UZS is lower, i.e. UZS appreciation against USD.'

function parseCbuDate(dateText) {
  const cbuDate = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(dateText)
  if (cbuDate) return `${cbuDate[3]}-${cbuDate[2]}-${cbuDate[1]}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return dateText
  throw new Error(`Unexpected CBU date format: ${dateText}`)
}

function isoAtUtcDate(dateText) {
  return `${dateText}T00:00:00Z`
}

function rateTextToNumber(rateText) {
  const normalized = String(rateText).replace(/\s/g, '').replace(',', '.')
  const rate = Number(normalized)
  if (!Number.isFinite(rate)) throw new Error(`Unexpected CBU USD rate: ${rateText}`)
  return roundTo(rate, 2)
}

export function buildCbuUsdUrl(dateText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) throw new Error(`Expected YYYY-MM-DD CBU request date: ${dateText}`)
  return `${CBU_USD_BASE}/${dateText}/`
}

export function parseCbuUsdObservation(json, requestedDate, sourceUrl = buildCbuUsdUrl(requestedDate)) {
  const rows = Array.isArray(json) ? json : [json]
  const row = rows.find((entry) => entry && String(entry.Ccy).toUpperCase() === 'USD') ?? rows[0]
  if (!row || typeof row !== 'object') throw new Error(`CBU USD response for ${requestedDate} did not contain a currency row.`)

  const actualDate = parseCbuDate(row.Date)
  const rate = rateTextToNumber(row.Rate)
  return {
    requestedDate,
    actualDate,
    rate,
    sourceUrl,
  }
}

export async function fetchCbuUsdObservation(requestedDate, options = {}) {
  const sourceUrl = buildCbuUsdUrl(requestedDate)
  const json = options.fetchJson
    ? await options.fetchJson(sourceUrl, requestedDate)
    : await fetchJsonWithRetry(sourceUrl, options.http)
  return parseCbuUsdObservation(json, requestedDate, sourceUrl)
}

function observationCaveat(label, observation) {
  const returned = observation.requestedDate === observation.actualDate
    ? observation.actualDate
    : `${observation.actualDate} returned for requested ${observation.requestedDate}`
  return `${label}: requested ${observation.requestedDate}; actual CBU date/rate ${returned}, ${observation.rate} UZS per USD.`
}

function actualDateWarning(label, observation) {
  if (observation.requestedDate === observation.actualDate) return null
  return `${label} requested date ${observation.requestedDate} differed from actual CBU date ${observation.actualDate}; nearest available CBU observation was used.`
}

function buildCommonCaveats(latest, priorMonth, priorYear) {
  return [
    observationCaveat('Latest observation', latest),
    observationCaveat('Prior-month comparison observation', priorMonth),
    observationCaveat('Prior-year comparison observation', priorYear),
    'Formula: ((latest - comparison) / comparison) * 100.',
    'Rounded to 2 decimal places.',
    SIGN_CONVENTION,
  ]
}

export async function buildCbuFxMetricUpdates(options = {}) {
  const latestDate = options.latestDate ?? new Date().toISOString().slice(0, 10)
  const priorMonthDate = options.priorMonthDate ?? addUtcMonths(latestDate, -1)
  const priorYearDate = options.priorYearDate ?? addUtcMonths(latestDate, -12)
  const extractedAt = options.extractedAt ?? new Date().toISOString()

  const latest = await fetchCbuUsdObservation(latestDate, options)
  const priorMonth = await fetchCbuUsdObservation(priorMonthDate, options)
  const priorYear = await fetchCbuUsdObservation(priorYearDate, options)
  const levelWarnings = [
    actualDateWarning('Latest', latest),
    actualDateWarning('Prior-month', priorMonth),
  ].filter(Boolean)
  const momWarnings = [
    actualDateWarning('Latest', latest),
    actualDateWarning('Prior-month', priorMonth),
  ].filter(Boolean)
  const yoyWarnings = [
    actualDateWarning('Latest', latest),
    actualDateWarning('Prior-year', priorYear),
  ].filter(Boolean)
  const commonCaveats = buildCommonCaveats(latest, priorMonth, priorYear)
  const mom = percentChange(latest.rate, priorMonth.rate, 2)
  const yoy = percentChange(latest.rate, priorYear.rate, 2)

  return [
    {
      metric_id: 'usd_uzs_level',
      value: latest.rate,
      previous_value: priorMonth.rate,
      source_label: 'Central Bank of Uzbekistan exchange rate',
      source_period: latest.actualDate,
      source_url: latest.sourceUrl,
      observed_at: isoAtUtcDate(latest.actualDate),
      caveats: [
        'Official/reference rate, not transaction-weighted market average.',
        observationCaveat('Latest observation', latest),
        observationCaveat('Prior-month comparison observation', priorMonth),
      ],
      warnings: levelWarnings,
    },
    {
      metric_id: 'usd_uzs_mom_change',
      value: mom,
      previous_value: null,
      source_label: 'CBU exchange rate, calculated',
      source_period: `${latest.actualDate} vs ${priorMonth.actualDate}`,
      source_reference: `Calculated from CBU official USD rates: ${latest.rate} on ${latest.actualDate} and ${priorMonth.rate} on ${priorMonth.actualDate}. Requested dates: latest ${latest.requestedDate}, prior-month ${priorMonth.requestedDate}.`,
      extracted_at: extractedAt,
      caveats: commonCaveats,
      warnings: momWarnings,
    },
    {
      metric_id: 'usd_uzs_yoy_change',
      value: yoy,
      previous_value: null,
      source_label: 'CBU exchange rate, calculated',
      source_period: `${latest.actualDate} vs ${priorYear.actualDate}`,
      source_reference: `Calculated from CBU official USD rates: ${latest.rate} on ${latest.actualDate} and ${priorYear.rate} on ${priorYear.actualDate}. Requested dates: latest ${latest.requestedDate}, prior-year ${priorYear.requestedDate}.`,
      extracted_at: extractedAt,
      caveats: commonCaveats,
      warnings: yoyWarnings,
    },
  ]
}

export { SIGN_CONVENTION }
