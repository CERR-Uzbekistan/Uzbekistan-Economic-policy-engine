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

function formatMetricValue(metric: HeadlineMetric) {
  if (metric.unit === 'UZS/USD') {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(metric.value)
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(metric.value)
}

function formatDelta(metric: HeadlineMetric) {
  if (metric.delta_abs === null) {
    return 'n/a'
  }
  const sign = metric.delta_abs > 0 ? '+' : ''
  return `${sign}${metric.delta_abs.toFixed(1)}`
}

function ScenarioMainChart({ chart }: { chart: ChartSpec }) {
  if (chart.chart_type === 'bar') {
    const series = chart.series[0]
    return (
      <div className="scenario-main-chart" aria-label={chart.title}>
        <div className="scenario-main-chart__head">
          <h3>{chart.title}</h3>
          <p>{chart.subtitle}</p>
        </div>
        <ul className="scenario-chart-bars">
          {chart.x.values.map((label, index) => {
            const value = series?.values[index] ?? 0
            const width = Math.min(100, Math.abs(value) * 22 + 8)
            return (
              <li key={label.toString()}>
                <span>{label}</span>
                <div>
                  <i style={{ width: `${width}%` }} />
                </div>
                <strong>{value.toFixed(1)}</strong>
              </li>
            )
          })}
        </ul>
        <p className="scenario-main-chart__takeaway">{chart.takeaway}</p>
      </div>
    )
  }

  return (
    <div className="scenario-main-chart" aria-label={chart.title}>
      <div className="scenario-main-chart__head">
        <h3>{chart.title}</h3>
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

  return (
    <section className="scenario-panel scenario-panel--results" aria-labelledby="scenario-results-title">
      <div className="scenario-panel__head">
        <h2 id="scenario-results-title">Results</h2>
        <p>Review headline effects and transmission paths for the current assumptions.</p>
      </div>

      <div className="scenario-headline-grid">
        {results.headline_metrics.map((metric) => (
          <article key={metric.metric_id} className="scenario-headline-card">
            <p>{metric.label}</p>
            <h3>
              {formatMetricValue(metric)} <span>{metric.unit}</span>
            </h3>
            <small>vs baseline: {formatDelta(metric)}</small>
          </article>
        ))}
      </div>

      <div className="scenario-tab-control" role="tablist" aria-label="Result views">
        {(Object.keys(TAB_LABELS) as ScenarioLabResultTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => onTabChange(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <ScenarioMainChart chart={activeChart} />
    </section>
  )
}
