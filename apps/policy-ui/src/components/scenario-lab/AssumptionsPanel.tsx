import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  AssumptionCategory,
  ScenarioType,
  ScenarioLabAssumptionInput,
  ScenarioLabAssumptionState,
  ScenarioLabPreset,
} from '../../contracts/data-contract'
import type { SavedScenarioRecord } from '../../state/scenarioStore'

type AssumptionsPanelProps = {
  assumptions: ScenarioLabAssumptionInput[]
  values: ScenarioLabAssumptionState
  presets: ScenarioLabPreset[]
  selectedPresetId: string
  scenarioName: string
  scenarioType: ScenarioType
  scenarioDescription: string
  scenarioTags: string[]
  availableScenarioTags: string[]
  onPresetChange: (presetId: string) => void
  onScenarioNameChange: (name: string) => void
  onScenarioTypeChange: (scenarioType: ScenarioType) => void
  onScenarioDescriptionChange: (description: string) => void
  onScenarioTagToggle: (tag: string) => void
  onAssumptionChange: (key: string, value: number) => void
  onRunScenario: () => void
  isRunPending: boolean
  onSaveScenario: () => void
  savedScenarios: SavedScenarioRecord[]
  onLoadScenario: (scenarioId: string) => void
  onDeleteScenario: (scenarioId: string) => void
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
const SCENARIO_TYPE_OPTIONS: ScenarioType[] = ['baseline', 'alternative', 'stress']

function formatRelativeTime(isoTimestamp: string, locale: string): string {
  const target = new Date(isoTimestamp).getTime()
  if (!Number.isFinite(target)) {
    return isoTimestamp
  }

  const seconds = Math.round((target - Date.now()) / 1000)
  const absSeconds = Math.abs(seconds)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (absSeconds < 60) {
    return formatter.format(seconds, 'second')
  }
  if (absSeconds < 60 * 60) {
    return formatter.format(Math.round(seconds / 60), 'minute')
  }
  if (absSeconds < 60 * 60 * 24) {
    return formatter.format(Math.round(seconds / (60 * 60)), 'hour')
  }
  if (absSeconds < 60 * 60 * 24 * 30) {
    return formatter.format(Math.round(seconds / (60 * 60 * 24)), 'day')
  }
  if (absSeconds < 60 * 60 * 24 * 365) {
    return formatter.format(Math.round(seconds / (60 * 60 * 24 * 30)), 'month')
  }
  return formatter.format(Math.round(seconds / (60 * 60 * 24 * 365)), 'year')
}

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
  scenarioType,
  scenarioDescription,
  scenarioTags,
  availableScenarioTags,
  onPresetChange,
  onScenarioNameChange,
  onScenarioTypeChange,
  onScenarioDescriptionChange,
  onScenarioTagToggle,
  onAssumptionChange,
  onRunScenario,
  isRunPending,
  onSaveScenario,
  savedScenarios,
  onLoadScenario,
  onDeleteScenario,
  saveStatus,
}: AssumptionsPanelProps) {
  const { t, i18n } = useTranslation()
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

        <label>
          <span>{t('scenarioLab.form.scenarioType')}</span>
          <select
            value={scenarioType}
            onChange={(event) => onScenarioTypeChange(event.target.value as ScenarioType)}
          >
            {SCENARIO_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`scenarioLab.form.scenarioTypeOptions.${option}`)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>{t('scenarioLab.form.description')}</span>
          <textarea
            value={scenarioDescription}
            onChange={(event) => onScenarioDescriptionChange(event.target.value)}
            placeholder={t('scenarioLab.form.descriptionPlaceholder')}
            rows={3}
          />
        </label>

        <fieldset className="scenario-tag-fieldset">
          <legend>{t('scenarioLab.form.tags')}</legend>
          <div className="scenario-tag-chip-list">
            {availableScenarioTags.map((tag) => {
              const isSelected = scenarioTags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  className={`scenario-tag-chip ${isSelected ? 'scenario-tag-chip--selected' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => onScenarioTagToggle(tag)}
                >
                  {t(`scenarioLab.form.tagOptions.${tag}`)}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="scenario-session-controls__actions">
          <button type="button" onClick={onSaveScenario}>
            {t('buttons.saveDraft')}
          </button>
          <button type="button" onClick={onRunScenario} disabled={isRunPending}>
            {isRunPending ? `${t('buttons.run')}...` : t('buttons.runScenario')}
          </button>
          {saveStatus ? (
            <p role="status" aria-live="polite">
              {saveStatus}
            </p>
          ) : null}
        </div>

        <section className="scenario-saved-list" aria-labelledby="scenario-saved-list-title">
          <h3 id="scenario-saved-list-title">{t('scenarioLab.saved.title')}</h3>
          {savedScenarios.length === 0 ? (
            <p className="empty-state">{t('scenarioLab.saved.empty')}</p>
          ) : (
            <ul>
              {savedScenarios.map((savedScenario) => (
                <li key={savedScenario.scenario_id}>
                  <div>
                    <strong>{savedScenario.scenario_name}</strong>
                    <span>
                      {formatRelativeTime(savedScenario.created_at, i18n.resolvedLanguage ?? 'en')}
                    </span>
                  </div>
                  <div className="scenario-saved-list__actions">
                    <button type="button" onClick={() => onLoadScenario(savedScenario.scenario_id)}>
                      {t('scenarioLab.saved.load')}
                    </button>
                    <button type="button" onClick={() => onDeleteScenario(savedScenario.scenario_id)}>
                      {t('scenarioLab.saved.delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
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
