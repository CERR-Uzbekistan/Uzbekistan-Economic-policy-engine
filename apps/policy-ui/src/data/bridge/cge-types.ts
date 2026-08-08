import type { ModelAttribution } from '../../contracts/data-contract.js'

export type CgeControlId =
  | 'world_import_price_change_pct'
  | 'import_tariff_change_pp'
  | 'government_consumption_change_pct'
  | 'remittances_change_pct'

export type CgeResultKey =
  | 'Er'
  | 'Pe'
  | 'Pm'
  | 'Pd'
  | 'E'
  | 'M'
  | 'Ds'
  | 'Dd'
  | 'Q'
  | 'Qs'
  | 'Qd'
  | 'X'
  | 'Pq'
  | 'Pt'
  | 'Px'
  | 'TAX'
  | 'Y'
  | 'Sg'
  | 'Cn'
  | 'S'
  | 'Z'
  | 'TB'

export type CgeResults = Record<CgeResultKey, number>

export type CgeChanges = Record<
  | 'Er_pct_change'
  | 'E_pct_change'
  | 'M_pct_change'
  | 'Ds_pct_change'
  | 'Q_pct_change'
  | 'Y_pct_change'
  | 'Cn_pct_change'
  | 'TAX_pct_change'
  | 'Sg_pct_change'
  | 'S_pct_change'
  | 'Z_pct_change',
  number
>

export type CgeParameters = {
  at: number
  bt: number
  rho_t: number
  sig_t: number
  aq: number
  bq: number
  rho_q: number
  sig_q: number
  wm: number
  we: number
  tm: number
  te: number
  ts: number
  ty: number
  sy: number
  G: number
  tr: number
  ft: number
  re: number
  B: number
  X: number
  Pf: number
}

export type CgeControlDefinition = {
  id: CgeControlId
  parameter: 'wm' | 'tm' | 'G' | 're'
  label: string
  unit: '%' | 'pp'
  min: number
  max: number
  step: number
  default: number
}

export type CgeControlValues = Record<CgeControlId, number>

export type CgePreset = {
  preset_id: string
  title: string
  description: string
  controls: CgeControlValues
  evidence_status:
    | 'exact_base_reconciliation'
    | 'exact_workbook_benchmark'
    | 'directional_source_support'
    | 'solver_sensitivity_only'
}

export type CgeRun = {
  results: CgeResults
  changes_from_base: CgeChanges
  accounting_residuals: Record<string, number>
  solver: {
    converged: boolean
    method: string
    iterations: number
    exchange_rate: number
    normalized_exchange_rate: number
    exchange_rate_semantics: string
  }
}

export type CgeBenchmark = {
  benchmark_id: string
  title: string
  status: 'exact_workbook_match'
  source_file: string
  source_sha256: string
  parameter_overrides: Partial<CgeParameters>
  expected_results: Partial<CgeResults>
  max_abs_error: number
  tolerance: number
  note: string
}

export type CgeBridgePayload = {
  schema_version: 'cge-reference-v1'
  attribution: ModelAttribution
  metadata: {
    exported_at: string
    base_year: 2021
    status: 'experimental_reference'
    solver_version: string
    framework: string
    source_artifact: string
    source_sha256: string
    result_semantics: 'comparative_static_percent_change_from_2021_base'
    approval_status: 'not_model_owner_approved'
  }
  calibration: {
    parameters: CgeParameters
    base_results: CgeResults
    closure: Record<string, string>
    diagnostics: {
      status: 'formula_reconciled'
      tolerance_pct: number
      comparison_basis: string
      declared_base_reference: string
      max_abs_gap_pct: number
      material_gaps_pct: Record<string, number>
      source_workbook_status: string
    }
    accounting_residuals: Record<string, number>
  }
  controls: CgeControlDefinition[]
  presets: CgePreset[]
  benchmarks: CgeBenchmark[]
  reference_runs: Record<string, CgeRun>
  excluded_sources: Array<{ source_file: string; source_sha256?: string; reason: string }>
  caveats: string[]
}

export type CgeScenarioResult = CgeRun & {
  control_values: CgeControlValues
  parameters_used: CgeParameters
  error: null
}
