import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KnowledgeHubContentView } from '../components/knowledge-hub/KnowledgeHubContentView.js'
import { PageContainer } from '../components/layout/PageContainer.js'
import { PageHeader } from '../components/layout/PageHeader.js'
import { beginRetry } from '../data/source-state.js'
import {
  getInitialKnowledgeHubSourceState,
  loadKnowledgeHubSourceState,
} from '../data/knowledge-hub/source.js'
import './knowledge-hub.css'

function formatHeaderDate(value: string | undefined): string | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return value
  return parsed.toISOString().slice(0, 10)
}

export function KnowledgeHubPage() {
  const { t } = useTranslation()
  const [sourceState, setSourceState] = useState(getInitialKnowledgeHubSourceState)

  useEffect(() => {
    let cancelled = false
    loadKnowledgeHubSourceState().then((state) => {
      if (!cancelled) {
        setSourceState(state)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleRetry() {
    setSourceState((previous) => beginRetry(previous))
    const nextState = await loadKnowledgeHubSourceState()
    setSourceState(nextState)
  }

  const packageCount = sourceState.content?.meta.reform_packages ?? sourceState.content?.reform_packages?.length ?? 0
  const sourcesConfigured = sourceState.content?.meta.sources_configured ?? 0
  const lastFetchDate = formatHeaderDate(sourceState.content?.generated_at)
  const pageHeaderMeta = (
    <>
      <span className="page-header__eyebrow">{t('knowledgeHub.reformTracker.header.eyebrow')}</span>
      <span>
        <strong>{packageCount}</strong> {t('knowledgeHub.reformTracker.header.packages')}
      </span>
      <span>
        <strong>{sourcesConfigured}</strong> {t('knowledgeHub.reformTracker.header.sources')}
      </span>
      {sourceState.content?.generated_at ? (
        <span>
          {t('knowledgeHub.reformTracker.header.updated')} <strong>{lastFetchDate}</strong>
        </span>
      ) : null}
    </>
  )

  if (sourceState.status === 'loading') {
    return (
      <PageContainer className="knowledge-hub-page">
        <PageHeader
          title={t('pages.knowledgeHub.title')}
          description={t('pages.knowledgeHub.description')}
          meta={pageHeaderMeta}
        />
        <p className="empty-state" role="status" aria-live="polite">
          {t('states.loading.knowledgeHub')}
        </p>
      </PageContainer>
    )
  }

  if (sourceState.status === 'error' || !sourceState.content) {
    return (
      <PageContainer className="knowledge-hub-page">
        <PageHeader
          title={t('pages.knowledgeHub.title')}
          description={t('pages.knowledgeHub.description')}
          meta={pageHeaderMeta}
        />
        <p className="empty-state" role="alert">
          {sourceState.error ?? t('knowledgeHub.reformTracker.errorUnavailable')}
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
    <PageContainer className="knowledge-hub-page">
      <PageHeader
        title={t('pages.knowledgeHub.title')}
        description={t('pages.knowledgeHub.description')}
        meta={pageHeaderMeta}
      />
      <KnowledgeHubContentView content={sourceState.content} />
    </PageContainer>
  )
}
