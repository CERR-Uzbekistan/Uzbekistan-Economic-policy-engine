import { useTranslation } from 'react-i18next'
import type { KnowledgeHubContent } from '../../contracts/data-contract.js'
import { TrustStateLabel } from '../system/TrustStateLabel.js'
import { ReformTimeline } from './ReformTimeline.js'
import { ResearchBriefList } from './ResearchBriefList.js'

type KnowledgeHubContentViewProps = {
  content: KnowledgeHubContent
}

export function KnowledgeHubContentView({ content }: KnowledgeHubContentViewProps) {
  const { t } = useTranslation()
  const { reforms, briefs } = content

  return (
    <>
      <p className="knowledge-hub-static-banner">
        <TrustStateLabel id="staticCuratedContent" tone="warn" />
        <span>{t('knowledgeHub.staticPilotBanner')}</span>
      </p>
      <div className="hub-grid">
        <ReformTimeline reforms={reforms} />
        <ResearchBriefList briefs={briefs} />
      </div>
    </>
  )
}
