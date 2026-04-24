import { useTranslation } from 'react-i18next'
import type { ResearchBrief } from '../../contracts/data-contract.js'
import { BriefCard } from './BriefCard.js'

type ResearchBriefListProps = {
  briefs: ResearchBrief[]
}

export function ResearchBriefList({ briefs }: ResearchBriefListProps) {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="knowledge-hub-research-briefs-title">
      <div className="page-section-head">
        <h2 id="knowledge-hub-research-briefs-title">{t('knowledgeHub.briefs.title')}</h2>
        <p>{t('knowledgeHub.briefs.helper')}</p>
      </div>
      {briefs.length === 0 ? (
        <p className="empty-state">{t('knowledgeHub.briefs.empty')}</p>
      ) : (
        <div className="brief-list">
          {briefs.map((brief) => (
            <BriefCard key={brief.id} brief={brief} />
          ))}
        </div>
      )}
    </section>
  )
}
