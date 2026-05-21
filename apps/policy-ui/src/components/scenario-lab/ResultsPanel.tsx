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
  formatSignedNumber,
  formatUnitLabel,
  formatUnavailable,
  getDefaultFractionDigitsForUnit,
} from '../../lib/format/locale-format.js'
import { ImpulseResponseChart } from './ImpulseResponseChart.js'
import { ChartRenderer } from '../system/ChartRenderer.js'

type ResultsPanelProps = {
  activeTab: ScenarioLabResultTab
  onTabChange: (tab: ScenarioLabResultTab) => void
  results: ScenarioLabResultsBundle
  scenarioName?: string
  selectedPresetId?: string
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

const QPM_DECISION_METRIC_ORDER = ['gdp_growth', 'inflation', 'policy_rate'] as const

function formatMetricValue(metric: HeadlineMetric, locale: string | undefined) {
  return formatNumber(metric.value, locale, {
    maximumFractionDigits: getDefaultFractionDigitsForUnit(metric.unit),
  })
}

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

function formatDeltaWithUnit(value: number | null, unit: string, locale: string | undefined) {
  const signed = formatSignedDelta(value, unit, locale)
  if (value === null) {
    return signed
  }
  if (unit === '%' || unit === '% GDP') {
    return `${signed} ${formatUnitLabel('percentagePoint', locale)}`
  }
  const unitLabel = formatAxisUnitLabel(unit, locale)
  return unitLabel ? `${signed} ${unitLabel}` : signed
}

// Non-headline tabs retain the existing table-view — they're out of scope for
// Shot-1 structural alignment (prompt §4.4 drops only the bar chart).
function metricLabel(metric: HeadlineMetric, t: ReturnType<typeof useTranslation>['t']) {
  return t(`scenarioLab.results.metrics.${metric.metric_id}`, { defaultValue: metric.label })
}

function localizedPresetName(
  selectedPresetId: string | undefined,
  scenarioName: string | undefined,
  t: ReturnType<typeof useTranslation>['t'],
) {
  if (!selectedPresetId) {
    return scenarioName ?? t('scenarioLab.results.decision.currentScenario')
  }
  return t(`scenarioLab.presets.${selectedPresetId}.title`, {
    defaultValue: scenarioName ?? t('scenarioLab.results.decision.currentScenario'),
  })
}

function ScenarioTabChart({ chart, activeTab }: { chart: ChartSpec; activeTab: ScenarioLabResultTab }) {
  const { t } = useTranslation()
  return (
    <div className="scenario-main-chart">
      <div className="scenario-output-context">
        <span className="claim-label">{t(CLAIM_LABEL_KEYS[activeTab])}</span>
        <p>{t(TAB_EXPLANATION_KEYS[activeTab])}</p>
      </div>
      <ChartRenderer spec={chart} />
    </div>
  )
}

export function ResultsPanel({
  activeTab,
  onTabChange,
  results,
  scenarioName,
  selectedPresetId,
}: ResultsPanelProps) {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const activeChart = results.charts_by_tab[activeTab]
  const decisionMetrics = QPM_DECISION_METRIC_ORDER.map((metricId) =>
    results.headline_metrics.find((metric) => metric.metric_id === metricId),
  ).filter((metric): metric is HeadlineMetric => Boolean(metric))
  const decisionScenarioName = localizedPresetName(selectedPresetId, scenarioName, t)

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

      <div className="qpm-decision-view">
        <div className="qpm-decision-view__head">
          <span>{t('scenarioLab.results.decision.eyebrow')}</span>
          <h3>{t('scenarioLab.results.decision.title')}</h3>
          <p>
            {t('scenarioLab.results.decision.lead', {
              scenarioName: decisionScenarioName,
            })}
          </p>
        </div>
        <dl className="qpm-decision-view__metrics">
          {decisionMetrics.map((metric) => {
            const deltaText = formatDeltaWithUnit(metric.delta_abs, metric.unit, locale)
            return (
              <div key={metric.metric_id}>
                <dt>{metricLabel(metric, t)}</dt>
                <dd>
                  {formatMetricValue(metric, locale)} <span>{formatAxisUnitLabel(metric.unit, locale)}</span>
                </dd>
                <small>{t('scenarioLab.results.deltaVsBaseline', { delta: deltaText })}</small>
              </div>
            )
          })}
        </dl>
        <p className="qpm-decision-view__note">{t('scenarioLab.results.decision.note')}</p>
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
