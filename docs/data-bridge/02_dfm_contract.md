# DFM Data Bridge — Consumer Contract

**Source:** `scripts/export_dfm.R` → `apps/policy-ui/public/data/dfm.json`
**Status:** Option B (nightly static JSON) — TB-P2 adopted 2026-04-20
**Version:** solver 0.1.0, data 2026Q1
**Upstream input:** `dfm_nowcast/dfm_data.js` (EM-fitted state-space parameters; refit is a separate modelling event)
**Readiness note:** `docs/data-bridge/dfm-model-readiness-note.md`

## Purpose

This file is consumed by the frontend Overview page (nowcast block and
GDP-forecast chart) and, later, by a DFM-specific Model Explorer surface,
to replace the illustrative mock nowcast with real DFM output. It is the
second bridge artefact after `qpm.json`.

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
| `metadata.export_mode` | enum | `"frozen_state_space_bridge"` until the exporter is rewired to run a source-model refit. |
| `metadata.source_model_reference` | object | Points to the local source-model bundle and records that the public export does not read the source workbook. |
| `metadata.source_audit` | object | Local source-folder/workbook/script/object audit status. The raw source folder remains untracked. |
| `metadata.transformation_map` | object | Points to `docs/data-bridge/dfm-transformation-map.json` and CSV; records 36-of-36 public indicator coverage and review blockers. |
| `metadata.refit_status` | object | Current source-refit automation status and exact blocker. In this environment, `Rscript` is not on PATH, so the R refit is not executed. |
| `metadata.backtest_status` | object | Points to `docs/data-bridge/dfm-validation-summary.json` and `dfm-validation-report.md`; true DFM vintage backtesting is blocked by missing historical vintages. |
| `metadata.uncertainty_range` | object | Current illustrative uncertainty metadata, including sigma base, method, calibration source, and official-forecast flag. |
| `metadata.contribution_diagnostics` | object | Guardrail metadata: contributions are factor signals, not GDP percentage-point effects. |
| `metadata.readiness_status` | object | Explicit readiness gates: source refit in CI, per-series transform map, historical backtest/validation, diagnostics audit, and economist sign-off. |

`indicators[].contribution` must not be labelled as a GDP-growth
percentage-point effect. It is a standardized DFM factor signal used to
explain what moved the nowcast.

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

It maps `source_sheet` / `source_column` to `variable_id`, transformation
rule, unit, frequency, missing-value rule, and model role. The map is
generated from the local source workbook by:

```text
node scripts/dfm/extract-source-map.mjs
```

The current source R workflow still applies generic log differences after
optional seasonal adjustment. The map therefore distinguishes documented
coverage from economist acceptance: rates, ratios, weekly FX,
already-growth variables, and some index/balance series remain flagged
for review before a production refit.

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
  is a Sprint 3+ consumer-wiring decision.
- **No V_last-aware uncertainty.** The fan chart uses an illustrative
  historical benchmark proxy, not the per-run filtered-state covariance
  `V_last`. `V_last` is present in the upstream artefact but is not
  surfaced here; a `V_last`-aware band can be added without breaking the
  contract by adding an optional field to `uncertainty`.
- **No multi-factor decomposition.** The model is single-factor
  (`n_factors = 1`); a multi-factor view is not in scope for this export.
- **No re-estimation.** The script **consumes** the EM-fitted parameters
  frozen in `dfm_nowcast/dfm_data.js`; it does not re-run EM or re-fit
  the state-space system. Re-fit is a separate modelling event (see
  `dfm-parameters-frozen-at-refit` caveat).
- **No direct source-workbook refit/export yet.** The local source model bundle
  in `model sources/Fore+Nowcast/DFM` is reference material for review.
  Public `dfm.json` is still generated from the checked-in frozen bridge
  artifact. Workbook updates require a reviewed refit/export step before
  public values change.
- **No true DFM vintage backtest yet.** The current validation report is a
  GDP-history benchmark proxy. It is useful for a conservative internal
  range, but it is not evidence of real-time DFM forecast accuracy.
- **No production validation gates yet.** The current artifact must keep
  `metadata.readiness_status.public_status = "internal_preview_bridge"`
  until the source refit path, economist-reviewed transformations, true
  DFM vintage backtest, diagnostics audit, and economist sign-off are
  available.
- **No scenario variants.** Unlike QPM, DFM has no "policy rate cut"
  or "UZS depreciation" scenarios — there is one nowcast, one factor
  path. The JSON has no top-level `scenarios[]` array by design.

## Freshness

The JSON is regenerated by the GitHub Actions data-regeneration workflow
(`.github/workflows/data-regen.yml`). During Sprint 3 the workflow is
complete on `epic/replatform-execution` and can be run with
`workflow_dispatch`; scheduled/default-branch cron activation becomes
operational only after the TB-P1 deployment migration is promoted to
`main`. The TB-P1 epic-branch pilot deployment does not, by itself, make
scheduled freshness active.
`attribution.timestamp` and
`attribution.run_id` reflect the nightly build. If the JSON is older
than 48 hours, the Overview page / NowcastForecastBlock should surface
the vintage prominently; if older than 7 days, the vintage warning
should escalate to a caveat-level banner (per TA-3 scenario-store rule
and the `dfm-parameters-frozen-at-refit` caveat — a stale export means
a stale refit).

Two sources of "freshness" are in play and should not be conflated:

1. **Nightly JSON regeneration** (this file): stamped by
   `attribution.timestamp` / `metadata.exported_at`.
2. **Upstream EM refit** of the state-space parameters: stamped by
   `metadata.source_artifact_exported_at` (copied verbatim from the
   upstream artefact's `meta.exported_at`). The refit cadence is
   separate from the JSON regeneration cadence.

The consumer should surface both vintages when relevant.

## Consumer wiring checklist (PR 2 of 4 — next PR)

- [ ] `apps/policy-ui/src/data/bridge/dfm-types.ts` — DFM-specific
      TypeScript types (`DfmBridgePayload`, `DfmNowcastQuarter`,
      `DfmQuarterHistory`, `DfmIndicator`, `DfmFactorBlock`).
- [ ] `apps/policy-ui/src/data/bridge/dfm-guard.ts` — schema validator
      with path-level issues, matching the per-page guard pattern
      established by `qpm-guard.ts`.
- [ ] `apps/policy-ui/src/data/bridge/dfm-client.ts` — fetch
      `/data/dfm.json`, validate, return `DfmBridgePayload` with guarded
      error modes.
- [ ] `apps/policy-ui/src/data/bridge/dfm-adapter.ts` — adapt
      `DfmBridgePayload` to downstream contract shapes:
      `HeadlineMetric` for the nowcast KPI (using the 90% band to
      populate `confidence`), `ChartSpec` with `UncertaintyBand[]` for
      the quarterly GDP fan chart (`is_illustrative: false`).
- [ ] Integration test: given a committed `dfm.json` fixture → produces
      a valid `HeadlineMetric` for `gdp_growth_yoy`, a valid `ChartSpec`
      for the GDP fan chart with three non-empty uncertainty bands, and
      a populated `indicators` table.

## Downstream PRs (not in this slice)

- **Overview page integration.** Switch nowcast source in
  `apps/policy-ui/src/data/raw/overview-live.ts` (or the adapter
  upstream of it) from mock to the DFM bridge, with mock fallback
  gated on a failed guard.
- **Default-branch activation.** Keep manual dispatch on the epic branch
  until the TB-P1 deployment migration is promoted to `main`; after that,
  scheduled cron runs update user-facing pilot data.
