import type {
  Caveat,
  Confidence,
  Direction,
  HeadlineMetric,
  MacroSnapshot,
  ModelAttribution,
  OverviewIndicatorGroup,
} from '../../contracts/data-contract.js'
import {
  getClaimLabelKey,
  getMetricSemantics,
  type OverviewComparisonPeriodStrategy,
} from '../../components/overview/metric-semantics.js'
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
  const semantics = getMetricSemantics(metric.id)
  if (semantics) return semantics.display_unit
  if (metric.id === 'usd_uzs_level') return 'UZS/USD'
  if (metric.unit === 'USD per troy ounce') return 'USD/oz'
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

const MONTH_INDEX_BY_NAME: Readonly<Record<string, number>> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

function deriveComparisonPeriod(
  sourcePeriod: string,
  strategy: OverviewComparisonPeriodStrategy,
  previousValue: number | null,
): string | null {
  if (previousValue === null) return null

  if (strategy === 'previous_month') {
    const match = /^([A-Za-z]+)\s+(\d{4})$/.exec(sourcePeriod.trim())
    if (!match) return null
    const monthIndex = MONTH_INDEX_BY_NAME[match[1].toLowerCase()]
    if (monthIndex === undefined) return null
    const year = Number(match[2])
    const previousMonth = monthIndex === 0 ? 11 : monthIndex - 1
    const previousYear = monthIndex === 0 ? year - 1 : year
    return `${MONTH_LABELS[previousMonth]} ${previousYear}`
  }

  if (strategy === 'previous_year') {
    const match = /^(\d{4})$/.exec(sourcePeriod.trim())
    return match ? String(Number(match[1]) - 1) : null
  }

  if (strategy === 'same_quarter_previous_year') {
    const normalized = sourcePeriod.trim()
    const yearFirst = /^(\d{4})\s+Q([1-4])$/i.exec(normalized)
    if (yearFirst) return `${Number(yearFirst[1]) - 1} Q${yearFirst[2]}`
    const quarterFirst = /^Q([1-4])\s+(\d{4})$/i.exec(normalized)
    if (quarterFirst) return `Q${quarterFirst[1]} ${Number(quarterFirst[2]) - 1}`
  }

  return null
}

function toHeadlineMetric(metric: OverviewArtifactMetric, artifact: OverviewArtifact): HeadlineMetric {
  const deltaAbs = metric.previous_value === null ? null : metric.value - metric.previous_value
  const semantics = getMetricSemantics(metric.id)
  const deltaBasis = semantics?.delta_display_mode ?? 'absolute'
  const deltaValue =
    deltaAbs === null
      ? null
      : deltaBasis === 'percent_change'
        ? metric.previous_value === null || metric.previous_value === 0
          ? null
          : (deltaAbs / metric.previous_value) * 100
        : deltaBasis === 'none'
          ? null
          : deltaAbs
  // `delta_pct` is retained only for true percent-change semantics. Rate metrics
  // use percentage-point `delta_value`, so downstream UI cannot mistake pp deltas
  // for relative percentage changes.
  const deltaPct = deltaBasis === 'percent_change' ? deltaValue : null
  const definition = OVERVIEW_LOCKED_METRIC_BY_ID.get(metric.id)
  const comparisonPeriod = deriveComparisonPeriod(
    metric.source_period,
    semantics?.comparison_period_strategy ?? 'none',
    metric.previous_value,
  )

  return {
    metric_id: metric.id,
    label: metric.label,
    value: metric.value,
    unit: toDisplayUnit(metric),
    period: metric.source_period,
    baseline_value: metric.previous_value,
    delta_abs: deltaAbs,
    delta_value: deltaValue,
    delta_unit: semantics?.delta_unit ?? toDisplayUnit(metric),
    delta_basis: deltaBasis,
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
    claim_label_key: semantics?.claim_label_key ?? getClaimLabelKey(metric.claim_type) ?? undefined,
    comparison_basis_key: semantics?.comparison_basis_key,
    comparison_period: comparisonPeriod,
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

const PANEL_GROUP_ORDER = ['growth', 'inflation', 'trade', 'monetary_fx', 'gold'] as const

const SUMMARY_METRIC_IDS: OverviewMetricId[] = [
  'real_gdp_growth_quarter_yoy',
  'cpi_yoy',
  'cpi_mom',
  'trade_balance',
  'usd_uzs_level',
  'exports_yoy',
  'imports_yoy',
  'policy_rate',
  'gold_price_level',
]

const GROUP_TITLE_BY_ID: Record<string, string> = {
  growth: 'Growth',
  inflation: 'Inflation',
  trade: 'Trade',
  monetary_fx: 'Monetary / FX',
  gold: 'Gold',
}

function toOverviewIndicatorGroups(artifact: OverviewArtifact): OverviewIndicatorGroup[] {
  const metricsById = new Map(artifact.metrics.map((metric) => [metric.id, metric]))
  const groupedIds = new Set<string>()
  const groups: OverviewIndicatorGroup[] = []
  const groupsById = new Map<string, OverviewIndicatorGroup>()

  for (const artifactGroup of artifact.panel_groups) {
    const metrics = artifactGroup.metric_ids
      .map((id) => metricsById.get(id))
      .filter((metric): metric is OverviewArtifactMetric => metric !== undefined)
      .map((metric) => {
        groupedIds.add(metric.id)
        return toHeadlineMetric(metric, artifact)
      })

    const group: OverviewIndicatorGroup = {
      group_id: artifactGroup.id,
      title: artifactGroup.title || GROUP_TITLE_BY_ID[artifactGroup.id] || artifactGroup.id,
      metrics,
    }
    groups.push(group)
    groupsById.set(group.group_id, group)
  }

  for (const metric of artifact.metrics) {
    if (groupedIds.has(metric.id)) continue
    const fallbackGroupId = metric.block
    let group = groupsById.get(fallbackGroupId)
    if (!group) {
      group = {
        group_id: fallbackGroupId,
        title: GROUP_TITLE_BY_ID[fallbackGroupId] || fallbackGroupId,
        metrics: [],
      }
      groups.push(group)
      groupsById.set(fallbackGroupId, group)
    }
    group.metrics.push(toHeadlineMetric(metric, artifact))
    groupedIds.add(metric.id)
  }

  return groups
    .filter((group) => group.metrics.length > 0)
    .sort((left, right) => {
      const leftOrder = PANEL_GROUP_ORDER.indexOf(left.group_id as (typeof PANEL_GROUP_ORDER)[number])
      const rightOrder = PANEL_GROUP_ORDER.indexOf(right.group_id as (typeof PANEL_GROUP_ORDER)[number])
      const normalizedLeft = leftOrder < 0 ? Number.MAX_SAFE_INTEGER : leftOrder
      const normalizedRight = rightOrder < 0 ? Number.MAX_SAFE_INTEGER : rightOrder
      return normalizedLeft - normalizedRight
    })
}

function toArtifactSummaryMetrics(artifact: OverviewArtifact): HeadlineMetric[] {
  const metricsById = new Map(artifact.metrics.map((metric) => [metric.id, metric]))
  return SUMMARY_METRIC_IDS.map((id) => metricsById.get(id))
    .filter(
      (metric): metric is OverviewArtifactMetric =>
        metric !== undefined && metric.validation_status !== 'failed',
    )
    .map((metric) => toHeadlineMetric(metric, artifact))
}

export function overviewArtifactToMacroSnapshot(artifact: OverviewArtifact): MacroSnapshot {
  const topCards = selectTopCardMetrics(artifact.metrics).map((metric) => toHeadlineMetric(metric, artifact))
  const indicatorGroups = toOverviewIndicatorGroups(artifact)
  const artifactSummaryMetrics = toArtifactSummaryMetrics(artifact)
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
    indicator_groups: indicatorGroups,
    artifact_summary_metrics: artifactSummaryMetrics,
    caveats: [...artifactWarnings, ...artifactCaveats, ...metricCaveats],
    references,
  }
}
