# DFM source output review

Generated: 2026-07-16T10:12:14Z

## Headline

Review-only source output gives 2026Q1 GDP YoY nowcast of 7.0078% and QoQ of 1.4398%.

Estimation source: saved_results_rdata; converged: TRUE; iterations: 155.

This artifact is for internal review only. It does not update `apps/policy-ui/public/data/dfm.json`.

## Source-history guardrail

Latest observed raw GDP period is 2025Q4: raw YoY 8.5455% versus seasonally adjusted model-input YoY 8.7027%.

Source-workbook GDP history is audit-only and blocked from public display pending provenance and continuity verification. Seasonally adjusted GDP remains model input only.

## Recent GDP path

period | gdp_level | yoy_pct | qoq_pct
--- | --- | --- | ---
2024Q2 | 259534 | 6.6449 | 1.9472
2024Q3 | 263979.3 | 10.2295 | 1.6982
2024Q4 | 260324.3 | 1.6241 | -1.3938
2025Q1 | 268255.2 | 5.3927 | 3.0009
2025Q2 | 273495 | 5.3793 | 1.9343
2025Q3 | 277701.8 | 5.1983 | 1.5265
2025Q4 | 282979.5 | 8.7027 | 1.8826
2026Q1 | 287054 | 7.0078 | 1.4398

## Top standardized factor drivers

These are not GDP percentage-point contributions.

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

## Review verdict

Status: usable_for_internal_model_review_not_public_release

Critical:
- This artifact is generated from the external 2026 source folder and must not be treated as the public dfm.json contract.
- Source-workbook GDP history is audit-only because workbook source metadata and series continuity are not verified; the seasonally adjusted GDP path is model input only.

Warnings:
- Saved EM results are reused when output/results.RData is present; rerun with a clean refit before final model-owner sign-off.
- Top drivers are standardized factor signals, not GDP percentage-point contributions.
- Transformation caveats remain open for growth, rate, index, and survey rows.

Related artifacts:
- `docs/data-bridge/dfm-2026q2-robustness-review.md`
- `docs/data-bridge/dfm-gdp-seasonal-adjustment-audit.md`
