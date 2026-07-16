import type { ModelCatalogEntry } from '../../contracts/data-contract'
import { useTranslation } from 'react-i18next'

type ModelCatalogCardProps = {
  entry: ModelCatalogEntry
  isActive: boolean
  onSelect: () => void
}

export function ModelCatalogCard({ entry, isActive, onSelect }: ModelCatalogCardProps) {
  const { t } = useTranslation()
  const isActiveModel = entry.status.severity === 'ok' || entry.status.label === 'Experimental reference'
  const statusLabel = isActiveModel
    ? t('modelExplorer.status.active')
    : t('modelExplorer.status.notActive')
  const availabilityLabel = isActiveModel
    ? t('modelExplorer.card.currentUse')
    : t('modelExplorer.card.methodologyOnly')

  return (
    <button
      type="button"
      className={`model-card${isActive ? ' active' : ''}`}
      aria-pressed={isActive}
      aria-label={t('modelExplorer.card.selectAria', { model: entry.title })}
      onClick={onSelect}
    >
      <div className="model-card__head">
        <h3 className="model-card__title">{entry.title}</h3>
        <span className={`status-badge status-badge--${entry.status.severity}`}>
          {statusLabel}
        </span>
      </div>
      <p className="model-card__availability">{availabilityLabel}</p>
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
