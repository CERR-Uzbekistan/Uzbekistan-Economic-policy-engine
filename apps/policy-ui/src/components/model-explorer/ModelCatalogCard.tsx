import type { ModelCatalogEntry } from '../../contracts/data-contract'
import { TrustStateLabel } from '../system/TrustStateLabel.js'

type ModelCatalogCardProps = {
  entry: ModelCatalogEntry
  isActive: boolean
  onSelect: () => void
}

export function ModelCatalogCard({ entry, isActive, onSelect }: ModelCatalogCardProps) {
  const isBridgeBacked = entry.id === 'qpm-uzbekistan' || entry.id === 'dfm-nowcast' || entry.id === 'io-model'

  return (
    <button
      type="button"
      className={`model-card${isActive ? ' active' : ''}`}
      aria-pressed={isActive}
      onClick={onSelect}
    >
      <div className="model-card__head">
        <h3 className="model-card__title">{entry.title}</h3>
        <span className="model-card__labels">
          <TrustStateLabel
            id={isBridgeBacked ? 'liveBridgeJson' : 'planned'}
            tone={isBridgeBacked ? 'success' : 'warn'}
          />
          <span className={`status-badge status-badge--${entry.status.severity}`}>
            {entry.status.label}
          </span>
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
