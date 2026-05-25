# DFM model readiness note

This note records what the Policy Engine can safely claim about the
Dynamic Factor Model (DFM) nowcast lane, based on the checked-in app
artifact and the local source bundle in `model sources/Fore+Nowcast/DFM`.

## What the app runs

The React app does not estimate the DFM in the browser. It reads the
checked-in public bridge artifact:

- `apps/policy-ui/public/data/dfm.json`
- upstream legacy artifact: `dfm_nowcast/dfm_data.js`

That artifact is the public output of the DFM refit/export lane. It
contains the current-quarter GDP nowcast, uncertainty bands, latent-factor
diagnostics, indicator loadings, indicator contributions, and caveats.

Current tracked export mode:

```text
metadata.export_mode = "source_reconciled_bridge"
```

That means the local canonical export runs the source R refit from
`model sources/Fore+Nowcast/DFM`, then checks that the checked-in bridge
artifact reproduces the same current public nowcast. The public `dfm.json`
still reads through `dfm_nowcast/dfm_data.js`; direct publication from
source-refit output is the next model-owner sign-off step. In GitHub
Actions, raw source files are not available, so CI can regenerate the
bridge artifact but cannot rerun the source refit.

The current public artifact now also carries explicit readiness metadata:

- `metadata.source_audit`
- `metadata.transformation_map`
- `metadata.refit_status`
- `metadata.backtest_status`
- `metadata.uncertainty_range`
- `metadata.contribution_diagnostics`

These fields expose the source-data status, transform-map coverage, refit
blocker, validation proxy, uncertainty range, and contribution guardrails
directly to Model Explorer.

## Source model bundle

The local source bundle contains the full R-side nowcasting workflow:

- `model sources/Fore+Nowcast/DFM/main.R`
- `model sources/Fore+Nowcast/DFM/settings.R`
- `model sources/Fore+Nowcast/DFM/data/data_uzbekistan.xlsx`
- `model sources/Fore+Nowcast/DFM/functions/*.R`
- `model sources/Fore+Nowcast/DFM/report.Rmd`

Current source settings:

- sample start: `2016-01-01`
- latent factors: `1`
- forecast horizon in the source run: `3` months
- DFM estimation call: `estimate_dfm(..., blocks = NA, p = 1, max_iter = 200, threshold = 1e-05)`

The source workbook has 36 series rows:

- 35 high-frequency input rows
- 1 quarterly GDP target row
- one source exchange-rate series is weekly in the workbook and is
  harmonized into the high-frequency public bridge row set

The derived source map is committed here:

- `docs/data-bridge/dfm-transformation-map.json`
- `docs/data-bridge/dfm-transformation-map.csv`

It is generated with:

```text
node scripts/dfm/extract-source-map.mjs
```

The map records `source_sheet`, `source_column`, variable id,
current source transformation, recommended transformation, rationale,
risk flags, owner-decision status, public-display guidance,
missing-value rule, and model role for all 36 current public DFM rows.
The raw workbook remains outside source control.

The canonical local export command is:

```text
node scripts/dfm/export-canonical.mjs
```

It refreshes the transformation map, runs the source refit, regenerates
the public `dfm.json`, rebuilds the validation report, audits source
coverage for the target-quarter nowcast, and writes:

- `docs/data-bridge/dfm-source-coverage.json`
- `docs/data-bridge/dfm-source-coverage.md`
- `docs/data-bridge/dfm-canonical-export-report.json`
- `docs/data-bridge/dfm-canonical-export-report.md`

The latest report shows that the source refit and public bridge both
produce `2026Q1` GDP growth of `7.0078%` YoY and `1.4398%` QoQ, with
zero source-minus-public difference.

The source coverage audit is the publication gate for a Q2 DFM nowcast.
For `2026Q2`, it requires the previous-quarter GDP target (`2026Q1`) and
high-frequency monthly indicators through at least April 2026. The current
local workbook is not Q2-ready: quarterly GDP ends at `2025Q4`, and all
35 high-frequency inputs end at `2025-12`. The audit classifies the
needed refresh channels as 18 licensed/Macrobond-or-equivalent exports,
10 official Statistics Agency feeds, 7 internal CERR feeds, and 1
owner-supplied GDP target/manual source.

## How the model works

1. The source workbook provides quarterly GDP and high-frequency monthly
   or harmonized indicators: production, trade, prices, monetary series,
   business surveys, exchange rates, services, construction, and related
   activity measures.
2. The R pipeline seasonally adjusts flagged series, converts source
   observations into growth/transformed series, and runs stationarity
   checks.
3. A single latent factor is estimated with a mixed-frequency state-space
   DFM using the EM algorithm and Kalman filtering/smoothing.
4. The factor and observed indicators are used to infer the current
   quarterly GDP nowcast.
5. Post-processing converts the model's quarterly GDP path into GDP levels
   and YoY growth.
6. The bridge export writes the public `dfm.json` artifact consumed by
   Overview and Model Explorer.

## How to read the indicator table

The Overview contribution table explains which indicators are moving the
latent DFM factor. A contribution is a standardized factor signal:

```text
latest standardized indicator movement x factor loading
```

It is not a percentage-point effect on GDP growth. For example, a positive
money or trade contribution means that row is pushing the common factor up
in the current data slice. It does not mean GDP growth rises by that many
percentage points.

## Current validation status

Current public artifact checks:

- schema validation passes
- current quarter: `2026Q1`
- data version: `2026Q1`
- solver version: `0.1.0`
- convergence flag: `true`
- EM iterations: `155`
- public row count: `36`
- latent factor count: `1`
- public forward horizon: `0 quarters`
- export mode: `source_reconciled_bridge`
- public status: `internal_preview_bridge`
- source refit in CI: `local_only_not_ci`
- per-series transform map: `available`
- historical backtest/validation: `proxy_available`; true DFM vintages are still unavailable
- diagnostics audit: `available` as contribution guardrails, not model-owner sign-off
- economist sign-off: `not_available`
- source workbook status: `available_locally_untracked`
- transform coverage: `36_of_36`
- transformation-map decision status: 18 `approved`, 18
  `approved_with_caveat`, and 0 `blocked_needs_owner_decision`
- refit status: `available` for the local source runner; public export is reconciled to the source refit through the canonical local command
- source coverage for 2026Q2: `not_ready_for_target_nowcast_refit`
- validation/backtest status: `proxy_validation_available`
- uncertainty range status: `available_illustrative`

This is enough for an internal-preview DFM nowcast lane. It is not enough
to claim a final production-grade nowcasting system.

## Validation and uncertainty

The validation artifacts are:

- `docs/data-bridge/dfm-validation-summary.json`
- `docs/data-bridge/dfm-validation-report.md`

The report computes simple historical GDP YoY benchmark errors from the
public bridge history because true DFM vintages are unavailable. Current
benchmark results:

| Benchmark | Observations | MAE (pp) | RMSE (pp) |
|---|---:|---:|---:|
| last observed YoY | 31 | 2.9871 | 3.7855 |
| same quarter previous year YoY | 28 | 4.1445 | 5.0061 |
| four-quarter trailing average YoY | 28 | 2.8261 | 3.3867 |

The public nowcast bands use the lowest-RMSE benchmark as an illustrative
sigma base:

```text
sigma_base = 3.3867 pp
sigma(h) = sigma_base * sqrt(h)
```

This is intentionally conservative and must be described as an internal
validation proxy. It is not a DFM real-time backtest and not an official
forecast interval.

## Source audit findings

The local source bundle is useful, but it is not production-hardened yet:

- `calculate_growth.R` applies generic log growth to all series. The
  transformation map now records recommended row-level decisions and
  plain-language rationales. The four previously blocked rows now have
  cautious transformation decisions: `financial_sound` uses percentage-point
  NPL-ratio changes, `rate_1y` uses percentage-point rate changes,
  `uzs_usd` uses monthly-average FX log changes, and `kazakh_leadind`
  uses the deviation of its YTD PY=100 index from 100.
- `postprocess_gdp.R` depends on the global `df` object and should take
  all required inputs explicitly before it is used in a reproducible
  export path.
- `growth decomposition.R` rescales factor contributions to sum to a
  chosen GDP growth number and drops negative contributors. It should not
  be treated as a public GDP percentage-point decomposition.
- `diagnostics_dfm.R` needs review before its residual diagnostics are
  used as validation evidence.
- The current one-factor setting may be reasonable for a preview, but
  should be tested against alternative factor counts and block structures.
- R is available locally through
  `C:\Program Files\R\R-4.5.2\bin\Rscript.exe`. The repo runner
  `scripts/dfm/run-source-refit.R` executes data prep, EM estimation,
  prediction, and GDP postprocessing and converged in 155 iterations. The
  remaining local source-workflow blocker is PDF report rendering because
  Pandoc is not available; CI also still needs a reproducible R
  dependency setup.
- The source workbook includes a weekly UZS/USD row while the public DFM
  schema exposes monthly/quarterly frequencies. The transform map now uses
  monthly averaging before the FX log-change input, but this remains a caveated
  transformation until model-owner sign-off.
- Some public labels and source workbook descriptions need owner review
  before the app treats them as final economic names.

## Remaining work

1. Add CI/runtime dependency management for `Rscript` plus packages:
   `readxl`, `dplyr`, `pracma`, `Matrix`, `zoo`, `purrr`, `lubridate`,
   `tidyr`, `signal`, `seasonal`, `urca`, `rmarkdown`, and `ggplot2`;
   install Pandoc if the PDF report is required.
2. Automate the DFM source panel refresh: quarterly real GDP in 2021
   constant prices, licensed/Macrobond-equivalent monthly exports,
   official Statistics Agency monthly feeds, and internal CERR feeds.
3. Replace bridge publication with direct source-refit output after the
   source-output contract is reviewed and signed off.
4. Move the transform map into reviewed source metadata and block refits
   when a series lacks an accepted transformation decision.
5. Add data integrity checks: duplicate dates, metadata/order mismatch,
   coercion-created missing values, failed seasonal adjustment, stationarity
   warnings, and EM non-convergence.
6. Fix GDP postprocessing and diagnostics.
7. Add real-time vintage backtesting: what would the model have predicted
   before official GDP releases?
8. Replace the GDP-only benchmark proxy with a reproducible validation
   report covering DFM vintage forecast errors, factor stability, residual
   diagnostics, and indicator news contributions.
9. Decide whether one factor is enough or whether category-specific factors
   are needed.
10. Add a source-controlled release note each time the DFM source workbook
   or refit output changes.

## Safe wording

Use:

- "model nowcast"
- "current-quarter GDP growth estimate"
- "standardized factor contribution"
- "not an official forecast"

Avoid:

- "official GDP forecast"
- "indicator contribution in percentage points"
- "causal effect on GDP"
- "production-grade nowcast model" without backtesting and economist sign-off
