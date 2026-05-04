import { useTranslation } from 'react-i18next'
import type {
  ChartSpec,
  HeadlineMetric,
  ScenarioLabResultTab,
  ScenarioLabResultsBundle,
} from '../../contracts/data-contract'
import {
  formatAxisUnitLabel,
  formatNumber,
  formatQuarterLabel,
  formatSignedNumber,
  formatUnavailable,
  formatValueWithUnit,
  getDefaultFractionDigitsForUnit,
} from '../../lib/format/locale-format.js'
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

const TAB_EXPLANATION_KEYS: Record<ScenarioLabResultTab, string> = {
  headline_impact: 'scenarioLab.results.explanations.headlineImpact',
  macro_path: 'scenarioLab.results.explanations.macroPath',
  external_balance: 'scenarioLab.results.explanations.externalBalance',
  fiscal_effects: 'scenarioLab.results.explanations.fiscalEffects',
}

const CLAIM_LABEL_KEYS: Record<ScenarioLabResultTab, string> = {
  headline_impact: 'scenarioLab.results.claimLabels.headlineImpact',
  macro_path: 'scenarioLab.results.claimLabels.macroPath',
  external_balance: 'scenarioLab.results.claimLabels.externalBalance',
  fiscal_effects: 'scenarioLab.results.claimLabels.fiscalEffects',
}

const HEADLINE_METRIC_ORDER = ['gdp_growth', 'inflation', 'current_account', 'policy_rate'] as const

function formatMetricValue(metric: HeadlineMetric, locale: string | undefined) {
  return formatNumber(metric.value, locale, {
    maximumFractionDigits: getDefaultFractionDigitsForUnit(metric.unit),
  })
}

const DIRECTION_GLYPH = { up: '↑', down: '↓', flat: '→' } as const

function formatSignedDelta(value: number | null, unit: string, locale: string | undefined) {
  if (value === null) {
    return formatUnavailable(locale)
  }
  const precision = getDefaultFractionDigitsForUnit(unit)
  return formatSignedNumber(value, locale, {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  })
}

// Non-headline tabs retain the existing table-view — they're out of scope for
// Shot-1 structural alignment (prompt §4.4 drops only the bar chart).
function ScenarioTabChart({ chart, activeTab }: { chart: ChartSpec; activeTab: ScenarioLabResultTab }) {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const titleId = `scenario-chart-title-${chart.chart_id}`
  const terminalIndex = Math.max(0, chart.x.values.length - 1)
  return (
    <div className="scenario-main-chart" aria-labelledby={titleId}>
      <div className="scenario-output-context">
        <span className="claim-label">{t(CLAIM_LABEL_KEYS[activeTab])}</span>
        <p>{t(TAB_EXPLANATION_KEYS[activeTab])}</p>
      </div>
      <div className="scenario-main-chart__head">
        <h3 id={titleId}>{chart.title}</h3>
        <p>{chart.subtitle}</p>
      </div>
      <dl className="scenario-tab-summary" aria-label={chart.title}>
        {chart.series.map((series) => (
          <div key={series.series_id}>
            <dt>{series.label}</dt>
            <dd>
              {formatValueWithUnit(series.values[terminalIndex], chart.y.unit, locale, {
                maximumFractionDigits: 1,
                minimumFractionDigits: 1,
              })}
            </dd>
          </div>
        ))}
      </dl>
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
              <th scope="row">{formatQuarterLabel(xValue, locale)}</th>
              {chart.series.map((series) => (
                <td key={series.series_id}>
                  {formatNumber(series.values[index], locale, {
                    maximumFractionDigits: 1,
                    minimumFractionDigits: 1,
                  })}
                </td>
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
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
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
          const deltaText = formatSignedDelta(metric.delta_abs, metric.unit, locale)
          const glyph = DIRECTION_GLYPH[metric.direction]
          return (
            <article key={metric.metric_id} className="scenario-headline-card hmetric">
              <p className="scenario-headline-card__label hmetric__label">{metric.label}</p>
              <p className="scenario-headline-card__value hmetric__value">
                {formatMetricValue(metric, locale)} <span>{formatAxisUnitLabel(metric.unit, locale)}</span>
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
          <ScenarioTabChart chart={activeChart} activeTab={activeTab} />
        )}
      </div>
    </section>
  )
}
