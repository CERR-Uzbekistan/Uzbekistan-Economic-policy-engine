import type { ModelCatalogEntry } from '../../contracts/data-contract'

type ModelCatalogCardProps = {
  entry: ModelCatalogEntry
  isActive: boolean
  onSelect: () => void
}

export function ModelCatalogCard({ entry, isActive, onSelect }: ModelCatalogCardProps) {
  return (
    <button
      type="button"
      className={`model-card${isActive ? ' active' : ''}`}
      aria-pressed={isActive}
      onClick={onSelect}
    >
      <div className="model-card__head">
        <h3 className="model-card__title">{entry.title}</h3>
        <span className={`status-badge status-badge--${entry.status.severity}`}>
          {entry.status.label}
        </span>
      </div>
      <p className="model-card__meta">{entry.methodology_signature}</p>
      <p className="model-card__desc">{entry.description}</p>
      <div className="model-card__stats">
        {entry.stats.map((stat) => (
          <div key={stat.label} className="model-card__stat">
            <b>{stat.value}</b>
            {stat.label}
          </div>
        ))}
      </div>
    </button>
  )
}
