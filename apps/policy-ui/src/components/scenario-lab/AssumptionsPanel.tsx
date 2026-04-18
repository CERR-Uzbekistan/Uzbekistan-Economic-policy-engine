import { useMemo, useState } from 'react'
import type {
  AssumptionCategory,
  ScenarioLabAssumptionInput,
  ScenarioLabAssumptionState,
  ScenarioLabPreset,
} from '../../contracts/data-contract'

type AssumptionsPanelProps = {
  assumptions: ScenarioLabAssumptionInput[]
  values: ScenarioLabAssumptionState
  presets: ScenarioLabPreset[]
  selectedPresetId: string
  scenarioName: string
  onPresetChange: (presetId: string) => void
  onScenarioNameChange: (name: string) => void
  onAssumptionChange: (key: string, value: number) => void
  onRunScenario: () => void
  isRunPending: boolean
  onSaveScenario: () => void
  saveStatus: string | null
}

const CATEGORY_TITLES: Record<AssumptionCategory, string> = {
  macro: 'Macro assumptions',
  external: 'External assumptions',
  fiscal: 'Fiscal assumptions',
  trade: 'Trade assumptions',
  advanced: 'Advanced assumptions',
}

const MAIN_CATEGORIES: AssumptionCategory[] = ['macro', 'external', 'fiscal', 'trade']

function AssumptionField({
  item,
  value,
  showTechnical,
  onChange,
}: {
  item: ScenarioLabAssumptionInput
  value: number
  showTechnical: boolean
  onChange: (nextValue: number) => void
}) {
  return (
    <label className="scenario-assumption-field">
      <span className="scenario-assumption-field__label">{item.label}</span>
      <span className="scenario-assumption-field__description">{item.description}</span>
      <div className="scenario-assumption-field__control">
        <input
          type="number"
          min={item.min}
          max={item.max}
          step={item.step}
          value={Number.isFinite(value) ? value : item.default_value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="scenario-assumption-field__unit">{item.unit}</span>
      </div>
      {showTechnical && item.technical_variable ? (
        <span className="scenario-assumption-field__technical">Technical: {item.technical_variable}</span>
      ) : null}
    </label>
  )
}

export function AssumptionsPanel({
  assumptions,
  values,
  presets,
  selectedPresetId,
  scenarioName,
  onPresetChange,
  onScenarioNameChange,
  onAssumptionChange,
  onRunScenario,
  isRunPending,
  onSaveScenario,
  saveStatus,
}: AssumptionsPanelProps) {
  const [showTechnical, setShowTechnical] = useState(false)

  const grouped = useMemo(() => {
    return assumptions.reduce<Record<AssumptionCategory, ScenarioLabAssumptionInput[]>>(
      (acc, assumption) => {
        acc[assumption.category].push(assumption)
        return acc
      },
      {
        macro: [],
        external: [],
        fiscal: [],
        trade: [],
        advanced: [],
      },
    )
  }, [assumptions])

  return (
    <section className="scenario-panel scenario-panel--assumptions" aria-labelledby="scenario-assumptions-title">
      <div className="scenario-panel__head page-section-head">
        <h2 id="scenario-assumptions-title">Assumptions</h2>
        <p>Define policy and shock assumptions in plain language.</p>
      </div>

      <div className="scenario-session-controls">
        <label>
          <span>Preset</span>
          <select value={selectedPresetId} onChange={(event) => onPresetChange(event.target.value)}>
            {presets.map((preset) => (
              <option key={preset.preset_id} value={preset.preset_id}>
                {preset.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Scenario name</span>
          <input
            type="text"
            value={scenarioName}
            onChange={(event) => onScenarioNameChange(event.target.value)}
            placeholder="Scenario name"
          />
        </label>

        <div className="scenario-session-controls__actions">
          <button type="button" onClick={onSaveScenario}>
            Save draft
          </button>
          <button type="button" onClick={onRunScenario} disabled={isRunPending}>
            {isRunPending ? 'Running...' : 'Run scenario'}
          </button>
          {saveStatus ? (
            <p role="status" aria-live="polite">
              {saveStatus}
            </p>
          ) : null}
        </div>
      </div>

      <label className="scenario-technical-toggle">
        <input
          type="checkbox"
          checked={showTechnical}
          onChange={(event) => setShowTechnical(event.target.checked)}
        />
        <span>Show technical variable names</span>
      </label>

      {MAIN_CATEGORIES.map((category) => (
        <section key={category} className="scenario-assumption-group">
          <h3>{CATEGORY_TITLES[category]}</h3>
          {grouped[category].length === 0 ? (
            <p className="empty-state">No assumptions available in this category.</p>
          ) : (
            <div className="scenario-assumption-list">
              {grouped[category].map((item) => (
                <AssumptionField
                  key={item.key}
                  item={item}
                  value={values[item.key] ?? item.default_value}
                  showTechnical={showTechnical}
                  onChange={(nextValue) => onAssumptionChange(item.key, nextValue)}
                />
              ))}
            </div>
          )}
        </section>
      ))}

      <details className="scenario-assumption-advanced">
        <summary>{CATEGORY_TITLES.advanced}</summary>
        {grouped.advanced.length === 0 ? (
          <p className="empty-state">No advanced assumptions are currently configured.</p>
        ) : (
          <div className="scenario-assumption-list">
            {grouped.advanced.map((item) => (
              <AssumptionField
                key={item.key}
                item={item}
                value={values[item.key] ?? item.default_value}
                showTechnical={showTechnical}
                onChange={(nextValue) => onAssumptionChange(item.key, nextValue)}
              />
            ))}
          </div>
        )}
      </details>
    </section>
  )
}
