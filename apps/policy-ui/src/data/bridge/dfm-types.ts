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

export type DfmMetadata = {
  exported_at: string
  source_script_sha: string | null
  solver_version: string
  source_artifact: string
  source_artifact_exported_at: string
}

export type DfmBridgePayload = {
  attribution: ModelAttribution
  nowcast: DfmNowcast
  factor: DfmFactorBlock
  indicators: DfmIndicator[]
  caveats: DfmCaveat[]
  metadata: DfmMetadata
}
