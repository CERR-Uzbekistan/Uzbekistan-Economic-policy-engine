import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { isIoSectorShockRecord, type SavedScenarioRecord } from '../../state/scenarioStore.js'
import { filterSavedScenarios, type SavedRunsFilter } from './savedRunsFilters.js'

type ScenarioLabSavedRunsPanelProps = {
  savedScenarios: SavedScenarioRecord[]
  onLoadScenario?: (scenarioId: string) => void
  onDeleteScenario?: (scenarioId: string) => void
}

function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

function formatOptionalNumber(value: number | null): string {
  if (value === null) {
    return 'n/a'
  }
  return formatNumber(value, 0)
}

function formatSavedAt(isoTimestamp: string, locale: string): string {
  const parsed = Date.parse(isoTimestamp)
  if (!Number.isFinite(parsed)) {
    return isoTimestamp
  }
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(parsed))
}

function formatMetricValue(value: number, unit: string): string {
  return `${formatNumber(value, unit === '%' ? 1 : 0)} ${unit}`
}

function getSavedTimestamp(scenario: SavedScenarioRecord): string {
  return scenario.io_sector_shock?.saved_at ?? scenario.run_saved_at ?? scenario.stored_at ?? scenario.updated_at
}

function getMacroKeyOutputs(scenario: SavedScenarioRecord): Array<{ label: string; value: string }> {
  return (
    scenario.run_results?.headline_metrics.slice(0, 3).map((metric) => ({
      label: metric.label,
      value: formatMetricValue(metric.value, metric.unit),
    })) ?? []
  )
}

function getMacroSourceVintage(scenario: SavedScenarioRecord): string | null {
  const attributionVintages = scenario.run_attribution
    ?.map((attribution) => attribution.data_version)
    .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index)
  if (attributionVintages && attributionVintages.length > 0) {
    return attributionVintages.join(', ')
  }
  return null
}

export function ScenarioLabSavedRunsPanel({
  savedScenarios,
  onLoadScenario,
  onDeleteScenario,
}: ScenarioLabSavedRunsPanelProps) {
  const { t, i18n } = useTranslation()
  const [activeFilter, setActiveFilter] = useState<SavedRunsFilter>('all')
  const locale = i18n.resolvedLanguage ?? 'en'
  const filteredScenarios = useMemo(
    () => filterSavedScenarios(savedScenarios, activeFilter),
    [activeFilter, savedScenarios],
  )
  const filterCounts = useMemo(
    () => ({
      all: savedScenarios.length,
      macro_qpm: filterSavedScenarios(savedScenarios, 'macro_qpm').length,
      io: filterSavedScenarios(savedScenarios, 'io').length,
    }),
    [savedScenarios],
  )

  if (savedScenarios.length === 0) {
    return (
      <section
        className="scenario-panel scenario-panel--saved-runs saved-runs-panel"
        id="scenario-model-tabpanel-saved_runs"
        role="tabpanel"
        aria-labelledby="scenario-model-tab-saved_runs"
      >
        <div className="scenario-panel__head page-section-head">
          <h2>{t('scenarioLab.savedRuns.title')}</h2>
          <p>{t('scenarioLab.savedRuns.empty')}</p>
          <p className="saved-runs-panel__local-note">{t('scenarioLab.saved.localBrowserDisclosure')}</p>
        </div>
      </section>
    )
  }

  const filters: SavedRunsFilter[] = ['all', 'macro_qpm', 'io']

  return (
    <section
      className="scenario-panel scenario-panel--saved-runs saved-runs-panel"
      id="scenario-model-tabpanel-saved_runs"
      role="tabpanel"
      aria-labelledby="scenario-model-tab-saved_runs"
    >
      <div className="scenario-panel__head page-section-head">
        <h2>{t('scenarioLab.savedRuns.title')}</h2>
        <p>{t('scenarioLab.savedRuns.description', { count: savedScenarios.length })}</p>
        <p className="saved-runs-panel__local-note">{t('scenarioLab.saved.localBrowserDisclosure')}</p>
      </div>

      <div className="saved-runs-panel__filters" role="tablist" aria-label={t('scenarioLab.savedRuns.filtersAria')}>
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={activeFilter === filter}
            className={activeFilter === filter ? 'active' : undefined}
            onClick={() => setActiveFilter(filter)}
          >
            <span>{t(`scenarioLab.savedRuns.filters.${filter}`)}</span>
            <strong>{filterCounts[filter]}</strong>
          </button>
        ))}
      </div>

      {filteredScenarios.length === 0 ? (
        <p className="empty-state">{t(`scenarioLab.savedRuns.filteredEmpty.${activeFilter}`)}</p>
      ) : null}

      <div className="saved-runs-panel__list">
        {filteredScenarios.map((scenario) => {
          if (isIoSectorShockRecord(scenario)) {
            const run = scenario.io_sector_shock
            return (
              <article className="saved-runs-panel__item saved-runs-panel__item--io" key={scenario.scenario_id}>
                <div>
                  <span className="saved-runs-panel__type">{t('scenarioLab.savedRuns.type.io')}</span>
                  <h3>{run.title}</h3>
                  <p>{t('scenarioLab.savedRuns.ioBoundary')}</p>
                  <div className="saved-runs-panel__actions">
                    <Link
                      className="ui-secondary-action"
                      to="/comparison"
                      state={{ addSavedScenarioIds: [scenario.scenario_id] }}
                    >
                      {t('scenarioLab.savedRuns.openInComparison')}
                    </Link>
                    {onDeleteScenario ? (
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => onDeleteScenario(scenario.scenario_id)}
                      >
                        {t('buttons.delete')}
                      </button>
                    ) : null}
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>{t('scenarioLab.savedRuns.fields.saved')}</dt>
                    <dd>{formatSavedAt(getSavedTimestamp(scenario), locale)}</dd>
                  </div>
                  <div>
                    <dt>{t('scenarioLab.savedRuns.fields.data')}</dt>
                    <dd>{run.data_vintage}</dd>
                  </div>
                  <div>
                    <dt>{t('scenarioLab.savedRuns.fields.sourceArtifact')}</dt>
                    <dd>{run.source_artifact}</dd>
                  </div>
                  <div>
                    <dt>{t('scenarioLab.ioShock.kpis.output')}</dt>
                    <dd>{formatNumber(run.totals.output_effect_bln_uzs)} bln UZS</dd>
                  </div>
                  <div>
                    <dt>{t('scenarioLab.ioShock.kpis.gdpContribution')}</dt>
                    <dd>{formatNumber(run.totals.gdp_accounting_contribution_bln_uzs)} bln UZS</dd>
                  </div>
                  <div>
                    <dt>{t('scenarioLab.ioShock.kpis.employment')}</dt>
                    <dd>{formatOptionalNumber(run.totals.employment_effect_persons)}</dd>
                  </div>
                </dl>
              </article>
            )
          }

          return (
            <article className="saved-runs-panel__item" key={scenario.scenario_id}>
              <div>
                <span className="saved-runs-panel__type">{t('scenarioLab.savedRuns.type.macro')}</span>
                <h3>{scenario.scenario_name}</h3>
                <p>{scenario.description || t('scenarioLab.savedRuns.macroFallback')}</p>
                <div className="saved-runs-panel__actions">
                  {onLoadScenario ? (
                    <button
                      type="button"
                      className="ui-secondary-action"
                      onClick={() => onLoadScenario(scenario.scenario_id)}
                    >
                      {t('buttons.load')}
                    </button>
                  ) : null}
                  <Link
                    className="ui-secondary-action"
                    to="/comparison"
                    state={{ addSavedScenarioIds: [scenario.scenario_id] }}
                  >
                    {t('scenarioLab.savedRuns.openInComparison')}
                  </Link>
                  {onDeleteScenario ? (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => onDeleteScenario(scenario.scenario_id)}
                    >
                      {t('buttons.delete')}
                    </button>
                  ) : null}
                </div>
              </div>
              <dl>
                <div>
                  <dt>{t('scenarioLab.savedRuns.fields.type')}</dt>
                  <dd>{t('scenarioLab.savedRuns.type.macro')}</dd>
                </div>
                <div>
                  <dt>{t('scenarioLab.savedRuns.fields.data')}</dt>
                  <dd>{scenario.data_version}</dd>
                </div>
                {getMacroSourceVintage(scenario) ? (
                  <div>
                    <dt>{t('scenarioLab.savedRuns.fields.sourceVintage')}</dt>
                    <dd>{getMacroSourceVintage(scenario)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>{t('scenarioLab.savedRuns.fields.saved')}</dt>
                  <dd>{formatSavedAt(getSavedTimestamp(scenario), locale)}</dd>
                </div>
                {getMacroKeyOutputs(scenario).map((metric) => (
                  <div key={metric.label}>
                    <dt>{metric.label}</dt>
                    <dd>{metric.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          )
        })}
      </div>
    </section>
  )
}
