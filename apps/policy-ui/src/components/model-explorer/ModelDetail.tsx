import { useTranslation } from 'react-i18next'
import type { ModelCatalogEntry } from '../../contracts/data-contract'
import { BridgeEvidencePanel } from './BridgeEvidencePanel.js'
import { CaveatList } from './CaveatList.js'
import { DataSourceList } from './DataSourceList.js'
import { EquationBlock } from './EquationBlock.js'
import { ParameterTable } from './ParameterTable.js'
import { ValidationSummary } from './ValidationSummary.js'
import { equationRegistry } from './equations/index.js'

export type ModelExplorerTab =
  | 'overview'
  | 'equations'
  | 'parameters'
  | 'data_sources'
  | 'caveats'

const TAB_LABEL_KEYS: Record<ModelExplorerTab, string> = {
  overview: 'modelExplorer.tabs.overview',
  equations: 'modelExplorer.tabs.equations',
  parameters: 'modelExplorer.tabs.parameters',
  data_sources: 'modelExplorer.tabs.dataSources',
  caveats: 'modelExplorer.tabs.caveats',
}

type ModelDetailProps = {
  entry: ModelCatalogEntry
  activeTab: ModelExplorerTab
  onTabChange: (tab: ModelExplorerTab) => void
}

function Equations({ entry }: { entry: ModelCatalogEntry }) {
  const jsxMap = equationRegistry[entry.id] ?? {}
  return (
    <div className="model-equations-stack">
      {entry.equations.map((equation) => (
        <EquationBlock key={equation.id} equation={equation} jsx={jsxMap[equation.id]} />
      ))}
    </div>
  )
}

export function ModelDetail({ entry, activeTab, onTabChange }: ModelDetailProps) {
  const { t } = useTranslation()
  const tabs: ModelExplorerTab[] = ['overview', 'equations', 'parameters', 'data_sources', 'caveats']

  return (
    <div className="model-detail" aria-labelledby="model-detail-title">
      <div className="model-detail__head">
        <h3 id="model-detail-title">
          <span className="sub">{entry.lifecycle_label}</span>
          {entry.full_title}
        </h3>
        <span className={`status-badge status-badge--${entry.status.severity}`}>
          {entry.status.label}
        </span>
      </div>

      <div
        className="model-detail__tabs segmented-control"
        role="tablist"
        aria-label={t('modelExplorer.tabs.aria')}
      >
        {tabs.map((tab) => {
          const isActive = tab === activeTab
          return (
            <button
              key={tab}
              id={`model-detail-tab-${tab}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`model-detail-panel-${tab}`}
              tabIndex={isActive ? 0 : -1}
              className={isActive ? 'active' : ''}
              onClick={() => onTabChange(tab)}
            >
              {t(TAB_LABEL_KEYS[tab])}
            </button>
          )
        })}
      </div>

      <div
        className="model-detail__body"
        role="tabpanel"
        id={`model-detail-panel-${activeTab}`}
        aria-labelledby={`model-detail-tab-${activeTab}`}
      >
        {/* Overview tab shows the full 2-col body; other tabs filter to one section. */}
        {activeTab === 'overview' ? (
          <>
            <div className="model-detail__column">
              <h4>{t('modelExplorer.purpose.title')}</h4>
              <p className="model-detail__purpose">{entry.purpose}</p>
              <h4>{t('modelExplorer.equations.title')}</h4>
              <Equations entry={entry} />
              <h4>{t('modelExplorer.parameters.title')}</h4>
              <ParameterTable parameters={entry.parameters} />
            </div>
            <div className="model-detail__column">
              <BridgeEvidencePanel evidence={entry.bridge_evidence} />
              <h4>{t('modelExplorer.caveats.title')}</h4>
              <CaveatList caveats={entry.caveats} />
              <h4>{t('modelExplorer.dataSources.title')}</h4>
              <DataSourceList dataSources={entry.data_sources} />
              <h4>{t('modelExplorer.validation.title')}</h4>
              <ValidationSummary paragraphs={entry.validation_summary} />
            </div>
          </>
        ) : activeTab === 'equations' ? (
          <div className="model-detail__column model-detail__column--wide">
            <h4>{t('modelExplorer.equations.title')}</h4>
            <Equations entry={entry} />
          </div>
        ) : activeTab === 'parameters' ? (
          <div className="model-detail__column model-detail__column--wide">
            <h4>{t('modelExplorer.parameters.title')}</h4>
            <ParameterTable parameters={entry.parameters} />
          </div>
        ) : activeTab === 'data_sources' ? (
          <div className="model-detail__column model-detail__column--wide">
            <h4>{t('modelExplorer.dataSources.title')}</h4>
            <DataSourceList dataSources={entry.data_sources} />
          </div>
        ) : (
          <div className="model-detail__column model-detail__column--wide">
            <h4>{t('modelExplorer.caveats.title')}</h4>
            <CaveatList caveats={entry.caveats} />
          </div>
        )}
      </div>
    </div>
  )
}
