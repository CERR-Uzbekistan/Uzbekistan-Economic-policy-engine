import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModelCatalogCard } from '../components/model-explorer/ModelCatalogCard'
import { ModelDetail, type ModelExplorerTab } from '../components/model-explorer/ModelDetail'
import { PageContainer } from '../components/layout/PageContainer'
import { PageHeader } from '../components/layout/PageHeader'
import type { ModelCatalogEntry, ModelExplorerWorkspace } from '../contracts/data-contract'
import {
  getInitialModelExplorerSourceState,
  loadModelExplorerSourceState,
} from '../data/model-explorer/source'
import { beginRetry } from '../data/source-state'
import './model-explorer.css'

function getCatalogEntries(workspace: ModelExplorerWorkspace): ModelCatalogEntry[] {
  return Object.values(workspace.catalog_entries_by_model_id ?? {})
}

export function ModelExplorerPage() {
  const { t } = useTranslation()
  const [sourceState, setSourceState] = useState(getInitialModelExplorerSourceState)
  const [activeTab, setActiveTab] = useState<ModelExplorerTab>('overview')
  const [selectedModelId, setSelectedModelId] = useState('')

  useEffect(() => {
    let cancelled = false
    loadModelExplorerSourceState().then((state) => {
      if (!cancelled) {
        setSourceState(state)
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
  }

  const workspace = sourceState.workspace
  const modelCatalogEntries = useMemo(
    () => (workspace ? getCatalogEntries(workspace) : []),
    [workspace],
  )

  const fallbackModelId = workspace?.default_model_id ?? modelCatalogEntries[0]?.id ?? ''
  const effectiveSelectedModelId = modelCatalogEntries.some((entry) => entry.id === selectedModelId)
    ? selectedModelId
    : fallbackModelId
  const selectedEntry =
    modelCatalogEntries.find((entry) => entry.id === effectiveSelectedModelId) ??
    modelCatalogEntries[0]
  const modelCatalogMeta = workspace?.meta ?? {
    models_total: modelCatalogEntries.length,
    models_live: modelCatalogEntries.length,
    last_calibration_audit_label: 'Not available',
    open_methodology_issues: 0,
  }

  const pageHeaderMeta = (
    <>
      <span className="page-header__eyebrow">{t('modelExplorer.header.eyebrow')}</span>
      <span>
        {t('modelExplorer.header.meta.bridgeBackedLabel')} {t('overview.common.middleDot')}{' '}
        <strong>{t('modelExplorer.header.meta.bridgeBackedModels')}</strong>
      </span>
      <span>
        {t('modelExplorer.header.meta.plannedLimitedLabel')} {t('overview.common.middleDot')}{' '}
        <strong>{t('modelExplorer.header.meta.plannedLimitedModels')}</strong>
      </span>
      <span>
        {t('modelExplorer.header.meta.lastAuditLabel')} {t('overview.common.middleDot')}{' '}
        <strong>{modelCatalogMeta.last_calibration_audit_label}</strong>
      </span>
      <span>
        {t('modelExplorer.header.meta.openIssuesLabel')} {t('overview.common.middleDot')}{' '}
        <strong>{modelCatalogMeta.open_methodology_issues}</strong>
      </span>
    </>
  )

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

  if (sourceState.status === 'error' || !workspace) {
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

  return (
    <PageContainer className="model-explorer-page">
      <PageHeader
        title={t('pages.modelExplorer.title')}
        description={t('pages.modelExplorer.description')}
        meta={pageHeaderMeta}
      />

      <div className="model-catalog">
        {modelCatalogEntries.map((entry) => (
          <ModelCatalogCard
            key={entry.id}
            entry={entry}
            isActive={entry.id === (selectedEntry?.id ?? '')}
            onSelect={() => {
              setSelectedModelId(entry.id)
              setActiveTab('overview')
            }}
          />
        ))}
      </div>

      {selectedEntry ? (
        <ModelDetail entry={selectedEntry} activeTab={activeTab} onTabChange={setActiveTab} />
      ) : (
        <p className="empty-state">{t('pages.modelExplorer.emptyState')}</p>
      )}
    </PageContainer>
  )
}
