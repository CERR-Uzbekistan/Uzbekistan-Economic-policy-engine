# CGE v1 Readiness Note

## Decision

The CGE 1-2-3 model is **not yet ready to be activated in the public Scenario Lab**. The Python solver is operational and directionally useful, but its calibration and source-workbook lineage still require model-owner reconciliation.

## What is working

- The Devarajan-Go 1-2-3 structure solves with CET export transformation, CES import aggregation, and balance-of-payments closure through a flexible exchange rate.
- The current default run converges.
- Tariff and remittance shocks have the expected first-order signs.
- The solver now compares every scenario with its own exact no-shock equilibrium, so a base run reports zero scenario change.
- Automated tests verify the core accounting identities; machine-readable diagnostics expose differences between the exact solver baseline and the older rounded base constants.

## Blocking calibration finding

The previous implementation compared model results with rounded constants in `CGE_BASE_ENDOGENOUS`. Those constants do not exactly reproduce the solver's no-shock equilibrium. With default inputs, the apparent differences included approximately:

- tax revenue: `-9.1%`;
- total savings: `-8.4%`;
- investment: `+6.9%`.

These were calibration-reference differences, not policy-shock effects. Scenario changes must therefore use the exact model-implied default equilibrium. The rounded constants remain visible only as a reconciliation diagnostic.

## Source evidence available locally

- Primary workbook: `model sources/CGE model/CGE123(2021)_UZ_IMF_MAIN.xls`.
- Unfinished later workbook: `model sources/CGE model/CGE Simulation reports/CGE123(2022)_UZ_IMF_MAIN_not finished.xls`.
- Supporting analytical reports cover tariffs, remittances, investment, VAT, world prices, gold prices, and energy tariffs.
- One supporting model description says calculations began from 2018 data with later extensions, while the primary workbook name and current solver metadata claim 2021. The active data vintage must be resolved explicitly.

The primary workbooks use the legacy binary `.xls` format. The bundled auditable spreadsheet reader cannot inspect their cells or formulas. A formula-preserving `.xlsx` conversion is required before cell-level reconciliation.

## Activation gates

1. Convert the accepted primary `.xls` workbook to `.xlsx` without changing formulas, named ranges, or values.
2. Identify the exact cells/ranges for exogenous inputs, calibrated structural parameters, base endogenous accounts, closure rules, and headline outputs.
3. Reconcile the workbook base equilibrium with the Python solver and explain every difference above the agreed tolerance.
4. Obtain model-owner decisions on source vintage, normalization, government-transfer sign, foreign inflow definitions, and exchange-rate closure.
5. Add benchmark scenarios from the accepted workbook and require the Python solver to reproduce them within stated tolerances.
6. Only then generate a checked-in `cge.json` artifact, guard, adapter, Model Explorer evidence, and Scenario Lab lane.

## Public-use boundary

Until all activation gates pass, CGE must remain labelled **planned / methodology only**. Existing MCP calculations are experimental model runs and must not be presented as reviewed Uzbekistan economy-wide policy estimates.