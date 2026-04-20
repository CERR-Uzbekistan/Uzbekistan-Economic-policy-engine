import type {
  ChartSpec,
  HeadlineMetric,
  ModelAttribution,
  ScenarioLabAssumptionState,
  ScenarioLabInterpretation,
  ScenarioLabPreset,
  ScenarioLabResultsBundle,
  ScenarioLabWorkspace,
} from '../../contracts/data-contract'

const ATTRIBUTION: ModelAttribution = {
  model_id: 'scenario-lab-mock-engine',
  model_name: 'Scenario Lab Mock Engine',
  module: 'scenario-lab',
  version: '0.1.0',
  run_id: 'run-2026-04-17-scenario-lab',
  data_version: 'mock-v1',
  timestamp: '2026-04-17T11:00:00+05:00',
}

export const scenarioLabBaseDataVersion = ATTRIBUTION.data_version

const PERIODS = ['2026 Q1', '2026 Q2', '2026 Q3', '2026 Q4']

const PRESETS: ScenarioLabPreset[] = [
  {
    preset_id: 'balanced-baseline',
    title: 'Balanced baseline',
    summary: 'No additional shocks; use as anchor for alternative scenarios.',
    assumption_overrides: {},
  },
  {
    preset_id: 'external-slowdown',
    title: 'External slowdown',
    summary: 'Lower remittances and export demand with mild exchange-rate pressure.',
    assumption_overrides: {
      remittance_change: -12,
      export_demand_change: -8,
      exchange_rate_change: 4,
    },
  },
  {
    preset_id: 'fiscal-consolidation',
    title: 'Fiscal consolidation',
    summary: 'Lower discretionary spending with improved revenue effort.',
    assumption_overrides: {
      gov_spending_change: -2,
      tax_revenue_change: 1.2,
    },
  },
  {
    preset_id: 'inflation-persistence',
    title: 'Inflation persistence',
    summary: 'Commodity and pass-through pressure despite policy tightening.',
    assumption_overrides: {
      commodity_price_change: 10,
      pass_through_adjustment: 0.3,
      policy_rate_change: 1,
    },
  },
]

export const scenarioLabPresetModelIds: Record<string, string[]> = PRESETS.reduce<
  Record<string, string[]>
>((acc, preset) => {
  acc[preset.preset_id] = [ATTRIBUTION.model_id]
  return acc
}, {})

const SCENARIO_ASSUMPTIONS = [
  {
    key: 'policy_rate_change',
    label: 'Policy rate change',
    description: 'Change in policy rate relative to baseline stance.',
    category: 'macro',
    unit: 'pp',
    technical_variable: 'qpm.policy_rate_shock',
    min: -3,
    max: 4,
    step: 0.25,
    default_value: 0,
  },
  {
    key: 'exchange_rate_change',
    label: 'Exchange-rate depreciation',
    description: 'Additional depreciation relative to baseline path.',
    category: 'macro',
    unit: '%',
    technical_variable: 'qpm.fx_depreciation_shock',
    min: -10,
    max: 20,
    step: 1,
    default_value: 0,
  },
  {
    key: 'remittance_change',
    label: 'Remittance shock',
    description: 'Change in remittance inflows against baseline.',
    category: 'external',
    unit: '%',
    technical_variable: 'pe.remittance_growth_adjustment',
    min: -25,
    max: 20,
    step: 1,
    default_value: 0,
  },
  {
    key: 'commodity_price_change',
    label: 'Commodity price shock',
    description: 'External commodity-price move affecting import bill and inflation.',
    category: 'external',
    unit: '%',
    technical_variable: 'dfm.commodity_price_index_shock',
    min: -20,
    max: 25,
    step: 1,
    default_value: 0,
  },
  {
    key: 'gov_spending_change',
    label: 'Government spending change',
    description: 'Shift in discretionary public spending envelope.',
    category: 'fiscal',
    unit: '% GDP',
    technical_variable: 'fpp.primary_spending_adjustment',
    min: -3,
    max: 4,
    step: 0.2,
    default_value: 0,
  },
  {
    key: 'tax_revenue_change',
    label: 'Tax revenue effort',
    description: 'Revenue collection change relative to baseline.',
    category: 'fiscal',
    unit: '% GDP',
    technical_variable: 'fpp.revenue_effort_adjustment',
    min: -2,
    max: 3,
    step: 0.2,
    default_value: 0,
  },
  {
    key: 'tariff_change',
    label: 'Tariff adjustment',
    description: 'Average tariff-rate change on imported goods.',
    category: 'trade',
    unit: 'pp',
    technical_variable: 'io.tariff_rate_adjustment',
    min: -10,
    max: 10,
    step: 0.5,
    default_value: 0,
  },
  {
    key: 'export_demand_change',
    label: 'External demand shift',
    description: 'Foreign demand shock to exports.',
    category: 'trade',
    unit: '%',
    technical_variable: 'pe.external_demand_shock',
    min: -20,
    max: 20,
    step: 1,
    default_value: 0,
  },
  {
    key: 'pass_through_adjustment',
    label: 'Exchange-rate pass-through adjustment',
    description: 'Adjustment to pass-through intensity in inflation block.',
    category: 'advanced',
    unit: 'index',
    technical_variable: 'qpm.pass_through_scaler',
    min: -0.5,
    max: 0.8,
    step: 0.05,
    default_value: 0,
  },
  {
    key: 'risk_premium_shock',
    label: 'Risk premium shock',
    description: 'Temporary financial stress affecting funding conditions.',
    category: 'advanced',
    unit: 'pp',
    technical_variable: 'qpm.risk_premium_shock',
    min: -1.5,
    max: 3,
    step: 0.25,
    default_value: 0,
  },
] as const

function roundTo(value: number, decimals = 1) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function getDefaultAssumptionState(): ScenarioLabAssumptionState {
  return SCENARIO_ASSUMPTIONS.reduce<ScenarioLabAssumptionState>((acc, assumption) => {
    acc[assumption.key] = assumption.default_value
    return acc
  }, {})
}

export function applyPresetToState(presetId: string): ScenarioLabAssumptionState {
  const base = getDefaultAssumptionState()
  const preset = PRESETS.find((entry) => entry.preset_id === presetId)
  if (!preset) {
    return base
  }
  return { ...base, ...preset.assumption_overrides }
}

function getMetricCore(values: ScenarioLabAssumptionState) {
  const policyRate = values.policy_rate_change ?? 0
  const fx = values.exchange_rate_change ?? 0
  const remittance = values.remittance_change ?? 0
  const commodity = values.commodity_price_change ?? 0
  const govSpending = values.gov_spending_change ?? 0
  const taxEffort = values.tax_revenue_change ?? 0
  const tariff = values.tariff_change ?? 0
  const externalDemand = values.export_demand_change ?? 0
  const passThrough = values.pass_through_adjustment ?? 0
  const riskPremium = values.risk_premium_shock ?? 0

  const gdpGrowth = clamp(
    roundTo(
      5.8 +
        0.16 * govSpending -
        0.12 * policyRate -
        0.05 * fx +
        0.04 * externalDemand +
        0.03 * remittance -
        0.03 * riskPremium,
    ),
    2.5,
    8.5,
  )

  const inflation = clamp(
    roundTo(
      8.6 +
        0.24 * fx +
        0.11 * commodity +
        0.2 * passThrough -
        0.16 * policyRate -
        0.04 * tariff +
        0.03 * govSpending,
    ),
    4.5,
    16.5,
  )

  const currentAccount = clamp(
    roundTo(
      -2.2 +
        0.09 * fx +
        0.08 * externalDemand +
        0.06 * tariff -
        0.06 * govSpending -
        0.04 * remittance -
        0.03 * commodity,
    ),
    -6,
    2.5,
  )

  const fiscalBalance = clamp(roundTo(-3.1 - 0.45 * govSpending + 0.36 * taxEffort), -6.5, 1.5)
  const policyRateLevel = clamp(roundTo(13.5 + policyRate + 0.2 * riskPremium), 10, 20)
  const exchangeRateLevel = clamp(roundTo(12600 + fx * 85 + riskPremium * 35, 0), 11500, 15000)

  return {
    gdpGrowth,
    inflation,
    currentAccount,
    fiscalBalance,
    policyRateLevel,
    exchangeRateLevel,
  }
}

function buildHeadlineMetrics(values: ScenarioLabAssumptionState): HeadlineMetric[] {
  const base = getMetricCore(getDefaultAssumptionState())
  const scenario = getMetricCore(values)
  const now = '2026-04-17T11:00:00+05:00'

  const metricRows = [
    {
      metric_id: 'gdp_growth',
      label: 'GDP growth',
      value: scenario.gdpGrowth,
      unit: '%',
      baseline: base.gdpGrowth,
      period: '2026 Q4',
    },
    {
      metric_id: 'inflation',
      label: 'Inflation',
      value: scenario.inflation,
      unit: '%',
      baseline: base.inflation,
      period: '2026 Q4',
    },
    {
      metric_id: 'current_account',
      label: 'Current account',
      value: scenario.currentAccount,
      unit: '% GDP',
      baseline: base.currentAccount,
      period: '2026 Q4',
    },
    {
      metric_id: 'fiscal_balance',
      label: 'Fiscal balance',
      value: scenario.fiscalBalance,
      unit: '% GDP',
      baseline: base.fiscalBalance,
      period: '2026 Q4',
    },
    {
      metric_id: 'policy_rate',
      label: 'Policy rate',
      value: scenario.policyRateLevel,
      unit: '%',
      baseline: base.policyRateLevel,
      period: '2026 Q4',
    },
    {
      metric_id: 'exchange_rate',
      label: 'Exchange rate',
      value: scenario.exchangeRateLevel,
      unit: 'UZS/USD',
      baseline: base.exchangeRateLevel,
      period: '2026 Q4',
    },
  ]

  return metricRows.map((entry) => {
    const deltaAbs = roundTo(entry.value - entry.baseline)
    const deltaPct = entry.baseline === 0 ? null : roundTo((deltaAbs / entry.baseline) * 100, 2)
    const direction = deltaAbs > 0 ? 'up' : deltaAbs < 0 ? 'down' : 'flat'
    return {
      metric_id: entry.metric_id,
      label: entry.label,
      value: entry.value,
      unit: entry.unit,
      period: entry.period,
      baseline_value: entry.baseline,
      delta_abs: deltaAbs,
      delta_pct: deltaPct,
      direction,
      confidence: 'medium',
      last_updated: now,
      model_attribution: [ATTRIBUTION],
    } satisfies HeadlineMetric
  })
}

function buildSeriesPath(baseValue: number, scenarioValue: number, softness = 0.35) {
  return PERIODS.map((_, index) => {
    const t = (index + 1) / PERIODS.length
    return roundTo(baseValue + (scenarioValue - baseValue) * t * (1 + softness * (1 - t)))
  })
}

function buildChartSeries(
  title: string,
  subtitle: string,
  axisLabel: string,
  unit: string,
  baselineValue: number,
  scenarioValue: number,
  takeaway: string,
): ChartSpec {
  return {
    chart_id: title.toLowerCase().replace(/\s+/g, '_'),
    title,
    subtitle,
    chart_type: 'line',
    x: {
      label: 'Period',
      unit: '',
      values: PERIODS,
    },
    y: {
      label: axisLabel,
      unit,
      values: buildSeriesPath(baselineValue, scenarioValue),
    },
    series: [
      {
        series_id: 'baseline_path',
        label: 'Baseline path',
        semantic_role: 'baseline',
        values: buildSeriesPath(baselineValue, baselineValue),
      },
      {
        series_id: 'scenario_path',
        label: 'Scenario path',
        semantic_role: 'alternative',
        values: buildSeriesPath(baselineValue, scenarioValue),
      },
    ],
    view_mode: 'level',
    uncertainty: [],
    takeaway,
    model_attribution: [ATTRIBUTION],
  }
}

function buildInterpretation(values: ScenarioLabAssumptionState): ScenarioLabInterpretation {
  const core = getMetricCore(values)
  const majorDrivers = Object.entries(values)
    .filter(([, value]) => Math.abs(value) > 0.01)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 2)
    .map(([key]) => key)

  const driverSummary =
    majorDrivers.length > 0
      ? `Main drivers are ${majorDrivers.join(' and ').replace(/_/g, ' ')}.`
      : 'No major shocks selected; results stay close to baseline.'

  return {
    what_changed: [
      `GDP moves to ${core.gdpGrowth.toFixed(1)}% by 2026 Q4.`,
      `Inflation settles at ${core.inflation.toFixed(1)}%, with exchange-rate and commodity sensitivity.`,
      `External and fiscal balances move with trade and spending settings.`,
    ],
    why_it_changed: [
      driverSummary,
      'Domestic demand and price channels respond first, then external and fiscal balances adjust.',
    ],
    key_risks: [
      'Pass-through may be stronger than assumed when exchange-rate shocks are persistent.',
      'Fiscal and external shocks can amplify each other in downside cases.',
    ],
    policy_implications: [
      'Sequence monetary and fiscal decisions to avoid conflicting signals.',
      'Use targeted mitigation if downside scenarios widen the growth-inflation trade-off.',
    ],
    suggested_next_scenarios: [
      'External slowdown with tighter fiscal stance.',
      'Inflation persistence with stronger policy-rate response.',
      'Exchange-rate shock with remittance downside stress.',
    ],
  }
}

export function buildScenarioLabResults(values: ScenarioLabAssumptionState): ScenarioLabResultsBundle {
  const baselineCore = getMetricCore(getDefaultAssumptionState())
  const scenarioCore = getMetricCore(values)
  const headlineMetrics = buildHeadlineMetrics(values)
  const interpretation = buildInterpretation(values)

  return {
    headline_metrics: headlineMetrics,
    charts_by_tab: {
      headline_impact: {
        chart_id: 'headline_impact_delta',
        title: 'Headline impact vs baseline',
        subtitle: 'Selected scenario impact at horizon',
        chart_type: 'bar',
        x: {
          label: 'Metric',
          unit: '',
          values: ['GDP', 'Inflation', 'Current Account', 'Fiscal Balance'],
        },
        y: {
          label: 'Delta',
          unit: 'pp',
          values: [
            roundTo(scenarioCore.gdpGrowth - baselineCore.gdpGrowth),
            roundTo(scenarioCore.inflation - baselineCore.inflation),
            roundTo(scenarioCore.currentAccount - baselineCore.currentAccount),
            roundTo(scenarioCore.fiscalBalance - baselineCore.fiscalBalance),
          ],
        },
        series: [
          {
            series_id: 'delta',
            label: 'Scenario minus baseline',
            semantic_role: 'alternative',
            values: [
              roundTo(scenarioCore.gdpGrowth - baselineCore.gdpGrowth),
              roundTo(scenarioCore.inflation - baselineCore.inflation),
              roundTo(scenarioCore.currentAccount - baselineCore.currentAccount),
              roundTo(scenarioCore.fiscalBalance - baselineCore.fiscalBalance),
            ],
          },
        ],
        view_mode: 'delta',
        uncertainty: [],
        takeaway: 'This view highlights directional trade-offs before detailed channel review.',
        model_attribution: [ATTRIBUTION],
      },
      macro_path: buildChartSeries(
        'Macro path (real GDP growth)',
        'Baseline and scenario trajectories',
        'GDP growth',
        '%',
        baselineCore.gdpGrowth,
        scenarioCore.gdpGrowth,
        'Growth path reflects combined demand, cost, and policy-rate channels.',
      ),
      external_balance: buildChartSeries(
        'External balance path (current account)',
        'Baseline and scenario trajectories',
        'Current account',
        '% GDP',
        baselineCore.currentAccount,
        scenarioCore.currentAccount,
        'External balance responds to exchange-rate, trade, and remittance assumptions.',
      ),
      fiscal_effects: buildChartSeries(
        'Fiscal effects path (fiscal balance)',
        'Baseline and scenario trajectories',
        'Fiscal balance',
        '% GDP',
        baselineCore.fiscalBalance,
        scenarioCore.fiscalBalance,
        'Fiscal outcomes are driven by spending and revenue assumptions in this mock setup.',
      ),
    },
    interpretation,
  }
}

export const scenarioLabWorkspaceMock: ScenarioLabWorkspace = {
  workspace_id: 'scenario-lab-v1',
  workspace_name: 'Scenario Lab Workspace',
  generated_at: '2026-04-17T11:00:00+05:00',
  assumptions: SCENARIO_ASSUMPTIONS.map((item) => ({ ...item })),
  presets: PRESETS,
}
