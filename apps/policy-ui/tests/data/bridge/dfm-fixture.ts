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
    methodology_label: 'Illustrative validation-proxy RMSE range, sigma = 3.3867 pp * sqrt(h), h=1',
    is_illustrative: true,
    bands: [
      { confidence_level: 0.5, lower_pct: 4.7252, upper_pct: 9.2904 },
      { confidence_level: 0.7, lower_pct: 3.4992, upper_pct: 10.5164 },
      { confidence_level: 0.9, lower_pct: 1.4367, upper_pct: 12.5789 },
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
      source_script_sha: 'fixture-export-script-md5',
      solver_version: '0.1.0',
      source_artifact: 'dfm_nowcast/dfm_data.js',
      source_artifact_md5: 'fixture-source-artifact-md5',
      source_artifact_exported_at: '2026-04-08 10:09:12',
      export_script: 'scripts/export_dfm.R',
      export_script_md5: 'fixture-export-script-md5',
      export_mode: 'frozen_state_space_bridge',
      source_model_reference: {
        status: 'reference_only_not_public_export_input',
        path: 'model sources/Fore+Nowcast/DFM',
        data_workbook: 'model sources/Fore+Nowcast/DFM/data/data_uzbekistan.xlsx',
        source_workbook_updates_require_refit: true,
        public_export_reads_source_workbook: false,
      },
      source_audit: {
        source_folder_status: 'available_locally_untracked',
        workbook_status: 'available_locally_untracked',
        workbook_md5: 'fixture-workbook-md5',
        source_scripts: ['main.R', 'functions/estimate_dfm.R'],
        saved_model_objects: ['.RData', 'output/results.RData'],
      },
      transformation_map: {
        status: 'available_with_owner_review_decisions',
        json_artifact: 'docs/data-bridge/dfm-transformation-map.json',
        csv_artifact: 'docs/data-bridge/dfm-transformation-map.csv',
        public_indicator_coverage: '36_of_36',
        reviewed_blockers: [
          'four_rows_blocked_for_model_owner_decision_before_production_refit',
          'public_contributions_remain_factor_signals_not_gdp_percentage_point_effects',
        ],
      },
      refit_status: {
        status: 'available',
        public_export_reads_source_workbook: false,
        blocker:
          'No local Rscript blocker remains. Remaining blockers: public export still publishes the frozen bridge until source-refit output is reconciled and signed off.',
        source_logic_status:
          'local_source_refit_completed_without_pdf_report; artifact=docs/data-bridge/dfm-source-refit-summary.json; iterations=155; converged=TRUE; source_public_yoy_diff_pp=0',
      },
      backtest_status: {
        status: 'proxy_validation_available',
        validation_artifact: 'docs/data-bridge/dfm-validation-summary.json',
        validation_report: 'docs/data-bridge/dfm-validation-report.md',
        vintage_backtest: 'blocked_no_historical_vintages',
        benchmark: 'four_quarter_trailing_average_yoy',
        rmse_pp: 3.3867,
      },
      uncertainty_range: {
        status: 'available_illustrative',
        sigma_base_pp: 3.3867,
        method: 'historical GDP benchmark RMSE scaled by sqrt(h)',
        calibration_source: 'docs/data-bridge/dfm-validation-summary.json',
        is_official_forecast_interval: false,
      },
      contribution_diagnostics: {
        status: 'guarded_factor_signal_only',
        top_contribution_audit: 'native-unit and rate rows are labelled as non-growth source indicators in the UI',
        not_percentage_point_gdp_effects: true,
      },
      readiness_status: {
        public_status: 'internal_preview_bridge',
        source_refit_in_ci: 'not_available',
        per_series_transform_map: 'available',
        historical_backtest: 'available',
        diagnostics_audit: 'available',
        economist_signoff: 'not_available',
      },
    },
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
