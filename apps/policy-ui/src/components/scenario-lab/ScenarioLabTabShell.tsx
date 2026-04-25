import { useTranslation } from 'react-i18next'
import type { ScenarioLabModelTab } from './ScenarioLabModelTabs.js'

type ScenarioLabTabShellProps = {
  tab: Exclude<ScenarioLabModelTab, 'macro_qpm'>
  savedRunCount?: number
}

const SHELL_ITEMS: Record<ScenarioLabTabShellProps['tab'], string[]> = {
  io_sector_shock: [
    'scenarioLab.modelTabShell.io.items.inputs',
    'scenarioLab.modelTabShell.io.items.outputs',
    'scenarioLab.modelTabShell.io.items.boundary',
  ],
  saved_runs: [
    'scenarioLab.modelTabShell.saved.items.macro',
    'scenarioLab.modelTabShell.saved.items.io',
    'scenarioLab.modelTabShell.saved.items.compare',
  ],
  synthesis_preview: [
    'scenarioLab.modelTabShell.synthesis.items.chain',
    'scenarioLab.modelTabShell.synthesis.items.layers',
    'scenarioLab.modelTabShell.synthesis.items.reconciliation',
  ],
}

const TITLE_KEYS: Record<ScenarioLabTabShellProps['tab'], string> = {
  io_sector_shock: 'scenarioLab.modelTabShell.io.title',
  saved_runs: 'scenarioLab.modelTabShell.saved.title',
  synthesis_preview: 'scenarioLab.modelTabShell.synthesis.title',
}

const DESCRIPTION_KEYS: Record<ScenarioLabTabShellProps['tab'], string> = {
  io_sector_shock: 'scenarioLab.modelTabShell.io.description',
  saved_runs: 'scenarioLab.modelTabShell.saved.description',
  synthesis_preview: 'scenarioLab.modelTabShell.synthesis.description',
}

export function ScenarioLabTabShell({ tab, savedRunCount = 0 }: ScenarioLabTabShellProps) {
  const { t } = useTranslation()
  const titleId = `scenario-model-tabpanel-title-${tab}`

  return (
    <section
      className="scenario-tab-shell"
      id={`scenario-model-tabpanel-${tab}`}
      role="tabpanel"
      aria-labelledby={`scenario-model-tab-${tab}`}
    >
      <div className="scenario-tab-shell__intro">
        <p className="scenario-tab-shell__eyebrow">{t('scenarioLab.modelTabShell.eyebrow')}</p>
        <h2 id={titleId}>{t(TITLE_KEYS[tab])}</h2>
        <p>{t(DESCRIPTION_KEYS[tab], { count: savedRunCount })}</p>
      </div>
      <div className="scenario-tab-shell__body">
        <ul>
          {SHELL_ITEMS[tab].map((itemKey) => (
            <li key={itemKey}>{t(itemKey)}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
