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

This is enough for an internal-preview DFM nowcast lane. It is not enough
to claim a final production-grade nowcasting system.

## Remaining work

- Run the R refit/export lane directly from the source workbook and compare
  it against the checked-in `dfm.json`.
- Add real-time vintage backtesting: what would the model have predicted
  before official GDP releases?
- Add a reproducible validation report covering historical fit, forecast
  errors, and indicator news contributions.
- Decide whether one factor is enough or whether category-specific factors
  are needed.
- Upgrade public frequency metadata if weekly/daily source series are kept
  separately instead of harmonized into monthly bridge rows.
- Add a source-controlled release note each time the DFM source workbook or
  refit output changes.

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
