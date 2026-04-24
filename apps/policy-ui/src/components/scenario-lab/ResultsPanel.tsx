import { useTranslation } from 'react-i18next'
import type {
  ChartSpec,
  HeadlineMetric,
  ScenarioLabResultTab,
  ScenarioLabResultsBundle,
} from '../../contracts/data-contract'
import { ImpulseResponseChart } from './ImpulseResponseChart.js'

type ResultsPanelProps = {
  activeTab: ScenarioLabResultTab
  onTabChange: (tab: ScenarioLabResultTab) => void
  results: ScenarioLabResultsBundle
}

const TAB_LABEL_KEYS: Record<ScenarioLabResultTab, string> = {
  headline_impact: 'scenarioLab.results.tabs.headlineImpact',
  macro_path: 'scenarioLab.results.tabs.macroPath',
  external_balance: 'scenarioLab.results.tabs.externalBalance',
  fiscal_effects: 'scenarioLab.results.tabs.fiscalEffects',
}

const HEADLINE_METRIC_ORDER = ['gdp_growth', 'inflation', 'current_account', 'policy_rate'] as const

function formatMetricValue(metric: HeadlineMetric) {
  if (metric.unit === 'UZS/USD') {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(metric.value)
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(metric.value)
}

const DIRECTION_GLYPH = { up: '↑', down: '↓', flat: '→' } as const

function formatSignedDelta(value: number | null, unit: string) {
  if (value === null) {
    return 'n/a'
  }
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  const magnitude = Math.abs(value)
  const precision = unit === 'UZS/USD' ? 0 : 1
  return `${sign}${magnitude.toFixed(precision)}`
}

// Non-headline tabs retain the existing table-view — they're out of scope for
// Shot-1 structural alignment (prompt §4.4 drops only the bar chart).
function ScenarioTabChart({ chart }: { chart: ChartSpec }) {
  const titleId = `scenario-chart-title-${chart.chart_id}`
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
  const { t } = useTranslation()
  const activeChart = results.charts_by_tab[activeTab]
  const preferredHeadlineMetrics = HEADLINE_METRIC_ORDER.map((metricId) =>
    results.headline_metrics.find((metric) => metric.metric_id === metricId),
  ).filter((metric): metric is HeadlineMetric => Boolean(metric))
  const headlineMetrics =
    preferredHeadlineMetrics.length === HEADLINE_METRIC_ORDER.length
      ? preferredHeadlineMetrics
      : results.headline_metrics.slice(0, HEADLINE_METRIC_ORDER.length)

  const showImpulseResponse = activeTab === 'headline_impact' && results.impulse_response_chart

  return (
    <section
      className="scenario-panel scenario-panel--results lab-panel"
      aria-labelledby="scenario-results-title"
    >
      <div className="scenario-panel__head page-section-head">
        <h2 id="scenario-results-title">{t('scenarioLab.results.title')}</h2>
        <p>{t('scenarioLab.results.description')}</p>
      </div>

      <div
        className="scenario-tab-control segmented-control result-tabs"
        role="tablist"
        aria-label={t('scenarioLab.results.tabsAria')}
      >
        {(Object.keys(TAB_LABEL_KEYS) as ScenarioLabResultTab[]).map((tab) => {
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
              {t(TAB_LABEL_KEYS[tab])}
            </button>
          )
        })}
      </div>

      <div className="scenario-headline-grid hmetric-strip headline-metrics">
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
                aria-label={t('scenarioLab.results.deltaVsBaseline', { delta: deltaText })}
              >
                <span aria-hidden="true">{glyph}</span>
                <span>{t('scenarioLab.results.deltaVsBaseline', { delta: deltaText })}</span>
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
        {showImpulseResponse && results.impulse_response_chart ? (
          <ImpulseResponseChart chart={results.impulse_response_chart} />
        ) : (
          <ScenarioTabChart chart={activeChart} />
        )}
      </div>
    </section>
  )
}
