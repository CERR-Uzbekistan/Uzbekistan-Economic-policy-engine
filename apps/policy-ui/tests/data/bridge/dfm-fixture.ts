import type {
  DfmBridgePayload,
  DfmCaveat,
  DfmIndicator,
  DfmNowcastQuarter,
  DfmQuarterHistory,
} from '../../../src/data/bridge/dfm-types.js'

const CURRENT_QUARTER: DfmNowcastQuarter = {
  period: '2026Q1',
  quarter_start_date: '2026-01-01',
  gdp_growth_yoy_pct: 7.0078,
  gdp_growth_qoq_pct: 1.4398,
  gdp_level_idx: 287053.958,
  horizon_quarters: 1,
  uncertainty: {
    methodology_label: 'Out-of-sample RMSE fan chart, sigma = 0.45 pp * sqrt(h), h=1',
    is_illustrative: false,
    bands: [
      { confidence_level: 0.5, lower_pct: 6.7045, upper_pct: 7.3111 },
      { confidence_level: 0.7, lower_pct: 6.5416, upper_pct: 7.474 },
      { confidence_level: 0.9, lower_pct: 6.2676, upper_pct: 7.748 },
    ],
  },
}

const HISTORY: DfmQuarterHistory[] = [
  {
    period: '2017Q1',
    quarter_start_date: '2017-01-01',
    gdp_growth_yoy_pct: null,
    gdp_growth_qoq_pct: null,
    gdp_level_idx: 166640.771,
  },
  {
    period: '2017Q2',
    quarter_start_date: '2017-04-01',
    gdp_growth_yoy_pct: null,
    gdp_growth_qoq_pct: 2.9694,
    gdp_level_idx: 171663.284,
  },
  {
    period: '2018Q1',
    quarter_start_date: '2018-01-01',
    gdp_growth_yoy_pct: 10.2467,
    gdp_growth_qoq_pct: 2.8283,
    gdp_level_idx: 183715.989,
  },
  {
    period: '2025Q4',
    quarter_start_date: '2025-10-01',
    gdp_growth_yoy_pct: 8.7027,
    gdp_growth_qoq_pct: 1.8826,
    gdp_level_idx: 282979.52,
  },
]

const INDICATORS: DfmIndicator[] = [
  {
    indicator_id: 'ip_uzs',
    label: 'Industrial Production (UZS)',
    category: 'Production',
    frequency: 'monthly',
    loading: 0.097197,
    contribution: 0.006886,
    latest_value: 2.0689,
  },
  {
    indicator_id: 'gdp',
    label: 'GDP (Quarterly)',
    category: 'Target variable',
    frequency: 'quarterly',
    loading: 0.038639,
    contribution: 0.009255,
    latest_value: 1.8827,
  },
  {
    indicator_id: 'ppi',
    label: 'Producer Price Index',
    category: 'Prices',
    frequency: 'monthly',
    loading: 0.000122,
    contribution: -1e-6,
    latest_value: null,
  },
]

const CAVEATS: DfmCaveat[] = [
  {
    caveat_id: 'dfm-single-factor',
    severity: 'info',
    message: 'Model uses a single common factor (n_factors = 1).',
    affected_metrics: ['gdp_growth'],
    affected_models: ['DFM'],
    source: 'dfm_nowcast/dfm_data.js meta.n_factors',
  },
  {
    caveat_id: 'dfm-statoffice-latency',
    severity: 'warning',
    message: 'Current nowcast quarter expected to be before StatOffice publication.',
    affected_metrics: ['gdp_growth'],
    affected_models: ['DFM'],
  },
]

const FACTOR_DATES = ['2017-05-01', '2017-06-01', '2017-07-01']
const FACTOR_PATH = [-0.605423, -0.18063, 0.037476]

export function buildValidDfmPayload(): DfmBridgePayload {
  return {
    attribution: {
      model_id: 'DFM',
      model_name: 'Dynamic Factor Model - GDP Nowcast (Uzbekistan)',
      module: 'dfm_nowcast',
      version: '0.1.0',
      run_id: 'dfm-nightly-2026-04-22',
      data_version: '2026Q1',
      timestamp: '2026-04-22T11:58:03Z',
    },
    nowcast: {
      last_observed_date: '2025-12-01',
      current_quarter: clone(CURRENT_QUARTER),
      forecast_horizon: [],
      history: HISTORY.map(clone),
    },
    factor: {
      n_factors: 1,
      dates: FACTOR_DATES.slice(),
      path: FACTOR_PATH.slice(),
      converged: true,
      n_iter: 155,
      loglik: 3157.2246,
      last_data_date: '2025-12-01',
      monthly_series_start: '2017-05-01',
    },
    indicators: INDICATORS.map(clone),
    caveats: CAVEATS.map(clone),
    metadata: {
      exported_at: '2026-04-22T11:58:03Z',
      source_script_sha: null,
      solver_version: '0.1.0',
      source_artifact: 'dfm_nowcast/dfm_data.js',
      source_artifact_exported_at: '2026-04-08 10:09:12',
    },
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
