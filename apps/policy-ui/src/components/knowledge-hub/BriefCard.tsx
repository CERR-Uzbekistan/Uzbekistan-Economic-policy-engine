import { useTranslation } from 'react-i18next'
import type { ResearchBrief } from '../../contracts/data-contract.js'

type BriefCardProps = {
  brief: ResearchBrief
}

export function BriefCard({ brief }: BriefCardProps) {
  const { t } = useTranslation()
  const { byline } = brief

  const bylineSegments: string[] = []
  if (byline.ai_drafted) {
    bylineSegments.push(t('knowledgeHub.briefs.byline.aiDrafted'))
    if (byline.reviewed_by) {
      bylineSegments.push(t('knowledgeHub.briefs.byline.reviewedBy', { reviewer: byline.reviewed_by }))
    }
  } else if (byline.author) {
    bylineSegments.push(byline.author)
  }
  if (byline.date_label) {
    bylineSegments.push(byline.date_label)
  }
  if (typeof byline.read_time_minutes === 'number') {
    bylineSegments.push(
      t('knowledgeHub.briefs.byline.readTime', { minutes: byline.read_time_minutes }),
    )
  }

  return (
    <article className="brief">
      <div className="brief__author">{bylineSegments.join(' · ')}</div>
      <h4>{brief.title}</h4>
      <p>{brief.summary}</p>
      <div className="meta">
        {byline.ai_drafted ? (
          <span className="ui-chip ui-chip--warn">{t('knowledgeHub.briefs.aiDraftedChip')}</span>
        ) : null}
        {brief.domain_tag ? (
          <span className="ui-chip ui-chip--accent">{brief.domain_tag}</span>
        ) : null}
        {brief.model_refs.map((ref) => (
          <span key={ref} className="attribution-badge">
            {ref}
          </span>
        ))}
      </div>
    </article>
  )
}
