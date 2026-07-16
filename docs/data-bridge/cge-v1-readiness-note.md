# CGE v1 Readiness Note

## Decision

The Python CGE solver is now **formula-reconciled with the primary 2021 source workbook**, including one independently saved 2021 energy-price experiment. It is still **not approved for the public Scenario Lab**. The remaining gates are model-owner decisions about the accepted source vintage, closure interpretation, and policy benchmark set.

## Source material inspected

Primary source:

- `model sources/CGE model/CGE123(2021)_UZ_IMF_MAIN.xls`

Supporting variants:

- `CGE123_2021_21.12.2023.xls` (energy-price experiment);
- `CGE123_2021_28.01.2024.xls` (investment experiments);
- `CGE123_2021_gold_price.xls`;
- `CGE123(2022)_UZ_IMF_MAIN_not finished.xls`.

Source fingerprints:

- primary workbook SHA-256: `8F2B5D75E19D89318FA73EB8E84136DFD9F8DCB0D896B57718F81E9073482904`;
- energy benchmark SHA-256: `EF0096EBE52C90EC268CB7E75A498EE6A2BECD281387275B4D683F1F70B869EC`.

The legacy files were converted to formula-preserving `.xlsx` working copies for inspection. The conversions are audit intermediates only; source workbooks were not modified or committed.

## What the workbook audit found

The primary workbook contains three different states:

1. formula-derived base cells on `1-2-3 Model`;
2. older saved Solver reports and the `All` summary;
3. cached scenario cells from a prior run.

They are not mutually consistent. For example, the current exogenous scenario column raises government consumption by 3.5%, while its cached endogenous scenario cells reproduce an older import-price experiment. The saved `All` base also uses a different price normalization and earlier calibration. These saved/cached cells are excluded from benchmark evidence.

The primary workbook's cached investment base is `0.355902`, but its accepted savings and price equations imply:

```text
investment Z = aggregate savings S / sales price Pt
             = 0.4210094996 / 1.0647223378
             = 0.3954171756
```

The solver and exact base reference now use the formula-derived value.

## Equation reconciliation

The previous Python port did not reproduce several workbook equations. The corrected port now uses:

| Account | Accepted workbook equation |
|---|---|
| Export price | `Pe = Er * we / (1 + te)` |
| Import price | `Pm = Er * wm * (1 + tm)` |
| Output price | `Px = (Pe * E + Pd * Ds) / X` |
| Composite price | `Pq = (Pm * M + Pd * Dd) / Qs` |
| Sales price | `Pt = Pq * (1 + ts)` |
| Income | `Y = Px * X + tr * Pq + re * Er` |
| Tax revenue | `TAX = tm*wm*Er*M + te*Pe*E + ts*Pq*Qd + ty*Y` |
| Government saving | `Sg = TAX - G*Pt - tr*Pq + ft*Er` |
| Aggregate saving | `S = sy*Y + Er*B + Sg` |
| Consumption | `Cn = Y*(1-ty-sy)/Pt` |
| Investment | `Z = S/Pt` |
| Current account | `wm*M - we*E - ft - re = B` |

The CET export and CES Armington equations and calibrated structural parameters are taken directly from the primary workbook formulas.

## Price normalization and closure

The source workbook fixes `Er = 1` and solves for the domestic-good price `Pd`. The Python service fixes `Pd = 1` and solves for `Er`. These are equivalent numeraires:

- real quantities are unchanged;
- all nominal prices and values differ only by the same common scaling factor;
- the returned `Er` is a normalized relative-price index, not the observed UZS/USD exchange rate.

Other closures:

- foreign saving `B` is fixed;
- government saving `Sg` adjusts;
- investment is savings-driven;
- total output `X` is fixed in the 1-2-3 model.

## Reconciled base

The no-shock solver reproduces the formula-derived 2021 base within `0.001%`. Core reference values include:

| Variable | Reconciled value |
|---|---:|
| Exports `E` | 0.2559126 |
| Imports `M` | 0.4397460 |
| Domestic good `Ds=Dd` | 0.7440874 |
| Composite good `Qs=Qd` | 1.1838334 |
| Income `Y` | 1.1014404 |
| Consumption `Cn` | 0.6126321 |
| Saving `S` | 0.4210095 |
| Investment `Z` | 0.3954172 |
| Tax revenue `TAX` | 0.1164151 |
| Government saving `Sg` | -0.0342951 |

All domestic-market, composite-market, current-account, and government-budget residuals are tested below `1e-8`.

## Workbook benchmark

The 21 December 2023 energy workbook raises the world import-price index from `0.9840983` to `1.0656990`. Under equivalent normalization, the Python solver reproduces its saved scenario:

| Variable | Workbook | Python tolerance |
|---|---:|---:|
| Exports | 0.2585946 | 0.000002 |
| Imports | 0.4085912 | 0.000002 |
| Domestic good | 0.7413784 | 0.000002 |
| Composite good | 1.1490382 | 0.000002 |
| Consumption | 0.5936978 | 0.000002 |
| Investment | 0.3795563 | 0.000002 |

The workbook's `Price Effect (Pf)` label is not referenced by any accepted equation. The API retains it only for compatibility and rejects values other than `1.0` rather than implying a false productivity channel.

## What is now working

- Exact structural and exogenous calibration values replace rounded approximations.
- No-shock changes are exactly zero relative to the solver baseline.
- Formula-derived base accounts reconcile.
- A consistent workbook scenario is locked by an automated benchmark test.
- Solver output states the closure and numeraire.
- Invalid domains, inactive `Pf` shocks, missing brackets, and false convergence are rejected.
- Accounting residuals are returned and tested.

## Remaining activation gates

1. A model owner must approve the primary 2021 workbook as the accepted vintage.
2. A model owner must approve the fixed-foreign-saving, savings-driven closure and the equivalent Python numeraire.
3. Government transfer sign and foreign inflow definitions must be confirmed against source documentation.
4. At least two additional policy scenarios must be selected from internally consistent workbooks and accepted as benchmarks.
5. The public product must describe `Er` as a relative-price index, never as a nominal UZS/USD forecast.
6. Only after these decisions should the team generate a checked-in `cge.json` artifact and activate CGE in Model Explorer or Scenario Lab.

## Public-use boundary

Until the activation gates pass, CGE remains **planned / methodology only** in the public application. MCP results are experimental comparative-static calculations, not reviewed economy-wide policy estimates or forecasts.
