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

function buildValue(
  scenario: ComparisonScenario,
  baseline: ComparisonScenario,
  mode: ComparisonViewMode,
): number | null {
  if (mode === 'risk') {
    return scenario.risk_index
  }
  const scenarioValue = scenario.values.gdp_growth
  if (typeof scenarioValue !== 'number') {
    return null
  }
  if (mode === 'delta') {
    const baselineValue = baseline.values.gdp_growth
    if (typeof baselineValue !== 'number') {
      return null
    }
    return scenarioValue - baselineValue
  }
  return scenarioValue
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

  const rows = selectedScenarios.map((scenario) => ({
    scenario,
    value: buildValue(scenario, baseline, viewMode),
  }))

  const measurableRows = rows.filter(
    (row): row is { scenario: ComparisonScenario; value: number } => row.value !== null,
  )

  if (measurableRows.length === 0) {
    return (
      <section className="comparison-panel comparison-panel--chart" aria-labelledby="comparison-chart-title">
        <div className="comparison-panel__head page-section-head">
          <h2 id="comparison-chart-title">Comparison Chart · GDP Growth</h2>
          <p>{descriptionForMode(viewMode)}</p>
        </div>
        <p className="empty-state">GDP growth values are unavailable for the selected scenarios.</p>
      </section>
    )
  }

  const maxAbs = Math.max(...measurableRows.map((row) => Math.abs(row.value)), 1)
  const isDeltaView = viewMode === 'delta'

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
        <ul className="comparison-chart-bars" aria-label="Scenario comparison values">
          {measurableRows.map(({ scenario, value }) => {
            const isBaseline = scenario.scenario_id === baselineId
            const ratio = Math.abs(value) / maxAbs
            const centredWidth = isDeltaView ? ratio * 50 : ratio * 100
            const isNegative = isDeltaView && value < 0
            return (
              <li key={scenario.scenario_id}>
                <div className="comparison-chart-bars__label">
                  <span>{scenario.scenario_name}</span>
                  {isBaseline ? (
                    <span className="comparison-chart-bars__role">Baseline</span>
                  ) : null}
                </div>
                <div
                  className={`comparison-chart-bars__track ${
                    isDeltaView ? 'comparison-chart-bars__track--centred' : ''
                  }`}
                  aria-hidden="true"
                >
                  {isDeltaView ? <span className="comparison-chart-bars__axis" /> : null}
                  <span
                    className={`comparison-chart-bars__fill ${
                      isBaseline ? 'comparison-chart-bars__fill--baseline' : ''
                    } ${
                      isDeltaView
                        ? isNegative
                          ? 'comparison-chart-bars__fill--negative'
                          : 'comparison-chart-bars__fill--positive'
                        : ''
                    }`}
                    style={{ width: `${centredWidth}%` }}
                  />
                </div>
                <strong className="comparison-chart-bars__value">
                  {formatValue(value, viewMode)}
                </strong>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
