import type { DfmBridgePayload } from './dfm-types.js'

export type DfmReadinessReasonCode =
  | 'internal_preview_only'
  | 'source_refit_not_in_ci'
  | 'economist_signoff_missing'
  | 'current_quarter_mismatch'
  | 'source_vintage_stale'
  | 'factor_data_stale'
  | 'current_value_missing'
  | 'forecast_horizon_empty'

export type DfmReadinessReason = {
  code: DfmReadinessReasonCode
  message: string
}

export type DfmReadinessAssessment = {
  status: 'available' | 'unavailable'
  expected_quarter: string
  artifact_quarter: string
  source_age_days: number | null
  factor_age_days: number | null
  reasons: DfmReadinessReason[]
}

const MAX_SOURCE_AGE_DAYS = 45
const MAX_FACTOR_AGE_DAYS = 62

function expectedQuarter(now: Date): string {
  return `${now.getUTCFullYear()}Q${Math.floor(now.getUTCMonth() / 3) + 1}`
}

function normalizeQuarter(value: string): string {
  return value.toUpperCase().replace(/\s+/g, '')
}

function parseTimestamp(value: string): number | null {
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(' ', 'T')}Z`
    : value
  const parsed = Date.parse(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function ageDays(value: string, now: Date): number | null {
  const parsed = parseTimestamp(value)
  if (parsed === null) return null
  const ageMilliseconds = now.getTime() - parsed
  if (ageMilliseconds < 0) return null
  return Math.floor(ageMilliseconds / 86_400_000)
}

export function assessDfmReadiness(
  payload: DfmBridgePayload,
  now: Date = new Date(),
): DfmReadinessAssessment {
  const reasons: DfmReadinessReason[] = []
  const expected = expectedQuarter(now)
  const artifactQuarter = normalizeQuarter(payload.nowcast.current_quarter.period)
  const sourceAgeDays = ageDays(payload.metadata.source_artifact_exported_at, now)
  const factorAgeDays = ageDays(payload.factor.last_data_date, now)

  if (payload.metadata.readiness_status.public_status !== 'operational') {
    reasons.push({
      code: 'internal_preview_only',
      message: 'DFM is marked internal preview, not operational public output.',
    })
  }
  if (payload.metadata.readiness_status.source_refit_in_ci !== 'available') {
    reasons.push({
      code: 'source_refit_not_in_ci',
      message: 'The source-data refit is not reproducible in CI.',
    })
  }
  if (payload.metadata.readiness_status.economist_signoff !== 'available') {
    reasons.push({
      code: 'economist_signoff_missing',
      message: 'Economist/model-owner sign-off is not available.',
    })
  }
  if (artifactQuarter !== expected) {
    reasons.push({
      code: 'current_quarter_mismatch',
      message: `Artifact quarter ${payload.nowcast.current_quarter.period} does not match current quarter ${expected}.`,
    })
  }
  if (sourceAgeDays === null || sourceAgeDays > MAX_SOURCE_AGE_DAYS) {
    reasons.push({
      code: 'source_vintage_stale',
      message: `Upstream DFM source vintage is missing or older than ${MAX_SOURCE_AGE_DAYS} days.`,
    })
  }
  if (factorAgeDays === null || factorAgeDays > MAX_FACTOR_AGE_DAYS) {
    reasons.push({
      code: 'factor_data_stale',
      message: `Latest factor input is missing or older than ${MAX_FACTOR_AGE_DAYS} days.`,
    })
  }
  if (!Number.isFinite(payload.nowcast.current_quarter.gdp_growth_yoy_pct)) {
    reasons.push({
      code: 'current_value_missing',
      message: 'Current-quarter GDP nowcast is missing.',
    })
  }
  if (payload.nowcast.forecast_horizon.length === 0) {
    reasons.push({
      code: 'forecast_horizon_empty',
      message: 'No forward forecast horizon is published.',
    })
  }

  return {
    status: reasons.length === 0 ? 'available' : 'unavailable',
    expected_quarter: expected,
    artifact_quarter: payload.nowcast.current_quarter.period,
    source_age_days: sourceAgeDays,
    factor_age_days: factorAgeDays,
    reasons,
  }
}