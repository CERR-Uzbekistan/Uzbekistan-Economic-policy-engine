import type {
  ComparisonScenario,
  ComparisonScenarioTag,
} from '../../contracts/data-contract'
import { useTranslation } from 'react-i18next'

type ScenarioSelectorPanelProps = {
  qpmScenarios: ComparisonScenario[]
  savedScenarios: ComparisonScenario[]
  selectedIds: string[]
  baselineId: string
  tagsByScenarioId: Record<string, ComparisonScenarioTag>
  onToggleScenario: (scenarioId: string) => void
  onBaselineChange: (scenarioId: string) => void
  onTagChange: (scenarioId: string, tag: ComparisonScenarioTag) => void
}

const SLOT_LIMIT = 3

function scenarioTypeKey(type: ComparisonScenario['scenario_type']) {
  if (type === 'baseline') {
    return 'comparison.selector.scenarioType.baseline'
  }
  if (type === 'stress') {
    return 'comparison.selector.scenarioType.stress'
  }
  return 'comparison.selector.scenarioType.alternative'
}

function toTagLabelKey(tag: ComparisonScenarioTag) {
  if (tag === 'preferred') {
    return 'comparison.selector.tag.preferred'
  }
  if (tag === 'balanced') {
    return 'comparison.selector.tag.balanced'
  }
  if (tag === 'aggressive') {
    return 'comparison.selector.tag.aggressive'
  }
  return 'comparison.selector.tag.downside_stress'
}

function renderScenarioRows(params: {
  scenarios: ComparisonScenario[]
  selectedIds: string[]
  baselineId: string
  tagsByScenarioId: Record<string, ComparisonScenarioTag>
  onToggleScenario: (scenarioId: string) => void
  onTagChange: (scenarioId: string, tag: ComparisonScenarioTag) => void
  t: (key: string) => string
}) {
  const { scenarios, selectedIds, baselineId, tagsByScenarioId, onToggleScenario, onTagChange, t } = params

  return scenarios.map((scenario) => {
    const isSelected = selectedIds.includes(scenario.scenario_id)
    const isBaseline = baselineId === scenario.scenario_id
    return (
      <article key={scenario.scenario_id} className="comparison-scenario-row">
        <label className="comparison-scenario-row__select">
          <input type="checkbox" checked={isSelected} onChange={() => onToggleScenario(scenario.scenario_id)} />
          <span>{scenario.scenario_name}</span>
        </label>

        <div className="comparison-scenario-row__meta">
          <span className="comparison-scenario-row__type ui-chip ui-chip--neutral">
            {t(scenarioTypeKey(scenario.scenario_type))}
          </span>
          {isBaseline ? (
            <span className="comparison-baseline-badge ui-chip ui-chip--accent">
              {t('comparison.selector.baselineBadge')}
            </span>
          ) : null}
        </div>

        <p>{scenario.summary}</p>

        {isSelected ? (
          <label className="comparison-scenario-row__tag">
            <span>{t('comparison.selector.tagLabel')}</span>
            <select
              value={tagsByScenarioId[scenario.scenario_id] ?? 'balanced'}
              onChange={(event) => onTagChange(scenario.scenario_id, event.target.value as ComparisonScenarioTag)}
            >
              {(['preferred', 'balanced', 'aggressive', 'downside_stress'] as const).map((option) => (
                <option key={option} value={option}>
                  {t(toTagLabelKey(option))}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </article>
    )
  })
}

export function ScenarioSelectorPanel({
  qpmScenarios,
  savedScenarios,
  selectedIds,
  baselineId,
  tagsByScenarioId,
  onToggleScenario,
  onBaselineChange,
  onTagChange,
}: ScenarioSelectorPanelProps) {
  const { t } = useTranslation()
  const allScenarios = [...qpmScenarios, ...savedScenarios]
  const scenarioMap = allScenarios.reduce<Record<string, ComparisonScenario>>((acc, scenario) => {
    acc[scenario.scenario_id] = scenario
    return acc
  }, {})
  // Decision 11: selected ids may include entries no longer present in the pool.
  // We silently skip missing ids in render surfaces.
  const selectedScenarios = selectedIds.map((scenarioId) => scenarioMap[scenarioId]).filter(Boolean)

  if (allScenarios.length === 0) {
    return (
      <section className="comparison-panel comparison-panel--selector" aria-labelledby="comparison-selector-title">
        <div className="comparison-panel__head page-section-head">
          <h2 id="comparison-selector-title">{t('comparison.selector.title')}</h2>
          <p>{t('comparison.selector.description')}</p>
        </div>
        <p className="empty-state">{t('comparison.selector.empty')}</p>
      </section>
    )
  }

  return (
    <section className="comparison-panel comparison-panel--selector" aria-labelledby="comparison-selector-title">
      <div className="comparison-panel__head page-section-head">
        <h2 id="comparison-selector-title">{t('comparison.selector.title')}</h2>
        <p>{t('comparison.selector.description')}</p>
      </div>

      <div className="comparison-selector-meta">
        <span>
          {t('comparison.selector.selectedCount', {
            count: selectedScenarios.length,
            max: SLOT_LIMIT,
          })}
        </span>
        <label>
          <span>{t('comparison.selector.baselineLabel')}</span>
          <select value={baselineId} onChange={(event) => onBaselineChange(event.target.value)}>
            {selectedScenarios.map((scenario) => (
              <option key={scenario.scenario_id} value={scenario.scenario_id}>
                {scenario.scenario_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h3 className="comparison-selector-section-heading">{t('comparison.selector.qpmSection')}</h3>
      <div className="comparison-scenario-list">
        {renderScenarioRows({
          scenarios: qpmScenarios,
          selectedIds,
          baselineId,
          tagsByScenarioId,
          onToggleScenario,
          onTagChange,
          t,
        })}
      </div>

      <h3 className="comparison-selector-section-heading">{t('comparison.selector.savedSection')}</h3>
      {savedScenarios.length === 0 ? (
        <p className="comparison-selector-section-empty">{t('comparison.selector.savedEmpty')}</p>
      ) : null}
      <div className="comparison-scenario-list">
        {renderScenarioRows({
          scenarios: savedScenarios,
          selectedIds,
          baselineId,
          tagsByScenarioId,
          onToggleScenario,
          onTagChange,
          t,
        })}
      </div>
    </section>
  )
}
