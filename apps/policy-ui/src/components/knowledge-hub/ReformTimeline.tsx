import type { ReformTrackerItem } from '../../contracts/data-contract.js'
import { TimelineItem } from './TimelineItem.js'

type ReformTimelineProps = {
  reforms: ReformTrackerItem[]
}

export function ReformTimeline({ reforms }: ReformTimelineProps) {
  return (
    <section aria-labelledby="knowledge-hub-reform-timeline-title" className="accepted-section">
      <div className="page-section-head">
        <h2 id="knowledge-hub-reform-timeline-title">Accepted reforms</h2>
        <p>Owner-reviewed records cleared for internal tracker display.</p>
      </div>
      {reforms.length === 0 ? (
        <p className="empty-state">
          No accepted reforms are displayed yet. This is intentional: source-extracted items stay
          in the candidate queue until a reviewer of record clears source, status, category,
          evidence type, and caveat metadata.
        </p>
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
