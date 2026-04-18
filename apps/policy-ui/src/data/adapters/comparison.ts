import type {
  ComparisonMetricDefinition,
  ComparisonScenario,
  ComparisonScenarioTag,
  ComparisonWorkspace,
  ScenarioType,
} from '../../contracts/data-contract'

export type RawComparisonHeadlineMetric = {
  metricId?: string
  label?: string
  unit?: string
  value?: number
}

export type RawComparisonSeries = {
  seriesId?: string
  metricId?: string
  label?: string
  values?: number[]
}

export type RawComparisonScenarioOutput = {
  headlineMetrics?: RawComparisonHeadlineMetric[]
  chartsByTab?: {
    headline_impact?: {
      x?: {
        values?: Array<string | number>
      }
      y?: {
        values?: number[]
      }
      series?: RawComparisonSeries[]
    }
  }
}

export type RawComparisonScenario = {
  scenarioId?: string
  scenarioName?: string
  scenarioType?: string
  summary?: string
  initialTag?: string
  values?: Record<string, number>
  riskIndex?: number
  normalizedOutput?: RawComparisonScenarioOutput
}

export type RawComparisonPayload = {
  workspaceId?: string
  generatedAt?: string
  metricDefinitions?: Array<{
    metricId?: string
    label?: string
    unit?: string
  }>
  scenarios?: RawComparisonScenario[]
  defaultBaselineId?: string
  defaultSelectedIds?: string[]
}

function toIsoOrFallback(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function toScenarioType(value: string | undefined): ScenarioType {
  if (value === 'baseline' || value === 'alternative' || value === 'stress') {
    return value
  }
  return 'alternative'
}

function toScenarioTag(value: string | undefined, scenarioType: ScenarioType): ComparisonScenarioTag {
  if (value === 'preferred' || value === 'balanced' || value === 'aggressive' || value === 'downside_stress') {
    return value
  }
  return scenarioType === 'stress' ? 'downside_stress' : 'balanced'
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function toMetricIdFromLabel(label: string | undefined): string | null {
  if (!label) {
    return null
  }
  const normalized = label.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  return normalized
    .replace(/\(%\)/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function hasUsableSeriesValues(series: RawComparisonSeries, expectedLength: number | null): boolean {
  if (!Array.isArray(series.values) || series.values.length === 0) {
    return false
  }
  if (!series.values.every((value) => isFiniteNumber(value))) {
    return false
  }
  if (expectedLength !== null && series.values.length !== expectedLength) {
    return false
  }
  return true
}

function toValuesFromOutput(output: RawComparisonScenarioOutput | undefined): Record<string, number> {
  if (!output) {
    return {}
  }

  const values: Record<string, number> = {}

  for (const metric of output.headlineMetrics ?? []) {
    if (!metric?.metricId || !isFiniteNumber(metric.value)) {
      continue
    }
    values[metric.metricId] = metric.value
  }

  const chart = output.chartsByTab?.headline_impact
  const expectedLength = Array.isArray(chart?.x?.values) && chart.x.values.length > 0 ? chart.x.values.length : null

  for (const series of chart?.series ?? []) {
    // MVP rule: series values are canonical; y.values is ignored here.
    if (!hasUsableSeriesValues(series, expectedLength)) {
      continue
    }

    const metricId = series.metricId ?? toMetricIdFromLabel(series.label)
    if (!metricId) {
      continue
    }

    const terminalValue = series.values?.[series.values.length - 1]
    if (!isFiniteNumber(terminalValue)) {
      continue
    }

    if (values[metricId] === undefined) {
      values[metricId] = terminalValue
    }
  }

  return values
}

function toMetricDefinitions(
  rawDefinitions: RawComparisonPayload['metricDefinitions'],
  scenarios: ComparisonScenario[],
): ComparisonMetricDefinition[] {
  const fromPayload = (rawDefinitions ?? [])
    .filter((metric): metric is NonNullable<typeof metric> => Boolean(metric))
    .map((metric, index) => ({
      metric_id: metric.metricId ?? `metric_${index + 1}`,
      label: metric.label ?? metric.metricId ?? `Metric ${index + 1}`,
      unit: metric.unit ?? '',
    }))

  if (fromPayload.length > 0) {
    return fromPayload
  }

  const discoveredMetricIds = new Set<string>()
  for (const scenario of scenarios) {
    for (const metricId of Object.keys(scenario.values)) {
      discoveredMetricIds.add(metricId)
    }
  }

  return Array.from(discoveredMetricIds).map((metricId) => ({
    metric_id: metricId,
    label: metricId.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    unit: '',
  }))
}

function ensureBaselineId(scenarios: ComparisonScenario[], candidate: string | undefined): string {
  if (candidate && scenarios.some((scenario) => scenario.scenario_id === candidate)) {
    return candidate
  }

  const baselineScenario = scenarios.find((scenario) => scenario.scenario_type === 'baseline')
  return baselineScenario?.scenario_id ?? scenarios[0]?.scenario_id ?? ''
}

function toDefaultSelectedIds(
  scenarios: ComparisonScenario[],
  baselineId: string,
  candidateIds: string[] | undefined,
): string[] {
  const validCandidateIds = (candidateIds ?? []).filter((id) =>
    scenarios.some((scenario) => scenario.scenario_id === id),
  )

  const withBaseline = validCandidateIds.includes(baselineId)
    ? validCandidateIds
    : [baselineId, ...validCandidateIds]

  const unique = Array.from(new Set(withBaseline)).filter(Boolean)
  if (unique.length >= 2) {
    return unique.slice(0, 4)
  }

  const fallback = scenarios
    .map((scenario) => scenario.scenario_id)
    .filter((id) => id !== baselineId)
    .slice(0, 3)

  return Array.from(new Set([baselineId, ...fallback])).filter(Boolean).slice(0, 4)
}

export function toComparisonWorkspace(raw: RawComparisonPayload): ComparisonWorkspace | null {
  const fallbackGeneratedAt = new Date().toISOString()
  const generatedAt = toIsoOrFallback(raw.generatedAt, fallbackGeneratedAt)

  const scenarios = (raw.scenarios ?? [])
    .map((scenario, index): ComparisonScenario | null => {
      const scenarioType = toScenarioType(scenario.scenarioType)

      const mergedValues: Record<string, number> = {
        ...(scenario.values ?? {}),
        ...toValuesFromOutput(scenario.normalizedOutput),
      }

      const finiteValues = Object.entries(mergedValues).filter(([, value]) => isFiniteNumber(value))
      if (finiteValues.length === 0) {
        // MVP rule: if live series are labeled but contain no usable numerics, drop this scenario.
        return null
      }

      return {
        scenario_id: scenario.scenarioId ?? `scenario-${index + 1}`,
        scenario_name: scenario.scenarioName ?? `Scenario ${index + 1}`,
        scenario_type: scenarioType,
        summary: scenario.summary ?? 'No summary provided.',
        initial_tag: toScenarioTag(scenario.initialTag, scenarioType),
        values: Object.fromEntries(finiteValues),
        risk_index: isFiniteNumber(scenario.riskIndex) ? scenario.riskIndex : 50,
      }
    })
    .filter((scenario): scenario is ComparisonScenario => scenario !== null)

  if (scenarios.length < 2) {
    // MVP rule: never silently substitute mock for an undersized live payload.
    // Caller (source layer) surfaces this as an honest error rather than a fake "ready" state.
    return null
  }

  const metricDefinitions = toMetricDefinitions(raw.metricDefinitions, scenarios)
  const baselineId = ensureBaselineId(scenarios, raw.defaultBaselineId)
  const defaultSelectedIds = toDefaultSelectedIds(scenarios, baselineId, raw.defaultSelectedIds)

  return {
    workspace_id: raw.workspaceId ?? `comparison-live-${generatedAt}`,
    generated_at: generatedAt,
    metric_definitions: metricDefinitions,
    scenarios,
    default_baseline_id: baselineId,
    default_selected_ids: defaultSelectedIds,
  }
}
