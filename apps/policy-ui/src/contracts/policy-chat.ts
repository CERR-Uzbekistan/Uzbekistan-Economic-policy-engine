export type PolicyChatModelId = 'qpm' | 'dfm' | 'io'
export type PolicyChatOperation = 'qpm_impulse_response' | 'dfm_nowcast' | 'io_demand_shock'

export type PolicyChatParameter = {
  key: string
  label: string
  value: string | number
  unit: string | null
  origin: 'user_stated' | 'inferred' | 'model_default'
  editable: boolean
  allowed_range: { min: number; max: number } | null
}

export type PolicyChatProposal = {
  type: 'proposal'
  proposal_id: string
  model_id: PolicyChatModelId
  model_name: string
  operation: PolicyChatOperation
  locale: 'en' | 'ru' | 'uz'
  summary: string
  parameters: PolicyChatParameter[]
  warnings: Array<{ code: string; message: string; blocking: boolean }>
  caveat: string
  capability_version: string
  proposal_hash: string
  created_at: string
}

export type QpmPeak = { value: number; quarter: number }
export type QpmImpulseResult = {
  model: 'QPM'
  shock: { type: string; size: number; horizon: number }
  solver: { converged: boolean; iterations: number }
  irf_paths: { output_gap: number[]; inflation_yoy: number[]; policy_rate: number[]; ner_depreciation_yoy: number[]; exchange_rate_gap: number[]; rer_gap: number[]; mci: number[] }
  peaks: Record<string, QpmPeak>
  parameters_used: Record<string, number>
}
export type DfmNowcastResult = {
  model: 'DFM Nowcast'
  gdp_nowcast_yoy_pct: number
  model_status: { n_monthly_indicators: number; n_factors: number; last_data_date: string }
  forecasts: Array<{ horizon_months: number; gdp_yoy_pct: number; se: number; ci_68: [number, number]; ci_90: [number, number] }>
  top_contributors: Array<{ indicator: string; loading: number; contribution?: number | null }>
}
export type IoDemandResult = {
  model: 'Input-Output (Leontief)'
  n_sectors: number
  base_year: number
  aggregate: { total_demand_shock_bln_uzs: number; total_output_effect_bln_uzs: number; total_va_effect_bln_uzs: number; total_employment_effect_persons: number; aggregate_multiplier: number }
  top_sectors: Array<{ code: string; name: string; demand_shock_bln_uzs: number; output_effect_bln_uzs: number; va_effect_bln_uzs: number; employment_effect_persons: number }>
}

export type PolicyChatRun = {
  run_id: string
  proposal_id: string
  proposal_hash: string
  model_id: PolicyChatModelId
  operation: PolicyChatOperation
  locale: 'en' | 'ru' | 'uz'
  status: 'succeeded'
  model_attribution: Array<{ model_id: string; model_name: string; module: string; version: string; run_id: string; data_version: string; timestamp: string }>
  confirmed_parameters: PolicyChatParameter[]
  normalized_result: QpmImpulseResult | DfmNowcastResult | IoDemandResult
  explanation: { summary: string; interpretation: string[]; limitations: string[]; grounding_status: 'deterministic_fallback' }
  started_at: string
  completed_at: string
}