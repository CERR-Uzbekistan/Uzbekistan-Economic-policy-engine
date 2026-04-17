import type {
  ComparisonScenario,
  ComparisonScenarioTag,
} from '../../contracts/data-contract'

type ScenarioSelectorPanelProps = {
  scenarios: ComparisonScenario[]
  selectedIds: string[]
  baselineId: string
  tagsByScenarioId: Record<string, ComparisonScenarioTag>
  onToggleScenario: (scenarioId: string) => void
  onBaselineChange: (scenarioId: string) => void
  onTagChange: (scenarioId: string, tag: ComparisonScenarioTag) => void
}

const TAG_OPTIONS: { value: ComparisonScenarioTag; label: string }[] = [
  { value: 'preferred', label: 'Preferred' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'aggressive', label: 'Aggressive' },
  { value: 'downside_stress', label: 'Downside stress' },
]

function scenarioTypeLabel(type: ComparisonScenario['scenario_type']) {
  if (type === 'baseline') {
    return 'Baseline'
  }
  if (type === 'stress') {
    return 'Stress'
  }
  return 'Alternative'
}

export function ScenarioSelectorPanel({
  scenarios,
  selectedIds,
  baselineId,
  tagsByScenarioId,
  onToggleScenario,
  onBaselineChange,
  onTagChange,
}: ScenarioSelectorPanelProps) {
  const selectedScenarios = scenarios.filter((scenario) => selectedIds.includes(scenario.scenario_id))

  return (
    <section className="comparison-panel comparison-panel--selector" aria-labelledby="comparison-selector-title">
      <div className="comparison-panel__head">
        <h2 id="comparison-selector-title">Scenario selector</h2>
        <p>Select 2-4 scenarios and define one baseline for delta interpretation.</p>
      </div>

      <div className="comparison-selector-meta">
        <span>Selected: {selectedIds.length} / 4</span>
        <label>
          <span>Baseline</span>
          <select value={baselineId} onChange={(event) => onBaselineChange(event.target.value)}>
            {selectedScenarios.map((scenario) => (
              <option key={scenario.scenario_id} value={scenario.scenario_id}>
                {scenario.scenario_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="comparison-scenario-list">
        {scenarios.map((scenario) => {
          const isSelected = selectedIds.includes(scenario.scenario_id)
          const isBaseline = baselineId === scenario.scenario_id
          return (
            <article key={scenario.scenario_id} className="comparison-scenario-row">
              <label className="comparison-scenario-row__select">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleScenario(scenario.scenario_id)}
                />
                <span>{scenario.scenario_name}</span>
              </label>

              <div className="comparison-scenario-row__meta">
                <span>{scenarioTypeLabel(scenario.scenario_type)}</span>
                {isBaseline ? <span className="comparison-baseline-badge">Baseline</span> : null}
              </div>

              <p>{scenario.summary}</p>

              {isSelected ? (
                <label className="comparison-scenario-row__tag">
                  <span>Classification</span>
                  <select
                    value={tagsByScenarioId[scenario.scenario_id] ?? 'balanced'}
                    onChange={(event) =>
                      onTagChange(scenario.scenario_id, event.target.value as ComparisonScenarioTag)
                    }
                  >
                    {TAG_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
