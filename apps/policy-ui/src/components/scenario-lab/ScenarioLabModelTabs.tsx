import { useTranslation } from 'react-i18next'

export type ScenarioLabModelTab =
  | 'macro_qpm'
  | 'io_sector_shock'
  | 'pe_trade_shock'
  | 'cge_reform_shock'
  | 'fpp_fiscal_path'
  | 'saved_runs'
  | 'synthesis_preview'

type ScenarioLabModelTabDefinition = {
  id: ScenarioLabModelTab
  labelKey: string
  subtitleKey: string
  statusKey: string
}

const ACTIVE_SCENARIO_LAB_MODEL_TABS: ScenarioLabModelTabDefinition[] = [
  {
    id: 'macro_qpm',
    labelKey: 'scenarioLab.modelTabs.macroQpm',
    subtitleKey: 'scenarioLab.modelTabs.subtitle.macroQpm',
    statusKey: 'scenarioLab.modelTabs.status.active',
  },
  {
    id: 'io_sector_shock',
    labelKey: 'scenarioLab.modelTabs.ioSectorShock',
    subtitleKey: 'scenarioLab.modelTabs.subtitle.ioSectorShock',
    statusKey: 'scenarioLab.modelTabs.status.bridgePilot',
  },
  {
    id: 'pe_trade_shock',
    labelKey: 'scenarioLab.modelTabs.peTradeShock',
    subtitleKey: 'scenarioLab.modelTabs.subtitle.peTradeShock',
    statusKey: 'scenarioLab.modelTabs.status.bridgePilot',
  },
  {
    id: 'saved_runs',
    labelKey: 'scenarioLab.modelTabs.savedRuns',
    subtitleKey: 'scenarioLab.modelTabs.subtitle.savedRuns',
    statusKey: 'scenarioLab.modelTabs.status.shell',
  },
]

const PLANNED_SCENARIO_LAB_MODEL_LANES: ScenarioLabModelTabDefinition[] = [
  {
    id: 'cge_reform_shock',
    labelKey: 'scenarioLab.modelTabs.cgeReformShock',
    subtitleKey: 'scenarioLab.modelTabs.subtitle.cgeReformShock',
    statusKey: 'scenarioLab.modelTabs.status.planned',
  },
  {
    id: 'fpp_fiscal_path',
    labelKey: 'scenarioLab.modelTabs.fppFiscalPath',
    subtitleKey: 'scenarioLab.modelTabs.subtitle.fppFiscalPath',
    statusKey: 'scenarioLab.modelTabs.status.planned',
  },
  {
    id: 'synthesis_preview',
    labelKey: 'scenarioLab.modelTabs.synthesisPreview',
    subtitleKey: 'scenarioLab.modelTabs.subtitle.synthesisPreview',
    statusKey: 'scenarioLab.modelTabs.status.planned',
  },
]

type ScenarioLabModelTabsProps = {
  activeTab: ScenarioLabModelTab
  onTabChange: (tab: ScenarioLabModelTab) => void
}

export function ScenarioLabModelTabs({ activeTab, onTabChange }: ScenarioLabModelTabsProps) {
  const { t } = useTranslation()
  const plannedTitle = t('scenarioLab.modelTabs.plannedTitle')
  const plannedDescription = t('scenarioLab.modelTabs.plannedDescription')

  return (
    <section className="scenario-model-tabs" aria-labelledby="scenario-model-tabs-title">
      <div className="scenario-model-tabs__head">
        <h2 id="scenario-model-tabs-title">{t('scenarioLab.modelTabs.title')}</h2>
        <p>{t('scenarioLab.modelTabs.description')}</p>
      </div>
      <div
        className="scenario-model-tabs__list"
        role="tablist"
        aria-label={t('scenarioLab.modelTabs.tabsAria')}
      >
        {ACTIVE_SCENARIO_LAB_MODEL_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              id={`scenario-model-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`scenario-model-tabpanel-${tab.id}`}
              tabIndex={0}
              className={isActive ? 'scenario-model-tabs__tab active' : 'scenario-model-tabs__tab'}
              onClick={() => onTabChange(tab.id)}
            >
              <span>{t(tab.labelKey)}</span>
              <small className="scenario-model-tabs__subtitle">{t(tab.subtitleKey)}</small>
              <small className="scenario-model-tabs__status">{t(tab.statusKey)}</small>
            </button>
          )
        })}
      </div>
      <details className="scenario-model-tabs__planned">
        <summary id="scenario-model-tabs-planned-title" aria-label={`${plannedTitle}. ${plannedDescription}`}>
          <span>{plannedTitle}</span>
          <small>{plannedDescription}</small>
        </summary>
        <ul>
          {PLANNED_SCENARIO_LAB_MODEL_LANES.map((tab) => (
            <li key={tab.id}>
              <span>{t(tab.labelKey)}</span>
              <small>{t(tab.subtitleKey)}</small>
              <small>{t(tab.statusKey)}</small>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
