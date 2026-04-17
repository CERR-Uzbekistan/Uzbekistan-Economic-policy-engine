import type {
  ChartSpec,
  HeadlineMetric,
  ScenarioResult,
} from '../../contracts/data-contract'

export type OverviewRisk = {
  risk_id: string
  title: string
  why_it_matters: string
  impact_channel: string
  suggested_scenario: string
}

export type OverviewQuickAction = {
  action_id: string
  title: string
  summary: string
  scenario_query: string
}

export type OverviewV1Data = {
  scenario_result: ScenarioResult
  risks: OverviewRisk[]
  quick_actions: OverviewQuickAction[]
}

const commonAttribution = {
  model_id: 'multi-model-overview',
  model_name: 'Cross-Model Overview Synthesis',
  module: 'synthesis',
  version: '0.1.0',
  run_id: 'run-2026-04-17-0900',
  data_version: '2026Q1',
  timestamp: '2026-04-17T09:00:00+05:00',
}

const headlineMetrics: HeadlineMetric[] = [
  {
    metric_id: 'gdp_growth',
    label: 'GDP growth',
    value: 5.8,
    unit: '%',
    period: '2026 Q1',
    baseline_value: 5.5,
    delta_abs: 0.3,
    delta_pct: 5.45,
    direction: 'up',
    confidence: 'medium',
    last_updated: '2026-04-16T17:30:00+05:00',
    model_attribution: [commonAttribution],
  },
  {
    metric_id: 'inflation',
    label: 'Inflation',
    value: 8.7,
    unit: '%',
    period: 'March 2026',
    baseline_value: 9.1,
    delta_abs: -0.4,
    delta_pct: -4.4,
    direction: 'down',
    confidence: 'high',
    last_updated: '2026-04-16T17:30:00+05:00',
    model_attribution: [commonAttribution],
  },
  {
    metric_id: 'policy_rate',
    label: 'Policy rate',
    value: 13.5,
    unit: '%',
    period: 'April 2026',
    baseline_value: 14.0,
    delta_abs: -0.5,
    delta_pct: -3.57,
    direction: 'down',
    confidence: 'high',
    last_updated: '2026-04-15T10:00:00+05:00',
    model_attribution: [commonAttribution],
  },
  {
    metric_id: 'exchange_rate',
    label: 'Exchange rate',
    value: 12650,
    unit: 'UZS/USD',
    period: 'April 2026',
    baseline_value: 12520,
    delta_abs: 130,
    delta_pct: 1.04,
    direction: 'up',
    confidence: 'medium',
    last_updated: '2026-04-17T08:50:00+05:00',
    model_attribution: [commonAttribution],
  },
  {
    metric_id: 'current_account',
    label: 'Current account',
    value: -2.1,
    unit: '% GDP',
    period: '2026 Q1',
    baseline_value: -2.5,
    delta_abs: 0.4,
    delta_pct: 16.0,
    direction: 'up',
    confidence: 'low',
    last_updated: '2026-04-14T18:20:00+05:00',
    model_attribution: [commonAttribution],
  },
  {
    metric_id: 'fiscal_balance',
    label: 'Fiscal balance',
    value: -3.4,
    unit: '% GDP',
    period: '2026 Q1',
    baseline_value: -3.1,
    delta_abs: -0.3,
    delta_pct: -9.68,
    direction: 'down',
    confidence: 'medium',
    last_updated: '2026-04-16T12:15:00+05:00',
    model_attribution: [commonAttribution],
  },
  {
    metric_id: 'reserves',
    label: 'Reserves',
    value: 33.2,
    unit: 'USD bn',
    period: 'March 2026',
    baseline_value: 32.4,
    delta_abs: 0.8,
    delta_pct: 2.47,
    direction: 'up',
    confidence: 'high',
    last_updated: '2026-04-16T16:40:00+05:00',
    model_attribution: [commonAttribution],
  },
  {
    metric_id: 'public_debt',
    label: 'Public debt',
    value: 37.9,
    unit: '% GDP',
    period: '2026 Q1',
    baseline_value: 38.2,
    delta_abs: -0.3,
    delta_pct: -0.79,
    direction: 'down',
    confidence: 'medium',
    last_updated: '2026-04-13T14:00:00+05:00',
    model_attribution: [commonAttribution],
  },
]

const nowcastChart: ChartSpec = {
  chart_id: 'gdp_nowcast_revision',
  title: 'Nowcast revision (real GDP growth)',
  subtitle: 'Latest estimate vs prior estimate',
  chart_type: 'line',
  x: {
    label: 'Period',
    unit: '',
    values: ['2025 Q4', '2026 Q1', '2026 Q2'],
  },
  y: {
    label: 'Growth',
    unit: '%',
    values: [5.2, 5.8, 5.9],
  },
  series: [
    {
      series_id: 'latest_estimate',
      label: 'Latest estimate',
      semantic_role: 'baseline',
      values: [5.2, 5.8, 5.9],
    },
    {
      series_id: 'prior_estimate',
      label: 'Prior estimate',
      semantic_role: 'alternative',
      values: [5.1, 5.5, 5.7],
    },
  ],
  view_mode: 'level',
  uncertainty: [],
  takeaway:
    'The Q1 estimate was revised up by 0.3 pp, mainly reflecting stronger service activity and import compression.',
  model_attribution: [commonAttribution],
}

export const overviewV1Data: OverviewV1Data = {
  scenario_result: {
    scenario: {
      scenario_id: 'overview-baseline-2026q1',
      scenario_name: 'Current baseline snapshot',
      scenario_type: 'baseline',
      tags: ['overview', 'baseline', 'macro-snapshot'],
      description: 'Baseline macroeconomic snapshot for decision-monitoring.',
      created_at: '2026-04-17T09:05:00+05:00',
      updated_at: '2026-04-17T09:05:00+05:00',
      created_by: 'system',
      assumptions: [],
      model_ids: ['qpm_uzbekistan', 'dfm_nowcast', 'pe_model'],
    },
    headline_metrics: headlineMetrics,
    charts: [nowcastChart],
    tables: [],
    narrative: {
      summary:
        'Growth remains resilient, inflation is easing but still above medium-term comfort levels, and external vulnerability has narrowed modestly.',
      key_findings: [
        'Services and remittance-backed consumption supported near-term growth.',
        'Lower import pressure improved external indicators despite exchange-rate softness.',
      ],
      risks: [
        'External demand slowdown could weaken exports in the next two quarters.',
        'Food and administered price shocks could slow disinflation momentum.',
        'Loose fiscal execution could delay monetary normalization.',
      ],
      policy_implications: [
        'Maintain disinflation credibility while avoiding abrupt tightening.',
        'Prioritize targeted fiscal efficiency over broad expansion.',
      ],
      recommendations: [
        'Stress test exchange-rate depreciation with remittance downside.',
        'Compare fiscal-neutral and fiscal-expansion alternatives before next briefing.',
      ],
      uncertainty_note:
        'Near-term inflation and exchange-rate estimates carry moderate uncertainty due to global commodity volatility.',
      generated_at: '2026-04-17T09:05:00+05:00',
      generation_mode: 'template',
    },
    caveats: [
      {
        caveat_id: 'cav-001',
        severity: 'warning',
        message:
          'Near-term external balances are sensitive to remittance assumptions not fully observed in real time.',
        affected_metrics: ['current_account', 'exchange_rate'],
        affected_models: ['dfm_nowcast'],
      },
    ],
    references: ['Internal macro monitoring note, April 2026'],
  },
  risks: [
    {
      risk_id: 'risk-external-slowdown',
      title: 'External slowdown risk',
      why_it_matters: 'Lower trading-partner demand would pressure export volumes and growth.',
      impact_channel: 'Exports, FX inflows, and industrial output.',
      suggested_scenario: 'External slowdown stress',
    },
    {
      risk_id: 'risk-inflation-persistence',
      title: 'Inflation persistence risk',
      why_it_matters: 'Food and regulated-price shocks can keep inflation above target for longer.',
      impact_channel: 'Real incomes, policy-rate path, and fiscal costs.',
      suggested_scenario: 'Inflation persistence stress',
    },
    {
      risk_id: 'risk-fiscal-slippage',
      title: 'Fiscal slippage risk',
      why_it_matters: 'Broader-than-planned spending can complicate disinflation and debt dynamics.',
      impact_channel: 'Fiscal balance, financing need, and policy credibility.',
      suggested_scenario: 'Fiscal discipline stress',
    },
  ],
  quick_actions: [
    {
      action_id: 'exchange-rate-shock',
      title: 'Run exchange-rate shock',
      summary: 'Test 10% depreciation and assess inflation and external balance effects.',
      scenario_query: 'preset=exchange-rate-shock',
    },
    {
      action_id: 'tariff-change',
      title: 'Test tariff change',
      summary: 'Simulate tariff reduction and estimate growth/import pass-through.',
      scenario_query: 'preset=tariff-change',
    },
    {
      action_id: 'fiscal-comparison',
      title: 'Compare fiscal scenarios',
      summary: 'Contrast fiscal-neutral and expansion paths in one comparison set.',
      scenario_query: 'preset=fiscal-comparison',
    },
    {
      action_id: 'inflation-risk',
      title: 'Open inflation risk scenario',
      summary: 'Stress disinflation path under persistent price shocks.',
      scenario_query: 'preset=inflation-risk',
    },
    {
      action_id: 'export-brief',
      title: 'Prepare snapshot brief',
      summary: 'Generate a concise note using current baseline headline metrics.',
      scenario_query: 'preset=snapshot-brief',
    },
  ],
}
