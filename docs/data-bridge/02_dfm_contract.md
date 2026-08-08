# DFM Data Bridge — Consumer Contract

**Source:** `scripts/export_dfm.R` → `apps/policy-ui/public/data/dfm.json`
**Status:** Option B (nightly static JSON) — TB-P2 adopted 2026-04-20
**Version:** solver 0.1.0, data 2026Q1
**Upstream input:** canonical export runner (`scripts/dfm/export-canonical.mjs`) reconciles the local source refit against the checked-in bridge before publishing `dfm.json`
**Readiness note:** `docs/data-bridge/dfm-model-readiness-note.md`

## Purpose

This file is consumed by the frontend Overview page (nowcast block and
GDP-forecast chart) and the Model Explorer DFM surface. It is the second
bridge artefact after `qpm.json`.

## Shape

```
{
  attribution: ModelAttribution,
  nowcast: {
    last_observed_date: string,            // ISO "YYYY-MM-DD"
    current_quarter:   DfmNowcastQuarter,  // nearest forecast quarter
    forecast_horizon:  DfmNowcastQuarter[],// h=2,3,... (empty for now)
    history:           DfmQuarterHistory[] // prior quarters
  },
  factor: {
    n_factors, dates[], path[], converged, n_iter,
    loglik, last_data_date, monthly_series_start
  },
  indicators:  DfmIndicator[],   // 36 entries (35 high-frequency inputs + GDP)
  caveats:     Caveat[],         // 5 entries (severity info/warning)
  metadata: {
    exported_at, source_script_sha, solver_version,
    source_artifact, source_artifact_md5, source_artifact_exported_at,
    export_script, export_script_md5, export_mode,
    source_model_reference,
    source_audit,
    transformation_map,
    refit_status,
    backtest_status,
    uncertainty_range,
    contribution_diagnostics,
    readiness_status
  }
}
```

`ModelAttribution` and `Caveat` map directly onto the types in
`apps/policy-ui/src/contracts/data-contract.ts`. `DfmNowcastQuarter`,
`DfmQuarterHistory`, `DfmIndicator` and the factor block are DFM-specific
and should be modelled in `apps/policy-ui/src/data/bridge/dfm-types.ts`
when consumer wiring lands.

### `DfmNowcastQuarter`

```
{
  period:             string,  // e.g. "2026Q1"
  quarter_start_date: string,  // ISO, e.g. "2026-01-01"
  gdp_growth_yoy_pct: number | null,
  gdp_growth_qoq_pct: number | null,
  gdp_level_idx:      number | null,
  horizon_quarters:   number,        // h = 1 for current_quarter, 2+ beyond
  uncertainty: {
    methodology_label: string,
    is_illustrative:   true,         // validation proxy, not official interval
    bands: [
      { confidence_level: 0.5, lower_pct: number, upper_pct: number },
      { confidence_level: 0.7, lower_pct: number, upper_pct: number },
      { confidence_level: 0.9, lower_pct: number, upper_pct: number }
    ]
  }
}
```

`DfmQuarterHistory` is the same object **without** `horizon_quarters` or
`uncertainty`. History YoY may be `null` for the first four quarters of
the series (YoY is undefined before t+4 observations).

### `DfmIndicator`

```
{
  indicator_id: string,   // stable short key, e.g. "ip_uzs"
  label:        string,   // display label, e.g. "Industrial Production (UZS)"
  category:     string,   // "Production" | "Trade" | "Prices" | "Credit" | ...
  frequency:    "monthly" | "quarterly",
  loading:      number,   // factor loading on this indicator
  contribution: number,   // latest standardised contribution to factor
  latest_value: number | null  // latest observed value (native units; see below)
}
```

## Unit conventions

| Field | Unit | Notes |
|---|---|---|
| `nowcast.current_quarter.gdp_growth_yoy_pct` | percent YoY | e.g., 7.01 = 7.01% |
| `nowcast.current_quarter.gdp_growth_qoq_pct` | percent QoQ (not annualised) | e.g., 1.44 = 1.44% |
| `nowcast.current_quarter.gdp_level_idx` | GDP level index | Scale inherited from upstream `dfm_data.js`; treat as dimensionless level used for growth computations, not as UZS billions. |
| `nowcast.*.uncertainty.bands[].lower_pct` / `upper_pct` | percent YoY | Same scale as the YoY point estimate. |
| `factor.path[]` | standardised factor score | z-scale; not a percent. Dates align 1:1 with `factor.dates[]`. |
| `indicators[].loading` | dimensionless | Factor loading from the C matrix row for this indicator. |
| `indicators[].contribution` | standardised units | Latest indicator value × loading, in the factor's z-scale. |
| `indicators[].latest_value` | native | Native indicator units (YoY % for growth series, index level for IP, USD for trade, etc.); retained verbatim from `dfm_data.js` `latest.values`. Do not aggregate across indicators. |
| `attribution.data_version` / `metadata.solver_version` | string | `"2026Q1"` and `"0.1.0"` in the current export. |
| `metadata.export_mode` | enum | `"source_reconciled_bridge"` when the local source refit reproduces the public bridge output; `"frozen_state_space_bridge"` is retained only for older artifacts. |
| `metadata.source_model_reference` | object | Points to the local source-model bundle and records that the public export is reconciled to, but does not yet directly read, the source-refit output. |
| `metadata.source_audit` | object | Local source-folder/workbook/script/object audit status. The raw source folder remains untracked. |
| `metadata.transformation_map` | object | Points to `docs/data-bridge/dfm-transformation-map.json` and CSV; records 36-of-36 public indicator coverage and row-level owner-review decisions. |
| `metadata.refit_status` | object | Current source-refit automation and reconciliation status. Local source refit now runs through data prep, EM estimation, prediction, and GDP postprocessing via `scripts/dfm/run-source-refit.R`; `reconciliation_status` and `canonical_export_report` point to the source/public bridge comparison. Direct publication from source-refit output still needs a reviewed source-output contract and model-owner sign-off. |
| `metadata.backtest_status` | object | Points to `docs/data-bridge/dfm-validation-summary.json` and `dfm-validation-report.md`; true DFM vintage backtesting is blocked by missing historical vintages. |
| `metadata.uncertainty_range` | object | Current illustrative uncertainty metadata, including sigma base, method, calibration source, and official-forecast flag. |
| `metadata.contribution_diagnostics` | object | Guardrail metadata: contributions are factor signals, not GDP percentage-point effects. |
| `metadata.readiness_status` | object | Explicit readiness gates: source refit in CI, per-series transform map, historical backtest/validation, diagnostics audit, and economist sign-off. `source_refit_in_ci` is currently `local_only_not_ci`; `historical_backtest` may be `proxy_available` when only benchmark validation exists. |

`indicators[].contribution` must not be labelled as a GDP-growth
percentage-point effect. It is a standardized DFM factor signal used to
explain what moved the nowcast.

The refit runner records a GDP source-history audit under
metadata.refit_status.source_gdp_history_audit in dfm.json and
source_gdp_history_audit in the refit summary. This compares the workbook's
unadjusted GDP row with the seasonally adjusted GDP input used by the model.

The comparison is audit-only. The workbook labels the row as real GDP at
constant 2021 prices, but its Source metadata is blank and the series contains
unresolved continuity breaks. Consumers must not present either the raw
workbook growth rates or the adjusted model-input history as an official GDP
release. Official historical GDP must come from a separately verified,
source-owned release series.

The source workbook contains one weekly exchange-rate series. The
checked-in legacy bridge harmonizes non-quarterly inputs into the public
high-frequency row set exposed as monthly/quarterly in `dfm.json`; the
public schema therefore remains `"monthly" | "quarterly"` until the
refit/export path is upgraded.

The current fan-chart formula is `sigma(h) = sigma_base * sqrt(h)` with
`sigma_base = 3.3867 pp`, sourced from
`docs/data-bridge/dfm-validation-summary.json`. This is the lowest-RMSE
historical GDP-only benchmark proxy, not a real-time DFM vintage
backtest. Consumers must render it as illustrative and must not describe
it as an official forecast interval.

## Transformation Map

The source-workbook transformation map is committed in two forms:

- `docs/data-bridge/dfm-transformation-map.json`
- `docs/data-bridge/dfm-transformation-map.csv`

It maps `source_sheet` / `source_column` to `variable_id`, current source
transformation, recommended transformation, rationale, risk flags,
owner-decision status, public-display guidance, missing-value rule, and model role. The map is
generated from the local source workbook by:

```text
node scripts/dfm/extract-source-map.mjs
```

The current source R workflow still applies generic log differences after
optional seasonal adjustment. The map therefore distinguishes documented
coverage from economist acceptance: 18 rows are approved, 18 are
approved with caveats, and 0 remain blocked after row-level review.

## Source Refit Status

The local source refit and canonical reconciliation artifacts are:

- `docs/data-bridge/dfm-source-refit-summary.json`
- `docs/data-bridge/dfm-source-coverage.json`
- `docs/data-bridge/dfm-source-coverage.md`
- `docs/data-bridge/dfm-canonical-export-report.json`
- `docs/data-bridge/dfm-canonical-export-report.md`

They are generated by:

```text
node scripts/dfm/export-canonical.mjs
```

The runner refreshes the source transformation map, audits whether the
source workbook has enough coverage for the target-quarter nowcast,
executes the source workbook data preparation, one-factor EM estimation,
prediction, and GDP postprocessing without rendering the PDF report,
regenerates the public `dfm.json`, rebuilds the validation artifacts,
and writes the canonical comparison report. The latest run converged in
155 iterations and matched the public bridge at 2026Q1: 7.0078% YoY and
1.4398% QoQ, with 0 pp source/public differences. The remaining local
report issue is Pandoc availability for `rmarkdown::render()`, not R
availability.

The same runner compares the raw workbook GDP row with the seasonally adjusted
model-input history. In the current local workbook, the latest comparison is
2025Q4: 8.5455% YoY from the raw workbook row versus 8.7027% YoY from the
adjusted model input. Because the workbook source field is blank and continuity
has not been signed off, this is a diagnostic comparison, not official history
and not a nowcast.

For an owner-supplied 2026 nowcasting folder outside the repository,
the runner can be pointed at the external source without copying it into
git:

```text
Rscript scripts/dfm/run-source-refit.R . --source-dir="<external DFM folder>" --output="tmp/dfm-2026q1-source-refit-summary.json"
```

On this Windows machine, `Rscript` is installed but not on PATH. Use
`C:\Program Files\R\R-4.5.2\bin\Rscript.exe` in place of `Rscript` when
running the commands locally.

The external audit likewise finds 8.7615% YoY from the unadjusted workbook row
and 7.8578% YoY from the seasonally adjusted model input for 2026Q1. That gap
shows why estimation inputs and published history must remain separate. Neither
number is an approved official-history display value until the source series,
vintage, and continuity are verified by the model owner.

The source-output, robustness, GDP seasonal-adjustment, and
transformation-sensitivity review scripts are:

```text
Rscript scripts/dfm/export-source-output-review.R . --source-dir="<external DFM folder>"
Rscript scripts/dfm/review-source-nowcast.R . --source-dir="<external DFM folder>"
Rscript scripts/dfm/audit-gdp-seasonal-adjustment.R . --source-dir="<external DFM folder>"
Rscript scripts/dfm/review-transformation-robustness.R . --source-dir="<external DFM folder>"
```

They write:

- `docs/data-bridge/dfm-source-output-review.json`
- `docs/data-bridge/dfm-source-output-review.md`
- `docs/data-bridge/dfm-2026q2-robustness-review.json`
- `docs/data-bridge/dfm-2026q2-robustness-review.md`
- `docs/data-bridge/dfm-gdp-seasonal-adjustment-audit.json`
- `docs/data-bridge/dfm-gdp-seasonal-adjustment-audit.md`
- `docs/data-bridge/dfm-transformation-robustness-review.json`
- `docs/data-bridge/dfm-transformation-robustness-review.md`

Current decision from these artifacts: keep seasonally adjusted GDP for
DFM model estimation and projection, and keep the raw-versus-adjusted history comparison audit-only until source provenance and continuity are verified. The unadjusted-GDP sensitivity is not a
preferred alternative forecast; it is a diagnostic showing that raw GDP
QoQ seasonality is too large for the DFM state equation. The
transformation stress test currently shows small headline movement
against the baseline (`+0.0315 pp` for reviewed caveated transformations
with `DFM_MAX_ITER=1000`, and `-0.1719 pp` when caveated high-frequency
rows are dropped), but the reviewed-transformations case still hit the EM
iteration cap and must remain a diagnostic, not a replacement model
specification.

The longer transformation-isolation and final model-robustness stages did not
complete within the bounded July 2026 rerun. Older June outputs are not treated
as current evidence and are excluded from this validated bundle. Reproducing
those stages with explicit per-case runtime limits remains required before
their conclusions can support a publication decision.

## Source Coverage Gate

The source coverage artifact is generated by:

```text
Rscript scripts/dfm/audit-source-coverage.R . --target-quarter=2026Q2 --required-target-months=1
```

For Q2 2026, the gate requires:

- quarterly real GDP target data through 2026Q1;
- monthly/weekly indicator observations through at least April 2026 for
  an early Q2 nowcast;
- at least 80% high-frequency indicator coverage before publishing a
  target-quarter source refit.

The current local workbook is not ready for Q2 publication: quarterly GDP
ends at 2025Q4 and all 35 high-frequency indicators end at December
2025. The coverage artifact classifies the required refresh channels as:

| Refresh channel | Series count |
|---|---:|
| licensed Macrobond or equivalent export | 18 |
| official Statistics Agency feed | 10 |
| internal CERR feed | 7 |
| owner-supplied GDP target/manual source | 1 |

This is a publication gate, not a model estimate. It prevents the
Overview Q2 fallback from being relabelled as DFM-generated until the
source panel actually contains the necessary Q2 inputs.

The public `scripts/export_dfm.R` still reads the checked-in bridge
artifact as its immediate data input, but the canonical runner now proves
that the bridge and source refit agree before publication. Replacing the
bridge input with direct source-refit output still requires a reviewed
source-output contract and model-owner sign-off.

## Validation And Backtest Status

The validation artifact is:

- `docs/data-bridge/dfm-validation-summary.json`
- `docs/data-bridge/dfm-validation-report.md`

It computes historical GDP YoY benchmark errors from public `dfm.json`
history. Current metrics:

| Benchmark | MAE (pp) | RMSE (pp) |
|---|---:|---:|
| last observed YoY | 2.9871 | 3.7855 |
| same quarter previous year YoY | 4.1445 | 5.0061 |
| four-quarter trailing average YoY | 2.8261 | 3.3867 |

The selected uncertainty proxy is the four-quarter trailing average RMSE.
True DFM vintage backtesting remains blocked because historical workbook
vintages or saved pre-release DFM outputs are not source-controlled.

## Absent fields, by design

- **No news decomposition.** The legacy UI computes an indicator-level
  news decomposition interactively on the Kalman-update page. The nightly
  export ships the current filtered state's nowcast only; the news view
  remains a future modelling/product decision.
- **No V_last-aware uncertainty.** The fan chart uses an illustrative
  historical benchmark proxy, not the per-run filtered-state covariance
  `V_last`. `V_last` is present in the upstream artefact but is not
  surfaced here; a `V_last`-aware band can be added without breaking the
  contract by adding an optional field to `uncertainty`.
- **No multi-factor decomposition.** The model is single-factor
  (`n_factors = 1`); a multi-factor view is not in scope for this export.
- **No direct source-workbook publication yet.** The canonical local export
  reruns the source refit and reconciles it to the checked-in bridge, but
  public `dfm.json` still reads the bridge artifact as its immediate input.
  Publishing directly from source-refit output requires a reviewed
  source-output contract and model-owner sign-off.
- **No true DFM vintage backtest yet.** The current validation report is a
  GDP-history benchmark proxy. It is useful for a conservative internal
  range, but it is not evidence of real-time DFM forecast accuracy.
- **No production validation gates yet.** The current artifact must keep
  `metadata.readiness_status.public_status = "internal_preview_bridge"`
  until the source refit path, reviewed transformations, true
  DFM vintage backtest, diagnostics audit, and economist sign-off are
  available.
- **No scenario variants.** Unlike QPM, DFM has no "policy rate cut"
  or "UZS depreciation" scenarios — there is one nowcast, one factor
  path. The JSON has no top-level `scenarios[]` array by design.

## Freshness

The JSON is regenerated by the GitHub Actions data-regeneration workflow
(`.github/workflows/data-regen.yml`) on the default branch. The workflow
calls `node scripts/dfm/export-canonical.mjs --allow-missing-source` so
CI can regenerate the checked-in bridge artifact even when the raw source
workbook is absent. Full source-refit reconciliation remains a local
model-owner workflow because the raw workbook is not source-controlled.
`attribution.timestamp` and
`attribution.run_id` reflect the nightly build. If the JSON is older
than 48 hours, the Overview page / NowcastForecastBlock should surface
the vintage prominently; if older than 7 days, the vintage warning
should escalate to a caveat-level banner (per TA-3 scenario-store rule
and the `dfm-parameters-frozen-at-refit` caveat; a stale export means the
source-reconciled bridge is stale).

Two sources of "freshness" are in play and should not be conflated:

1. **Nightly JSON regeneration** (this file): stamped by
   `attribution.timestamp` / `metadata.exported_at`.
2. **Upstream EM refit** of the state-space parameters: stamped by
   `metadata.source_artifact_exported_at` (copied verbatim from the
   upstream artefact's `meta.exported_at`). The refit cadence is
   separate from the JSON regeneration cadence.

The consumer should surface both vintages when relevant.

## Consumer wiring status

- `apps/policy-ui/src/data/bridge/dfm-types.ts` defines the DFM-specific
  public artifact contract.
- `apps/policy-ui/src/data/bridge/dfm-guard.ts` validates the committed
  artifact, including source-refit reconciliation metadata.
- `apps/policy-ui/src/data/bridge/dfm-client.ts` fetches `/data/dfm.json`
  through the guarded static-data path.
- `apps/policy-ui/src/data/bridge/dfm-adapter.ts` adapts the bridge into
  Overview/Model Explorer shapes and keeps the uncertainty bands marked
  illustrative.
- The current remaining model-work items are direct source-refit
  publication, true vintage backtesting, richer DFM diagnostics, and
  economist/model-owner sign-off.
