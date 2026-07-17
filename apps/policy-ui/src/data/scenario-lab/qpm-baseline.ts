import overviewArtifactJson from '../../../public/data/overview.json' with { type: 'json' }
import { validateOverviewArtifact } from '../overview/artifact-guard.js'
import type { OverviewArtifact, OverviewArtifactMetric, OverviewMetricId } from '../overview/artifact-types.js'

export type QpmBaselineMetricSource = {
  metric_id: OverviewMetricId
  label: string
  value: number
  unit: string
  source_label: string
  source_period: string
}

export type QpmBaselineSourceMetadata = {
  source: 'overview-artifact' | 'deterministic-fallback'
  source_artifact: string
  exported_at: string
  data_version: string
  status_label: string
  note: string
  metrics: QpmBaselineMetricSource[]
}

export type QpmBaselineLevels = {
  inflation: number
  policyRate: number
  outputGap: number
  nerDepreciation: number
  exchangeRateBase: number
  externalDemandGap: number
  startYear: number
  startQuarter: number
  metadata: QpmBaselineSourceMetadata
}

const OVERVIEW_ARTIFACT_PATH = 'apps/policy-ui/public/data/overview.json'
const POTENTIAL_GROWTH = 6

export const QPM_FALLBACK_BASELINE: QpmBaselineLevels = {
  inflation: 10.5,
  policyRate: 13.5,
  outputGap: -1.5,
  nerDepreciation: 8,
  exchangeRateBase: 12650,
  externalDemandGap: 0,
  startYear: 2026,
  startQuarter: 1,
  metadata: {
    source: 'deterministic-fallback',
    source_artifact: 'checked-in QPM fallback calibration',
    exported_at: '2026-05-21T00:00:00+05:00',
    data_version: '2026Q1 fallback',
    status_label: 'Fallback baseline',
    note:
      'Using fixed QPM initial conditions because the Overview artifact was unavailable or invalid.',
    metrics: [],
  },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function metricById(artifact: OverviewArtifact, id: OverviewMetricId): OverviewArtifactMetric | null {
  return artifact.metrics.find((metric) => metric.id === id) ?? null
}

function usableMetric(artifact: OverviewArtifact, id: OverviewMetricId): OverviewArtifactMetric | null {
  const metric = metricById(artifact, id)
  if (
    !metric ||
    metric.validation_status !== 'valid' ||
    metric.freshness.status !== 'current' ||
    !Number.isFinite(metric.value)
  ) {
    return null
  }
  return metric
}

function metricSource(metric: OverviewArtifactMetric): QpmBaselineMetricSource {
  return {
    metric_id: metric.id,
    label: metric.label,
    value: metric.value,
    unit: metric.unit,
    source_label: metric.source_label,
    source_period: metric.source_period,
  }
}

function parseQuarter(sourcePeriod: string | undefined): { year: number; quarter: number } | null {
  if (!sourcePeriod) return null
  const match = sourcePeriod.match(/\b(20\d{2})\s*Q([1-4])\b/i)
  if (!match) return null
  return {
    year: Number(match[1]),
    quarter: Number(match[2]),
  }
}

function nextQuarter(quarter: { year: number; quarter: number }): { year: number; quarter: number } {
  if (quarter.quarter < 4) {
    return { year: quarter.year, quarter: quarter.quarter + 1 }
  }
  return { year: quarter.year + 1, quarter: 1 }
}

function quarterFromTimestamp(value: string): { year: number; quarter: number } | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return {
    year: date.getUTCFullYear(),
    quarter: Math.floor(date.getUTCMonth() / 3) + 1,
  }
}

function laterQuarter(
  first: { year: number; quarter: number },
  second: { year: number; quarter: number },
): { year: number; quarter: number } {
  const firstIndex = first.year * 4 + first.quarter
  const secondIndex = second.year * 4 + second.quarter
  return firstIndex >= secondIndex ? first : second
}

function toDateLabel(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10)
}

function buildOverviewBaseline(artifact: OverviewArtifact): QpmBaselineLevels | null {
  const inflation = usableMetric(artifact, 'cpi_yoy')
  const policyRate = usableMetric(artifact, 'policy_rate')
  const exchangeRateLevel = usableMetric(artifact, 'usd_uzs_level')
  const exchangeRateMove =
    usableMetric(artifact, 'usd_uzs_yoy_change') ?? usableMetric(artifact, 'usd_uzs_mom_change')
  const exports = usableMetric(artifact, 'exports_yoy')
  const nowcast = usableMetric(artifact, 'gdp_nowcast_current_quarter')
  const latestQuarterGrowth = usableMetric(artifact, 'real_gdp_growth_quarter_yoy')
  const growthState = nowcast ?? latestQuarterGrowth

  if (!inflation || !policyRate || !exchangeRateLevel || !exchangeRateMove || !exports || !growthState) {
    return null
  }

  const quarter = parseQuarter(nowcast?.source_period) ??
    parseQuarter(latestQuarterGrowth?.source_period) ?? {
      year: QPM_FALLBACK_BASELINE.startYear,
      quarter: QPM_FALLBACK_BASELINE.startQuarter,
    }
  const nextObservedQuarter = nextQuarter(quarter)
  const artifactQuarter = quarterFromTimestamp(artifact.exported_at)
  const firstProjectionQuarter = artifactQuarter ? laterQuarter(nextObservedQuarter, artifactQuarter) : nextObservedQuarter
  const metrics = [
    inflation,
    policyRate,
    growthState,
    exchangeRateLevel,
    exchangeRateMove,
    exports,
  ].map(metricSource)

  return {
    inflation: inflation.value,
    policyRate: policyRate.value,
    outputGap: clamp(growthState.value - POTENTIAL_GROWTH, -5, 5),
    nerDepreciation: exchangeRateMove.value,
    exchangeRateBase: exchangeRateLevel.value,
    externalDemandGap: exports.validation_status === 'valid' ? clamp(exports.value / 20, -2, 2) : 0,
    startYear: firstProjectionQuarter.year,
    startQuarter: firstProjectionQuarter.quarter,
    metadata: {
      source: 'overview-artifact',
      source_artifact: OVERVIEW_ARTIFACT_PATH,
      exported_at: artifact.exported_at,
      data_version: `Overview ${toDateLabel(artifact.exported_at)}`,
      status_label: 'Overview artifact baseline',
      note:
        'Scenario Lab anchors the visible QPM baseline path to current, valid Overview values where mapped, then applies QPM shock deviations around that path. Metrics that fail validity or freshness gates remain contextual and cannot seed the baseline.',
      metrics,
    },
  }
}

export function resolveQpmBaselineLevels(): QpmBaselineLevels {
  const validation = validateOverviewArtifact(overviewArtifactJson)
  if (!validation.ok) {
    return QPM_FALLBACK_BASELINE
  }
  return buildOverviewBaseline(validation.value) ?? QPM_FALLBACK_BASELINE
}
