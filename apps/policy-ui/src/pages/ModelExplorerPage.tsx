import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '../components/layout/PageContainer'
import { PageHeader } from '../components/layout/PageHeader'
import type {
  ModelExplorerModelDetail,
  ModelExplorerTabId,
  ModelRunStatus,
} from '../contracts/data-contract'
import {
  getInitialModelExplorerSourceState,
  loadModelExplorerSourceState,
} from '../data/model-explorer/source'
import { beginRetry } from '../data/source-state'
import './model-explorer.css'

const TAB_LABEL_KEYS: Record<ModelExplorerTabId, string> = {
  assumptions: 'pages.modelExplorer.tabs.assumptions',
  equations: 'pages.modelExplorer.tabs.equations',
  caveats: 'pages.modelExplorer.tabs.caveats',
  data_sources: 'pages.modelExplorer.tabs.dataSources',
}

function formatSeverityLabel(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

const STATUS_LABEL_KEYS: Record<ModelRunStatus, string> = {
  active: 'pages.modelExplorer.status.active',
  staging: 'pages.modelExplorer.status.staging',
  paused: 'pages.modelExplorer.status.paused',
}

function DetailPanelContent({ tab, detail }: { tab: ModelExplorerTabId; detail: ModelExplorerModelDetail }) {
  const { t } = useTranslation()

  if (tab === 'assumptions') {
    if (detail.assumptions.length === 0) {
      return <p className="empty-state">{t('pages.modelExplorer.detail.empty.assumptions')}</p>
    }
    return (
      <div className="model-explorer-list">
        {detail.assumptions.map((assumption) => (
          <article key={assumption.assumption_id} className="model-explorer-item">
            <h3>{assumption.label}</h3>
            <p className="model-explorer-item__value">{assumption.value}</p>
            <p>{assumption.rationale}</p>
          </article>
        ))}
      </div>
    )
  }

  if (tab === 'equations') {
    if (detail.equations.length === 0) {
      return <p className="empty-state">{t('pages.modelExplorer.detail.empty.equations')}</p>
    }
    return (
      <div className="model-explorer-list">
        {detail.equations.map((equation) => (
          <article key={equation.equation_id} className="model-explorer-item">
            <h3>{equation.title}</h3>
            <pre className="model-explorer-equation">
              <code>{equation.expression}</code>
            </pre>
            <p>{equation.explanation}</p>
          </article>
        ))}
      </div>
    )
  }

  if (tab === 'caveats') {
    if (detail.caveats.length === 0) {
      return <p className="empty-state">{t('pages.modelExplorer.detail.empty.caveats')}</p>
    }
    return (
      <div className="model-explorer-list">
        {detail.caveats.map((caveat) => (
          <article key={caveat.caveat_id} className="model-explorer-item">
            <h3>
              <span className="ui-chip ui-chip--neutral">
                {t(`pages.modelExplorer.severity.${caveat.severity}`, {
                  defaultValue: formatSeverityLabel(caveat.severity),
                })}
              </span>
            </h3>
            <p>{caveat.message}</p>
            <p className="model-explorer-item__value">
              {t('pages.modelExplorer.detail.implicationPrefix')}: {caveat.implication}
            </p>
          </article>
        ))}
      </div>
    )
  }

  if (detail.data_sources.length === 0) {
    return <p className="empty-state">{t('pages.modelExplorer.detail.empty.dataSources')}</p>
  }

  return (
    <div className="model-explorer-list">
      {detail.data_sources.map((source) => (
        <article key={source.source_id} className="model-explorer-item">
          <h3>{source.name}</h3>
          <p className="model-explorer-item__value">
            {source.provider} · {source.frequency} · {source.vintage}
          </p>
          <p>{source.note}</p>
        </article>
      ))}
    </div>
  )
}

export function ModelExplorerPage() {
  const { t } = useTranslation()
  const [sourceState, setSourceState] = useState(getInitialModelExplorerSourceState)
  const [selectedModelId, setSelectedModelId] = useState('')
  const [activeTab, setActiveTab] = useState<ModelExplorerTabId>('assumptions')

  useEffect(() => {
    let cancelled = false
    loadModelExplorerSourceState().then((state) => {
      if (!cancelled) {
        setSourceState(state)
        if (state.status === 'ready' && state.workspace) {
          const fallbackModelId = state.workspace.models[0]?.model_id ?? ''
          setSelectedModelId(state.workspace.default_model_id || fallbackModelId)
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleRetry() {
    setSourceState((prev) => beginRetry(prev))
    const nextState = await loadModelExplorerSourceState()
    setSourceState(nextState)
    if (nextState.status === 'ready' && nextState.workspace) {
      const fallbackModelId = nextState.workspace.models[0]?.model_id ?? ''
      setSelectedModelId(nextState.workspace.default_model_id || fallbackModelId)
    }
  }

  if (sourceState.status === 'loading') {
    return (
      <PageContainer className="model-explorer-page">
        <PageHeader
          title={t('pages.modelExplorer.title')}
          description={t('pages.modelExplorer.description')}
        />
        <p className="empty-state" role="status" aria-live="polite">
          {t('states.loading.modelExplorer')}
        </p>
      </PageContainer>
    )
  }

  if (sourceState.status === 'error' || !sourceState.workspace) {
    return (
      <PageContainer className="model-explorer-page">
        <PageHeader
          title={t('pages.modelExplorer.title')}
          description={t('pages.modelExplorer.description')}
        />
        <p className="empty-state" role="alert">
          {sourceState.error ?? t('states.error.modelExplorerUnavailable')}
        </p>
        {sourceState.canRetry ? (
          <div>
            <button type="button" className="ui-secondary-action" onClick={handleRetry}>
              {t('buttons.retry')}
            </button>
          </div>
        ) : null}
      </PageContainer>
    )
  }

  const { models, default_model_id, details_by_model_id } = sourceState.workspace
  const effectiveSelectedModelId = selectedModelId || default_model_id
  const selectedModel = models.find((model) => model.model_id === effectiveSelectedModelId) ?? models[0]
  const selectedDetail = selectedModel ? details_by_model_id[selectedModel.model_id] : undefined

  return (
    <PageContainer className="model-explorer-page">
      <PageHeader
        title={t('pages.modelExplorer.title')}
        description={t('pages.modelExplorer.description')}
      />

      {models.length === 0 || !selectedModel || !selectedDetail ? (
        <p className="empty-state">{t('pages.modelExplorer.emptyState')}</p>
      ) : (
        <div className="model-explorer-layout">
          <section className="model-explorer-panel" aria-labelledby="model-catalog-title">
            <div className="page-section-head">
              <h2 id="model-catalog-title">{t('pages.modelExplorer.catalogTitle')}</h2>
              <p>{t('pages.modelExplorer.catalogHint')}</p>
            </div>

            <div className="model-explorer-catalog">
              {models.map((model) => {
                const isActive = model.model_id === selectedModel.model_id
                return (
                  <button
                    key={model.model_id}
                    type="button"
                    className={`model-explorer-model-button${isActive ? ' active' : ''}`}
                    onClick={() => {
                      setSelectedModelId(model.model_id)
                      setActiveTab('assumptions')
                    }}
                  >
                    <div className="model-explorer-model-button__head">
                      <strong>{model.model_name}</strong>
                      <span className="ui-chip ui-chip--neutral">{t(STATUS_LABEL_KEYS[model.status])}</span>
                    </div>
                    <p className="model-explorer-model-button__meta">
                      {model.model_type} · {model.frequency}
                    </p>
                    <p>{model.summary}</p>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="model-explorer-panel" aria-labelledby="model-detail-title">
            <div className="page-section-head">
              <h2 id="model-detail-title">{selectedModel.model_name}</h2>
              <p>{selectedDetail.overview}</p>
            </div>

            <div
              className="segmented-control"
              role="tablist"
              aria-label={t('pages.modelExplorer.detailTabsAria')}
            >
              {(Object.keys(TAB_LABEL_KEYS) as ModelExplorerTabId[]).map((tab) => {
                const isActive = tab === activeTab
                return (
                  <button
                    key={tab}
                    id={`model-explorer-tab-${tab}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`model-explorer-tabpanel-${tab}`}
                    tabIndex={isActive ? 0 : -1}
                    className={isActive ? 'active' : ''}
                    onClick={() => setActiveTab(tab)}
                  >
                    {t(TAB_LABEL_KEYS[tab])}
                  </button>
                )
              })}
            </div>

            <div
              id={`model-explorer-tabpanel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`model-explorer-tab-${activeTab}`}
            >
              <DetailPanelContent tab={activeTab} detail={selectedDetail} />
            </div>
          </section>
        </div>
      )}
    </PageContainer>
  )
}
