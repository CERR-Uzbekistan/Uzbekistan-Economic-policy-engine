# DFM 2026Q2 robustness review

Generated: 2026-07-16T10:12:04Z

## Headline

Baseline source refit gives 2026Q1 GDP YoY nowcast of 7.0078% and QoQ of 1.4398%.

This is a model nowcast from the owner-supplied source folder. It is not yet the public app nowcast and is not an official GDP forecast.

## Source-history guardrail

Latest observed raw GDP history is 2025Q4: raw YoY 8.5455% versus seasonally adjusted model-input YoY 8.7027%. Difference: 0.1572 pp.

Source-workbook GDP history is audit-only and must not be displayed as official history. The adjusted series is model input only.

## GDP seasonal-adjustment decision

Decision: keep seasonally adjusted GDP for model estimation; keep raw source-workbook GDP audit-only pending provenance and continuity verification.

The separate GDP seasonal-adjustment audit shows that raw quarterly GDP has strong quarter-specific seasonality. Latest raw QoQ is 8.0818% while adjusted QoQ is 1.9005%. Raw QoQ volatility is 25.4865 pp versus 1.9876 pp after seasonal adjustment.

Supporting artifact: `docs/data-bridge/dfm-gdp-seasonal-adjustment-audit.md`.

## Robustness cases

case | nowcast | yoy_pct | qoq_pct | diff_pp | converged | iterations
--- | --- | --- | --- | --- | --- | ---
baseline | 2026Q1 | 7.0078 | 1.4398 | 0 | TRUE | 155
no_gdp_seasonal_adjustment | 2026Q1 | 47.8691 | -3.3376 | 40.8613 | TRUE | 154
april_only_high_frequency | 2026Q1 | 7.0078 | 1.4398 | 0 | TRUE | 155
drop_top3_absolute_drivers | 2026Q1 | 7.0115 | 1.4434 | 0.0037 | TRUE | 115

## Top standardized factor drivers

These are not GDP percentage-point contributions. They are standardized indicator movements multiplied by factor loadings.

id | contribution | loading | latest | date | direction
--- | --- | --- | --- | --- | ---
real_est | 0.243193 | 0.405417 | 31264 | 2025-12-01 | supports_nowcast
IDA_mom | 0.227149 | 0.393503 | 1066.5793 | 2025-12-01 | supports_nowcast
IDA_yoy | 0.155968 | 0.229651 | 1221.9993 | 2025-12-01 | supports_nowcast
manf_YOY | 0.151445 | 0.318693 | 112.8186 | 2025-12-01 | supports_nowcast
bank_trans | 0.127311 | 0.369669 | 6244923.3789 | 2025-12-01 | supports_nowcast
m0 | 0.078714 | -0.088204 | 65172148716000 | 2025-12-01 | supports_nowcast
stock_deals | 0.059983 | 0.044576 | 50971 | 2025-12-01 | supports_nowcast
retail_trade_grwth | 0.042903 | 0.223641 | 111 | 2025-12-01 | supports_nowcast
ent_new | 0.023246 | 0.235017 | 87775 | 2025-12-01 | supports_nowcast
IND_YOY | -0.023146 | 0.381273 | 108.3771 | 2025-12-01 | drags_nowcast

## Hostile-review findings

Critical:
- Source-workbook GDP history and model-adjusted GDP history differ. Both remain review-only until source provenance and series continuity are verified.
- The result remains a one-factor DFM with no true real-time vintage backtest.

Warnings:
- The no-GDP-seasonal-adjustment case moves the point estimate materially, but the seasonal-adjustment audit shows this is expected because raw GDP QoQ is dominated by quarter seasonality.
- May-data removal and top-driver leave-out move the point estimate only modestly.
- Top contributions are standardized factor signals, not GDP percentage-point effects.
- Some source rows are already growth/rate/native-unit indicators and still use the generic source transformation path.

Notes:
- This review does not publish the 2026Q2 result into apps/policy-ui/public/data/dfm.json.
- All source-folder raw files remain outside git.

## Limitations

- No historical source-workbook vintages are available, so this is not a true real-time DFM backtest.
- The source workflow still relies on generic log-difference transformations for multiple caveated rows.
- Alternative block/factor structures are not estimated in this run; the source model remains one-factor.
- The PDF report step remains skipped because Pandoc is not available locally.
