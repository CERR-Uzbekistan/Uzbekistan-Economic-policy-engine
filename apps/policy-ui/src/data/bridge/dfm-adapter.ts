import type { ModelAttribution } from '../../contracts/data-contract.js'
import type {
  DfmBridgePayload,
  DfmCaveat,
  DfmFactorBlock,
  DfmIndicator,
  DfmMetadata,
  DfmNowcastQuarter,
  DfmQuarterHistory,
} from './dfm-types.js'

/**
 * Bridge-native DFM adapter view types. The output is DFM-shaped
 * (time-series nowcast + factor path + indicators), not Overview-shaped.
 * PR 3 owns the reshape from these views into Overview's consumer
 * contract (ChartSpec + HeadlineMetric).
 *
 * Deliberate divergence from QPM's adapter: QPM maps 1:1 to
 * ComparisonScenario because its target page (Comparison) has a clean
 * canonical consumer contract. Overview's current nowcast_forecast
 * shape is a pre-bridge mock artifact, not a canonical contract worth
 * designing against; PR 3 will touch Overview's adapter at the same
 * time it wires the DFM source.
 */

export type DfmQuarterView = {
  period: string
  quarter_start_date: string
  gdp_growth_yoy_pct: number | null
  gdp_growth_qoq_pct: number | null
  gdp_level_idx: number | null
}

export type DfmNowcastQuarterView = DfmQuarterView & {
  horizon_quarters: number
  uncertainty: {
    methodology_label: string
    is_illustrative: boolean
    bands: Array<{
      confidence_level: number
      lower_pct: number
      upper_pct: number
    }>
  }
}

export type DfmFactorView = {
  n_factors: number
  dates: string[]
  path: number[]
  converged: boolean
  n_iter: number
  loglik: number
  last_data_date: string
  monthly_series_start: string
}

export type DfmIndicatorView = {
  indicator_id: string
  label: string
  category: string
  frequency: 'monthly' | 'quarterly'
  loading: number
  contribution: number
  latest_value: number | null
}

export type DfmAdapterMeta = {
  exported_at: string
  source_script_sha: string | null
  solver_version: string
  source_artifact: string
  source_artifact_exported_at: string
}

export type DfmAdapterOutput = {
  nowcast: {
    last_observed_date: string
    current: DfmNowcastQuarterView
    forecast: DfmNowcastQuarterView[]
    history: DfmQuarterView[]
  }
  factor: DfmFactorView
  indicators: DfmIndicatorView[]
  attribution: ModelAttribution
  caveats: DfmCaveat[]
  meta: DfmAdapterMeta
}

function toNowcastQuarterView(entry: DfmNowcastQuarter): DfmNowcastQuarterView {
  return {
    period: entry.period,
    quarter_start_date: entry.quarter_start_date,
    gdp_growth_yoy_pct: entry.gdp_growth_yoy_pct,
    gdp_growth_qoq_pct: entry.gdp_growth_qoq_pct,
    gdp_level_idx: entry.gdp_level_idx,
    horizon_quarters: entry.horizon_quarters,
    uncertainty: {
      // Preserve ASCII methodology label verbatim from the bridge payload.
      // PR 3 decides when to invoke prettyPrintMethodologyLabel at the
      // user-visible call site.
      methodology_label: entry.uncertainty.methodology_label,
      is_illustrative: entry.uncertainty.is_illustrative,
      bands: entry.uncertainty.bands.map((band) => ({
        confidence_level: band.confidence_level,
        lower_pct: band.lower_pct,
        upper_pct: band.upper_pct,
      })),
    },
  }
}

function toHistoryView(entry: DfmQuarterHistory): DfmQuarterView {
  return {
    period: entry.period,
    quarter_start_date: entry.quarter_start_date,
    gdp_growth_yoy_pct: entry.gdp_growth_yoy_pct,
    gdp_growth_qoq_pct: entry.gdp_growth_qoq_pct,
    gdp_level_idx: entry.gdp_level_idx,
  }
}

function toFactorView(block: DfmFactorBlock): DfmFactorView {
  return {
    n_factors: block.n_factors,
    dates: block.dates.slice(),
    path: block.path.slice(),
    converged: block.converged,
    n_iter: block.n_iter,
    loglik: block.loglik,
    last_data_date: block.last_data_date,
    monthly_series_start: block.monthly_series_start,
  }
}

function toIndicatorView(indicator: DfmIndicator): DfmIndicatorView {
  return {
    indicator_id: indicator.indicator_id,
    label: indicator.label,
    category: indicator.category,
    frequency: indicator.frequency,
    loading: indicator.loading,
    contribution: indicator.contribution,
    latest_value: indicator.latest_value,
  }
}

function toMeta(metadata: DfmMetadata): DfmAdapterMeta {
  return {
    exported_at: metadata.exported_at,
    source_script_sha: metadata.source_script_sha,
    solver_version: metadata.solver_version,
    source_artifact: metadata.source_artifact,
    source_artifact_exported_at: metadata.source_artifact_exported_at,
  }
}

export function toDfmAdapterOutput(payload: DfmBridgePayload): DfmAdapterOutput {
  return {
    nowcast: {
      last_observed_date: payload.nowcast.last_observed_date,
      current: toNowcastQuarterView(payload.nowcast.current_quarter),
      forecast: payload.nowcast.forecast_horizon.map(toNowcastQuarterView),
      history: payload.nowcast.history.map(toHistoryView),
    },
    factor: toFactorView(payload.factor),
    indicators: payload.indicators.map(toIndicatorView),
    attribution: { ...payload.attribution },
    caveats: payload.caveats.map((caveat) => ({ ...caveat })),
    meta: toMeta(payload.metadata),
  }
}

/**
 * The DFM fan-chart methodology label in the source JSON is ASCII-only
 * for diff stability: "Out-of-sample RMSE fan chart, sigma = 0.45 pp *
 * sqrt(h), h=1". When the label surfaces in a user-visible chart
 * caption or tooltip, pretty-print it to Unicode (σ for sigma, × for *,
 * √ for sqrt). Technical metadata strings (attribution logs, console
 * output) stay ASCII.
 *
 * Exported standalone; the adapter transform does NOT invoke this —
 * bridge payload flows through with ASCII labels intact. PR 3 wires
 * the call site when Overview's label display is touched.
 */
export function prettyPrintMethodologyLabel(raw: string): string {
  return raw
    .replace(/\bsqrt\(/g, '√(')
    .replace(/\bsigma\b/g, 'σ')
    .replace(/ \* /g, ' × ')
}
