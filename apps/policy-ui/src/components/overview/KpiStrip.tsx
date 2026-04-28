import { useTranslation } from 'react-i18next'
import type { HeadlineMetric } from '../../contracts/data-contract'
import {
  DIRECTION_GLYPH,
  formatOverviewDelta,
  formatOverviewDeltaWithUnit,
  formatOverviewMetricValue,
} from './metric-format.js'
import { getComparisonBasisKey } from './metric-comparison-basis.js'

type KpiStripProps = {
  metrics: HeadlineMetric[]
}

const SME_CONTENT_PENDING = '[SME content pending]'

function formatFreshness(value: string, locale: string): string {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) {
    return value
  }
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  }).format(new Date(parsed))
}

type KpiProvenance = 'nowcast' | 'scenario' | 'reference' | 'draft'

const KPI_PROVENANCE_MONOGRAM: Record<KpiProvenance, string> = {
  nowcast: 'N',
  scenario: 'S',
  reference: 'R',
  draft: 'D',
}

function getMetricProvenance(metric: HeadlineMetric): KpiProvenance | null {
  if (metric.context_note === SME_CONTENT_PENDING) {
    return 'draft'
  }
  const attributionText = metric.model_attribution
    .flatMap((item) => [item.module, item.model_id, item.model_name])
    .join(' ')
    .toLowerCase()

  if (attributionText.includes('nowcast') || attributionText.includes('dfm')) {
    return 'nowcast'
  }
  if (attributionText.includes('qpm')) {
    return 'scenario'
  }
  if (attributionText.includes('pe')) {
    return 'reference'
  }
  return null
}

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
          const freshness = formatFreshness(metric.last_updated, locale)
          const deltaLabel = metric.delta_label
          const composedDelta = formatOverviewDeltaWithUnit(metric, locale) ?? t('overview.kpi.notAvailable')
          const contextNote = metric.context_note
          const contextIsSentinel = contextNote === SME_CONTENT_PENDING
          const provenance = getMetricProvenance(metric)
          const comparisonBasisKey = getComparisonBasisKey(metric.metric_id)
          const comparisonBasis = comparisonBasisKey ? t(comparisonBasisKey) : null

          return (
            <article key={metric.metric_id} className="kpi overview-kpi-card" data-metric-id={metric.metric_id}>
              <div className="kpi__head overview-kpi-card__top">
                <p className="kpi__name overview-kpi-card__label">{metric.label}</p>
                <span className="overview-kpi-card__top-meta">
                  {provenance ? (
                    <span
                      className={`overview-kpi-card__provenance overview-kpi-card__provenance--${provenance}`}
                      aria-label={t(`overview.kpi.provenance.${provenance}`)}
                      title={t(`overview.kpi.provenance.${provenance}`)}
                    >
                      {KPI_PROVENANCE_MONOGRAM[provenance]}
                    </span>
                  ) : null}
                  {metric.validation_status === 'warning' ? (
                    <span className="ui-chip ui-chip--warn overview-kpi-card__status">
                      {t('overview.indicators.status.warning')}
                    </span>
                  ) : null}
                  <span className="kpi__freshness">{t('overview.kpi.freshness', { date: freshness })}</span>
                </span>
              </div>
              <div className="overview-kpi-card__main">
                <p className="kpi__value overview-kpi-card__value">
                  {formatOverviewMetricValue(metric, locale)} <span>{metric.unit}</span>
                </p>
                <p className="kpi__delta overview-kpi-trend" aria-label={srLabel}>
                  <span className="overview-kpi-trend__glyph" aria-hidden="true">
                    {DIRECTION_GLYPH[metric.direction]}
                  </span>{' '}
                  {deltaLabel ? deltaLabel : composedDelta}
                </p>
              </div>
              <div className="kpi__context overview-kpi-card__meta">
                <span>{metric.period}</span>
                {comparisonBasis ? (
                  <span className="overview-comparison-basis overview-kpi-card__basis">
                    {comparisonBasis}
                  </span>
                ) : null}
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
