import type {
  ChartSpec,
  HeadlineMetric,
  ScenarioLabAssumptionState,
  ScenarioLabInterpretation,
  ScenarioLabPreset,
  ScenarioLabResultsBundle,
  ScenarioLabWorkspace,
  SuggestedNextScenario,
} from '../../contracts/data-contract'
import {
  QPM_SCENARIO_ATTRIBUTION,
  solveScenarioLabQpm,
  type QpmScenarioRun,
} from '../scenario-lab/qpm-solver.js'

const ATTRIBUTION = QPM_SCENARIO_ATTRIBUTION

export const scenarioLabBaseDataVersion = ATTRIBUTION.data_version

const PERIODS = ['2026 Q1', '2026 Q2', '2026 Q3', '2026 Q4']

const PRESETS: ScenarioLabPreset[] = [
  {
    preset_id: 'baseline',
    title: 'Baseline',
    summary: 'All shocks zero; economy follows the baseline calibration path from Q1 2026 initial conditions toward steady state.',
    assumption_overrides: {},
  },
  {
    preset_id: 'rate-cut-100bp',
    title: 'Policy rate cut (−100 bp)',
    summary: 'CBU cuts the policy rate by 100 bp below the baseline path; expect stronger demand and weaker disinflation pressure.',
    assumption_overrides: {
      policy_rate_change: -1.0,
    },
  },
  {
    preset_id: 'rate-hike-100bp',
    title: 'Policy rate hike (+100 bp)',
    summary: 'CBU hikes the policy rate by 100 bp above the Taylor-rule path; expect lower output gap and stronger UZS via the UIP channel.',
    assumption_overrides: {
      policy_rate_change: 1.0,
    },
  },
  {
    preset_id: 'exchange-rate-shock',
    title: 'UZS depreciation (+10%)',
    summary: 'One-off 10% UZS depreciation against USD; expect inflation spike via direct pass-through (a4) and RER gap, plus policy-rate response.',
    assumption_overrides: {
      exchange_rate_change: 10,
    },
  },
  {
    preset_id: 'external-slowdown',
    title: 'External slowdown',
    summary:
      'Foreign output gap weakens relative to baseline; expect softer activity through the active QPM external-demand channel.',
    assumption_overrides: {
      export_demand_change: -0.5,
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
    label: 'Foreign output gap shock',
    description: 'Foreign output-gap shock entering the QPM IS curve through b3 * gap*_t.',
    category: 'trade',
    unit: 'pp',
    technical_variable: 'qpm.external_demand_shock',
    min: -5,
    max: 5,
    step: 0.25,
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

function qpmEndpointIndex(qpmRun: QpmScenarioRun): number {
  return Math.min(3, qpmRun.scenario.gdpGrowth.length - 1)
}

function buildAccountingPath(start: number, end: number, points: number): number[] {
  return Array.from({ length: points }, (_, index) => {
    const t = points <= 1 ? 1 : index / (points - 1)
    return roundTo(start + (end - start) * t)
  })
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

function getMetricCore(values: ScenarioLabAssumptionState, qpmRun = solveScenarioLabQpm(values)) {
  const endpointIndex = qpmEndpointIndex(qpmRun)
  const fx = values.exchange_rate_change ?? 0
  const remittance = values.remittance_change ?? 0
  const commodity = values.commodity_price_change ?? 0
  const govSpending = values.gov_spending_change ?? 0
  const taxEffort = values.tax_revenue_change ?? 0
  const tariff = values.tariff_change ?? 0
  const externalDemand = values.export_demand_change ?? 0

  const currentAccount = clamp(
    roundTo(
      -2.2 +
        0.09 * fx +
        0.08 * externalDemand +
        0.06 * tariff -
        0.06 * govSpending +
        0.04 * remittance -
        0.03 * commodity,
    ),
    -6,
    2.5,
  )

  const fiscalBalance = clamp(roundTo(-3.1 - 0.45 * govSpending + 0.36 * taxEffort), -6.5, 1.5)

  return {
    gdpGrowth: qpmRun.scenario.gdpGrowth[endpointIndex],
    inflation: qpmRun.scenario.inflation[endpointIndex],
    currentAccount,
    fiscalBalance,
    policyRateLevel: qpmRun.scenario.policyRate[endpointIndex],
    exchangeRateLevel: qpmRun.scenario.exchangeRate[endpointIndex],
  }
}

function buildHeadlineMetrics(
  values: ScenarioLabAssumptionState,
  qpmRun: QpmScenarioRun,
): HeadlineMetric[] {
  const baseQpm = solveScenarioLabQpm(getDefaultAssumptionState())
  const base = getMetricCore(getDefaultAssumptionState(), baseQpm)
  const scenario = getMetricCore(values, qpmRun)
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

function buildChartSeries(
  chartId: string,
  title: string,
  subtitle: string,
  axisLabel: string,
  unit: string,
  periods: string[],
  baselineValues: number[],
  scenarioValues: number[],
  takeaway: string,
): ChartSpec {
  return {
    chart_id: chartId,
    title,
    subtitle,
    chart_type: 'line',
    x: {
      label: 'Period',
      unit: '',
      values: periods,
    },
    y: {
      label: axisLabel,
      unit,
      values: scenarioValues,
    },
    series: [
      {
        series_id: 'baseline_path',
        label: 'Baseline path',
        semantic_role: 'baseline',
        values: baselineValues,
      },
      {
        series_id: 'scenario_path',
        label: 'Scenario path',
        semantic_role: 'alternative',
        values: scenarioValues,
      },
    ],
    view_mode: 'level',
    uncertainty: [],
    takeaway,
    model_attribution: [ATTRIBUTION],
  }
}

function buildInterpretation(values: ScenarioLabAssumptionState): ScenarioLabInterpretation {
  const interpretation = buildInterpretationCore(values)
  return interpretation
}

const ASSUMPTION_INTERPRETATION_LABELS: Record<string, string> = {
  policy_rate_change: 'policy-rate setting',
  exchange_rate_change: 'exchange-rate path',
  remittance_change: 'remittance inflows',
  commodity_price_change: 'commodity-price pressure',
  gov_spending_change: 'government spending',
  tax_revenue_change: 'tax-revenue effort',
  tariff_change: 'import tariff setting',
  export_demand_change: 'external demand',
  pass_through_adjustment: 'exchange-rate pass-through',
  risk_premium_shock: 'risk premium',
}

function formatDriverLabel(key: string): string {
  return ASSUMPTION_INTERPRETATION_LABELS[key] ?? key.replace(/_/g, ' ')
}

function joinDriverLabels(labels: string[]): string {
  if (labels.length <= 1) {
    return labels[0] ?? ''
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`
  }
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

function activeDriverLabels(values: ScenarioLabAssumptionState, keys: string[]): string[] {
  return keys.filter((key) => Math.abs(values[key] ?? 0) > 0.01).map(formatDriverLabel)
}

function buildInterpretationCore(values: ScenarioLabAssumptionState): ScenarioLabInterpretation {
  const base = getMetricCore(getDefaultAssumptionState())
  const core = getMetricCore(values)
  const majorDrivers = Object.entries(values)
    .filter(([, value]) => Math.abs(value) > 0.01)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 2)
    .map(([key]) => formatDriverLabel(key))

  const driverSummary =
    majorDrivers.length > 0
      ? `Main drivers are ${joinDriverLabels(majorDrivers)}.`
      : 'No major shocks selected; results stay close to baseline.'
  const priceDrivers = activeDriverLabels(values, [
    'exchange_rate_change',
    'commodity_price_change',
    'tariff_change',
    'pass_through_adjustment',
    'policy_rate_change',
    'gov_spending_change',
  ])
  const balanceDrivers = activeDriverLabels(values, [
    'remittance_change',
    'export_demand_change',
    'tariff_change',
    'gov_spending_change',
    'tax_revenue_change',
    'commodity_price_change',
  ])
  const inflationChannelText =
    priceDrivers.length > 0
      ? `active price channels: ${joinDriverLabels(priceDrivers)}.`
      : 'no additional price shock channel is selected.'
  const balanceChannelText =
    balanceDrivers.length > 0
      ? `External and fiscal balances move through ${joinDriverLabels(balanceDrivers)}.`
      : 'External and fiscal balances stay near baseline because remittance, trade, spending, and revenue settings are unchanged.'

  return {
    what_changed: [
      `GDP growth is ${roundTo(core.gdpGrowth - base.gdpGrowth).toFixed(1)} pp versus baseline by 2026 Q4.`,
      `Inflation is ${roundTo(core.inflation - base.inflation).toFixed(1)} pp versus baseline; ${inflationChannelText}`,
      balanceChannelText,
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

// Prompt §4.4: clickable suggested-next anchors with route + preset targets.
const SCENARIO_LAB_SUGGESTED_NEXT: SuggestedNextScenario[] = [
  {
    label: 'Deepen external-demand slowdown',
    target_route: '/scenario-lab',
    target_preset: 'external-slowdown',
  },
  {
    label: 'Add exchange-rate pass-through stress',
    target_route: '/scenario-lab',
    target_preset: 'exchange-rate-shock',
  },
  {
    label: 'Compare with baseline and tight-money',
    target_route: '/comparison',
  },
]

function buildImpulseResponseChart(qpmRun: QpmScenarioRun): ChartSpec {
  const horizons = qpmRun.baseline.periods.map((_, index) => `Q${index + 1}`)
  const gdpSeries = qpmRun.deltas.gdpGrowth.map((value) => roundTo(value, 2))
  const inflationSeries = qpmRun.deltas.inflation.map((value) => roundTo(value, 2))
  const policyRateSeries = qpmRun.deltas.policyRate.map((value) => roundTo(value, 2))

  return {
    chart_id: 'scenario_lab_impulse_response',
    title: 'Scenario impulse response vs baseline · 12 quarters',
    subtitle: 'Deviation from baseline in percentage points; canonical QPM calculation, not an official forecast.',
    chart_type: 'line',
    x: {
      label: 'Horizon',
      unit: '',
      values: horizons,
    },
    y: {
      label: 'Deviation from baseline',
      unit: 'pp',
      values: [...gdpSeries, ...inflationSeries, ...policyRateSeries],
    },
    series: [
      {
        series_id: 'gdp_gap',
        label: 'GDP gap',
        semantic_role: 'baseline',
        values: gdpSeries,
      },
      {
        series_id: 'inflation',
        label: 'Inflation',
        semantic_role: 'downside',
        values: inflationSeries,
      },
      {
        series_id: 'policy_rate',
        label: 'Policy rate',
        semantic_role: 'other',
        values: policyRateSeries,
      },
    ],
    view_mode: 'delta',
    uncertainty: [],
    takeaway:
      'Read each line as a scenario deviation from the baseline QPM path, not as a standalone forecast level.',
    model_attribution: [ATTRIBUTION],
  }
}

function resolveInterpretationGenerationMode(): NonNullable<
  ScenarioLabInterpretation['metadata']
>['generation_mode'] {
  // No preset currently seeds 'assisted' mode. TA-9 will introduce
  // assisted narratives from the AI advisor; for now all preset
  // outputs are template-mode.
  return 'template'
}

export function buildScenarioLabResults(
  values: ScenarioLabAssumptionState,
  options?: { selectedPresetId?: string },
): ScenarioLabResultsBundle {
  const qpmRun = solveScenarioLabQpm(values)
  const baselineQpmRun = solveScenarioLabQpm(getDefaultAssumptionState())
  const baselineCore = getMetricCore(getDefaultAssumptionState(), baselineQpmRun)
  const scenarioCore = getMetricCore(values, qpmRun)
  const headlineMetrics = buildHeadlineMetrics(values, qpmRun)
  const interpretation = buildInterpretation(values)
  const pathPeriods = qpmRun.baseline.periods.slice(0, PERIODS.length)
  const baselineCurrentAccountPath = buildAccountingPath(
    baselineCore.currentAccount,
    baselineCore.currentAccount,
    pathPeriods.length,
  )
  const scenarioCurrentAccountPath = buildAccountingPath(
    baselineCore.currentAccount,
    scenarioCore.currentAccount,
    pathPeriods.length,
  )
  const baselineFiscalPath = buildAccountingPath(
    baselineCore.fiscalBalance,
    baselineCore.fiscalBalance,
    pathPeriods.length,
  )
  const scenarioFiscalPath = buildAccountingPath(
    baselineCore.fiscalBalance,
    scenarioCore.fiscalBalance,
    pathPeriods.length,
  )
  void options
  const generationMode = resolveInterpretationGenerationMode()
  interpretation.metadata = { generation_mode: generationMode }
  interpretation.suggested_next = SCENARIO_LAB_SUGGESTED_NEXT

  return {
    headline_metrics: headlineMetrics,
    impulse_response_chart: buildImpulseResponseChart(qpmRun),
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
        'qpm_macro_path',
        'Macro path (real GDP growth)',
        'Baseline and scenario trajectories',
        'GDP growth',
        '%',
        pathPeriods,
        qpmRun.baseline.gdpGrowth.slice(0, pathPeriods.length),
        qpmRun.scenario.gdpGrowth.slice(0, pathPeriods.length),
        'Growth path reflects combined demand, cost, and policy-rate channels.',
      ),
      external_balance: buildChartSeries(
        'qpm_external_balance',
        'External balance path (current account)',
        'Baseline and scenario trajectories',
        'Current account',
        '% GDP',
        pathPeriods,
        baselineCurrentAccountPath,
        scenarioCurrentAccountPath,
        'External balance responds to exchange-rate, trade, and remittance assumptions.',
      ),
      fiscal_effects: buildChartSeries(
        'qpm_fiscal_effects',
        'Fiscal effects path (fiscal balance)',
        'Baseline and scenario trajectories',
        'Fiscal balance',
        '% GDP',
        pathPeriods,
        baselineFiscalPath,
        scenarioFiscalPath,
        'Fiscal outcomes are driven by spending and revenue assumptions in this reference setup.',
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
