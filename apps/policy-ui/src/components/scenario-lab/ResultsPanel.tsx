import type {
  ChartSpec,
  HeadlineMetric,
  ScenarioLabResultTab,
  ScenarioLabResultsBundle,
} from '../../contracts/data-contract'

type ResultsPanelProps = {
  activeTab: ScenarioLabResultTab
  onTabChange: (tab: ScenarioLabResultTab) => void
  results: ScenarioLabResultsBundle
}

const TAB_LABELS: Record<ScenarioLabResultTab, string> = {
  headline_impact: 'Headline impact',
  macro_path: 'Macro path',
  external_balance: 'External balance',
  fiscal_effects: 'Fiscal effects',
}

const HEADLINE_METRIC_ORDER = ['gdp_growth', 'inflation', 'current_account', 'policy_rate'] as const

function formatMetricValue(metric: HeadlineMetric) {
  if (metric.unit === 'UZS/USD') {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(metric.value)
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(metric.value)
}

const DIRECTION_GLYPH = { up: '▲', down: '▼', flat: '—' } as const

function formatSignedDelta(value: number | null, unit: string) {
  if (value === null) {
    return 'n/a'
  }
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  const magnitude = Math.abs(value)
  const precision = unit === 'UZS/USD' ? 0 : 1
  return `${sign}${magnitude.toFixed(precision)}`
}

const BAR_AXIS_MAX = 6

function ScenarioMainChart({ chart }: { chart: ChartSpec }) {
  const titleId = `scenario-chart-title-${chart.chart_id}`

  if (chart.chart_type === 'bar') {
    const series = chart.series[0]
    return (
      <div className="scenario-main-chart" aria-labelledby={titleId}>
        <div className="scenario-main-chart__head">
          <h3 id={titleId}>{chart.title}</h3>
          <p>{chart.subtitle}</p>
        </div>
        <ul className="scenario-chart-bars">
          {chart.x.values.map((label, index) => {
            const value = series?.values[index] ?? 0
            const fillPercent = Math.min(50, (Math.abs(value) / BAR_AXIS_MAX) * 50)
            const isNegative = value < 0
            return (
              <li key={label.toString()}>
                <span className="scenario-chart-bars__label">{label}</span>
                <div className="scenario-chart-bars__track" aria-hidden="true">
                  <span className="scenario-chart-bars__axis" />
                  <span
                    className={`scenario-chart-bars__fill ${
                      isNegative
                        ? 'scenario-chart-bars__fill--negative'
                        : 'scenario-chart-bars__fill--positive'
                    }`}
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
                <strong className="scenario-chart-bars__value">
                  {formatSignedDelta(value, chart.y.unit)}
                  <span aria-hidden="true"> {chart.y.unit}</span>
                </strong>
              </li>
            )
          })}
        </ul>
        <p className="scenario-main-chart__takeaway">{chart.takeaway}</p>
      </div>
    )
  }

  return (
    <div className="scenario-main-chart" aria-labelledby={titleId}>
      <div className="scenario-main-chart__head">
        <h3 id={titleId}>{chart.title}</h3>
        <p>{chart.subtitle}</p>
      </div>
      <table className="scenario-chart-table">
        <thead>
          <tr>
            <th scope="col">{chart.x.label}</th>
            {chart.series.map((series) => (
              <th key={series.series_id} scope="col">
                {series.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.x.values.map((xValue, index) => (
            <tr key={xValue.toString()}>
              <th scope="row">{xValue}</th>
              {chart.series.map((series) => (
                <td key={series.series_id}>{series.values[index]?.toFixed(1)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="scenario-main-chart__takeaway">{chart.takeaway}</p>
    </div>
  )
}

export function ResultsPanel({ activeTab, onTabChange, results }: ResultsPanelProps) {
  const activeChart = results.charts_by_tab[activeTab]
  const preferredHeadlineMetrics = HEADLINE_METRIC_ORDER.map((metricId) =>
    results.headline_metrics.find((metric) => metric.metric_id === metricId),
  ).filter((metric): metric is HeadlineMetric => Boolean(metric))
  const headlineMetrics =
    preferredHeadlineMetrics.length === HEADLINE_METRIC_ORDER.length
      ? preferredHeadlineMetrics
      : results.headline_metrics.slice(0, HEADLINE_METRIC_ORDER.length)

  return (
    <section className="scenario-panel scenario-panel--results" aria-labelledby="scenario-results-title">
      <div className="scenario-panel__head page-section-head">
        <h2 id="scenario-results-title">Results</h2>
        <p>Review headline effects and transmission paths for the current assumptions.</p>
      </div>

      <div className="scenario-tab-control segmented-control" role="tablist" aria-label="Result views">
        {(Object.keys(TAB_LABELS) as ScenarioLabResultTab[]).map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              id={`scenario-tab-${tab}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`scenario-tabpanel-${tab}`}
              tabIndex={isActive ? 0 : -1}
              className={isActive ? 'active' : ''}
              onClick={() => onTabChange(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          )
        })}
      </div>

      <div className="scenario-headline-grid hmetric-strip">
        {headlineMetrics.map((metric) => {
          const deltaText = formatSignedDelta(metric.delta_abs, metric.unit)
          const glyph = DIRECTION_GLYPH[metric.direction]
          return (
            <article key={metric.metric_id} className="scenario-headline-card hmetric">
              <p className="scenario-headline-card__label hmetric__label">{metric.label}</p>
              <p className="scenario-headline-card__value hmetric__value">
                {formatMetricValue(metric)} <span>{metric.unit}</span>
              </p>
              <span
                className="scenario-headline-card__delta hmetric__delta"
                aria-label={`Change vs baseline: ${deltaText}`}
              >
                <span aria-hidden="true">{glyph}</span>
                <span>{deltaText} vs baseline</span>
              </span>
            </article>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`scenario-tabpanel-${activeTab}`}
        aria-labelledby={`scenario-tab-${activeTab}`}
      >
        <ScenarioMainChart chart={activeChart} />
      </div>
    </section>
  )
}
