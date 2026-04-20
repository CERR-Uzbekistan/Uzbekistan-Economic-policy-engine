import { useTranslation } from 'react-i18next'
import type { HeadlineMetric } from '../../contracts/data-contract'

type KpiStripProps = {
  metrics: HeadlineMetric[]
}

function formatMetricValue(metric: HeadlineMetric) {
  if (metric.unit === 'UZS/USD') {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(metric.value)
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(metric.value)
}

const DIRECTION_GLYPH: Record<HeadlineMetric['direction'], string> = {
  up: '▲',
  down: '▼',
  flat: '—',
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

export function KpiStrip({ metrics }: KpiStripProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'

  if (metrics.length === 0) {
    return <p className="empty-state">{t('overview.kpi.empty')}</p>
  }

  return (
    <section className="kpi-strip" aria-labelledby="overview-kpi-title">
      <div className="overview-section-head page-section-head">
        <h2 id="overview-kpi-title">{t('overview.kpi.title')}</h2>
        <p>{t('overview.kpi.description')}</p>
      </div>

      <div className="overview-kpi-grid">
        {metrics.map((metric) => {
          const delta = formatDelta(metric)
          const directionWord = t(`overview.kpi.direction.${metric.direction}`)
          const srLabel = delta
            ? t('overview.kpi.deltaSrLabel', { direction: directionWord, delta })
            : t('overview.kpi.noPrior')
          const freshness = formatFreshness(metric.last_updated, locale)
          const deltaText = delta ?? t('overview.kpi.notAvailable')

          return (
            <article key={metric.metric_id} className="kpi overview-kpi-card">
              <div className="kpi__head overview-kpi-card__top">
                <p className="kpi__name overview-kpi-card__label">{metric.label}</p>
                <span className="kpi__freshness">{t('overview.kpi.freshness', { date: freshness })}</span>
              </div>
              <p className="kpi__value overview-kpi-card__value">
                {formatMetricValue(metric)} <span>{metric.unit}</span>
              </p>
              <span className="kpi__delta overview-kpi-trend ui-chip ui-chip--neutral" aria-label={srLabel}>
                <span className="arrow overview-kpi-trend__glyph" aria-hidden="true">
                    {DIRECTION_GLYPH[metric.direction]}
                </span>
                <span>{deltaText}</span>
              </span>
              <div className="kpi__context overview-kpi-card__meta">
                <span>{metric.period}</span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
