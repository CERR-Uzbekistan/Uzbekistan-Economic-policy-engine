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
const QPM_BASELINE_PRIMARY_METRICS = new Set([
  'cpi_yoy',
  'policy_rate',
  'gdp_nowcast_current_quarter',
  'real_gdp_growth_quarter_yoy',
  'usd_uzs_level',
])
const QPM_BASELINE_CONTEXT_METRICS = new Set([
  'exports_yoy',
  'imports_yoy',
  'trade_balance',
  'reer_level',
])
const QPM_START_METRIC_BY_DECISION_METRIC: Record<string, string[]> = {
  gdp_growth: ['gdp_nowcast_current_quarter', 'real_gdp_growth_quarter_yoy'],
  inflation: ['cpi_yoy'],
  policy_rate: ['policy_rate'],
}

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

function formatActiveShockList(
  assumptions: Assumption[],
  t: ReturnType<typeof useTranslation>['t'],
  locale: string | undefined,
): string {
  const activeAssumptions = getActiveAssumptions(assumptions)
  if (activeAssumptions.length === 0) {
    return t('scenarioLab.results.calculation.noShock', { defaultValue: 'No active shock' })
  }
  return activeAssumptions
    .map((assumption) =>
      `${assumptionLabel(assumption, t)} ${formatAssumptionShock(
        assumption.value as number,
        assumption.unit,
        locale,
      )}`,
    )
    .join('; ')
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

function buildPathDelta(chart: ChartSpec) {
  const baseline = chart.series.find((series) => series.semantic_role === 'baseline')
  const scenario =
    chart.series.find((series) => series.series_id === 'scenario_path') ??
    chart.series.find((series) => series.semantic_role !== 'baseline')

  if (!baseline || !scenario) {
    return null
  }

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
  const baseline = chart.series.find((series) => series.semantic_role === 'baseline')
  const scenario =
    chart.series.find((series) => series.series_id === 'scenario_path') ??
    chart.series.find((series) => series.semantic_role !== 'baseline')

  if (!baseline || !scenario) {
    return true
  }

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

  const primaryMetrics = source.metrics.filter((metric) =>
    QPM_BASELINE_PRIMARY_METRICS.has(metric.metric_id),
  )
  const detailMetrics = source.metrics.filter(
    (metric) => !QPM_BASELINE_PRIMARY_METRICS.has(metric.metric_id),
  )

  return (
    <section className="qpm-baseline-source" aria-label={t('scenarioLab.results.baselineSource.ariaLabel')}>
      <div className="qpm-baseline-source__head">
        <span>{t('scenarioLab.results.baselineSource.eyebrow')}</span>
        <strong>{t('scenarioLab.results.baselineSource.title')}</strong>
        <small>{source.data_version}</small>
      </div>
      <p>{t('scenarioLab.results.baselineSource.summary')}</p>
      {primaryMetrics.length > 0 ? (
        <ul className="qpm-baseline-source__primary">
          {primaryMetrics.map((metric) => (
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
      <details className="qpm-baseline-source__details">
        <summary>{t('scenarioLab.results.baselineSource.details')}</summary>
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
        {detailMetrics.length > 0 ? (
          <ul className="qpm-baseline-source__secondary">
            {detailMetrics.map((metric) => {
              const isContextOnly = QPM_BASELINE_CONTEXT_METRICS.has(metric.metric_id)
              return (
                <li key={metric.metric_id}>
                  <span>{metric.label}</span>
                  <strong>{formatValueWithUnit(metric.value, metric.unit, locale)}</strong>
                  <small>
                    {metric.source_period} · {metric.source_label}
                    {isContextOnly
                      ? ` · ${t('scenarioLab.results.baselineSource.contextOnly')}`
                      : ''}
                  </small>
                </li>
              )
            })}
          </ul>
        ) : null}
      </details>
    </section>
  )
}

type StartComparisonRow = {
  baseline: number | null
  delta: number | null
  label: string
  metricId: string
  scenario: number
  sourcePeriod: string
  start: number
  unit: string
}

function buildStartComparisonRows(
  results: ScenarioLabResultsBundle,
  decisionMetrics: HeadlineMetric[],
): StartComparisonRow[] {
  const sourceMetrics = results.baseline_source?.metrics ?? []
  return decisionMetrics
    .map((metric) => {
      const startMetricIds = QPM_START_METRIC_BY_DECISION_METRIC[metric.metric_id] ?? []
      const sourceMetric = sourceMetrics.find((candidate) =>
        startMetricIds.includes(candidate.metric_id),
      )
      if (!sourceMetric) {
        return null
      }
      return {
        baseline: metric.baseline_value,
        delta: metric.delta_abs,
        label: metric.label,
        metricId: metric.metric_id,
        scenario: metric.value,
        sourcePeriod: sourceMetric.source_period,
        start: sourceMetric.value,
        unit: metric.unit,
      }
    })
    .filter((row): row is StartComparisonRow => Boolean(row))
}

function CalculationTrail({
  activeAssumptions,
  decisionPeriod,
  modelLabel,
  sourceLabel,
}: {
  activeAssumptions: Assumption[]
  decisionPeriod: string
  modelLabel: string
  sourceLabel: string
}) {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const shockText = formatActiveShockList(activeAssumptions, t, locale)

  return (
    <div
      className="qpm-calculation-trail"
      aria-label={t('scenarioLab.results.calculation.ariaLabel', {
        defaultValue: 'How QPM scenario results are calculated',
      })}
    >
      <p>
        {t('scenarioLab.results.calculation.lead', {
          defaultValue:
            'Where the result comes from: QPM combines the starting point, the selected shock, and the model equations. The numbers below are calculated scenario outputs, not copied directly from Overview.',
        })}
      </p>
      <ol>
        <li>
          <span>{t('scenarioLab.results.calculation.start', { defaultValue: 'Start' })}</span>
          <strong>{sourceLabel}</strong>
        </li>
        <li>
          <span>{t('scenarioLab.results.calculation.shock', { defaultValue: 'Shock' })}</span>
          <strong>{shockText}</strong>
        </li>
        <li>
          <span>{t('scenarioLab.results.calculation.model', { defaultValue: 'Model' })}</span>
          <strong>{modelLabel}</strong>
        </li>
        <li>
          <span>{t('scenarioLab.results.calculation.output', { defaultValue: 'Output' })}</span>
          <strong>{decisionPeriod}</strong>
        </li>
      </ol>
    </div>
  )
}

function QpmResultBridge({
  decisionMetrics,
  results,
}: {
  decisionMetrics: HeadlineMetric[]
  results: ScenarioLabResultsBundle
}) {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const rows = buildStartComparisonRows(results, decisionMetrics)

  if (rows.length === 0) {
    return null
  }

  return (
    <section
      className="qpm-result-bridge"
      aria-label={t('scenarioLab.results.bridge.ariaLabel', {
        defaultValue: 'Current indicators to QPM scenario endpoint',
      })}
    >
      <div>
        <span>
          {t('scenarioLab.results.bridge.eyebrow', {
            defaultValue: 'Current values are not the result',
          })}
        </span>
        <h4>
          {t('scenarioLab.results.bridge.title', {
            defaultValue: "Why the result can differ from today's indicators",
          })}
        </h4>
        <p>
          {t('scenarioLab.results.bridge.body', {
            defaultValue:
              'The Overview snapshot sets the starting conditions. QPM then projects a baseline path and compares the selected scenario against that baseline endpoint.',
          })}
        </p>
      </div>
      <dl>
        {rows.map((row) => (
          <div key={row.metricId}>
            <dt>
              {t(`scenarioLab.results.metrics.${row.metricId}`, {
                defaultValue: row.label,
              })}
            </dt>
            <dd>
              <span>
                {t('scenarioLab.results.bridge.start', {
                  defaultValue: 'Start · {{period}}',
                  period: row.sourcePeriod,
                })}
              </span>
              <strong>{formatMetricLevelValue(row.start, row.unit, locale)}</strong>
            </dd>
            <dd>
              <span>{t('scenarioLab.results.bridge.baseline', { defaultValue: 'Baseline endpoint' })}</span>
              <strong>{formatMetricLevelValue(row.baseline, row.unit, locale)}</strong>
            </dd>
            <dd>
              <span>{t('scenarioLab.results.bridge.scenario', { defaultValue: 'Scenario endpoint' })}</span>
              <strong>{formatMetricLevelValue(row.scenario, row.unit, locale)}</strong>
            </dd>
            <dd>
              <span>{t('scenarioLab.results.bridge.effect', { defaultValue: 'Effect' })}</span>
              <strong>{formatDeltaWithUnit(row.delta, row.unit, locale)}</strong>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function ScenarioTabChart({ chart, activeTab }: { chart: ChartSpec; activeTab: ScenarioLabResultTab }) {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const pathDelta = buildPathDelta(chart)
  const hasMaterialDifference = hasMaterialPathDifference(chart)

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
      {hasMaterialDifference ? (
        <ChartRenderer
          height={300}
          hideAttribution
          hideTakeaway
          showEndLabels
          spec={chart}
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
  const activeChart = results.charts_by_tab[activeTab]
  const modelAttribution =
    results.impulse_response_chart?.model_attribution[0] ?? activeChart.model_attribution[0]
  const decisionMetrics = QPM_DECISION_METRIC_ORDER.map((metricId) =>
    results.headline_metrics.find((metric) => metric.metric_id === metricId),
  ).filter((metric): metric is HeadlineMetric => Boolean(metric))
  const decisionScenarioName = localizedPresetName(selectedPresetId, scenarioName, t)
  const decisionPeriod =
    decisionMetrics.find((metric) => metric.period)?.period ??
    t('scenarioLab.results.decision.periodUnavailable')
  const calculationSourceLabel =
    results.baseline_source?.data_version ??
    t('scenarioLab.results.calculation.unknownSource', {
      defaultValue: 'Latest available snapshot',
    })
  const calculationModelLabel =
    modelAttribution?.model_name ??
    t('scenarioLab.results.calculation.qpmModel', {
      defaultValue: 'QPM scenario model',
    })

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
        <CalculationTrail
          activeAssumptions={activeAssumptions}
          decisionPeriod={decisionPeriod}
          modelLabel={calculationModelLabel}
          sourceLabel={calculationSourceLabel}
        />
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
        <QpmResultBridge decisionMetrics={decisionMetrics} results={results} />
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
