import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChartSemanticRole, ChartSpec, ComparisonScenario, ScenarioLabResultTab } from '../../contracts/data-contract'
import type { QpmBridgePayload, QpmScenario } from '../../data/bridge/qpm-types'
import type { SavedScenarioRecord } from '../../state/scenarioStore'
import { ChartRenderer } from '../system/ChartRenderer'

type ComparisonChartPanelProps = {
  selectedScenarios: ComparisonScenario[]
  selectedIds: string[]
  baselineId: string
  qpmPayload: QpmBridgePayload | null
  savedScenariosById: Record<string, SavedScenarioRecord>
}

const TAB_ORDER: readonly ScenarioLabResultTab[] = [
  'headline_impact',
  'macro_path',
  'external_balance',
  'fiscal_effects',
]

const TAB_TO_METRIC: Record<ScenarioLabResultTab, keyof QpmScenario['paths']> = {
  headline_impact: 'gdp_growth',
  macro_path: 'inflation',
  external_balance: 'exchange_rate',
  fiscal_effects: 'policy_rate',
}

const TAB_TO_UNIT: Record<ScenarioLabResultTab, string> = {
  headline_impact: '%',
  macro_path: '%',
  external_balance: 'UZS/USD',
  fiscal_effects: '%',
}

function toSemanticRole(scenario: ComparisonScenario, baselineId: string): ChartSemanticRole {
  if (scenario.scenario_id === baselineId) {
    return 'baseline'
  }
  if (scenario.scenario_type === 'stress') {
    return 'downside'
  }
  return 'alternative'
}

function buildQpmMiniChartSpec(params: {
  scenario: ComparisonScenario
  qpmScenario: QpmScenario
  payload: QpmBridgePayload
  tab: ScenarioLabResultTab
  baselineId: string
  title: string
  subtitle: string
  takeaway: string
}): ChartSpec {
  const { scenario, qpmScenario, payload, tab, baselineId, title, subtitle, takeaway } = params
  const metricId = TAB_TO_METRIC[tab]
  const values = qpmScenario.paths[metricId]

  return {
    chart_id: `comparison-mini-${tab}-${scenario.scenario_id}`,
    title,
    subtitle,
    chart_type: 'line',
    x: {
      label: 'Period',
      unit: '',
      values: qpmScenario.periods,
    },
    y: {
      label: metricId,
      unit: TAB_TO_UNIT[tab],
      values,
    },
    series: [
      {
        series_id: `${scenario.scenario_id}-${metricId}`,
        label: scenario.scenario_name,
        semantic_role: toSemanticRole(scenario, baselineId),
        values,
      },
    ],
    view_mode: 'level',
    uncertainty: [],
    takeaway,
    model_attribution: [payload.attribution],
  }
}

function buildFallbackScalarSpec(params: {
  scenario: ComparisonScenario
  baselineId: string
  tab: ScenarioLabResultTab
  title: string
  subtitle: string
  takeaway: string
}): ChartSpec | null {
  const { scenario, baselineId, tab, title, subtitle, takeaway } = params
  const metricId = TAB_TO_METRIC[tab]
  const value = scenario.values[metricId]
  if (!Number.isFinite(value)) {
    return null
  }

  const numericValue = value as number
  return {
    chart_id: `comparison-fallback-${tab}-${scenario.scenario_id}`,
    title,
    subtitle,
    chart_type: 'bar',
    x: {
      label: 'Metric',
      unit: '',
      values: [metricId],
    },
    y: {
      label: metricId,
      unit: TAB_TO_UNIT[tab],
      values: [numericValue],
    },
    series: [
      {
        series_id: `${scenario.scenario_id}-${metricId}`,
        label: scenario.scenario_name,
        semantic_role: toSemanticRole(scenario, baselineId),
        values: [numericValue],
      },
    ],
    view_mode: 'level',
    uncertainty: [],
    takeaway,
    model_attribution: [],
  }
}

export function ComparisonChartPanel({
  selectedScenarios,
  selectedIds,
  baselineId,
  qpmPayload,
  savedScenariosById,
}: ComparisonChartPanelProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ScenarioLabResultTab>('headline_impact')
  const selectedById = useMemo(
    () =>
      selectedScenarios.reduce<Record<string, ComparisonScenario>>((acc, scenario) => {
        acc[scenario.scenario_id] = scenario
        return acc
      }, {}),
    [selectedScenarios],
  )
  const qpmById = useMemo(() => {
    if (!qpmPayload) {
      return {}
    }
    return qpmPayload.scenarios.reduce<Record<string, QpmScenario>>((acc, scenario) => {
      acc[scenario.scenario_id] = scenario
      return acc
    }, {})
  }, [qpmPayload])

  if (selectedScenarios.length < 2) {
    return (
      <section className="comparison-panel comparison-panel--chart" aria-labelledby="comparison-chart-title">
        <div className="comparison-panel__head page-section-head">
          <h2 id="comparison-chart-title">{t('comparison.chart.title')}</h2>
          <p>{t('comparison.chart.description')}</p>
        </div>
        <p className="empty-state">{t('comparison.chart.emptySelection')}</p>
      </section>
    )
  }

  return (
    <section className="comparison-panel comparison-panel--chart" aria-labelledby="comparison-chart-title">
      <div className="comparison-panel__head page-section-head">
        <h2 id="comparison-chart-title">{t('comparison.chart.title')}</h2>
        <p>{t('comparison.chart.description')}</p>
      </div>

      <div className="comparison-view-toggle segmented-control" role="tablist" aria-label={t('comparison.chart.tabSwitcherAria')}>
        {TAB_ORDER.map((tabId) => {
          const isActive = activeTab === tabId
          return (
            <button
              key={tabId}
              id={`comparison-tab-${tabId}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`comparison-panel-${tabId}`}
              tabIndex={isActive ? 0 : -1}
              className={isActive ? 'active' : ''}
              onClick={() => setActiveTab(tabId)}
            >
              {t(`comparison.chart.tabSwitcher.${tabId}`)}
            </button>
          )
        })}
      </div>

      <div
        id={`comparison-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`comparison-tab-${activeTab}`}
        className="comparison-small-multiples"
      >
        {selectedIds.map((scenarioId) => {
          const scenario = selectedById[scenarioId]
          if (!scenario) {
            return null
          }

          const tabLabel = t(`comparison.chart.tabSwitcher.${activeTab}`)
          const title = t('comparison.chart.miniTitle', { scenario_name: scenario.scenario_name })
          const subtitle = t('comparison.chart.miniSubtitle', { tab_label: tabLabel })
          const takeaway = t('comparison.chart.miniTakeaway')
          const qpmScenario = qpmById[scenarioId]
          const savedScenario = savedScenariosById[scenarioId]
          const savedChart = savedScenario?.run_results?.charts_by_tab[activeTab]

          let chart: ChartSpec | null = null
          let fallbackMessage: string | null = null

          if (qpmPayload && qpmScenario) {
            chart = buildQpmMiniChartSpec({
              scenario,
              qpmScenario,
              payload: qpmPayload,
              tab: activeTab,
              baselineId,
              title,
              subtitle,
              takeaway,
            })
          } else if (savedScenario) {
            if (savedChart) {
              chart = savedChart
            } else {
              fallbackMessage = t('comparison.chart.savedRunEmpty')
            }
          } else {
            chart = buildFallbackScalarSpec({
              scenario,
              baselineId,
              tab: activeTab,
              title,
              subtitle,
              takeaway,
            })
            if (!chart) {
              fallbackMessage = t('comparison.chart.unavailable')
            }
          }

          return (
            <article key={scenarioId} className="comparison-small-multiples__slot">
              <h3>{scenario.scenario_name}</h3>
              {chart ? (
                <ChartRenderer
                  spec={chart}
                  height={200}
                  ariaLabel={t('comparison.chart.slotAria', {
                    scenario_name: scenario.scenario_name,
                    tab_label: tabLabel,
                  })}
                />
              ) : (
                <p className="empty-state">{fallbackMessage ?? t('comparison.chart.unavailable')}</p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
