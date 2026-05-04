import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { ComparisonScenarioMeta } from '../../contracts/data-contract'
import { ScenarioChip } from './ScenarioChip.js'

type ComparisonSelectorProps = {
  scenarios: ComparisonScenarioMeta[]
  baselineId: string
  onRemove?: (scenarioId: string) => void
  onAddSavedScenario: () => void
  onBaselineChange: (scenarioId: string) => void
}

// Prompt §4.3 chip-rail selector. Amend-cycle 1: baseline switcher restored per
// prompt §4.3 (it was non-blocking but called out by Codex). Baseline is the
// scenario whose role === 'baseline' in the composed ComparisonContent; a
// dropdown lets operators pick a different baseline from the selection or
// swap one in.
export function ComparisonSelector({
  scenarios,
  baselineId,
  onRemove,
  onAddSavedScenario,
  onBaselineChange,
}: ComparisonSelectorProps) {
  const { t } = useTranslation()
  const baselineLabelId = useId()

  return (
    <div className="cmp-selector" aria-labelledby="comparison-selector-label">
      <span id="comparison-selector-label" className="label">
        {t('comparison.selector.inView')}
      </span>
      {scenarios.map((scenario) => (
        <ScenarioChip
          key={scenario.id}
          name={scenario.name}
          role={scenario.role}
          onRemove={onRemove ? () => onRemove(scenario.id) : undefined}
          removable={scenario.id !== baselineId && scenarios.length > 2}
        />
      ))}

      <div className="cmp-selector__baseline">
        <label htmlFor={baselineLabelId} className="label">
          {t('comparison.selector.baselineLabel')}
        </label>
        <select
          id={baselineLabelId}
          className="cmp-selector__baseline-select"
          value={baselineId}
          onChange={(event) => onBaselineChange(event.target.value)}
        >
          {scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="btn-ghost cmp-selector__add"
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse' || event.pointerType === 'touch') {
            event.preventDefault()
            onAddSavedScenario()
          }
        }}
        onClick={onAddSavedScenario}
      >
        {t('comparison.selector.addSaved')}
      </button>
    </div>
  )
}
