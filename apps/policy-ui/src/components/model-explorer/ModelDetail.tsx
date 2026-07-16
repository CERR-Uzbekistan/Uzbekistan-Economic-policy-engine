import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ModelCatalogEntry,
  ModelNote,
  ModelValidationCheck,
} from '../../contracts/data-contract'
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

const MODEL_EXPLORER_TABS: ModelExplorerTab[] = [
  'overview',
  'equations',
  'parameters',
  'data_sources',
  'caveats',
]

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

function ModelNoteBlock({ note }: { note?: ModelNote }) {
  if (!note) return null

  return (
    <section className="model-note" aria-labelledby="model-note-title">
      <div className="model-note__head">
        <h4 id="model-note-title">{note.title}</h4>
        <p>{note.summary}</p>
      </div>
      <dl className="model-note__facts">
        {note.items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      <ul className="model-note__boundaries">
        {note.boundaries.map((boundary) => (
          <li key={boundary}>{boundary}</li>
        ))}
      </ul>
    </section>
  )
}

const VALIDATION_STATUS_LABELS: Record<ModelValidationCheck['status'], string> = {
  pass: 'Pass',
  caveat: 'Caveat',
  needs_review: 'Needs review',
}

function ValidationCheckList({ checks }: { checks?: ModelValidationCheck[] }) {
  if (!checks || checks.length === 0) return null

  return (
    <div className="validation-checks" aria-label="Validation checks">
      {checks.map((check) => (
        <article key={check.label} className="validation-check">
          <div className="validation-check__head">
            <strong>{check.label}</strong>
            <span
              className={`validation-check__status validation-check__status--${check.status}`}
            >
              {VALIDATION_STATUS_LABELS[check.status]}
            </span>
          </div>
          <p>{check.detail}</p>
        </article>
      ))}
    </div>
  )
}

export function ModelDetail({ entry, activeTab, onTabChange }: ModelDetailProps) {
  const { t } = useTranslation()
  const isActiveModel = entry.status.severity === 'ok' || entry.status.label === 'Experimental reference'

  function focusTab(tab: ModelExplorerTab) {
    window.requestAnimationFrame(() => {
      document.getElementById(`model-detail-tab-${tab}`)?.focus()
    })
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, tab: ModelExplorerTab) {
    const currentIndex = MODEL_EXPLORER_TABS.indexOf(tab)
    let nextTab: ModelExplorerTab | null = null

    if (event.key === 'ArrowRight') {
      nextTab = MODEL_EXPLORER_TABS[(currentIndex + 1) % MODEL_EXPLORER_TABS.length]
    } else if (event.key === 'ArrowLeft') {
      nextTab =
        MODEL_EXPLORER_TABS[
          (currentIndex - 1 + MODEL_EXPLORER_TABS.length) % MODEL_EXPLORER_TABS.length
        ]
    } else if (event.key === 'Home') {
      nextTab = MODEL_EXPLORER_TABS[0]
    } else if (event.key === 'End') {
      nextTab = MODEL_EXPLORER_TABS[MODEL_EXPLORER_TABS.length - 1]
    }

    if (nextTab) {
      event.preventDefault()
      onTabChange(nextTab)
      focusTab(nextTab)
    }
  }

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
        {MODEL_EXPLORER_TABS.map((tab) => {
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
              onKeyDown={(event) => handleTabKeyDown(event, tab)}
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
        {!isActiveModel ? (
          <div className="model-detail__notice" role="note">
            <strong>{t('modelExplorer.statusNotice.referenceTitle')}</strong>
            <span>{t('modelExplorer.statusNotice.referenceBody')}</span>
            {entry.activation_requirements && entry.activation_requirements.length > 0 ? (
              <div className="model-detail__activation">
                <strong>{t('modelExplorer.statusNotice.activationTitle')}</strong>
                <ul>
                  {entry.activation_requirements.map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        {/* Overview tab shows the full 2-col body; other tabs filter to one section. */}
        {activeTab === 'overview' ? (
          <>
            <div className="model-detail__column">
              <h4>{t('modelExplorer.purpose.title')}</h4>
              <p className="model-detail__purpose">{entry.purpose}</p>
              <ModelNoteBlock note={entry.model_note} />
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
              <ValidationCheckList checks={entry.validation_checks} />
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
