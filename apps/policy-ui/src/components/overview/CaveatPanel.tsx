import { useTranslation } from 'react-i18next'
import type { Caveat } from '../../contracts/data-contract'

type CaveatPanelProps = {
  caveats: Caveat[]
}

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const

export function CaveatPanel({ caveats }: CaveatPanelProps) {
  const { t } = useTranslation()

  if (caveats.length === 0) {
    return null
  }

  const sorted = [...caveats].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  )

  return (
    <section
      className="overview-caveats"
      aria-labelledby="overview-caveats-title"
    >
      <div className="overview-caveats__head page-section-head">
        <h2 id="overview-caveats-title">{t('overview.caveats.title')}</h2>
        <p>{t('overview.caveats.description')}</p>
      </div>
      <ul className="overview-caveats__list">
        {sorted.map((caveat) => (
          <li
            key={caveat.caveat_id}
            className={`overview-caveat overview-caveat--${caveat.severity}`}
          >
            <div className="overview-caveat__header">
              <span
                className={`overview-caveat__severity overview-caveat__severity--${caveat.severity}`}
              >
                {t(`overview.caveats.severity.${caveat.severity}`)}
              </span>
              {caveat.affected_models.length > 0 ? (
                <span className="overview-caveat__models">
                  {caveat.affected_models.join(' · ')}
                </span>
              ) : null}
            </div>
            <p className="overview-caveat__message">{caveat.message}</p>
            {caveat.affected_metrics.length > 0 ? (
              <p className="overview-caveat__metrics">
                {t('overview.caveats.affectedMetrics', {
                  metrics: caveat.affected_metrics.join(', '),
                })}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
