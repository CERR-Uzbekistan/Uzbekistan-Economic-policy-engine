import { useEffect, useState } from 'react'
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
  retryModelExplorerSourceState,
} from '../data/model-explorer/source'
import { beginRetry } from '../data/source-state'
import './model-explorer.css'

const TAB_LABELS: Record<ModelExplorerTabId, string> = {
  assumptions: 'Assumptions',
  equations: 'Equations',
  caveats: 'Caveats',
  data_sources: 'Data sources',
}

function formatSeverityLabel(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

const STATUS_LABELS: Record<ModelRunStatus, string> = {
  active: 'Active',
  staging: 'Staging',
  paused: 'Paused',
}

function DetailPanelContent({ tab, detail }: { tab: ModelExplorerTabId; detail: ModelExplorerModelDetail }) {
  if (tab === 'assumptions') {
    if (detail.assumptions.length === 0) {
      return <p className="empty-state">No assumptions are documented for this model.</p>
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
      return <p className="empty-state">No equations are documented for this model.</p>
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
      return <p className="empty-state">No caveats are documented for this model.</p>
    }
    return (
      <div className="model-explorer-list">
        {detail.caveats.map((caveat) => (
          <article key={caveat.caveat_id} className="model-explorer-item">
            <h3>
              <span className="ui-chip ui-chip--neutral">{formatSeverityLabel(caveat.severity)}</span>
            </h3>
            <p>{caveat.message}</p>
            <p className="model-explorer-item__value">Implication: {caveat.implication}</p>
          </article>
        ))}
      </div>
    )
  }

  if (detail.data_sources.length === 0) {
    return <p className="empty-state">No data sources are documented for this model.</p>
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
    const nextState = await retryModelExplorerSourceState()
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
          title="Model Explorer"
          description="Basic model catalog and technical reference for assumptions, equations, caveats, and sources."
        />
        <p className="empty-state" role="status" aria-live="polite">
          Loading model metadata...
        </p>
      </PageContainer>
    )
  }

  if (sourceState.status === 'error' || !sourceState.workspace) {
    return (
      <PageContainer className="model-explorer-page">
        <PageHeader
          title="Model Explorer"
          description="Basic model catalog and technical reference for assumptions, equations, caveats, and sources."
        />
        <p className="empty-state" role="status" aria-live="polite">
          {sourceState.error ?? 'Model metadata is currently unavailable.'}
        </p>
        {sourceState.canRetry ? (
          <div>
            <button type="button" className="ui-secondary-action" onClick={handleRetry}>
              Retry
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
        title="Model Explorer"
        description="Basic model catalog and technical reference for assumptions, equations, caveats, and sources."
      />

      {models.length === 0 || !selectedModel || !selectedDetail ? (
        <p className="empty-state">No model metadata is available in this workspace.</p>
      ) : (
        <div className="model-explorer-layout">
          <section className="model-explorer-panel" aria-labelledby="model-catalog-title">
            <div className="page-section-head">
              <h2 id="model-catalog-title">Model catalog</h2>
              <p>Select one model to inspect technical assumptions and caveats.</p>
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
                      <span className="ui-chip ui-chip--neutral">{STATUS_LABELS[model.status]}</span>
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

            <div className="segmented-control" role="tablist" aria-label="Model detail tabs">
              {(Object.keys(TAB_LABELS) as ModelExplorerTabId[]).map((tab) => {
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
                    {TAB_LABELS[tab]}
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
