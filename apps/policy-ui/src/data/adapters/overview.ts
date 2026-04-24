import type {
  ChartSpec,
  Confidence,
  Direction,
  MacroSnapshot,
  ModelAttribution,
  NarrativeSegment,
} from '../../contracts/data-contract'

type RawModelAttribution = {
  id?: string
  name?: string
  module?: string
  version?: string
  runId?: string
  dataVersion?: string
  timestamp?: string
}

type RawOverviewMetric = {
  id?: string
  name?: string
  current?: number
  unit?: string
  period?: string
  previous?: number | null
  confidence?: string | null
  lastUpdated?: string
  attribution?: RawModelAttribution[]
}

type RawNowcastPoint = {
  period?: string
  latest?: number
  prior?: number
}

type RawOverviewRisk = {
  id?: string
  title?: string
  why?: string
  channel?: string
  suggestedScenario?: string
  scenarioQuery?: string
}

type RawOverviewAction = {
  id?: string
  title?: string
  summary?: string
  scenarioQuery?: string
}

type RawOverviewOutputAction = {
  id?: string
  title?: string
  summary?: string
  targetHref?: string
}

type RawOverviewCaveat = {
  id?: string
  severity?: string
  message?: string
  affectedMetrics?: string[]
  affectedModels?: string[]
}

type RawPolicyAction = {
  id?: string
  title?: string
  institution?: string
  actionType?: string
  occurredAt?: string
  url?: string
}

type RawDataRefresh = {
  id?: string
  dataSource?: string
  modelId?: string
  refreshedAt?: string
  summary?: string
}

type RawSavedScenarioActivity = {
  id?: string
  scenarioName?: string
  scenarioId?: string
  author?: string
  savedAt?: string
}

type RawOverviewActivityFeed = {
  policyActions?: RawPolicyAction[]
  dataRefreshes?: RawDataRefresh[]
  savedScenarios?: RawSavedScenarioActivity[]
}

export type RawOverviewPayload = {
  id?: string
  name?: string
  generatedAt?: string
  // Shot-1 widening: live payloads MAY return structured narrative segments.
  // The guard validates segment shape and the adapter preserves the union.
  summary?: string | NarrativeSegment[]
  models?: string[]
  headline?: RawOverviewMetric[]
  nowcast?: {
    id?: string
    title?: string
    subtitle?: string
    yLabel?: string
    yUnit?: string
    points?: RawNowcastPoint[]
    takeaway?: string
    attribution?: RawModelAttribution[]
  }
  risks?: RawOverviewRisk[]
  actions?: RawOverviewAction[]
  output?: RawOverviewOutputAction
  caveats?: RawOverviewCaveat[]
  references?: string[]
  activityFeed?: RawOverviewActivityFeed
}

function toIsoOrFallback(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function toConfidence(value: string | null | undefined): Confidence | null {
  if (!value) {
    return null
  }
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value
  }
  return null
}

function toDirection(deltaAbs: number | null): Direction {
  if (deltaAbs === null) {
    return 'flat'
  }
  if (deltaAbs > 0) {
    return 'up'
  }
  if (deltaAbs < 0) {
    return 'down'
  }
  return 'flat'
}

function toModelAttribution(input: RawModelAttribution[], fallbackTimestamp: string): ModelAttribution[] {
  return input.map((item, index) => ({
    model_id: item.id ?? `model-${index + 1}`,
    model_name: item.name ?? 'Unknown model',
    module: item.module ?? 'unknown',
    version: item.version ?? 'unknown',
    run_id: item.runId ?? 'unknown-run',
    data_version: item.dataVersion ?? 'unknown-data-version',
    timestamp: toIsoOrFallback(item.timestamp, fallbackTimestamp),
  }))
}

function toNowcastChart(
  nowcast: RawOverviewPayload['nowcast'],
  fallbackTimestamp: string,
): ChartSpec {
  const points = nowcast?.points ?? []
  const xValues = points.map((point, index) => point.period ?? `Period ${index + 1}`)
  const latestValues = points.map((point) => point.latest ?? 0)
  const priorValues = points.map((point) => point.prior ?? 0)

  return {
    chart_id: nowcast?.id ?? 'nowcast_forecast',
    title: nowcast?.title ?? 'Nowcast update',
    subtitle: nowcast?.subtitle ?? 'Latest estimate versus prior estimate',
    chart_type: 'line',
    x: {
      label: 'Period',
      unit: '',
      values: xValues,
    },
    y: {
      label: nowcast?.yLabel ?? 'Value',
      unit: nowcast?.yUnit ?? '%',
      values: latestValues,
    },
    series: [
      {
        series_id: 'latest_estimate',
        label: 'Latest estimate',
        semantic_role: 'baseline',
        values: latestValues,
      },
      {
        series_id: 'prior_estimate',
        label: 'Prior estimate',
        semantic_role: 'alternative',
        values: priorValues,
      },
    ],
    view_mode: 'level',
    uncertainty: [],
    takeaway: nowcast?.takeaway ?? 'No nowcast takeaway is currently available.',
    model_attribution: toModelAttribution(nowcast?.attribution ?? [], fallbackTimestamp),
  }
}

export function toMacroSnapshot(raw: RawOverviewPayload): MacroSnapshot {
  const fallbackGeneratedAt = new Date().toISOString()
  const generatedAt = toIsoOrFallback(raw.generatedAt, fallbackGeneratedAt)

  const headlineMetrics = (raw.headline ?? []).map((metric, index) => {
    const value = metric.current ?? 0
    const baselineValue = metric.previous ?? null
    const deltaAbs = baselineValue === null ? null : value - baselineValue
    const deltaPct =
      deltaAbs === null || baselineValue === null || baselineValue === 0
        ? null
        : (deltaAbs / baselineValue) * 100

    return {
      metric_id: metric.id ?? `metric-${index + 1}`,
      label: metric.name ?? `Metric ${index + 1}`,
      value,
      unit: metric.unit ?? '',
      period: metric.period ?? 'n/a',
      baseline_value: baselineValue,
      delta_abs: deltaAbs,
      delta_pct: deltaPct,
      direction: toDirection(deltaAbs),
      confidence: toConfidence(metric.confidence),
      last_updated: toIsoOrFallback(metric.lastUpdated, generatedAt),
      model_attribution: toModelAttribution(metric.attribution ?? [], generatedAt),
    }
  })

  return {
    snapshot_id: raw.id ?? 'overview-snapshot',
    snapshot_name: raw.name ?? 'Overview Snapshot',
    generated_at: generatedAt,
    // Shot-1 widening: string passes through unchanged; NarrativeSegment[]
    // (validated by the guard) is preserved so the state header can <em>-wrap
    // emphasized segments without re-parsing prose at render time.
    summary: raw.summary ?? 'No summary is available for this snapshot.',
    model_ids: raw.models ?? [],
    headline_metrics: headlineMetrics,
    nowcast_forecast: toNowcastChart(raw.nowcast, generatedAt),
    top_risks: (raw.risks ?? []).map((risk, index) => ({
      risk_id: risk.id ?? `risk-${index + 1}`,
      title: risk.title ?? `Risk ${index + 1}`,
      why_it_matters: risk.why ?? 'No rationale provided.',
      impact_channel: risk.channel ?? 'Not specified',
      suggested_scenario: risk.suggestedScenario ?? 'Not specified',
      scenario_query: risk.scenarioQuery,
    })),
    analysis_actions: (raw.actions ?? []).map((action, index) => ({
      action_id: action.id ?? `action-${index + 1}`,
      title: action.title ?? `Action ${index + 1}`,
      summary: action.summary ?? 'No action summary provided.',
      scenario_query: action.scenarioQuery ?? '',
    })),
    output_action: {
      action_id: raw.output?.id ?? 'output-action',
      title: raw.output?.title ?? 'Open output',
      summary: raw.output?.summary ?? 'No output action summary provided.',
      target_href: raw.output?.targetHref ?? '/scenario-lab',
    },
    caveats: (raw.caveats ?? []).map((caveat, index) => ({
      caveat_id: caveat.id ?? `caveat-${index + 1}`,
      severity:
        caveat.severity === 'info' || caveat.severity === 'warning' || caveat.severity === 'critical'
          ? caveat.severity
          : 'warning',
      message: caveat.message ?? 'No caveat details provided.',
      affected_metrics: caveat.affectedMetrics ?? [],
      affected_models: caveat.affectedModels ?? [],
    })),
    references: raw.references ?? [],
    // activity_feed is required per the contract; the guard returns
    // an error-severity issue when raw.activityFeed is missing. This
    // adapter still defensively returns empty streams so consumer UI
    // does not crash on malformed input — but the error in guard
    // issues is the operative signal.
    activity_feed: {
      policy_actions: (raw.activityFeed?.policyActions ?? []).map((action, index) => ({
        action_id: action.id ?? `policy-action-${index + 1}`,
        title: action.title ?? 'Untitled policy action',
        institution: action.institution ?? 'Unknown institution',
        action_type:
          action.actionType === 'rate_decision' ||
          action.actionType === 'regulation' ||
          action.actionType === 'announcement' ||
          action.actionType === 'other'
            ? action.actionType
            : 'other',
        occurred_at: toIsoOrFallback(action.occurredAt, generatedAt),
        url: action.url,
      })),
      data_refreshes: (raw.activityFeed?.dataRefreshes ?? []).map((refresh, index) => ({
        refresh_id: refresh.id ?? `refresh-${index + 1}`,
        data_source: refresh.dataSource ?? 'Unknown data source',
        model_id: refresh.modelId ?? 'unknown',
        refreshed_at: toIsoOrFallback(refresh.refreshedAt, generatedAt),
        summary: refresh.summary,
      })),
      saved_scenarios: (raw.activityFeed?.savedScenarios ?? []).map((activity, index) => ({
        activity_id: activity.id ?? `saved-scenario-${index + 1}`,
        scenario_name: activity.scenarioName ?? 'Untitled scenario',
        scenario_id: activity.scenarioId ?? 'unknown-scenario',
        author: activity.author ?? 'Unknown author',
        saved_at: toIsoOrFallback(activity.savedAt, generatedAt),
      })),
    },
  }
}
