import type {
  ComparisonScenario,
  ComparisonViewMode,
} from '../../contracts/data-contract'

type ComparisonChartPanelProps = {
  selectedScenarios: ComparisonScenario[]
  baselineId: string
  viewMode: ComparisonViewMode
  onViewModeChange: (mode: ComparisonViewMode) => void
}

const VIEW_LABELS: Record<ComparisonViewMode, string> = {
  level: 'Level view',
  delta: 'Delta view',
  risk: 'Risk view',
}

function buildValue(scenario: ComparisonScenario, baseline: ComparisonScenario, mode: ComparisonViewMode) {
  if (mode === 'delta') {
    const scenarioValue = scenario.values.gdp_growth ?? 0
    const baselineValue = baseline.values.gdp_growth ?? 0
    return scenarioValue - baselineValue
  }
  if (mode === 'risk') {
    return scenario.risk_index
  }
  return scenario.values.gdp_growth ?? 0
}

function descriptionForMode(mode: ComparisonViewMode) {
  if (mode === 'delta') {
    return 'GDP growth delta against baseline (pp).'
  }
  if (mode === 'risk') {
    return 'Composite macro risk pressure index (lower is more stable).'
  }
  return 'GDP growth levels at scenario horizon (%).'
}

function formatValue(value: number, mode: ComparisonViewMode) {
  if (mode === 'risk') {
    return `${Math.round(value)}`
  }
  const sign = mode === 'delta' && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}`
}

export function ComparisonChartPanel({
  selectedScenarios,
  baselineId,
  viewMode,
  onViewModeChange,
}: ComparisonChartPanelProps) {
  const baseline = selectedScenarios.find((scenario) => scenario.scenario_id === baselineId)
  if (!baseline) {
    return null
  }

  const rows = selectedScenarios.map((scenario) => ({
    scenario,
    value: buildValue(scenario, baseline, viewMode),
  }))

  const maxAbs = Math.max(...rows.map((row) => Math.abs(row.value)), 1)

  return (
    <section className="comparison-panel comparison-panel--chart" aria-labelledby="comparison-chart-title">
      <div className="comparison-panel__head">
        <h2 id="comparison-chart-title">Comparison chart</h2>
        <p>{descriptionForMode(viewMode)}</p>
      </div>

      <div className="comparison-view-toggle" role="tablist" aria-label="Comparison view">
        {(Object.keys(VIEW_LABELS) as ComparisonViewMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={viewMode === mode}
            className={viewMode === mode ? 'active' : ''}
            onClick={() => onViewModeChange(mode)}
          >
            {VIEW_LABELS[mode]}
          </button>
        ))}
      </div>

      <ul className="comparison-chart-bars" aria-label="Scenario comparison values">
        {rows.map(({ scenario, value }) => {
          const width = (Math.abs(value) / maxAbs) * 100
          const isBaseline = scenario.scenario_id === baselineId
          return (
            <li key={scenario.scenario_id}>
              <div className="comparison-chart-bars__label">
                <span>{scenario.scenario_name}</span>
                {isBaseline ? <small>Baseline</small> : null}
              </div>
              <div className={isBaseline ? 'baseline' : ''}>
                <i style={{ width: `${Math.max(width, 6)}%` }} />
              </div>
              <strong>{formatValue(value, viewMode)}</strong>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
