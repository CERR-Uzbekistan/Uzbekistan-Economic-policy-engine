import type {
  Caveat,
  Confidence,
  Direction,
  HeadlineMetric,
  MacroSnapshot,
  ModelAttribution,
} from '../../contracts/data-contract.js'
import { overviewV1Data } from '../mock/overview.js'
import type { OverviewArtifact, OverviewArtifactMetric } from './artifact-types.js'
import {
  OVERVIEW_LOCKED_METRIC_BY_ID,
  OVERVIEW_TOP_CARD_METRIC_IDS,
  type OverviewMetricId,
} from './artifact-types.js'

function toDirection(deltaAbs: number | null): Direction {
  if (deltaAbs === null) return 'flat'
  if (deltaAbs > 0) return 'up'
  if (deltaAbs < 0) return 'down'
  return 'flat'
}

function toConfidence(status: OverviewArtifactMetric['validation_status']): Confidence {
  return status === 'warning' ? 'medium' : 'high'
}

function toDisplayUnit(metric: OverviewArtifactMetric): string {
  if (metric.id === 'usd_uzs_level') return 'UZS/USD'
  if (metric.unit.startsWith('percent')) return '%'
  if (metric.unit === 'UZS per USD') return 'UZS/USD'
  return metric.unit
}

function toModelAttribution(metric: OverviewArtifactMetric, artifact: OverviewArtifact): ModelAttribution[] {
  return [
    {
      model_id: metric.id,
      model_name: metric.source_label,
      module: 'overview_artifact',
      version: artifact.schema_version,
      run_id: 'overview-artifact',
      data_version: metric.source_period,
      timestamp: metric.exported_at,
    },
  ]
}

function toHeadlineMetric(metric: OverviewArtifactMetric, artifact: OverviewArtifact): HeadlineMetric {
  const deltaAbs = metric.previous_value === null ? null : metric.value - metric.previous_value
  const deltaPct =
    deltaAbs === null || metric.previous_value === null || metric.previous_value === 0
      ? null
      : (deltaAbs / metric.previous_value) * 100
  const definition = OVERVIEW_LOCKED_METRIC_BY_ID.get(metric.id)

  return {
    metric_id: metric.id,
    label: metric.label,
    value: metric.value,
    unit: toDisplayUnit(metric),
    period: metric.source_period,
    baseline_value: metric.previous_value,
    delta_abs: deltaAbs,
    delta_pct: deltaPct,
    direction: toDirection(deltaAbs),
    confidence: toConfidence(metric.validation_status),
    last_updated: metric.exported_at,
    model_attribution: toModelAttribution(metric, artifact),
    context_note: `${metric.claim_type} · ${metric.source_label}`,
    delta_label: deltaAbs === null ? undefined : undefined,
    source_label: metric.source_label,
    source_period: metric.source_period,
    claim_type: metric.claim_type,
    validation_status: metric.validation_status,
    warnings: metric.warnings,
    caveats: metric.caveats,
    citation_label: definition?.citation_label,
  }
}

function selectTopCardMetrics(metrics: OverviewArtifactMetric[]): OverviewArtifactMetric[] {
  const byId = new Map(metrics.map((metric) => [metric.id, metric]))
  const explicit = metrics.filter((metric) => metric.top_card === true)
  const selected = explicit.length > 0
    ? explicit
    : OVERVIEW_TOP_CARD_METRIC_IDS.map((id) => byId.get(id)).filter(
        (metric): metric is OverviewArtifactMetric => metric !== undefined,
      )

  const defaultOrder = new Map<OverviewMetricId, number>(
    OVERVIEW_TOP_CARD_METRIC_IDS.map((id, index) => [id, index]),
  )

  return [...selected]
    .sort((left, right) => {
      const leftOrder = left.top_card_order ?? defaultOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER
      const rightOrder = right.top_card_order ?? defaultOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER
      return leftOrder - rightOrder
    })
    .slice(0, 8)
}

function toMetricCaveats(metric: OverviewArtifactMetric): Caveat[] {
  const warningCaveats: Caveat[] = metric.warnings.map((message, index) => ({
    caveat_id: `${metric.id}-warning-${index + 1}`,
    severity: 'warning',
    message,
    affected_metrics: [metric.id],
    affected_models: ['overview_artifact'],
  }))
  const caveats: Caveat[] = metric.caveats.map((message, index) => ({
    caveat_id: `${metric.id}-caveat-${index + 1}`,
    severity: 'info',
    message,
    affected_metrics: [metric.id],
    affected_models: ['overview_artifact'],
  }))
  return [...warningCaveats, ...caveats]
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

export function overviewArtifactToMacroSnapshot(artifact: OverviewArtifact): MacroSnapshot {
  const topCards = selectTopCardMetrics(artifact.metrics).map((metric) => toHeadlineMetric(metric, artifact))
  const artifactWarnings: Caveat[] = artifact.warnings.map((message, index) => ({
    caveat_id: `overview-artifact-warning-${index + 1}`,
    severity: 'warning',
    message,
    affected_metrics: [],
    affected_models: ['overview_artifact'],
  }))
  const artifactCaveats: Caveat[] = artifact.caveats.map((message, index) => ({
    caveat_id: `overview-artifact-caveat-${index + 1}`,
    severity: 'info',
    message,
    affected_metrics: [],
    affected_models: ['overview_artifact'],
  }))
  const metricCaveats = artifact.metrics.flatMap(toMetricCaveats)
  const references = unique(
    artifact.metrics.map((metric) => {
      const definition = OVERVIEW_LOCKED_METRIC_BY_ID.get(metric.id)
      return `${definition?.citation_label ?? metric.source_label} · ${metric.source_period}`
    }),
  )

  return {
    ...overviewV1Data,
    snapshot_id: 'overview-artifact',
    snapshot_name: 'Operational overview artifact',
    generated_at: artifact.exported_at,
    model_ids: unique(['overview_artifact', ...overviewV1Data.model_ids]),
    headline_metrics: topCards,
    caveats: [...artifactWarnings, ...artifactCaveats, ...metricCaveats],
    references,
  }
}
