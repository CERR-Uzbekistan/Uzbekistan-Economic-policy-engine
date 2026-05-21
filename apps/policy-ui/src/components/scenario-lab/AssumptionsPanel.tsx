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
import { normalizeAssumptionValue } from './assumption-value.js'
import { buildPresetChipPresentation } from './preset-chip.js'
import { SavedScenarioModal } from './SavedScenarioModal.js'

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
  canSaveScenario: boolean
  saveDisabledReason: string | null
  savedScenarios: SavedScenarioRecord[]
  onLoadScenario: (scenarioId: string) => void
  onDeleteScenario: (scenarioId: string) => void
  saveStatus: string | null
}

const CATEGORY_TITLES: Record<AssumptionCategory, string> = {
  macro: 'Monetary',
  external: 'External',
  fiscal: 'Fiscal',
  trade: 'Trade',
  advanced: 'Advanced',
}

const SCENARIO_TYPE_OPTIONS: ScenarioType[] = ['baseline', 'alternative', 'stress']

function isQpmCoreAssumption(assumption: ScenarioLabAssumptionInput): boolean {
  return assumption.category !== 'advanced' && assumption.technical_variable?.startsWith('qpm.') === true
}

function formatAssumptionValue(value: number, step: number): string {
  const stepDecimals = Math.max(0, (step.toString().split('.')[1] ?? '').length)
  return value.toFixed(Math.min(stepDecimals, 2))
}

// Prompt §4.4: assumption field with slider as primary control + number input
// as secondary. Help text + technical-variable toggle per prototype lines
// 776–819.
function AssumptionField({
  item,
  value,
  showTechnical,
  onChange,
  technicalPrefix,
  numericValueLabel,
  label,
  description,
}: {
  item: ScenarioLabAssumptionInput
  value: number
  showTechnical: boolean
  onChange: (nextValue: number) => void
  technicalPrefix: string
  numericValueLabel: string
  label: string
  description: string
}) {
  const displayValue = Number.isFinite(value) ? value : item.default_value

  return (
    <div className="scenario-assumption-field assumption-field">
      <div className="scenario-assumption-field__label assumption-field__label">
        <span className="name">{label}</span>
        <span className="value">
          {formatAssumptionValue(displayValue, item.step)} {item.unit}
        </span>
      </div>
      <input
        type="range"
        className="scenario-assumption-field__slider"
        min={item.min}
        max={item.max}
        step={item.step}
        value={displayValue}
        onChange={(event) => onChange(normalizeAssumptionValue(item, Number(event.target.value)))}
        aria-label={label}
      />
      <span className="scenario-assumption-field__description assumption-field__help">
        {description}
      </span>
      <div className="scenario-assumption-field__control">
        <input
          type="number"
          min={item.min}
          max={item.max}
          step={item.step}
          value={displayValue}
          onChange={(event) => onChange(normalizeAssumptionValue(item, Number(event.target.value)))}
          aria-label={numericValueLabel.replace('{{label}}', label)}
        />
        <span className="scenario-assumption-field__unit">{item.unit}</span>
      </div>
      {showTechnical && item.technical_variable ? (
        <span className="scenario-assumption-field__technical assumption-field__tech">
          {technicalPrefix.replace('{{variable}}', item.technical_variable)}
        </span>
      ) : null}
    </div>
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
  canSaveScenario,
  saveDisabledReason,
  savedScenarios,
  onLoadScenario,
  onDeleteScenario,
  saveStatus,
}: AssumptionsPanelProps) {
  const { t } = useTranslation()
  const [showTechnical, setShowTechnical] = useState(false)
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false)
  const technicalPrefix = t('scenarioLab.assumptions.technicalPrefix')
  const numericValueLabel = t('scenarioLab.assumptions.numericValueLabel')
  const assumptionLabel = (item: ScenarioLabAssumptionInput) =>
    t(`scenarioLab.assumptions.inputs.${item.key}.label`, { defaultValue: item.label })
  const assumptionDescription = (item: ScenarioLabAssumptionInput) =>
    t(`scenarioLab.assumptions.inputs.${item.key}.description`, {
      defaultValue: item.description,
    })
  const selectedPreset = presets.find((preset) => preset.preset_id === selectedPresetId)
  const displayScenarioName =
    selectedPreset && scenarioName === selectedPreset.title
      ? t(`scenarioLab.presets.${selectedPreset.preset_id}.title`, {
          defaultValue: selectedPreset.title,
        })
      : scenarioName

  const grouped = useMemo(
    () =>
      assumptions.reduce<Record<AssumptionCategory, ScenarioLabAssumptionInput[]>>(
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
      ),
    [assumptions],
  )
  const qpmCoreAssumptions = useMemo(
    () => assumptions.filter(isQpmCoreAssumption),
    [assumptions],
  )
  const linkedAssumptions = useMemo(
    () =>
      assumptions.filter(
        (assumption) => assumption.category !== 'advanced' && !isQpmCoreAssumption(assumption),
      ),
    [assumptions],
  )

  return (
    <section
      className="scenario-panel scenario-panel--assumptions lab-panel"
      aria-labelledby="scenario-assumptions-title"
    >
      <div className="scenario-panel__head page-section-head">
        <h2 id="scenario-assumptions-title">{t('scenarioLab.assumptions.title')}</h2>
        <p>{t('scenarioLab.assumptions.description')}</p>
      </div>

      {/* Preset chip rail */}
      <div className="presets" aria-label={t('scenarioLab.form.preset')}>
        {presets.map((preset) => {
          const presentation = buildPresetChipPresentation(
            selectedPresetId,
            preset.preset_id,
            onPresetChange,
          )
          return (
            <button
              key={preset.preset_id}
              type="button"
              className={presentation.className}
              aria-pressed={presentation.ariaPressed}
              onClick={presentation.onClick}
              onKeyDown={presentation.onKeyDown}
            >
              {t(`scenarioLab.presets.${preset.preset_id}.title`, { defaultValue: preset.title })}
            </button>
          )
        })}
      </div>

      {/* Lab-session block: scenario name + collapsed details + actions. */}
      <div className="lab-session scenario-session-controls">
        <label className="lab-session__field">
          <span>{t('scenarioLab.form.scenarioName')}</span>
          <input
            type="text"
            value={displayScenarioName}
            onChange={(event) => onScenarioNameChange(event.target.value)}
            placeholder={t('scenarioLab.form.scenarioNamePlaceholder')}
          />
        </label>

        {/* Prompt §4.4: collapsed by default; keyboard-operable native disclosure. */}
        <details className="lab-session__details">
          <summary>{t('scenarioLab.form.detailsSummary')}</summary>
          <div className="lab-session__details-body">
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
          </div>
        </details>

        <div className="lab-session__actions scenario-session-controls__actions">
          <button
            type="button"
            className="btn-primary"
            onClick={onRunScenario}
            disabled={isRunPending}
          >
            {isRunPending ? `${t('buttons.run')}...` : t('buttons.runScenario')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onSaveScenario}
            disabled={!canSaveScenario}
            title={saveDisabledReason ?? undefined}
            aria-describedby={saveDisabledReason ? 'scenario-save-disabled-reason' : undefined}
          >
            {t('buttons.saveDraft')}
          </button>
          {saveDisabledReason ? (
            <span id="scenario-save-disabled-reason" className="scenario-session-controls__save-reason">
              {saveDisabledReason}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          className="lab-session__load-link btn-ghost"
          onClick={() => setIsSavedModalOpen(true)}
        >
          {t('scenarioLab.saved.loadLink')}
        </button>

        <p className="lab-session__local-note">{t('scenarioLab.saved.localBrowserDisclosure')}</p>

        {saveStatus ? (
          <p className="lab-session__status" role="status" aria-live="polite">
            {saveStatus}
          </p>
        ) : null}
      </div>

      <label className="scenario-technical-toggle">
        <input
          type="checkbox"
          checked={showTechnical}
          onChange={(event) => setShowTechnical(event.target.checked)}
        />
        <span>{t('scenarioLab.assumptions.showTechnical')}</span>
      </label>

      <section className="scenario-assumption-group assumption-group">
        <h4>{t('scenarioLab.assumptions.qpmCoreTitle')}</h4>
        <p className="scenario-assumption-group__note">{t('scenarioLab.assumptions.qpmCoreDescription')}</p>
        {qpmCoreAssumptions.length === 0 ? (
          <p className="empty-state">{t('scenarioLab.assumptions.emptyCategory')}</p>
        ) : (
          <div className="scenario-assumption-list">
            {qpmCoreAssumptions.map((item) => (
              <AssumptionField
                key={item.key}
                item={item}
                value={values[item.key] ?? item.default_value}
                showTechnical={showTechnical}
                technicalPrefix={technicalPrefix}
                numericValueLabel={numericValueLabel}
                label={assumptionLabel(item)}
                description={assumptionDescription(item)}
                onChange={(nextValue) => onAssumptionChange(item.key, nextValue)}
              />
            ))}
          </div>
        )}
      </section>

      {linkedAssumptions.length > 0 ? (
        <details className="scenario-assumption-linked">
          <summary>{t('scenarioLab.assumptions.linkedTitle')}</summary>
          <p>{t('scenarioLab.assumptions.linkedDescription')}</p>
          <div className="scenario-assumption-list">
            {linkedAssumptions.map((item) => (
              <AssumptionField
                key={item.key}
                item={item}
                value={values[item.key] ?? item.default_value}
                showTechnical={showTechnical}
                technicalPrefix={technicalPrefix}
                numericValueLabel={numericValueLabel}
                label={assumptionLabel(item)}
                description={assumptionDescription(item)}
                onChange={(nextValue) => onAssumptionChange(item.key, nextValue)}
              />
            ))}
          </div>
        </details>
      ) : null}

      {grouped.advanced.length > 0 ? (
        <details className="scenario-assumption-advanced">
          <summary>
            {t('scenarioLab.assumptions.categories.advanced', {
              defaultValue: CATEGORY_TITLES.advanced,
            })}
          </summary>
          <div className="scenario-assumption-list">
            {grouped.advanced.map((item) => (
              <AssumptionField
                key={item.key}
                item={item}
                value={values[item.key] ?? item.default_value}
                showTechnical={showTechnical}
                technicalPrefix={technicalPrefix}
                numericValueLabel={numericValueLabel}
                label={assumptionLabel(item)}
                description={assumptionDescription(item)}
                onChange={(nextValue) => onAssumptionChange(item.key, nextValue)}
              />
            ))}
          </div>
        </details>
      ) : null}

      <SavedScenarioModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        savedScenarios={savedScenarios}
        onLoadScenario={onLoadScenario}
        onDeleteScenario={onDeleteScenario}
      />
    </section>
  )
}
