import type {
  ChartSemanticRole,
  ChartSpec,
  ComparisonMetricDefinition,
  ComparisonScenario,
  ComparisonViewMode,
} from '../../contracts/data-contract'
import { ChartRenderer } from '../system/ChartRenderer'

type ComparisonChartPanelProps = {
  selectedScenarios: ComparisonScenario[]
  metricDefinitions: ComparisonMetricDefinition[]
  baselineId: string
  viewMode: ComparisonViewMode
  onViewModeChange: (mode: ComparisonViewMode) => void
}

const VIEW_LABELS: Record<ComparisonViewMode, string> = {
  level: 'Level view',
  delta: 'Delta view',
  risk: 'Risk view',
}

const COMPARISON_ATTRIBUTION = {
  model_id: 'QPM',
  model_name: 'Quarterly Projection Model',
  module: 'comparison',
  version: '1.0.0',
  run_id: 'comparison-chart-panel',
  data_version: '2026Q1',
  timestamp: '2026-04-17T12:20:00+05:00',
}

function descriptionForMode(mode: ComparisonViewMode) {
  if (mode === 'delta') {
    return 'Delta versus baseline across key macro metrics.'
  }
  if (mode === 'risk') {
    return 'Composite macro risk pressure index (lower is more stable).'
  }
  return 'Scenario levels across key macro metrics.'
}

function toSemanticRole(
  scenario: ComparisonScenario,
  baselineId: string,
): ChartSemanticRole {
  if (scenario.scenario_id === baselineId) {
    return 'baseline'
  }
  if (scenario.scenario_type === 'stress') {
    return 'downside'
  }
  return 'alternative'
}

function averageFinite(values: number[]): number | null {
  const finiteValues = values.filter((value) => Number.isFinite(value))
  if (finiteValues.length === 0) {
    return null
  }
  const total = finiteValues.reduce((acc, value) => acc + value, 0)
  return total / finiteValues.length
}

function formatSigned(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}`
}

function isPercentComparableMetric(metric: ComparisonMetricDefinition): boolean {
  return metric.unit.includes('%')
}

function buildTakeaway(
  selectedScenarios: ComparisonScenario[],
  baseline: ComparisonScenario,
  metricDefinitions: ComparisonMetricDefinition[],
  viewMode: ComparisonViewMode,
  excludedMetricLabels: string[],
): string {
  const exclusionNote =
    excludedMetricLabels.length > 0
      ? ` ${excludedMetricLabels.join(', ')} excluded from chart due to non-comparable units; see table for levels.`
      : ''

  if (viewMode === 'risk') {
    const lowestRisk = [...selectedScenarios].sort((a, b) => a.risk_index - b.risk_index)[0]
    return `${lowestRisk.scenario_name} has the lowest composite risk index (${lowestRisk.risk_index.toFixed(0)}).${exclusionNote}`
  }

  const scoredScenarios = selectedScenarios.map((scenario) => {
    const values = metricDefinitions.map((metric) => {
      const scenarioValue = scenario.values[metric.metric_id]
      if (typeof scenarioValue !== 'number') {
        return Number.NaN
      }
      if (viewMode === 'delta') {
        const baselineValue = baseline.values[metric.metric_id]
        if (typeof baselineValue !== 'number') {
          return Number.NaN
        }
        return scenarioValue - baselineValue
      }
      return scenarioValue
    })

    return {
      scenario,
      score: averageFinite(values),
    }
  })

  const ranked = scoredScenarios
    .filter((entry): entry is { scenario: ComparisonScenario; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score)

  if (ranked.length === 0) {
    return `The selected scenarios have limited overlap across chart metrics.${exclusionNote}`
  }

  const leader = ranked[0]
  if (viewMode === 'delta') {
    return `${leader.scenario.scenario_name} leads on average delta (${formatSigned(leader.score)}).${exclusionNote}`
  }
  return `${leader.scenario.scenario_name} shows the strongest average level across plotted metrics (${leader.score.toFixed(1)}).${exclusionNote}`
}

function buildComparisonSpec(
  selectedScenarios: ComparisonScenario[],
  metricDefinitions: ComparisonMetricDefinition[],
  baselineId: string,
  viewMode: ComparisonViewMode,
): ChartSpec | null {
  const baseline = selectedScenarios.find((scenario) => scenario.scenario_id === baselineId)
  if (!baseline) {
    return null
  }

  const filteredMetrics =
    viewMode === 'risk'
      ? metricDefinitions
      : metricDefinitions.filter(isPercentComparableMetric)
  const metrics = filteredMetrics.slice(0, 5)
  const excludedMetricLabels =
    viewMode === 'risk'
      ? []
      : metricDefinitions
          .filter((metric) => !isPercentComparableMetric(metric))
          .map((metric) => metric.label)
  if (viewMode !== 'risk' && metrics.length === 0) {
    return null
  }
  const xValues =
    viewMode === 'risk'
      ? ['Macro risk index']
      : metrics.map((metric) =>
          metric.unit.trim() ? `${metric.label} (${metric.unit})` : metric.label,
        )

  const series = selectedScenarios.map((scenario) => ({
    series_id: scenario.scenario_id,
    label: scenario.scenario_name,
    semantic_role: toSemanticRole(scenario, baselineId),
    values:
      viewMode === 'risk'
        ? [scenario.risk_index]
        : metrics.map((metric) => {
            const scenarioValue = scenario.values[metric.metric_id]
            if (typeof scenarioValue !== 'number') {
              return Number.NaN
            }
            if (viewMode === 'delta') {
              const baselineValue = baseline.values[metric.metric_id]
              if (typeof baselineValue !== 'number') {
                return Number.NaN
              }
              return scenarioValue - baselineValue
            }
            return scenarioValue
          }),
  }))

  const hasAnyUsablePoint = series.some((item) =>
    item.values.some((value) => Number.isFinite(value)),
  )

  if (!hasAnyUsablePoint || xValues.length === 0) {
    return null
  }

  const yValues = series.flatMap((item) => item.values.filter((value) => Number.isFinite(value)))

  return {
    chart_id: `comparison-chart-${viewMode}`,
    title: 'Scenario comparison by metric',
    subtitle: descriptionForMode(viewMode),
    chart_type: 'bar',
    x: {
      label: viewMode === 'risk' ? 'Index' : 'Metric',
      unit: '',
      values: xValues,
    },
    y: {
      label: viewMode === 'risk' ? 'Risk index' : 'Value',
      unit: '',
      values: yValues,
    },
    series,
    view_mode: viewMode,
    uncertainty: [],
    takeaway: buildTakeaway(selectedScenarios, baseline, metrics, viewMode, excludedMetricLabels),
    model_attribution: [COMPARISON_ATTRIBUTION],
  }
}

export function ComparisonChartPanel({
  selectedScenarios,
  metricDefinitions,
  baselineId,
  viewMode,
  onViewModeChange,
}: ComparisonChartPanelProps) {
  const baseline = selectedScenarios.find((scenario) => scenario.scenario_id === baselineId)
  if (!baseline) {
    return (
      <section className="comparison-panel comparison-panel--chart" aria-labelledby="comparison-chart-title">
        <div className="comparison-panel__head page-section-head">
          <h2 id="comparison-chart-title">Comparison Chart · GDP Growth</h2>
          <p>{descriptionForMode(viewMode)}</p>
        </div>
        <p className="empty-state">Select a baseline scenario to populate chart values.</p>
      </section>
    )
  }

  const chartSpec = buildComparisonSpec(selectedScenarios, metricDefinitions, baselineId, viewMode)
  if (!chartSpec) {
    return (
      <section className="comparison-panel comparison-panel--chart" aria-labelledby="comparison-chart-title">
        <div className="comparison-panel__head page-section-head">
          <h2 id="comparison-chart-title">Comparison Chart · GDP Growth</h2>
          <p>{descriptionForMode(viewMode)}</p>
        </div>
        <p className="empty-state">Comparison values are unavailable for the selected scenarios.</p>
      </section>
    )
  }

  return (
    <section className="comparison-panel comparison-panel--chart" aria-labelledby="comparison-chart-title">
      <div className="comparison-panel__head page-section-head">
        <h2 id="comparison-chart-title">Comparison Chart · GDP Growth</h2>
        <p>{descriptionForMode(viewMode)}</p>
      </div>

      <div className="comparison-view-toggle segmented-control" role="tablist" aria-label="Comparison view">
        {(Object.keys(VIEW_LABELS) as ComparisonViewMode[]).map((mode) => {
          const isActive = viewMode === mode
          return (
            <button
              key={mode}
              id={`comparison-view-tab-${mode}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="comparison-view-panel"
              tabIndex={isActive ? 0 : -1}
              className={isActive ? 'active' : ''}
              onClick={() => onViewModeChange(mode)}
            >
              {VIEW_LABELS[mode]}
            </button>
          )
        })}
      </div>

      <div
        id="comparison-view-panel"
        role="tabpanel"
        aria-labelledby={`comparison-view-tab-${viewMode}`}
      >
        <ChartRenderer spec={chartSpec} ariaLabel={`Scenario comparison chart (${viewMode} view)`} />
      </div>
    </section>
  )
}
