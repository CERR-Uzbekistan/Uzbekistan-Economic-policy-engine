import type { Caveat, ModelAttribution } from '../../contracts/data-contract.js'

export type QpmScenarioId =
  | 'baseline'
  | 'rate-cut-100bp'
  | 'rate-hike-100bp'
  | 'exchange-rate-shock'
  | 'remittance-downside'

export const QPM_CANONICAL_SCENARIO_ORDER: readonly QpmScenarioId[] = [
  'baseline',
  'rate-cut-100bp',
  'rate-hike-100bp',
  'exchange-rate-shock',
  'remittance-downside',
]

export type QpmParameter = {
  symbol: string
  label: string
  value: number
  range_min: number
  range_max: number
  description: string | null
  description_ru: string | null
  description_uz: string | null
}

export type QpmShocks = {
  rs_shock: number
  s_shock: number
  gap_shock: number
  pie_shock: number
}

export type QpmPaths = {
  gdp_growth: number[]
  inflation: number[]
  policy_rate: number[]
  exchange_rate: number[]
}

export type QpmScenario = {
  scenario_id: QpmScenarioId
  scenario_name: string
  description: string
  horizon_quarters: number
  periods: string[]
  paths: QpmPaths
  shocks_applied: QpmShocks
  solver_iterations: number
}

export type QpmBridgePayload = {
  attribution: ModelAttribution
  parameters: QpmParameter[]
  scenarios: QpmScenario[]
  caveats: Caveat[]
  metadata: {
    exported_at: string
    source_script_sha: string | null
    solver_version: string
  }
}
