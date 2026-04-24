import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '../components/layout/PageContainer'
import { PageHeader } from '../components/layout/PageHeader'
import { ReformTimeline } from '../components/knowledge-hub/ReformTimeline'
import { ResearchBriefList } from '../components/knowledge-hub/ResearchBriefList'
import {
  getInitialKnowledgeHubSourceState,
  loadKnowledgeHubSourceState,
} from '../data/knowledge-hub/source'
import './knowledge-hub.css'

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

  if (sourceState.status === 'loading' || !sourceState.content) {
    return (
      <PageContainer>
        <PageHeader
          title={t('pages.knowledgeHub.title')}
          description={t('pages.knowledgeHub.description')}
        />
        <p className="empty-state" role="status" aria-live="polite">
          {t('states.loading.knowledgeHub')}
        </p>
      </PageContainer>
    )
  }

  const { reforms, briefs, meta } = sourceState.content

  const pageHeaderMeta = (
    <>
      <span className="page-header__eyebrow">{t('knowledgeHub.header.eyebrow')}</span>
      <span>
        {t('knowledgeHub.header.meta.reformsTracked')} {t('overview.common.middleDot')}{' '}
        <strong>{meta.reforms_tracked}</strong>
      </span>
      <span>
        {t('knowledgeHub.header.meta.researchBriefs')} {t('overview.common.middleDot')}{' '}
        <strong>{meta.research_briefs}</strong>
      </span>
      <span>
        {t('knowledgeHub.header.meta.literatureItems')} {t('overview.common.middleDot')}{' '}
        <strong>{meta.literature_items}</strong>
      </span>
    </>
  )

  return (
    <PageContainer className="knowledge-hub-page">
      <PageHeader
        title={t('pages.knowledgeHub.title')}
        description={t('pages.knowledgeHub.description')}
        meta={pageHeaderMeta}
      />
      <div className="hub-grid">
        <ReformTimeline reforms={reforms} />
        <ResearchBriefList briefs={briefs} />
      </div>
    </PageContainer>
  )
}
