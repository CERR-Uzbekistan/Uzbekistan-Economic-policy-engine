import { useTranslation } from 'react-i18next'
import { isIoSectorShockRecord, type SavedScenarioRecord } from '../../state/scenarioStore.js'

type ScenarioLabSavedRunsPanelProps = {
  savedScenarios: SavedScenarioRecord[]
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

export function ScenarioLabSavedRunsPanel({ savedScenarios }: ScenarioLabSavedRunsPanelProps) {
  const { t } = useTranslation()

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
        </div>
      </section>
    )
  }

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
      </div>

      <div className="saved-runs-panel__list">
        {savedScenarios.map((scenario) => {
          if (isIoSectorShockRecord(scenario)) {
            const run = scenario.io_sector_shock
            return (
              <article className="saved-runs-panel__item saved-runs-panel__item--io" key={scenario.scenario_id}>
                <div>
                  <span>{t('scenarioLab.savedRuns.type.io')}</span>
                  <h3>{run.title}</h3>
                  <p>{t('scenarioLab.savedRuns.ioBoundary')}</p>
                </div>
                <dl>
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
                <span>{t('scenarioLab.savedRuns.type.macro')}</span>
                <h3>{scenario.scenario_name}</h3>
                <p>{scenario.description || t('scenarioLab.savedRuns.macroFallback')}</p>
              </div>
              <dl>
                <div>
                  <dt>{t('scenarioLab.savedRuns.fields.type')}</dt>
                  <dd>{scenario.scenario_type}</dd>
                </div>
                <div>
                  <dt>{t('scenarioLab.savedRuns.fields.data')}</dt>
                  <dd>{scenario.data_version}</dd>
                </div>
                <div>
                  <dt>{t('scenarioLab.savedRuns.fields.saved')}</dt>
                  <dd>{new Date(scenario.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </article>
          )
        })}
      </div>
    </section>
  )
}
