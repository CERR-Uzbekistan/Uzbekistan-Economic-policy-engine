import type { ReformTrackerItem } from '../../contracts/data-contract.js'

type TimelineItemProps = {
  item: ReformTrackerItem
}

const STATUS_CLASS: Record<ReformTrackerItem['status'], string> = {
  completed: '',
  in_progress: 'in-progress',
  planned: 'planned',
}

export function TimelineItem({ item }: TimelineItemProps) {
  const statusClass = STATUS_CLASS[item.status]
  return (
    <div className={`tl-item${statusClass ? ` ${statusClass}` : ''}`}>
      <div className="tl-date">{item.date_label}</div>
      <h4>{item.title}</h4>
      <p>{item.mechanism}</p>
      <div className="meta">
        <span className="ui-chip ui-chip--accent">{item.domain_tag}</span>
        {item.model_refs.map((ref) => (
          <span key={ref} className="attribution-badge">
            {ref}
          </span>
        ))}
      </div>
    </div>
  )
}
