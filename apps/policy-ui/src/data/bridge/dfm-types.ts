import type { Caveat, ModelAttribution } from '../../contracts/data-contract.js'

export type DfmIndicatorFrequency = 'monthly' | 'quarterly'

/**
 * DFM-local caveat shape. Extends the shared Caveat with an optional
 * `source` field present on every entry in the committed dfm.json
 * fixture. The shared contract does not model `source`; we keep the
 * extension local to avoid modifying data-contract.ts.
 */
export type DfmCaveat = Caveat & {
  source?: string
}

/**
 * Point-oriented uncertainty on a single nowcast quarter.
 * Shared UncertaintyBand (series-oriented, paired with ChartSpec x-axis)
 * does not compose with DFM's per-quarter bands; DFM-local types own
 * this shape. PR 3 reshapes these into ChartSpec-compatible
 * UncertaintyBand[] when wiring the Overview fan chart.
 */
export type DfmUncertaintyBand = {
  confidence_level: number
  lower_pct: number
  upper_pct: number
}

export type DfmPointUncertainty = {
  methodology_label: string
  is_illustrative: boolean
  bands: DfmUncertaintyBand[]
}

export type DfmNowcastQuarter = {
  period: string
  quarter_start_date: string
  gdp_growth_yoy_pct: number | null
  gdp_growth_qoq_pct: number | null
  gdp_level_idx: number | null
  horizon_quarters: number
  uncertainty: DfmPointUncertainty
}

export type DfmQuarterHistory = {
  period: string
  quarter_start_date: string
  gdp_growth_yoy_pct: number | null
  gdp_growth_qoq_pct: number | null
  gdp_level_idx: number | null
}

export type DfmNowcast = {
  last_observed_date: string
  current_quarter: DfmNowcastQuarter
  forecast_horizon: DfmNowcastQuarter[]
  history: DfmQuarterHistory[]
}

export type DfmFactorBlock = {
  n_factors: number
  dates: string[]
  path: number[]
  converged: boolean
  n_iter: number
  loglik: number
  last_data_date: string
  monthly_series_start: string
}

export type DfmIndicator = {
  indicator_id: string
  label: string
  category: string
  frequency: DfmIndicatorFrequency
  loading: number
  contribution: number
  latest_value: number | null
}

export type DfmSourceGdpHistoryAuditQuarter = {
  period: string
  quarter_end_date: string
  raw_gdp_level: number | null
  raw_gdp_growth_yoy_pct: number | null
  model_adjusted_gdp_level: number | null
  model_adjusted_gdp_growth_yoy_pct: number | null
  model_adjusted_minus_raw_yoy_pp: number | null
}

export type DfmSourceGdpHistoryAudit = {
  status: 'review_only_unverified' | 'not_available' | 'blocked_missing_quarterly_gdp' | 'blocked_no_yoy_history'
  source_series_label?: string
  source_provenance?: string | null
  latest_observed_period?: string
  latest_observed_quarter_end_date?: string
  raw_gdp_level?: number | null
  raw_gdp_growth_yoy_pct?: number | null
  model_adjusted_gdp_level?: number | null
  model_adjusted_gdp_growth_yoy_pct?: number | null
  model_adjusted_minus_raw_yoy_pp?: number | null
  display_rule: string
  interpretation?: string
  recent_quarters?: DfmSourceGdpHistoryAuditQuarter[]
}

export type DfmMetadata = {
  exported_at: string
  source_script_sha: string | null
  solver_version: string
  source_artifact: string
  source_artifact_md5: string | null
  source_artifact_exported_at: string
  export_script: string
  export_script_md5: string | null
  export_mode: 'frozen_state_space_bridge' | 'source_reconciled_bridge'
  source_model_reference: {
    status: 'reference_only_not_public_export_input' | 'source_refit_reconciled_not_direct_public_input'
    path: string
    data_workbook: string
    source_workbook_updates_require_refit: boolean
    public_export_reads_source_workbook: boolean
  }
  source_audit: {
    source_folder_status: 'available_locally_untracked' | 'not_available'
    workbook_status: 'available_locally_untracked' | 'not_available'
    workbook_md5: string | null
    source_scripts: string[]
    saved_model_objects: string[]
  }
  transformation_map: {
    status: 'available_with_review_flags' | 'available_with_owner_review_decisions'
    json_artifact: string
    csv_artifact: string
    public_indicator_coverage: string
    reviewed_blockers: string[]
  }
  refit_status: {
    status: 'blocked_in_current_environment' | 'available'
    public_export_reads_source_workbook: boolean
    blocker: string
    source_logic_status: string
    reconciliation_status?: 'matched_public_artifact' | 'not_reconciled'
    canonical_export_report?: string | null
    source_gdp_history_audit: DfmSourceGdpHistoryAudit
  }
  backtest_status: {
    status: 'proxy_validation_available' | 'available' | 'not_available'
    validation_artifact: string
    validation_report: string
    vintage_backtest: string
    benchmark: string
    rmse_pp: number
  }
  uncertainty_range: {
    status: 'available_illustrative' | 'available'
    sigma_base_pp: number
    method: string
    calibration_source: string
    is_official_forecast_interval: boolean
  }
  contribution_diagnostics: {
    status: 'guarded_factor_signal_only' | 'available'
    top_contribution_audit: string
    not_percentage_point_gdp_effects: boolean
  }
  readiness_status: {
    public_status: 'internal_preview_bridge'
    source_refit_in_ci: 'not_available' | 'local_only_not_ci' | 'available'
    per_series_transform_map: 'not_available' | 'available'
    historical_backtest: 'not_available' | 'proxy_available' | 'available'
    diagnostics_audit: 'not_available' | 'available'
    economist_signoff: 'not_available' | 'available'
  }
}

export type DfmBridgePayload = {
  attribution: ModelAttribution
  nowcast: DfmNowcast
  factor: DfmFactorBlock
  indicators: DfmIndicator[]
  caveats: DfmCaveat[]
  metadata: DfmMetadata
}
