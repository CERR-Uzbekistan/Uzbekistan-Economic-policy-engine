import { useTranslation } from 'react-i18next'
import type { HeadlineMetric } from '../../contracts/data-contract'
import {
  DIRECTION_GLYPH,
  formatOverviewDelta,
  formatOverviewDeltaComparison,
  formatOverviewDeltaWithUnit,
  formatOverviewMetricValueWithUnit,
} from './metric-format.js'

type KpiStripProps = {
  metrics: HeadlineMetric[]
}

const SME_CONTENT_PENDING = '[SME content pending]'

export function KpiStrip({ metrics }: KpiStripProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'

  if (metrics.length === 0) {
    return <p className="empty-state">{t('overview.kpi.empty')}</p>
  }

  return (
    <section className="kpi-strip" aria-labelledby="overview-kpi-title">
      <h2 id="overview-kpi-title" className="sr-only">
        {t('overview.kpi.title')}
      </h2>

      <div className="overview-kpi-grid">
        {metrics.map((metric) => {
          const delta = formatOverviewDelta(metric, locale)
          const directionWord = t(`overview.kpi.direction.${metric.direction}`)
          const srLabel = delta
            ? t('overview.kpi.deltaSrLabel', { direction: directionWord, delta })
            : t('overview.kpi.noPrior')
          const deltaLabel = metric.delta_label
          const formattedDelta = formatOverviewDeltaWithUnit(metric, locale, t)
          const composedDelta = formattedDelta ?? t('overview.kpi.noPrior')
          const deltaComparison = formatOverviewDeltaComparison(metric, t)
          const composedDeltaWithComparison = formattedDelta && deltaComparison
            ? `${composedDelta} ${deltaComparison}`
            : composedDelta
          const contextNote = metric.context_note
          const contextIsSentinel = contextNote === SME_CONTENT_PENDING
          const claimLabel = metric.claim_label_key ? t(metric.claim_label_key) : null

          return (
            <article key={metric.metric_id} className="kpi overview-kpi-card" data-metric-id={metric.metric_id}>
              <div className="kpi__head overview-kpi-card__top">
                <p className="kpi__name overview-kpi-card__label">{metric.label}</p>
                <span className="overview-kpi-card__top-meta">
                  {claimLabel ? (
                    <span
                      className="overview-kpi-card__claim-label"
                      aria-label={claimLabel}
                      title={claimLabel}
                    >
                      {claimLabel}
                    </span>
                  ) : null}
                  {metric.validation_status === 'warning' ? (
                    <span className="ui-chip ui-chip--warn overview-kpi-card__status">
                      {t('overview.indicators.status.warning')}
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="overview-kpi-card__main">
                <p className="kpi__value overview-kpi-card__value">{formatOverviewMetricValueWithUnit(metric, locale, t)}</p>
                <p className="kpi__delta overview-kpi-trend" aria-label={srLabel}>
                  {formattedDelta || deltaLabel ? (
                    <>
                      <span className="overview-kpi-trend__glyph" aria-hidden="true">
                        {DIRECTION_GLYPH[metric.direction]}
                      </span>{' '}
                    </>
                  ) : null}
                  {deltaLabel ? deltaLabel : composedDeltaWithComparison}
                </p>
              </div>
              <div className="kpi__context overview-kpi-card__meta">
                <span className="overview-kpi-card__period">{metric.period}</span>
                {contextIsSentinel ? (
                  <span
                    className="ui-chip ui-chip--warn overview-kpi-card__sme-chip"
                    aria-label={t('overview.kpi.smePendingAria')}
                  >
                    {t('overview.kpi.smePendingChip')}
                  </span>
                ) : contextNote ? (
                  <span className="overview-kpi-card__context-note" title={contextNote}>{contextNote}</span>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
