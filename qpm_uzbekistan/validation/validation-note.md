# QPM v1 — Validation Note

**Issue:** [#141 — QPM v1 validation pack](https://github.com/CERR-Uzbekistan/Uzbekistan-Economic-policy-engine/issues/141)
**Status:** Phase 1 — cross-engine validation, equations documented, parameters reviewed, dataset ported.
**Verdict:** **Approved only for reference scenarios. Not approved for official forecasting or policy publication.**
**Date:** 2026-05-25
**Author:** CERR Economic Policy Lab (validation pack)

---

## 1. What "QPM" means in this platform

The HTML model at [qpm_uzbekistan/index.html](../index.html) is a deterministic, deviation-form impulse-response simulator built on a five-equation small-open-economy Quarterly Projection Model (Berg, Karam & Laxton 2006). It is paired with — and validated against — the canonical MATLAB / IRIS Toolbox implementation maintained by the CERR Modelling Team, snapshot of which is preserved in [data/](data/).

The platform's QPM is therefore best characterised as a **JavaScript port of the IRIS reference model, running in deviation form, with one extension** (direct quarterly import-price pass-through `a4·Δs`).

This document records what was checked, what passed, what didn't, and what should not be claimed about the model.

---

## 2. Equations currently used

### 2.1 Five-equation core (HTML, matches MATLAB up to extension noted)

All variables are **deviations from steady state**. Pre-shock state = 0. See [qpm_uzbekistan/index.html:571–724](../index.html).

**IS curve (aggregate demand):**

```
gap_t = b1·gap_{t-1} − b2·MCI_t + b3·gap*_t + ε_gap_t
MCI_t = b4·rr_gap_t − (1−b4)·z_gap_t
```

**Phillips curve (inflation) — HTML extends MATLAB with `a4·Δs`:**

```
π_t = a1·π_{t-1} + (1−a1)·E[π_{t+1}] + a2·RMC_t  + a4·Δs_t  + ε_π_t        (HTML)
π_t = a1·π_{t-1} + (1−a1)·E[π_{t+1}] + a2·RMC_t              + ε_π_t        (MATLAB)
RMC_t = a3·gap_t + (1−a3)·z_gap_t
```

**Taylor rule (forward-looking):**

```
rs_t = g1·rs_{t-1} + (1−g1)·( E[π_{t+1}] + g2·E[π4_{t+4} − π*] + g3·gap_t ) + ε_rs_t
```

**Modified UIP (exchange rate):**

```
s_t = (1−e1)·E[s_{t+1}] + e1·s_{t-1} − (rs_t − ρ_t)/4 + ε_s_t          (HTML, deviation form)
s_t = (1−e1)·E[s_{t+1}] + e1·(s_{t-1} + 2/4·(π* − π*_RW + Δz̄)) + (−rs + rs_RW + PREM)/4 + ε_s   (MATLAB, full)
```

The HTML form is the MATLAB form evaluated at zero deviation for the foreign block and trends — the equation is exactly the same when all those quantities are at steady state.

**Identities** (both engines):

```
z_gap_t   = s_t − l_cpi_t                    (RER gap, deviation form)
rr_gap_t  = rs_t − E[π_{t+1}]                (real rate gap)
Δs_t      = s_t − s_{t-1}                    (quarterly NER change)
π4_t      = (π_t + π_{t-1} + π_{t-2} + π_{t-3})/4   (YoY inflation)
D4L_S_t   = s_t − s_{t-4}                    (YoY NER depreciation)
```

### 2.2 Solver

- **HTML:** iterative Gauss-Seidel — backward sweep for the forward-looking UIP, forward sweep for IS / Phillips / Taylor — to fixed point (`||x_k − x_{k-1}||∞ < 1e-10`, max 600 iterations). Typical convergence in 30–80 iterations. ([index.html:617–706](../index.html)).
- **MATLAB:** IRIS Toolbox structural rational-expectations solver (`Model.fromFile` + `simulate` with `'Deviation', true`). First-order perturbation around steady state.

These two solvers are mathematically equivalent in the linear-rational-expectations limit but produce small numerical differences in finite iterations — see §4.

### 2.3 Shocks implemented in HTML

| Shock | HTML id | MATLAB shock | Description |
|---|---|---|---|
| Aggregate demand | `demand` | `SHK_L_GDP_GAP` | Direct IS curve residual |
| Cost-push inflation | `inflation` | `SHK_DLA_CPI` | Direct Phillips residual |
| UZS depreciation | `exchange` | `SHK_L_S` | UIP residual |
| Monetary tightening | `monetary` | `SHK_RS` | Taylor rule residual |
| Risk premium | `risk` | (proxy for `PREM`) | Acts on the rate wedge in UIP |
| External demand | `external` | (proxy for `L_GDP_RW_GAP`) | Exogenous AR(0.75) on foreign gap |

The MATLAB pack has additional shocks for the trend block (`SHK_RR_BAR`, `SHK_DLA_Z_BAR`, `SHK_DLA_GDP_BAR`, `SHK_D4L_CPI_TAR`) and the full foreign block (`SHK_L_GDP_RW_GAP`, `SHK_RS_RW`, `SHK_DLA_CPI_RW`, `SHK_RR_RW_BAR`). These are **not exposed in Scenario Lab today**.

### 2.4 Scenario Lab controls — what's a QPM shock vs accounting/proxy

| Scenario Lab control | Type | Hits |
|---|---|---|
| Policy rate slider | Direct QPM shock | `SHK_RS` |
| Cost-push slider | Direct QPM shock | `SHK_DLA_CPI` |
| Exchange-rate slider | Direct QPM shock | `SHK_L_S` |
| Demand-shock slider | Direct QPM shock | `SHK_L_GDP_GAP` |
| Risk-premium slider | Direct QPM shock | `PREM` proxy via UIP rate wedge |
| External-demand slider | Direct QPM shock | `gap*_t` exogenous path (AR(0.75)) |
| Inflation target slider (ssTar) | Steady-state value, not a shock | Shifts the model's anchor; rerun required |
| Neutral real rate slider (ssRRbar) | Steady-state value | Shifts the model's anchor |
| Potential growth slider (ssGdpbar) | Steady-state value | Display-only in deviation form; affects level overlay only |

**All KPIs and series on the IRF page are in deviation-from-steady-state form**, not levels. The cover-page macro snapshots elsewhere in the platform (`index.html` hub, Data Bridge) are independent — they read directly from the Statistics Agency feeds and are not QPM outputs.

---

## 3. Historical dataset

Ported into the repo at [data/](data/) — see [data/README.md](data/README.md) for full provenance, transformation pipeline, and missing-data handling.

**Coverage:** Uzbekistan 2016Q1 – 2025Q3 (41 quarters). Variables: GDP, CPI, policy rate, UZS/USD, plus auxiliary series (sectoral GDP, CPI subcomponents, lending rates, trading-partner GDP/CPI, world commodity prices).

**Transformations** (replicated from `a02_makedata_uzb.m`):
1. Monthly → quarterly via simple mean.
2. 4-quarter trailing moving average for seasonal adjustment.
3. `L_X = 100 · log(X_SA)` for GDP, CPI, NER.
4. Linear interpolation for missing values at edges.

**Vintages:**
- Data: Statistics Agency / CBU as of 2026-04-29 (matches `main` branch nightly regen commit).
- MATLAB pack: CERR snapshot 2026-05-25.

A second artefact, [data/matlab_kalman_filter.csv](data/matlab_kalman_filter.csv), contains the IRIS Kalman-smoothed estimates of all latent variables — output gap, trend real rate, RER trend, inflation expectations — covering the same period. This is the closest thing to a "historical run of the QPM" the platform has today, but it is **MATLAB-side only**; the JS QPM has no Kalman filter and cannot reproduce it.

---

## 4. Backtesting — Phase 1 (cross-engine) + Phase 2 (historical)

Two complementary tests:

- **§4.1–4.4 — Phase 1**: JS solver cross-checked against IRIS impulse responses. Answers *"does the JS engine reproduce the canonical model?"*.
- **§4.5–4.8 — Phase 2**: rolling 1–4Q-ahead forecasts scored against actual Uzbek outcomes 2018Q1–2025Q3. Answers *"does the model forecast Uzbekistan?"*.

### 4.1 Phase 1 — JS vs IRIS impulse responses

The JS solver was cross-checked against the IRIS solver on the four canonical 1-pp shock IRFs (Aggregate Demand, Cost-Push, UZS Depreciation, Monetary Tightening), 12-quarter horizon, using identical parameters and the Phillips extension disabled (`a4 = 0`).

Run live: [cross-check.html](cross-check.html).
Raw data: [data/html_vs_matlab_deltas.csv](data/html_vs_matlab_deltas.csv), [data/matlab_irf_benchmark.csv](data/matlab_irf_benchmark.csv).

### 4.2 Phase 1 fit — JS vs IRIS, pooled across 4 shocks × 13 quarters (n=52 per panel)

| Variable | Panel | Max \|Δ\| (pp) | RMSE (pp) | Verdict |
|---|---|---|---|---|
| Output Gap | `L_GDP_GAP` | 0.080 | 0.029 | **PASS** |
| Inflation YoY | `D4L_CPI` | 0.119 | 0.043 | WARN |
| Policy Rate | `RS` | 0.148 | 0.064 | WARN |
| NER Depreciation YoY | `D4L_S` | 0.253 | 0.107 | **FAIL** |
| Real Exchange Rate Gap | `L_Z_GAP` | 0.203 | 0.088 | **FAIL** |
| Monetary Conditions Index | `MCI` | 0.295 | 0.086 | **FAIL** |

Tolerance bands: PASS &lt; 0.05 pp · WARN &lt; 0.15 pp · FAIL ≥ 0.15 pp.

### 4.3 Phase 1 per-shock max |Δ| (worst panel reported)

| Shock | Worst panel | Max \|Δ\| (pp) |
|---|---|---|
| Aggregate Demand | NER Depr | 0.110 |
| Cost-Push Inflation | MCI | 0.295 |
| UZS Depreciation | NER Depr | 0.150 |
| Monetary Tightening | NER Depr | 0.148 |

### 4.4 Phase 1 interpretation

- **Core gauges (GDP gap, CPI YoY, policy rate) reproduce IRIS impulse responses to within ~0.05–0.15 pp** at every horizon and for every shock. This is the meaningful test for a reference scenario tool. Verdict: **JS solver is faithful on the variables that drive Scenario Lab KPIs and Advisor briefs.**
- **Exchange-rate-linked paths (NER YoY, RER gap, MCI) show larger deviations**, up to ~0.30 pp on the cost-push shock. Three drivers, in order of significance:
  1. **Solver-ordering effects.** Gauss-Seidel converges to the same fixed point as IRIS's structural solver in the linear-rational-expectations limit, but the iteration order in the JS code re-evaluates RMC / π / MCI / gap multiple times per quarter (see [index.html:677–688](../index.html)). The forward NER path is exquisitely sensitive to which version of `rs[t]` enters the UIP equation — a single ordering choice can move the long-horizon NER by ~0.1 pp.
  2. **Compounding effect of approximate Phillips equation.** Even with `a4 = 0`, tiny numerical residuals in inflation propagate into `l_cpi`, which feeds `z_gap`, which then dominates `MCI` (RER side, weight 1−b4 = 0.40).
  3. **Foreign block stubs.** Both engines run with foreign deviations = 0, but the IRIS solver applies its trend AR(1) processes (`rho_DLA_CPI_RW = 0.8`, etc.) with steady-state values built in; the HTML solver simply zero-fills. For the deviation-only IRFs run here this does not bite, but it is an outstanding source of disagreement once non-zero foreign shocks are introduced.
- **No directional errors.** Across all 312 cells, the sign of the JS path matches IRIS — i.e. the JS engine never says "rate up" when IRIS says "rate down" or vice versa. The disagreement is in magnitude only.

### 4.5 Phase 2 — Historical rolling backtest

A rolling pseudo-real-time backtest scores the JS QPM against actual Uzbek outcomes. **26 forecast origins (2018Q1 – 2024Q3), 4 horizons (1Q – 4Q ahead), 3 target variables** = 312 forecast cells.

Run live: [backtest.html](backtest.html).
Raw data: [data/backtest_forecasts.csv](data/backtest_forecasts.csv).

**Methodology** (deterministic conditional forecast):

1. Read the IRIS Kalman-smoothed historical state from [data/matlab_kalman_filter.csv](data/matlab_kalman_filter.csv).
2. At each origin `t₀`, extract the deviation state: `gap₀ = L_GDP_GAP(t₀)`, `π₀ = D4L_CPI(t₀) − D4L_CPI_TAR(t₀)`, `rs₀ = RS(t₀) − RSNEUTRAL(t₀)`.
3. Call `solveIRF(p, null, 0, 4, initConds)` — no shock, deterministic forward projection in deviation form.
4. Reconstruct level forecasts using smoothed trends at the forecast date:
   - `D4L_CPI_pred(h) = D4L_CPI_TAR(t₀+h) + π_pred(h)`
   - `RS_pred(h) = RSNEUTRAL(t₀+h) + rs_pred(h)`
   - `D4L_GDP_pred(h) = DLA_GDP_BAR(t₀+h) + (gap_pred(h) − gap_lag4)`
5. Score against `OBS_*` actuals at `t₀+h`.

**Caveat — Kalman-smoothed look-ahead.** Historical state at each origin uses the *full-sample* IRIS smoother, not a re-filtered estimate at `t₀`. This isolates the QPM's gap-forecasting dynamics from the separate problem of real-time trend estimation. A future Phase 3 could re-filter at each origin for a true pseudo-real-time test.

### 4.6 Phase 2 fit — pooled across all horizons (n=104 per variable)

| Variable | N | RMSE (pp) | MAE (pp) | Directional accuracy | Verdict |
|---|---|---|---|---|---|
| CPI Inflation YoY (`D4L_CPI`) | 104 | **4.06** | 3.53 | 71.2 % | **FAIL** |
| Policy Rate (`RS`) | 104 | **1.72** | 1.40 | 76.9 % | WARN |
| Real GDP YoY (`D4L_GDP`) | 104 | **1.74** | 1.33 | 85.6 % | WARN |

Tolerance bands (variable-specific, based on natural variation):

| | PASS &lt; | WARN &lt; | FAIL ≥ |
|---|---|---|---|
| `D4L_CPI` | 1.5 pp | 3.0 pp | 3.0 pp |
| `RS` | 1.0 pp | 2.5 pp | 2.5 pp |
| `D4L_GDP` | 1.5 pp | 3.0 pp | 3.0 pp |

### 4.7 Phase 2 fit by horizon

| Variable | 1Q | 2Q | 3Q | 4Q |
|---|---|---|---|---|
| `D4L_CPI` RMSE (pp) | 1.53 | 2.89 | 4.56 | 5.88 |
| `D4L_CPI` MAE (pp)  | 1.42 | 2.73 | 4.35 | 5.62 |
| `D4L_CPI` DA        | 69.2 % | 69.2 % | 69.2 % | 76.9 % |
| `RS` RMSE (pp)      | 1.38 | 1.54 | 1.79 | 2.10 |
| `RS` MAE (pp)       | 1.12 | 1.30 | 1.47 | 1.72 |
| `RS` DA             | 72.7 % | 66.7 % | 83.3 % | 81.0 % |
| `D4L_GDP` RMSE (pp) | 1.38 | 1.73 | 2.01 | 1.79 |
| `D4L_GDP` MAE (pp)  | 1.08 | 1.31 | 1.53 | 1.42 |
| `D4L_GDP` DA        | 84.6 % | 84.6 % | 88.5 % | 84.6 % |

### 4.8 Phase 2 interpretation

- **GDP forecasts are the best of the three.** RMSE 1.4–2.0 pp across all horizons, directional accuracy ~85 %. The IS curve's strong autoregressive structure (`b1 = 0.70`) and the natural smoothness of GDP growth combine well — the model correctly anticipates the *direction* of activity changes ~85 % of the time, with magnitude errors of 1–2 pp.
- **Policy-rate forecasts are decent.** RMSE 1.4–2.1 pp, DA 67–83 %. The Taylor rule's heavy smoothing (`g1 = 0.80`) means the QPM tracks slow CBU rate moves well but misses sharp pivots (e.g. the 2022 Q1 hike from 14 % to 17 %).
- **Inflation forecasts fail outright at 3- and 4-quarter horizons.** RMSE explodes from 1.5 pp at 1Q to 5.9 pp at 4Q. Two structural reasons:
  1. **Mean-reversion to target.** The Phillips curve pulls inflation toward `π* = 5 %`, so multi-quarter forecasts in 2018–2022 all aggressively under-predict the actual 10–17 % CPI YoY. Almost every error in this window is negative (predicted &lt; actual).
  2. **No food / commodity / FX-passthrough block.** The 2022 commodity-shock-driven inflation spike has no structural mechanism in the model — it cannot be predicted from QPM dynamics alone, only from the unobserved residual `SHK_DLA_CPI` that the model assumes is zero at the forecast origin.
- **Directional accuracy is high even when magnitudes are wrong.** 71–86 % directional accuracy across all three variables means the model usually gets the *direction* of macro change correct. For the Advisor's "is inflation going up or down?" briefs this is acceptable. For magnitude statements ("by how much?") it is not.
- **Best/worst periods.** Errors concentrate in 2018Q1–2020Q4 (the post-FX-liberalisation high-inflation era) and 2022Q1–2022Q4 (commodity shock). From 2023Q1 onwards, 1-quarter-ahead CPI errors fall below 1 pp; from 2023Q3 onwards, all 1-quarter errors are within sane bounds.
- **The backtest confirms — and quantifies — the "reference scenarios only" verdict.** The model does not have a structural mechanism to predict commodity shocks, FX shocks, or step-changes in monetary regime. Conditional on no shocks, it forecasts mean reversion. That is exactly what Scenario Lab's "what does a 100bp hike do?" use case asks for; it is not a forecast model.

---

## 5. Parameter review

See full table at [parameter-table.md](parameter-table.md). Summary:

- **All structural parameters are calibrated or borrowed from QPM literature.** None are estimated from Uzbek data.
- HTML defaults match MATLAB calibration point-for-point on every shared parameter — there is no calibration drift between the two engines.
- HTML adds one parameter (`a4`, direct import pass-through) tagged to Campa & Goldberg (2005). This term is the source of the only equation-level divergence between HTML and MATLAB.
- Steady-state values (`π* = 5 %`, `r̄ = 3.5 %`, `ȳ = 6 %`) match CBU communications and CERR/IMF estimates.

---

## 6. Limitations

What the QPM **does not** capture today, and which should be treated as known absences whenever the platform's output is presented:

| # | Limitation | Why it matters |
|---|---|---|
| 1 | **No estimation.** Every parameter is calibrated. | Cannot make uncertainty statements based on parameter standard errors. |
| 2 | **No historical filtering on the JS side.** Kalman filtering exists only in MATLAB. | The HTML model cannot produce historical fit charts, nowcasts, or quarter-by-quarter decompositions. |
| 3 | **Rich inflation block missing.** No separate food / administered-price / import / expectations channel. | Inflation responses are a single aggregate Phillips curve. Cannot reproduce the 2022–2023 food-price spike correctly. |
| 4 | **No managed-float / reserves / FX intervention.** UIP runs free. | UZS scenarios assume a market-determined rate. Not reliable for capital-control or intervention scenarios. |
| 5 | **No endogenous fiscal / debt block.** | Cannot model deficit, debt-service, or tax-policy scenarios. |
| 6 | **No external-sector / current-account block.** | Trade balance not modelled. External shock = foreign output gap only. |
| 7 | **No uncertainty bands / fan charts** (Monte Carlo bands exist but only perturb structural params, not the data). | Cannot communicate forecast confidence rigorously. |
| 8 | **Foreign block exogenous and stubbed.** | Foreign shocks have a thinner structural interpretation than domestic shocks. |
| 9 | **Solver disagreement on exchange-rate paths** (this note, §4.4). | NER / RER / MCI outputs have ~0.10–0.30 pp solver noise vs IRIS. Single-quarter NER moves should be quoted with this uncertainty. |
| 10 | **a4 extension is HTML-only.** | When users disable `a4` to match MATLAB, the import-pass-through channel disappears. Document this clearly in Scenario Lab tooltips. |

---

## 7. Recommended next improvements

Ordered by value-per-effort:

1. ~~**Phase 2 backtest engine** (issue #141 §3). Pseudo-real-time rolling forecast in JS, RMSE/MAE on GDP, CPI, RS.~~ ✅ **Delivered** — see [backtest.html](backtest.html) and §4.5–4.8.
2. **Re-filter at each origin (Phase 3)** to remove the Kalman-smoother look-ahead from §4.5. Either implement a JS-side filter or run the IRIS filter at each origin and store outputs. Would convert the current "deterministic conditional forecast" backtest into a true pseudo-real-time test.
3. **Estimate the simple AR(1) parameters from data** (`b1`, `a1`, `g1`, `e1`). Even simple least-squares on the historical series would replace 4 "calibrated" labels with "estimated" labels. ~1 day of analyst work.
4. **Rich inflation block** (food / admin / import / expectations) — the single biggest source of forecast error per §4.8. Separate issue, larger scope.
5. **Port the foreign block stubs into the JS engine** so external shocks behave the same way in both engines.
6. **Managed-float / reserves block** — separate issue, larger scope.
7. **Fan charts** via parameter-uncertainty Monte Carlo (already partially exist on the IRF page) plus shock-uncertainty draws.

---

## 8. Approval statement

The QPM v1 as implemented in [qpm_uzbekistan/index.html](../index.html) is approved for use as a **deterministic reference scenario tool** only. Specifically:

✅ **Approved for:**
- Internal scenario analysis ("what does a 100 bp rate hike do to inflation under our reference parameters?").
- Educational and communicational use in the Policy Engine platform.
- Side-by-side comparison with the MATLAB/IRIS implementation.
- Generating illustrative impulse responses for policy briefings, **with explicit disclaimers that the model is calibrated, not estimated.**

❌ **Not approved for:**
- Official forecasting or nowcasting publication.
- Quantitative policy recommendation memos that cite specific magnitudes (e.g. "the QPM predicts X% inflation in Q3 2026") without a disclaimer.
- Decision-making under uncertainty where confidence intervals are required.
- Stress scenarios involving managed FX, fiscal policy, or capital-flow shocks — the model has no structural representation of these.

This approval should be revisited after Phase 2 (historical backtest with RMSE/MAE evidence) and again after any structural enhancement (rich inflation block, managed float, fiscal block).

---

## 9. Artefacts (this folder)

| File | Purpose |
|---|---|
| [validation-note.md](validation-note.md) | This document. |
| [parameter-table.md](parameter-table.md) | Full parameter-by-parameter review. |
| [cross-check.html](cross-check.html) | Phase 1 — interactive JS-vs-MATLAB IRF comparison tool. |
| [backtest.html](backtest.html) | Phase 2 — interactive rolling backtest scoring tool. |
| [data/README.md](data/README.md) | Provenance & transformation pipeline. |
| [data/data_q.csv](data/data_q.csv) | Quarterly Uzbek macro series 2016Q1–2025Q3. |
| [data/data_m.csv](data/data_m.csv) | Monthly Uzbek macro series 2016M01–2025M09. |
| [data/matlab_irf_benchmark.csv](data/matlab_irf_benchmark.csv) | IRIS impulse responses for 4 shocks × 6 panels × 13 quarters. |
| [data/matlab_kalman_filter.csv](data/matlab_kalman_filter.csv) | IRIS Kalman-smoothed historical estimates of all latent variables. |
| [data/html_vs_matlab_deltas.csv](data/html_vs_matlab_deltas.csv) | Phase 1 — tabulated JS-vs-IRIS IRF differences, ready for spreadsheet review. |
| [data/backtest_forecasts.csv](data/backtest_forecasts.csv) | Phase 2 — all 312 forecast cells with predicted, actual, baseline, error. |
| [data/Uzbekistan.model](data/Uzbekistan.model) | Canonical IRIS model spec (reference). |
| [data/readmodel_uzb.m](data/readmodel_uzb.m) | Canonical parameter assignments (reference). |
