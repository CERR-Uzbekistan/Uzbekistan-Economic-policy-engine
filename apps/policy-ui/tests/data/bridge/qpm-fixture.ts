import type { QpmBridgePayload } from '../../../src/data/bridge/qpm-types.js'

const PERIODS = ['2026 Q1', '2026 Q2', '2026 Q3', '2026 Q4', '2027 Q1', '2027 Q2', '2027 Q3', '2027 Q4']

type ScenarioSeed = {
  scenario_id: QpmBridgePayload['scenarios'][number]['scenario_id']
  scenario_name: string
  gdp_growth: number[]
  inflation: number[]
  policy_rate: number[]
  exchange_rate: number[]
  shocks_applied: {
    rs_shock: number
    s_shock: number
    gap_shock: number
    pie_shock: number
  }
}

const SCENARIO_SEEDS: ScenarioSeed[] = [
  {
    scenario_id: 'baseline',
    scenario_name: 'Baseline',
    gdp_growth: [4.2, 4.0, 3.9, 4.1, 4.4, 4.9, 5.4, 5.8],
    inflation: [9.8, 8.5, 6.9, 5.1, 3.8, 3.2, 3.1, 3.4],
    policy_rate: [12.0, 10.4, 8.8, 7.6, 6.9, 6.7, 6.8, 7.2],
    exchange_rate: [12650, 12788, 12910, 13033, 13239, 13501, 13791, 14082],
    shocks_applied: { rs_shock: 0, s_shock: 0, gap_shock: 0, pie_shock: 0 },
  },
  {
    scenario_id: 'rate-cut-100bp',
    scenario_name: 'Policy rate cut (-100 bp)',
    gdp_growth: [4.3, 4.2, 4.1, 4.3, 4.6, 5.0, 5.4, 5.8],
    inflation: [9.9, 8.7, 7.2, 5.4, 4.2, 3.6, 3.4, 3.6],
    policy_rate: [11.3, 10.0, 8.7, 7.7, 7.1, 6.8, 6.9, 7.3],
    exchange_rate: [12692, 12849, 12973, 13087, 13282, 13535, 13819, 14111],
    shocks_applied: { rs_shock: -1, s_shock: 0, gap_shock: 0, pie_shock: 0 },
  },
  {
    scenario_id: 'rate-hike-100bp',
    scenario_name: 'Policy rate hike (+100 bp)',
    gdp_growth: [4.0, 3.7, 3.6, 3.8, 4.3, 4.8, 5.4, 5.8],
    inflation: [9.7, 8.4, 6.6, 4.7, 3.4, 2.8, 2.8, 3.2],
    policy_rate: [12.8, 10.8, 8.9, 7.6, 6.8, 6.5, 6.7, 7.1],
    exchange_rate: [12607, 12727, 12848, 12979, 13195, 13467, 13762, 14054],
    shocks_applied: { rs_shock: 1, s_shock: 0, gap_shock: 0, pie_shock: 0 },
  },
  {
    scenario_id: 'exchange-rate-shock',
    scenario_name: 'UZS depreciation (+10%)',
    gdp_growth: [5.4, 5.5, 5.2, 4.9, 4.6, 4.5, 4.6, 4.9],
    inflation: [10.9, 10.9, 10.4, 9.4, 7.6, 6.0, 4.7, 3.9],
    policy_rate: [14.3, 14.1, 13.1, 11.8, 10.3, 9.1, 8.1, 7.5],
    exchange_rate: [14328, 14143, 13930, 13758, 13746, 13874, 14109, 14412],
    shocks_applied: { rs_shock: 0, s_shock: 10, gap_shock: 0, pie_shock: 0 },
  },
  {
    scenario_id: 'remittance-downside',
    scenario_name: 'Remittance downside (proxy)',
    gdp_growth: [3.7, 3.6, 3.7, 4.0, 4.4, 4.9, 5.4, 5.8],
    inflation: [9.8, 8.5, 6.8, 5.0, 3.8, 3.2, 3.1, 3.5],
    policy_rate: [12.0, 10.2, 8.7, 7.6, 6.9, 6.7, 6.8, 7.3],
    exchange_rate: [12657, 12804, 12933, 13060, 13266, 13526, 13811, 14097],
    shocks_applied: { rs_shock: 0, s_shock: 0, gap_shock: -0.5, pie_shock: 0 },
  },
]

export function buildValidQpmPayload(): QpmBridgePayload {
  return {
    attribution: {
      model_id: 'QPM',
      model_name: 'Quarterly Projection Model (Uzbekistan)',
      module: 'qpm',
      version: '0.1.0',
      run_id: 'qpm-nightly-2026-04-22',
      data_version: '2026Q1',
      timestamp: '2026-04-22T07:55:13Z',
    },
    parameters: [
      {
        symbol: 'b1',
        label: 'Gap persistence',
        value: 0.7,
        range_min: 0.3,
        range_max: 0.95,
        description: 'Inertia in output gap dynamics.',
        description_ru: 'Инерция разрыва выпуска.',
        description_uz: "Chiqarish bo'shlig'i inersiyasi.",
      },
    ],
    scenarios: SCENARIO_SEEDS.map((seed) => ({
      scenario_id: seed.scenario_id,
      scenario_name: seed.scenario_name,
      description: seed.scenario_name,
      horizon_quarters: 8,
      periods: PERIODS,
      paths: {
        gdp_growth: seed.gdp_growth,
        inflation: seed.inflation,
        policy_rate: seed.policy_rate,
        exchange_rate: seed.exchange_rate,
      },
      shocks_applied: seed.shocks_applied,
      solver_iterations: 350,
    })),
    caveats: [
      {
        caveat_id: 'qpm-no-uncertainty-bands',
        severity: 'info',
        message: 'Uncertainty bands are not exported.',
        affected_metrics: ['gdp_growth', 'inflation', 'policy_rate', 'exchange_rate'],
        affected_models: ['QPM'],
      },
    ],
    metadata: {
      exported_at: '2026-04-22T07:55:14Z',
      source_script_sha: null,
      solver_version: '0.1.0',
    },
  }
}
