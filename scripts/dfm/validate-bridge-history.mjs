import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const DFM_JSON = 'apps/policy-ui/public/data/dfm.json'
const OUTPUT_JSON = 'docs/data-bridge/dfm-validation-summary.json'
const OUTPUT_MD = 'docs/data-bridge/dfm-validation-report.md'
const SOURCE_REFIT_JSON = 'docs/data-bridge/dfm-source-refit-summary.json'

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function metrics(errors) {
  return {
    n: errors.length,
    mae: mean(errors.map((error) => Math.abs(error))),
    rmse: Math.sqrt(mean(errors.map((error) => error * error))),
    mean_error: mean(errors),
  }
}

function benchmarkErrors(history, name, forecastAt) {
  const errors = []
  const rows = []
  for (let index = 0; index < history.length; index += 1) {
    const actual = history[index].gdp_growth_yoy_pct
    const predicted = forecastAt(history, index)
    if (!finite(actual) || !finite(predicted)) continue
    const error = actual - predicted
    errors.push(error)
    rows.push({
      period: history[index].period,
      actual,
      predicted,
      error,
    })
  }
  return {
    benchmark_id: name,
    metrics: metrics(errors),
    rows,
  }
}

function round(value, digits = 4) {
  return Number(value.toFixed(digits))
}

function roundMetrics(value) {
  return {
    n: value.n,
    mae: round(value.mae),
    rmse: round(value.rmse),
    mean_error: round(value.mean_error),
  }
}

function buildValidation() {
  const payload = JSON.parse(readFileSync(DFM_JSON, 'utf8'))
  let sourceRefit = null
  try {
    sourceRefit = JSON.parse(readFileSync(SOURCE_REFIT_JSON, 'utf8'))
  } catch {
    sourceRefit = null
  }
  const sourceRefitAvailable =
    sourceRefit?.artifact?.status === 'completed_without_pdf_report' &&
    sourceRefit?.estimation?.status === 'completed'
  const history = payload.nowcast.history.filter((row) => finite(row.gdp_growth_yoy_pct))
  const benchmarks = [
    benchmarkErrors(history, 'last_observed_yoy', (rows, index) =>
      index > 0 ? rows[index - 1].gdp_growth_yoy_pct : Number.NaN,
    ),
    benchmarkErrors(history, 'same_quarter_previous_year_yoy', (rows, index) =>
      index >= 4 ? rows[index - 4].gdp_growth_yoy_pct : Number.NaN,
    ),
    benchmarkErrors(history, 'four_quarter_trailing_average_yoy', (rows, index) => {
      if (index < 4) return Number.NaN
      return mean([
        rows[index - 1].gdp_growth_yoy_pct,
        rows[index - 2].gdp_growth_yoy_pct,
        rows[index - 3].gdp_growth_yoy_pct,
        rows[index - 4].gdp_growth_yoy_pct,
      ])
    }),
  ]

  const best = benchmarks
    .slice()
    .sort((left, right) => left.metrics.rmse - right.metrics.rmse)[0]

  return {
    artifact: {
      id: 'dfm-validation-summary',
      generated_at: new Date().toISOString(),
      source_artifact: DFM_JSON,
      public_artifact_data_version: payload.attribution.data_version,
      public_artifact_exported_at: payload.metadata.exported_at,
      validation_scope:
        'Historical GDP YoY benchmark validation from the public bridge history. True DFM vintage backtesting is blocked until historical source-workbook vintages or saved pre-release DFM outputs are available.',
      vintage_backtest_status: 'blocked_no_historical_vintages',
      source_refit_status: sourceRefitAvailable
        ? 'local_source_refit_completed_without_pdf_report'
        : 'source_refit_summary_not_available',
      source_refit_artifact: SOURCE_REFIT_JSON,
      uncertainty_calibration_status: 'proxy_from_best_historical_gdp_benchmark',
    },
    source_refit: sourceRefitAvailable
      ? {
          status: sourceRefit.artifact.status,
          generated_at: sourceRefit.artifact.generated_at,
          r_version: sourceRefit.artifact.r_version,
          iterations: sourceRefit.estimation.iterations,
          converged: sourceRefit.estimation.converged,
          loglik: sourceRefit.estimation.loglik,
          source_period: sourceRefit.current_nowcast.source_period,
          source_gdp_growth_yoy_pct: sourceRefit.current_nowcast.source_gdp_growth_yoy_pct,
          public_gdp_growth_yoy_pct: sourceRefit.current_nowcast.public_gdp_growth_yoy_pct,
          yoy_difference_source_minus_public_pp:
            sourceRefit.current_nowcast.yoy_difference_source_minus_public_pp,
          report_render_status: sourceRefit.runtime.report_render_status,
        }
      : null,
    history_sample: {
      first_period: history[0]?.period ?? null,
      last_period: history.at(-1)?.period ?? null,
      observations: history.length,
    },
    benchmarks: benchmarks.map((benchmark) => ({
      benchmark_id: benchmark.benchmark_id,
      metrics: roundMetrics(benchmark.metrics),
    })),
    selected_uncertainty_proxy: {
      benchmark_id: best.benchmark_id,
      sigma_base_pp: round(best.metrics.rmse),
      mae_pp: round(best.metrics.mae),
      observations: best.metrics.n,
      is_dfm_vintage_backtest: false,
      use_in_public_artifact:
        'Use as an illustrative nowcast range until a real DFM vintage backtest supersedes it.',
    },
    limitations: [
      'No historical vintages are available, so this report cannot estimate true real-time DFM nowcast errors.',
      'The validation uses actual GDP YoY history already in dfm.json and simple benchmark forecasts only.',
      'The local source R refit is available, but the public bridge still publishes the frozen dfm_nowcast artifact until source-refit output is reconciled and signed off.',
      'The source PDF report render still requires Pandoc; the repo refit runner skips only that report step.',
      'The uncertainty proxy should be treated as a conservative internal-preview range, not an official forecast interval.',
    ],
  }
}

function markdown(validation) {
  const lines = [
    '# DFM validation and uncertainty report',
    '',
    `Generated: ${validation.artifact.generated_at}`,
    '',
    '## Scope',
    '',
    validation.artifact.validation_scope,
    '',
    '## Current status',
    '',
    `- Vintage backtest status: ${validation.artifact.vintage_backtest_status}`,
    `- Source refit status: ${validation.artifact.source_refit_status}`,
    validation.source_refit
      ? `- Source refit result: converged=${validation.source_refit.converged}, iterations=${validation.source_refit.iterations}, source/public YoY difference=${validation.source_refit.yoy_difference_source_minus_public_pp} pp`
      : '- Source refit result: unavailable',
    '',
    '## Historical benchmark metrics',
    '',
    '| Benchmark | Observations | MAE (pp) | RMSE (pp) | Mean error (pp) |',
    '|---|---:|---:|---:|---:|',
    ...validation.benchmarks.map(
      (benchmark) =>
        `| ${benchmark.benchmark_id} | ${benchmark.metrics.n} | ${benchmark.metrics.mae} | ${benchmark.metrics.rmse} | ${benchmark.metrics.mean_error} |`,
    ),
    '',
    '## Selected uncertainty proxy',
    '',
    `The public bridge uses ${validation.selected_uncertainty_proxy.sigma_base_pp} percentage points as an illustrative sigma base, taken from the lowest-RMSE historical GDP benchmark (${validation.selected_uncertainty_proxy.benchmark_id}). Bands are scaled by sqrt(h).`,
    '',
    'This is deliberately conservative and should be replaced by a true DFM vintage backtest when historical vintages or saved pre-release outputs are available.',
    '',
    '## Limitations',
    '',
    ...validation.limitations.map((item) => `- ${item}`),
    '',
  ]
  return lines.join('\n')
}

const validation = buildValidation()
mkdirSync(dirname(OUTPUT_JSON), { recursive: true })
writeFileSync(OUTPUT_JSON, `${JSON.stringify(validation, null, 2)}\n`)
writeFileSync(OUTPUT_MD, markdown(validation))
console.log(`[dfm:validate] wrote ${OUTPUT_JSON}`)
console.log(`[dfm:validate] wrote ${OUTPUT_MD}`)
