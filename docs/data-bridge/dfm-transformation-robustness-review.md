# DFM transformation robustness review

Generated: 2026-07-16T10:17:09Z

## Baseline reference

Baseline source workflow: 2026Q1 YoY 7.0078%, QoQ 1.4398%.

## Stress cases

EM settings: max_iter=200, threshold=1e-05

case | yoy_pct | qoq_pct | yoy_diff_pp | converged | iterations | variables
--- | --- | --- | --- | --- | --- | ---
reviewed_caveat_transformations | 6.9989 | 1.4314 | -0.0089 | FALSE | 201 | 36
drop_caveated_high_frequency_rows | 7.0214 | 1.4527 | 0.0136 | TRUE | 84 | 19

## Reviewed transformation decisions

id | mode | replaced
--- | --- | ---
ip_cppy | native_growth_level_signal | TRUE
financial_sound | month_to_month_level_change | TRUE
rate_1y | month_to_month_level_change | TRUE
uzs_usd | source_log_difference | FALSE
kazakh_leadind | native_growth_level_signal | TRUE
IDA_yoy | native_growth_level_signal | TRUE
IDA_mom | native_growth_level_signal | TRUE
ind_percap_grwth | native_growth_level_signal | TRUE
const_grwth | native_growth_level_signal | TRUE
IND_YOY | native_growth_level_signal | TRUE
wholesale_trade_grwth | native_growth_level_signal | TRUE
retail_trade_grwth | native_growth_level_signal | TRUE
services_grwth | native_growth_level_signal | TRUE
bus_clim | month_to_month_level_change | TRUE
bus_clim_exp | month_to_month_level_change | TRUE
manf_YOY | native_growth_level_signal | TRUE
stock_deals | source_log_difference | FALSE

## Hostile-review verdict

Status: small_headline_sensitivity_with_convergence_caveat

Maximum absolute YoY movement versus baseline: 0.0136 pp.

Any nonconverged case: TRUE

Critical:
- This test does not prove the recommended transformations are final; it only measures headline sensitivity to the current caveated rows.
- Rows using native growth-level signals still require model-owner confirmation of scaling and source definitions.

Warnings:
- At least one transformation stress case did not converge before the iteration cap, so that case is a stress-test signal rather than a replacement specification.
- If the reviewed-transformation variant moves materially, do not publish the baseline source nowcast without resolving transformation ownership.
- If the caveated-row leave-out variant moves materially, the one-factor result depends too much on weakly documented rows.

Interpretation rule:
- Passing this test would support internal review, not production readiness.
- Failing this test means the baseline nowcast should remain blocked until transformation ownership is resolved.
