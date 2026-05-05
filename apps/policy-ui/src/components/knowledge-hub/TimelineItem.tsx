import type { ReformTrackerItem } from '../../contracts/data-contract.js'

type TimelineItemProps = {
  item: ReformTrackerItem
}

const STATUS_CLASS: Record<ReformTrackerItem['status'], string> = {
  adopted: '',
  in_implementation: 'in-progress',
  planned: 'planned',
  superseded: 'planned',
}

export function TimelineItem({ item }: TimelineItemProps) {
  const statusClass = STATUS_CLASS[item.status]
  const caveat = item.caveats[0] ?? 'Item-level caveat pending.'
  return (
    <div className={`tl-item${statusClass ? ` ${statusClass}` : ''}`}>
      <div className="tl-date">{item.as_of_date ?? item.source_published_at ?? 'Date pending'}</div>
      <h4>{item.title}</h4>
      <p>{item.summary}</p>
      <div className="meta">
        <span className="ui-chip ui-chip--accent">{item.domain_tag}</span>
        <span className="ui-chip">{item.reform_category}</span>
        <span className="ui-chip">{item.status}</span>
        <span className="ui-chip">{item.review_state}</span>
        {item.model_refs.map((ref) => (
          <span key={ref} className="attribution-badge">
            {ref}
          </span>
        ))}
      </div>
      <dl className="tracker-item-meta" aria-label={`${item.title} source and review metadata`}>
        <div>
          <dt>Source</dt>
          <dd>
            <a href={item.source_url}>{item.source_institution}</a>
          </dd>
        </div>
        <div>
          <dt>Source date</dt>
          <dd>{item.source_published_at ?? 'Unavailable'}</dd>
        </div>
        <div>
          <dt>Evidence type</dt>
          <dd>{item.evidence_types.join(', ')}</dd>
        </div>
        <div>
          <dt>Review</dt>
          <dd>{`${item.review_state} / ${item.review_status}`}</dd>
        </div>
      </dl>
      <p className="tracker-item-caveat">{caveat}</p>
    </div>
  )
}
