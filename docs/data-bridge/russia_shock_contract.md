# Russia Shock Prototype Contract

**Status:** Prototype, evidence-informed but not estimated or approved for production policy use.
**Producer:** `mcp_server/models/russia_shock.py`
**Inputs:** `mcp_server/data/russia_shock_scenarios.yaml`, `mcp_server/data/russia_shock_policies.yaml`, existing CGE/QPM/I-O model modules.

## Purpose

The Russia shock module maps remittance, migration, trade, fuel, payment-friction, risk-premium, and policy primitives into the existing Uzbekistan Economic Policy Engine model blocks. It produces scenario results for policy discussion without imposing GDP, inflation, exchange-rate depreciation, unemployment, fiscal loss, or banking stress as direct scenario assumptions.

## Output Files

`write_outputs(...)` writes:

- `result.json` full structured result
- `summary.csv` one-row headline indicators
- `sector_outputs.csv` top I-O sector effects
- `household_outputs.csv` synthetic household group impacts
- `external_balance.csv` balance-of-payments pressure components
- `fiscal_outputs.csv` fiscal satellite estimates
- `banking_stress.csv` banking satellite indices
- `summary.md` readable summary

## Key Caveats

- Russia partner splits beyond the memo figures are placeholders.
- Household and poverty estimates use synthetic groups, not official household microdata.
- Banking stress is an index satellite, not a bank balance-sheet model.
- China swap support reduces a proxy for China-linked USD import demand; it is not counted as USD reserve creation.
- The module is suitable for transparent prototype comparisons, not official forecasting.
- Channel confidence and evidence notes are attached to every structured result under `evidence.channel_calibration`.
- The fiscal trade-related revenue loss is a simple export-shock satellite proxy, not an import-tax or tax-microsimulation result.
- Custom calibration values control remittance exposure, migrant base, GDP scaling, and unemployment calculations; hidden model constants must not override them.
