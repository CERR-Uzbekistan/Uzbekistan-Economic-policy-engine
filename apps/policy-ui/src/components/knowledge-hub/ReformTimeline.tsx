import { useTranslation } from 'react-i18next'
import type { ReformTrackerItem } from '../../contracts/data-contract.js'
import { TimelineItem } from './TimelineItem.js'

type ReformTimelineProps = {
  reforms: ReformTrackerItem[]
}

export function ReformTimeline({ reforms }: ReformTimelineProps) {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="knowledge-hub-reform-timeline-title">
      <div className="page-section-head">
        <h2 id="knowledge-hub-reform-timeline-title">{t('knowledgeHub.reforms.title')}</h2>
        <p>{t('knowledgeHub.reforms.helper')}</p>
      </div>
      {reforms.length === 0 ? (
        <p className="empty-state">{t('knowledgeHub.reforms.empty')}</p>
      ) : (
        <div className="timeline">
          {reforms.map((reform) => (
            <TimelineItem key={reform.id} item={reform} />
          ))}
        </div>
      )}
    </section>
  )
}
