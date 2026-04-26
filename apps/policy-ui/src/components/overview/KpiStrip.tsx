import { useTranslation } from 'react-i18next'
import type { HeadlineMetric } from '../../contracts/data-contract'

type KpiStripProps = {
  metrics: HeadlineMetric[]
}

const SME_CONTENT_PENDING = '[SME content pending]'

function formatMetricValue(metric: HeadlineMetric) {
  if (metric.unit === 'UZS/USD') {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(metric.value)
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(metric.value)
}

// Prompt §4.5 item 5: delta renders as inline arrow-plus-text (prototype format
// "↑ +0.3 pp vs prior estimate"), not as a chip-pill.
const DIRECTION_GLYPH: Record<HeadlineMetric['direction'], string> = {
  up: '↑',
  down: '↓',
  flat: '→',
}

function formatDelta(metric: HeadlineMetric) {
  if (metric.delta_abs === null) {
    return null
  }
  const sign = metric.delta_abs > 0 ? '+' : metric.delta_abs < 0 ? '−' : ''
  const magnitude = Math.abs(metric.delta_abs)
  const precision = metric.unit === 'UZS/USD' ? 0 : 1
  return `${sign}${magnitude.toFixed(precision)}`
}

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
          const delta = formatDelta(metric)
          const directionWord = t(`overview.kpi.direction.${metric.direction}`)
          const srLabel = delta
            ? t('overview.kpi.deltaSrLabel', { direction: directionWord, delta })
            : t('overview.kpi.noPrior')
          const freshness = formatFreshness(metric.last_updated, locale)
          const deltaLabel = metric.delta_label
          const composedDelta = delta
            ? `${delta} ${metric.unit === 'UZS/USD' ? 'UZS' : metric.unit}`.trim()
            : t('overview.kpi.notAvailable')
          const contextNote = metric.context_note
          const contextIsSentinel = contextNote === SME_CONTENT_PENDING
          const provenance = getMetricProvenance(metric)

          return (
            <article key={metric.metric_id} className="kpi overview-kpi-card">
              <div className="kpi__head overview-kpi-card__top">
                <p className="kpi__name overview-kpi-card__label">{metric.label}</p>
                <span className="overview-kpi-card__top-meta">
                  {provenance ? (
                    <span className={`overview-kpi-card__provenance overview-kpi-card__provenance--${provenance}`}>
                      {t(`overview.kpi.provenance.${provenance}`)}
                    </span>
                  ) : null}
                  <span className="kpi__freshness">{t('overview.kpi.freshness', { date: freshness })}</span>
                </span>
              </div>
              <p className="kpi__value overview-kpi-card__value">
                {formatMetricValue(metric)} <span>{metric.unit}</span>
              </p>
              <p className="kpi__delta overview-kpi-trend" aria-label={srLabel}>
                <span className="overview-kpi-trend__glyph" aria-hidden="true">
                  {DIRECTION_GLYPH[metric.direction]}
                </span>{' '}
                {deltaLabel ? deltaLabel : composedDelta}
              </p>
              <div className="kpi__context overview-kpi-card__meta">
                <span>{metric.period}</span>
                {contextIsSentinel ? (
                  <span
                    className="ui-chip ui-chip--warn overview-kpi-card__sme-chip"
                    aria-label={t('overview.kpi.smePendingAria')}
                  >
                    {t('overview.kpi.smePendingChip')}
                  </span>
                ) : contextNote ? (
                  <span className="overview-kpi-card__context-note">{contextNote}</span>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
