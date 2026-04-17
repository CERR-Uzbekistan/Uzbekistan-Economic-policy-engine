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

function formatDelta(metric: HeadlineMetric) {
  if (metric.delta_abs === null) {
    return 'No prior value'
  }

  const sign = metric.delta_abs > 0 ? '+' : ''
  return `${sign}${metric.delta_abs.toFixed(1)}`
}

function trendLabel(metric: HeadlineMetric) {
  if (metric.direction === 'up') {
    return 'Rising'
  }
  if (metric.direction === 'down') {
    return 'Falling'
  }
  return 'Flat'
}

export function KpiStrip({ metrics }: KpiStripProps) {
  return (
    <section aria-labelledby="overview-kpi-title">
      <div className="overview-section-head">
        <h2 id="overview-kpi-title">Core indicators</h2>
        <p>Current values and period-over-period direction for decision scanning.</p>
      </div>

      <div className="overview-kpi-grid">
        {metrics.map((metric) => (
          <article key={metric.metric_id} className="overview-kpi-card">
            <div className="overview-kpi-card__top">
              <p className="overview-kpi-card__label">{metric.label}</p>
              <span className={`overview-kpi-trend overview-kpi-trend--${metric.direction}`}>
                {trendLabel(metric)}
              </span>
            </div>
            <p className="overview-kpi-card__value">
              {formatMetricValue(metric)} <span>{metric.unit}</span>
            </p>
            <div className="overview-kpi-card__meta">
              <span>Period: {metric.period}</span>
              <span>Change vs prior: {formatDelta(metric)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
