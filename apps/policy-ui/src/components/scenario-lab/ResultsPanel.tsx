import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  Assumption,
  ChartSpec,
  HeadlineMetric,
  ScenarioLabResultTab,
  ScenarioLabResultsBundle,
} from '../../contracts/data-contract'
import {
  formatAxisUnitLabel,
  formatSignedNumber,
  formatUnitLabel,
  formatUnavailable,
  formatValueWithUnit,
  getDefaultFractionDigitsForUnit,
} from '../../lib/format/locale-format.js'
import { ImpulseResponseChart } from './ImpulseResponseChart.js'
import { ChartRenderer } from '../system/ChartRenderer.js'
import { focusElementById, getRovingTabIndexForKey } from './tabKeyboard.js'

type ResultsPanelProps = {
  activeTab: ScenarioLabResultTab
  onTabChange: (tab: ScenarioLabResultTab) => void
  results: ScenarioLabResultsBundle
  scenarioName?: string
  selectedPresetId?: string
  activeAssumptions?: Assumption[]
}

const TAB_LABEL_KEYS: Record<ScenarioLabResultTab, string> = {
  headline_impact: 'scenarioLab.results.tabs.headlineImpact',
  macro_path: 'scenarioLab.results.tabs.macroPath',
  external_balance: 'scenarioLab.results.tabs.externalBalance',
  fiscal_effects: 'scenarioLab.results.tabs.fiscalEffects',
}

const RESULT_TABS = Object.keys(TAB_LABEL_KEYS) as ScenarioLabResultTab[]

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

function formatMetricLevelValue(value: number | null, unit: string, locale: string | undefined) {
  if (value === null) {
    return formatUnavailable(locale)
  }
  return formatValueWithUnit(value, unit, locale)
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function formatAssumptionShock(value: number, unit: string, locale: string | undefined): string {
  const precision = getDefaultFractionDigitsForUnit(unit)
  const signed = formatSignedNumber(value, locale, {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  })
  const unitLabel = formatAxisUnitLabel(unit, locale)
  return unitLabel ? `${signed} ${unitLabel}` : signed
}

function getActiveAssumptions(assumptions: Assumption[]): Assumption[] {
  return assumptions.filter(
    (assumption) => isFiniteNumber(assumption.value) && Math.abs(assumption.value) > 0.0001,
  )
}

function formatSourceDate(value: string, locale: string | undefined): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function assumptionLabel(assumption: Assumption, t: ReturnType<typeof useTranslation>['t']) {
  return t(`scenarioLab.assumptions.inputs.${assumption.key}.label`, {
    defaultValue: assumption.label,
  })
}

function terminalValue(values: number[]): { value: number; index: number } | null {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index]
    if (isFiniteNumber(value)) {
      return { value, index }
    }
  }
  return null
}

function roundChartValue(value: number, decimals = 3): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function getPathSeries(chart: ChartSpec) {
  const baseline = chart.series.find((series) => series.semantic_role === 'baseline')
  const scenario =
    chart.series.find((series) => series.series_id === 'scenario_path') ??
    chart.series.find((series) => series.semantic_role !== 'baseline')

  if (!baseline || !scenario) {
    return null
  }

  return { baseline, scenario }
}

function buildPathDelta(chart: ChartSpec) {
  const pathSeries = getPathSeries(chart)
  if (!pathSeries) {
    return null
  }
  const { baseline, scenario } = pathSeries

  const baselineTerminal = terminalValue(baseline.values)
  const scenarioTerminal = terminalValue(scenario.values)
  if (!baselineTerminal || !scenarioTerminal) {
    return null
  }

  const terminalIndex = Math.min(baselineTerminal.index, scenarioTerminal.index)
  const baselineValue = baseline.values[terminalIndex]
  const scenarioValue = scenario.values[terminalIndex]
  if (!isFiniteNumber(baselineValue) || !isFiniteNumber(scenarioValue)) {
    return null
  }

  return {
    baseline: baselineValue,
    delta: scenarioValue - baselineValue,
    period: chart.x.values[terminalIndex]?.toString() ?? '',
    scenario: scenarioValue,
    unit: chart.y.unit,
  }
}

function hasMaterialPathDifference(chart: ChartSpec): boolean {
  const pathSeries = getPathSeries(chart)
  if (!pathSeries) {
    return true
  }
  const { baseline, scenario } = pathSeries

  const maxLength = Math.max(baseline.values.length, scenario.values.length)
  for (let index = 0; index < maxLength; index += 1) {
    const baselineValue = baseline.values[index]
    const scenarioValue = scenario.values[index]
    if (!isFiniteNumber(baselineValue) || !isFiniteNumber(scenarioValue)) {
      continue
    }
    if (Math.abs(scenarioValue - baselineValue) >= 0.05) {
      return true
    }
  }
  return false
}

function buildDeviationChart(
  chart: ChartSpec,
  activeTab: ScenarioLabResultTab,
  t: ReturnType<typeof useTranslation>['t'],
): ChartSpec | null {
  const pathSeries = getPathSeries(chart)
  if (!pathSeries) {
    return null
  }

  const { baseline, scenario } = pathSeries
  const values = chart.x.values.map((_, index) => {
    const baselineValue = baseline.values[index]
    const scenarioValue = scenario.values[index]
    if (!isFiniteNumber(baselineValue) || !isFiniteNumber(scenarioValue)) {
      return Number.NaN
    }
    return roundChartValue(scenarioValue - baselineValue)
  })
  if (!values.some(isFiniteNumber)) {
    return null
  }

  const metric = t(`scenarioLab.results.effectChart.metrics.${activeTab}`, {
    defaultValue: chart.title || chart.y.label,
  })
  const unit = chart.y.unit === '%' || chart.y.unit === '% GDP' ? 'pp' : chart.y.unit

  return {
    ...chart,
    chart_id: `${chart.chart_id}_deviation`,
    subtitle: t('scenarioLab.results.effectChart.subtitle', {
      defaultValue: 'Scenario minus baseline; zero line means no scenario effect.',
    }),
    takeaway:
      chart.takeaway.trim() ||
      t('scenarioLab.results.effectChart.takeaway', {
        defaultValue: 'Read this as the scenario effect over time, not as a standalone forecast level.',
      }),
    title: t('scenarioLab.results.effectChart.title', {
      defaultValue: '{{metric}} effect vs baseline',
      metric,
    }),
    view_mode: 'delta',
    y: {
      ...chart.y,
      label: t('scenarioLab.results.effectChart.yLabel', {
        defaultValue: 'Scenario minus baseline',
      }),
      unit,
      values,
    },
    series: [
      {
        label: t('scenarioLab.results.effectChart.series', {
          defaultValue: 'Scenario effect',
        }),
        semantic_role: 'alternative',
        series_id: 'scenario_delta',
        values,
      },
    ],
  }
}

function ActiveShockSummary({ assumptions }: { assumptions: Assumption[] }) {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const activeAssumptions = getActiveAssumptions(assumptions)

  return (
    <section
      className="qpm-active-shocks"
      aria-label={t('scenarioLab.results.activeShocks.ariaLabel')}
    >
      <span className="qpm-active-shocks__title">{t('scenarioLab.results.activeShocks.title')}</span>
      {activeAssumptions.length > 0 ? (
        <ul className="qpm-active-shocks__list">
          {activeAssumptions.map((assumption) => (
            <li key={assumption.key}>
              <span>{assumptionLabel(assumption, t)}</span>
              <strong>{formatAssumptionShock(assumption.value as number, assumption.unit, locale)}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p>{t('scenarioLab.results.activeShocks.none')}</p>
      )}
    </section>
  )
}

function BaselineSourceSummary({ results }: { results: ScenarioLabResultsBundle }) {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const source = results.baseline_source

  if (!source) {
    return null
  }

  return (
    <details className="qpm-baseline-source" aria-label={t('scenarioLab.results.baselineSource.ariaLabel')}>
      <summary className="qpm-baseline-source__head">
        <span>{t('scenarioLab.results.baselineSource.eyebrow')}</span>
        <strong>{t('scenarioLab.results.baselineSource.title')}</strong>
        <small>{source.data_version}</small>
      </summary>
      <p>{t('scenarioLab.results.baselineSource.summary')}</p>
      <dl>
        <div>
          <dt>{t('scenarioLab.results.baselineSource.artifact')}</dt>
          <dd>{source.source_artifact}</dd>
        </div>
        <div>
          <dt>{t('scenarioLab.results.baselineSource.exportedAt')}</dt>
          <dd>{formatSourceDate(source.exported_at, locale)}</dd>
        </div>
      </dl>
      <p>{source.note}</p>
      {source.metrics.length > 0 ? (
        <ul className="qpm-baseline-source__secondary">
          {source.metrics.map((metric) => (
            <li key={metric.metric_id}>
              <span>{metric.label}</span>
              <strong>{formatValueWithUnit(metric.value, metric.unit, locale)}</strong>
              <small>
                {metric.source_period} · {metric.source_label}
              </small>
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  )
}

function ScenarioTabChart({ chart, activeTab }: { chart: ChartSpec; activeTab: ScenarioLabResultTab }) {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const pathDelta = buildPathDelta(chart)
  const hasMaterialDifference = hasMaterialPathDifference(chart)
  const deviationChart = buildDeviationChart(chart, activeTab, t)

  return (
    <div className="scenario-main-chart">
      <div className="scenario-output-context">
        <span className="claim-label">{t(CLAIM_LABEL_KEYS[activeTab])}</span>
        <p>{t(TAB_EXPLANATION_KEYS[activeTab])}</p>
      </div>
      {pathDelta ? (
        <dl className="qpm-path-deltas">
          <div>
            <dt>{t('scenarioLab.results.pathDeltas.period')}</dt>
            <dd>{pathDelta.period}</dd>
          </div>
          <div>
            <dt>{t('scenarioLab.results.pathDeltas.baselineEnd')}</dt>
            <dd>{formatValueWithUnit(pathDelta.baseline, pathDelta.unit, locale)}</dd>
          </div>
          <div>
            <dt>{t('scenarioLab.results.pathDeltas.scenarioEnd')}</dt>
            <dd>{formatValueWithUnit(pathDelta.scenario, pathDelta.unit, locale)}</dd>
          </div>
          <div>
            <dt>{t('scenarioLab.results.pathDeltas.difference')}</dt>
            <dd>{formatDeltaWithUnit(pathDelta.delta, pathDelta.unit, locale)}</dd>
          </div>
        </dl>
      ) : null}
      {hasMaterialDifference && deviationChart ? (
        <ChartRenderer
          height={300}
          hideAttribution
          hideTakeaway
          showEndLabels
          showZeroLine
          spec={deviationChart}
        />
      ) : (
        <p className="qpm-no-material-difference">
          {t('scenarioLab.results.pathDeltas.noMaterialDifference')}
        </p>
      )}
    </div>
  )
}

export function ResultsPanel({
  activeTab,
  onTabChange,
  results,
  scenarioName,
  selectedPresetId,
  activeAssumptions = [],
}: ResultsPanelProps) {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language

  function handleResultTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, tab: ScenarioLabResultTab) {
    const currentIndex = RESULT_TABS.indexOf(tab)
    const nextIndex = getRovingTabIndexForKey(event.key, currentIndex, RESULT_TABS.length)
    if (nextIndex === null) return

    event.preventDefault()
    const nextTab = RESULT_TABS[nextIndex]
    onTabChange(nextTab)
    focusElementById(`scenario-tab-${nextTab}`)
  }

  const activeChart = results.charts_by_tab[activeTab]
  const decisionMetrics = QPM_DECISION_METRIC_ORDER.map((metricId) =>
    results.headline_metrics.find((metric) => metric.metric_id === metricId),
  ).filter((metric): metric is HeadlineMetric => Boolean(metric))
  const decisionScenarioName = localizedPresetName(selectedPresetId, scenarioName, t)
  const decisionPeriod =
    decisionMetrics.find((metric) => metric.period)?.period ??
    t('scenarioLab.results.decision.periodUnavailable')

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
        {RESULT_TABS.map((tab) => {
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
              onKeyDown={(event) => handleResultTabKeyDown(event, tab)}
            >
              {t(TAB_LABEL_KEYS[tab])}
            </button>
          )
        })}
      </div>

      <ActiveShockSummary assumptions={activeAssumptions} />
        <BaselineSourceSummary results={results} />

      <div className="qpm-decision-view">
        <div className="qpm-decision-view__head">
          <span>{t('scenarioLab.results.decision.eyebrow')}</span>
          <h3>{t('scenarioLab.results.decision.title', { period: decisionPeriod })}</h3>
          <p>
            {t('scenarioLab.results.decision.lead', {
              scenarioName: decisionScenarioName,
            })}
          </p>
        </div>
        <dl className="qpm-decision-view__metrics">
          {decisionMetrics.map((metric) => {
            const deltaText = formatDeltaWithUnit(metric.delta_abs, metric.unit, locale)
            const scenarioLevel = formatMetricLevelValue(metric.value, metric.unit, locale)
            const baselineLevel = formatMetricLevelValue(metric.baseline_value, metric.unit, locale)
            return (
              <div key={metric.metric_id}>
                <dt>{metricLabel(metric, t)}</dt>
                <dd>{deltaText}</dd>
                <small>
                  {t('scenarioLab.results.effectVsBaseline', {
                    defaultValue: 'Effect vs baseline',
                  })}
                </small>
                <span className="qpm-decision-view__level">
                  {t('scenarioLab.results.scenarioAndBaseline', {
                    baseline: baselineLevel,
                    defaultValue: 'Scenario {{scenario}} · baseline {{baseline}}',
                    scenario: scenarioLevel,
                  })}
                </span>
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
