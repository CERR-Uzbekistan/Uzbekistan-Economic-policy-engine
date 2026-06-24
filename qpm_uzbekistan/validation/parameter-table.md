# QPM Parameter Review — v1 Calibration

Status as of 2026-05-25 · issue #141.
For each structural parameter:
- **HTML default** = value baked into `qpm_uzbekistan/index.html` slider DOM.
- **MATLAB** = value assigned in `data/readmodel_uzb.m`.
- **Status** = one of:
  - **C (calibrated)** — chosen by the CERR modelling team based on Uzbek economic structure, with stated rationale (often Russian/Uzbek comments in `readmodel_uzb.m`). No formal estimation.
  - **R (reference)** — borrowed from canonical QPM literature (typically Berg, Karam & Laxton 2006 — IMF QPM template), unchanged.
  - **E (estimated)** — would have been estimated from data. *No parameter currently in this category.*
- **Lit range** = plausible ranges from QPM/DSGE literature for small open emerging economies.

> **All current parameters are calibrated or reference, none are estimated from Uzbek data.** This is the single biggest gap before the model can be treated as anything more than a reference scenario tool.

---

## IS curve (aggregate demand)

| Param | Role | HTML default | MATLAB | Slider range | Status | Lit range | Notes |
|---|---|---|---|---|---|---|---|
| `b1` | Output-gap persistence | 0.70 | 0.70 | 0.30 – 0.95 | C | 0.50 – 0.90 | Comment in `readmodel_uzb.m:26`: "70% inertia. Remittances and external shocks make UZB sensitive; developed economies usually 0.8–0.9." Plausible but should be checked against actual output-gap autocorrelation (AR(1) on HP-detrended log GDP). |
| `b2` | MCI → output sensitivity | 0.20 | 0.20 | 0.05 – 0.60 | C | 0.10 – 0.40 | "Monetary transmission not fully developed in UZB" (`readmodel_uzb.m:28`). Low end of the literature range — likely defensible but needs estimation once historical policy-rate variation is larger. |
| `b3` | Foreign-output-gap spillover | 0.30 | 0.30 | 0.05 – 0.60 | C | 0.10 – 0.40 | Reasonable given UZB trade openness (≈45% of GDP). Could be cross-validated with a VAR on UZB GDP vs trade-weighted partner GDP. |
| `b4` | IR weight in MCI | 0.60 | 0.60 | 0.20 – 0.85 | C | 0.50 – 0.75 | Implies real rate dominates RER channel in MCI. Reasonable for inflation-targeting EMs. |

## Phillips curve (inflation)

| Param | Role | HTML default | MATLAB | Slider range | Status | Lit range | Notes |
|---|---|---|---|---|---|---|---|
| `a1` | Backward-looking inflation share | 0.60 | 0.60 | 0.30 – 0.90 | C | 0.40 – 0.80 | "60% backward, 40% forward — below 0.7 reflects volatile inflation expectations" (`readmodel_uzb.m:35`). Plausible for a still-anchoring inflation target. |
| `a2` | Marginal cost pass-through (Phillips slope) | 0.20 | 0.20 | 0.05 – 0.50 | C | 0.05 – 0.30 | Slope of NK Phillips curve. Recent UZB inflation history shows fast pass-through; lower bound of range. |
| `a3` | Domestic cost share in RMC | 0.65 | 0.65 | 0.20 – 0.90 | C | 0.50 – 0.80 | Implies (1−a3)=0.35 of marginal cost driven by RER. Roughly matches UZB import-to-GDP ratio. |
| `a4` | **Direct quarterly import pass-through** | 0.12 | **not present** | 0.00 – 0.30 | C (HTML-only) | 0.05 – 0.20 (Campa & Goldberg 2005) | **HTML extends the MATLAB Phillips curve** with an extra term `+ a4·Δs` capturing direct import-price pass-through within one quarter. Calibration tagged to Campa-Goldberg cross-country results. To match MATLAB exactly, set `a4 = 0`. |

## Taylor rule (monetary policy)

| Param | Role | HTML default | MATLAB | Slider range | Status | Lit range | Notes |
|---|---|---|---|---|---|---|---|
| `g1` | Rate smoothing | 0.80 | 0.80 | 0.30 – 0.95 | C | 0.60 – 0.90 | "CBU cautious / gradual" (`readmodel_uzb.m:46`). Matches observed CBU behaviour 2017–2024. |
| `g2` | Inflation response | 1.50 | 1.50 | 1.00 – 3.00 | R | 1.20 – 2.00 | Standard Taylor coefficient. **Taylor Principle: must be > 1** for stability — enforced in HTML (`index.html:747`). |
| `g3` | Output-gap response | 0.50 | 0.50 | 0.10 – 1.50 | R | 0.25 – 0.75 | Standard. |

## UIP (exchange rate)

| Param | Role | HTML default | MATLAB | Slider range | Status | Lit range | Notes |
|---|---|---|---|---|---|---|---|
| `e1` | UIP backward-looking weight | 0.70 | 0.70 | 0.10 – 0.90 | C | 0.40 – 0.80 | "Higher backward component for UZS/USD" (`readmodel_uzb.m:50`). High value reflects partially-managed UZS, weak short-term arbitrage. |

## Trend persistence (AR(1) ρ-parameters — MATLAB only)

These govern trend block dynamics in the IRIS model. The HTML deviation-form solver sets all trend deviations to zero, so these parameters do not show up on the JS side at all. If the HTML model is ever extended to historical filtering, these need to be ported.

| Param | Role | MATLAB | Status |
|---|---|---|---|
| `rho_D4L_CPI_TAR` | Inflation target persistence | 0.90 | R |
| `rho_DLA_Z_BAR` | RER trend persistence | 0.80 | R |
| `rho_DLA_GDP_BAR` | Potential GDP growth persistence | 0.80 | R |
| `rho_RR_BAR` | Trend real rate persistence | 0.90 | R |
| `rho_L_GDP_RW_GAP` | Foreign output-gap persistence | 0.80 | R |
| `rho_RS_RW` | Foreign nominal rate persistence | 0.80 | R |
| `rho_DLA_CPI_RW` | Foreign inflation persistence | 0.80 | R |
| `rho_RR_RW_BAR` | Foreign real rate persistence | 0.80 | R |

## Steady-state values

| Param | Role | HTML default | MATLAB | Slider range | Status | Lit range | Notes |
|---|---|---|---|---|---|---|---|
| `ss_D4L_CPI_TAR` | Inflation target | 5.0 % | 5.0 % | 3 – 12 % | C | — | CBU medium-term target. Update to 4 % when CBU re-anchors. |
| `ss_RR_BAR` | Neutral real rate | 3.5 % | 3.5 % | 1 – 8 % | C | 1 – 4 % | At the upper end of EM neutral-rate estimates. CERR/IMF estimates: 3–4 %. |
| `ss_DLA_GDP_BAR` | Potential GDP growth | 6.0 % | 6.0 % | 2 – 10 % | C | 4 – 7 % | "New Uzbekistan structural trend" (`readmodel_uzb.m:8`). CERR/IMF: ~6 %. |
| `ss_DLA_Z_BAR` | Trend RER appreciation (Balassa-Samuelson) | — (not in HTML) | −1.0 % | — | C | −2 – 0 % | MATLAB-only. |
| `ss_DLA_CPI_RW` | Foreign trend inflation | — (not in HTML) | 2.5 % | — | C | 2 – 3 % | MATLAB-only. Trading-partner average. |
| `ss_RR_RW_BAR` | Foreign neutral real rate | — (not in HTML) | 1.0 % | — | C | 0.5 – 1.5 % | MATLAB-only. ~Fed real neutral. |

## Shock standard deviations (MATLAB Kalman calibration)

These are used by the IRIS Kalman filter to extract trends from data; HTML does not estimate any. From `a03_kalmanfilter_uzb.m:57-59`:

| Shock | MATLAB std | Purpose |
|---|---|---|
| `SHK_L_GDP_GAP` | 0.30 | Smooth output gap |
| `SHK_DLA_GDP_BAR` | 0.05 | Stable potential GDP |
| `SHK_DLA_CPI` | 0.50 | Inflation shocks |
| (others) | IRIS defaults | — |

---

## Recommendation

For Phase 2 of the validation pack, **estimate or restrict the following parameters using the historical dataset**:

1. `b1` — fit AR(1) on a Kalman-smoothed output gap from `data_q.csv` GDP.
2. `a1` — fit AR(1) on quarterly CPI inflation deviations from target.
3. `g1` — fit AR(1) on the policy rate residuals after subtracting `g2`·(π−π*) + `g3`·gap.
4. `e1` — fit a UIP regression of NER on lagged NER and the rate differential.

For `a2`, `a3`, `b2`, `b3`, `g2`, `g3` — formal estimation is harder with 41 quarters of data and large structural breaks (2017 FX liberalisation, 2022 commodity shock). **Hold at calibrated values** but report robustness bands.
