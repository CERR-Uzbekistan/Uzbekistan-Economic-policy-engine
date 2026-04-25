import { useTranslation } from 'react-i18next'

export type ScenarioLabModelTab =
  | 'macro_qpm'
  | 'io_sector_shock'
  | 'saved_runs'
  | 'synthesis_preview'

type ScenarioLabModelTabDefinition = {
  id: ScenarioLabModelTab
  labelKey: string
  statusKey: string
  disabled?: boolean
}

const SCENARIO_LAB_MODEL_TABS: ScenarioLabModelTabDefinition[] = [
  {
    id: 'macro_qpm',
    labelKey: 'scenarioLab.modelTabs.macroQpm',
    statusKey: 'scenarioLab.modelTabs.status.active',
  },
  {
    id: 'io_sector_shock',
    labelKey: 'scenarioLab.modelTabs.ioSectorShock',
    statusKey: 'scenarioLab.modelTabs.status.next',
  },
  {
    id: 'saved_runs',
    labelKey: 'scenarioLab.modelTabs.savedRuns',
    statusKey: 'scenarioLab.modelTabs.status.shell',
  },
  {
    id: 'synthesis_preview',
    labelKey: 'scenarioLab.modelTabs.synthesisPreview',
    statusKey: 'scenarioLab.modelTabs.status.planned',
    disabled: true,
  },
]

type ScenarioLabModelTabsProps = {
  activeTab: ScenarioLabModelTab
  onTabChange: (tab: ScenarioLabModelTab) => void
}

export function ScenarioLabModelTabs({ activeTab, onTabChange }: ScenarioLabModelTabsProps) {
  const { t } = useTranslation()

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
        {SCENARIO_LAB_MODEL_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              id={`scenario-model-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`scenario-model-tabpanel-${tab.id}`}
              aria-disabled={tab.disabled ? 'true' : undefined}
              tabIndex={isActive ? 0 : -1}
              className={isActive ? 'scenario-model-tabs__tab active' : 'scenario-model-tabs__tab'}
              disabled={tab.disabled}
              onClick={() => {
                if (!tab.disabled) {
                  onTabChange(tab.id)
                }
              }}
            >
              <span>{t(tab.labelKey)}</span>
              <small>{t(tab.statusKey)}</small>
            </button>
          )
        })}
      </div>
    </section>
  )
}
