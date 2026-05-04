import { useTranslation } from 'react-i18next'
import { PageContainer } from '../components/layout/PageContainer.js'
import { PageHeader } from '../components/layout/PageHeader.js'
import { PendingSurface } from '../components/system/PendingSurface.js'
import './knowledge-hub.css'

export function KnowledgeHubPage() {
  const { t } = useTranslation()

  const pageHeaderMeta = (
    <>
      <span className="page-header__eyebrow">{t('knowledgeHub.pending.status')}</span>
      <span>{t('knowledgeHub.pending.reason')}</span>
    </>
  )

  return (
    <PageContainer className="knowledge-hub-page">
      <PageHeader
        title={t('pages.knowledgeHub.title')}
        description={t('pages.knowledgeHub.description')}
        meta={pageHeaderMeta}
      />
      <PendingSurface
        title={t('knowledgeHub.pending.title')}
        message={t('knowledgeHub.pending.message')}
        reasonLabel={t('knowledgeHub.pending.status')}
        nextStep={t('knowledgeHub.pending.nextStep')}
      />
    </PageContainer>
  )
}
