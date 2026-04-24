import type {
  ComparisonContent,
  ComparisonMetricDefinition,
  ComparisonMetricRow,
  ComparisonScenario,
  ComparisonScenarioMeta,
  ComparisonScenarioTag,
  ComparisonWorkspace,
  ScenarioRole,
  ScenarioType,
  TradeoffSummary,
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

// ───────────────────────────────────────────────────────────────
// Shot-1 composition layer (prompt §4.3 + audit §3.4).
//
// composeComparisonContent derives the UI-facing ComparisonContent shape
// from an existing ComparisonWorkspace (which the QPM bridge and mock
// pipelines continue to feed). The QPM bridge and scenarioComparisonAdapter
// are untouched by this layer — it is pure presentation composition.
// ───────────────────────────────────────────────────────────────

const SCENARIO_ROLE_BY_TYPE: Record<ScenarioType, ScenarioRole> = {
  baseline: 'baseline',
  alternative: 'alternative',
  stress: 'downside',
}

const SCENARIO_ROLE_LABEL: Record<ScenarioRole, string> = {
  baseline: 'Baseline',
  alternative: 'Alternative',
  downside: 'Stress',
  upside: 'Upside',
}

const SHOT1_COMPARISON_METRICS: ComparisonMetricDefinition[] = [
  { metric_id: 'gdp_growth', label: 'GDP growth · 3y avg', unit: '%' },
  { metric_id: 'inflation', label: 'Inflation · terminal', unit: '%' },
  { metric_id: 'current_account', label: 'Current account · %GDP', unit: '% GDP' },
  { metric_id: 'fiscal_balance', label: 'Fiscal balance · %GDP', unit: '% GDP' },
  { metric_id: 'reserves_end', label: 'Reserves · end', unit: 'USD bn' },
  { metric_id: 'unemployment_avg', label: 'Unemployment · avg', unit: '%' },
  { metric_id: 'real_wages_cumulative', label: 'Real wages · cumulative', unit: '%' },
]

function toShot1MetricDefinitions(workspace: ComparisonWorkspace): ComparisonMetricDefinition[] {
  const liveDefinitionsById = new Map(
    workspace.metric_definitions.map((metric) => [metric.metric_id, metric]),
  )

  return SHOT1_COMPARISON_METRICS.map((metric) => {
    const liveDefinition = liveDefinitionsById.get(metric.metric_id)
    return {
      metric_id: metric.metric_id,
      label: metric.label,
      unit: liveDefinition?.unit || metric.unit,
    }
  })
}

function formatMetricValue(value: number, unit: string): string {
  if (!Number.isFinite(value)) {
    return '—'
  }
  const precision = unit === 'UZS/USD' ? 0 : 1
  const magnitude = Math.abs(value).toFixed(precision)
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  // Balance-style units carry their own sign ("% GDP"); other percent/currency
  // units render "+X" / "−X" in front of the magnitude.
  const unitSpace = unit === '%' || unit === '' ? '' : ' '
  return `${sign}${magnitude}${unitSpace}${unit}`.trim()
}

function formatMetricDelta(value: number, unit: string): string {
  if (!Number.isFinite(value)) {
    return '—'
  }
  const precision = unit === 'UZS/USD' ? 0 : 1
  const magnitude = Math.abs(value).toFixed(precision)
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  // Deltas on percent-family units render as "pp"; currency and ratio units
  // keep their own label.
  const deltaUnit = unit === '%' || unit === '% GDP' ? 'pp' : unit
  const deltaSpace = deltaUnit ? ' ' : ''
  return `${sign}${magnitude}${deltaSpace}${deltaUnit}`.trim()
}

function pickExtremeScenarioIds(
  selectedScenarios: ComparisonScenario[],
  metric: ComparisonMetricDefinition,
): { highest: string | undefined; lowest: string | undefined } {
  let highestScenarioId: string | undefined
  let lowestScenarioId: string | undefined
  let highestValue = Number.NEGATIVE_INFINITY
  let lowestValue = Number.POSITIVE_INFINITY

  for (const scenario of selectedScenarios) {
    const value = scenario.values[metric.metric_id]
    if (!isFiniteNumber(value)) continue
    if (value > highestValue) {
      highestValue = value
      highestScenarioId = scenario.scenario_id
    }
    if (value < lowestValue) {
      lowestValue = value
      lowestScenarioId = scenario.scenario_id
    }
  }

  // When every selected scenario carries the same numeric value, the highest
  // and lowest collapse to the same scenario — suppress the star in that case
  // since no scenario is numerically extreme.
  if (highestValue === lowestValue) {
    return { highest: undefined, lowest: undefined }
  }
  return { highest: highestScenarioId, lowest: lowestScenarioId }
}

function toScenarioMeta(scenario: ComparisonScenario): ComparisonScenarioMeta {
  const role = SCENARIO_ROLE_BY_TYPE[scenario.scenario_type]
  return {
    id: scenario.scenario_id,
    name: scenario.scenario_name,
    role,
    role_label: SCENARIO_ROLE_LABEL[role],
  }
}

function renderShellBProse(
  fiscalScenario: ComparisonScenarioMeta,
  stressScenario: ComparisonScenarioMeta,
): string {
  // Shell B prose template (prompt §4.3 "fiscal-vs-growth-tradeoff"). Uses the
  // actual matched scenario names so em-emphasis in TradeoffSummaryPanel wraps
  // the live names rather than the prototype's literal strings.
  return (
    `${fiscalScenario.name} dominates on external and price stability — lower inflation, ` +
    `narrower current account, stronger reserves — at the cost of growth and employment. ` +
    `The ${stressScenario.name} stress is adverse across every dimension, with the current ` +
    `account and reserves deteriorating most sharply; the fiscal path provides only partial ` +
    `insulation. If price stability is the binding objective, consolidation is preferred. If ` +
    `growth and employment dominate the objective, the baseline is preferred and consolidation ` +
    `is deferred. No scenario is robust to the ${stressScenario.name} shock — that is a case ` +
    `for building reserve buffers now, not scenario selection.`
  )
}

function chooseTradeoffSummary(metas: ComparisonScenarioMeta[]): TradeoffSummary {
  const fiscalCandidate =
    metas.find(
      (meta) =>
        meta.role === 'alternative' && /consolid|fiscal/i.test(meta.name),
    ) ?? null
  const stressCandidate = metas.find((meta) => meta.role === 'downside') ?? null

  // Shell B fires on fiscal-consolidation alternative + stress scenario. Shell
  // A / C remain Shot 2 — unmatched configurations render the sentinel chip.
  if (fiscalCandidate && stressCandidate) {
    return {
      mode: 'shell',
      shell_id: 'fiscal-vs-growth-tradeoff',
      rendered_text: renderShellBProse(fiscalCandidate, stressCandidate),
    }
  }
  return { mode: 'empty' }
}

/**
 * Compose a {@link ComparisonContent} view from an existing
 * {@link ComparisonWorkspace} plus the page-level selection state.
 *
 * Purpose: the Shot-1 Comparison UI reads `ComparisonContent`, while the QPM
 * bridge and scenarioComparisonAdapter continue to feed `ComparisonWorkspace`.
 * This composer is the single boundary between the two shapes — it must never
 * mutate the workspace or bypass the adapter/source pipeline.
 */
export function composeComparisonContent(
  workspace: ComparisonWorkspace,
  selectedIds: string[],
  baselineId: string,
): ComparisonContent {
  const scenariosById = new Map(
    workspace.scenarios.map((scenario) => [scenario.scenario_id, scenario]),
  )
  const selectedScenarios = selectedIds
    .map((id) => scenariosById.get(id))
    .filter((scenario): scenario is ComparisonScenario => Boolean(scenario))

  const resolvedBaselineId = scenariosById.has(baselineId)
    ? baselineId
    : workspace.default_baseline_id
  const baselineScenario = scenariosById.get(resolvedBaselineId) ?? null

  const scenarios = selectedScenarios.map(toScenarioMeta)

  const metrics: ComparisonMetricRow[] = toShot1MetricDefinitions(workspace).map((metric) => {
    const values: Record<string, string> = {}
    const deltas: Record<string, string> = {}
    const baselineRaw = baselineScenario ? baselineScenario.values[metric.metric_id] : undefined

    for (const scenario of selectedScenarios) {
      const raw = scenario.values[metric.metric_id]
      values[scenario.scenario_id] = isFiniteNumber(raw) ? formatMetricValue(raw, metric.unit) : '—'

      if (scenario.scenario_id === resolvedBaselineId) {
        deltas[scenario.scenario_id] = '—'
        continue
      }
      if (!isFiniteNumber(raw) || !isFiniteNumber(baselineRaw)) {
        deltas[scenario.scenario_id] = '—'
        continue
      }
      deltas[scenario.scenario_id] = formatMetricDelta(raw - baselineRaw, metric.unit)
    }

    const { highest, lowest } = pickExtremeScenarioIds(selectedScenarios, metric)
    return {
      id: metric.metric_id,
      label: metric.label,
      baseline_value: isFiniteNumber(baselineRaw) ? formatMetricValue(baselineRaw, metric.unit) : '—',
      values,
      deltas,
      highest_scenario: highest,
      lowest_scenario: lowest,
    }
  })

  const horizonLabel = (() => {
    const generatedAtYear = new Date(workspace.generated_at).getUTCFullYear()
    if (!Number.isFinite(generatedAtYear)) {
      return ''
    }
    return `${generatedAtYear} Q1 – ${generatedAtYear + 2} Q4`
  })()

  return {
    scenarios,
    baseline_scenario_id: resolvedBaselineId,
    horizon_label: horizonLabel,
    metrics,
    tradeoff: chooseTradeoffSummary(scenarios),
  }
}
