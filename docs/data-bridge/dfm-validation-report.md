# DFM validation and uncertainty report

Generated: 2026-05-24T13:10:43.803Z

## Scope

Historical GDP YoY benchmark validation from the public bridge history. True DFM vintage backtesting is blocked until historical source-workbook vintages or saved pre-release DFM outputs are available.

## Current status

- Vintage backtest status: blocked_no_historical_vintages
- Source refit status: local_source_refit_completed_without_pdf_report
- Source refit result: converged=true, iterations=155, source/public YoY difference=0 pp

## Historical benchmark metrics

| Benchmark | Observations | MAE (pp) | RMSE (pp) | Mean error (pp) |
|---|---:|---:|---:|---:|
| last_observed_yoy | 31 | 2.9871 | 3.7855 | -0.0498 |
| same_quarter_previous_year_yoy | 28 | 4.1445 | 5.0061 | -0.0278 |
| four_quarter_trailing_average_yoy | 28 | 2.8261 | 3.3867 | 0.1125 |

## Selected uncertainty proxy

The public bridge uses 3.3867 percentage points as an illustrative sigma base, taken from the lowest-RMSE historical GDP benchmark (four_quarter_trailing_average_yoy). Bands are scaled by sqrt(h).

This is deliberately conservative and should be replaced by a true DFM vintage backtest when historical vintages or saved pre-release outputs are available.

## Limitations

- No historical vintages are available, so this report cannot estimate true real-time DFM nowcast errors.
- The validation uses actual GDP YoY history already in dfm.json and simple benchmark forecasts only.
- The local source R refit is available, but the public bridge still publishes the frozen dfm_nowcast artifact until source-refit output is reconciled and signed off.
- The source PDF report render still requires Pandoc; the repo refit runner skips only that report step.
- The uncertainty proxy should be treated as a conservative internal-preview range, not an official forecast interval.
