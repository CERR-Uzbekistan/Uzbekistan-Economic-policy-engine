# Scenario Lab Model Tabs Plan

**Date:** 2026-04-25  
**Scope:** Frontend structure for model-specific Scenario Lab analytics.

## Decision

Scenario Lab should become a tabbed analysis workspace. The current page remains
the default **Macro / QPM Scenario** tab. New model tabs should be added
incrementally, starting with **I-O Sector Shock**.

## Proposed Tabs

```text
Scenario Lab
  Macro / QPM Scenario
  DFM Nowcast
  I-O Sector Shock
  PE Trade Shock
  CGE Reform Shock
  FPP Fiscal Path
  Saved Runs
  Synthesis Preview
```

Not every tab needs to be fully implemented at once. Tabs can be staged:

- active: Macro / QPM Scenario;
- next active: I-O Sector Shock;
- planned/disabled: DFM, PE, CGE, FPP, Synthesis Preview;
- supporting: Saved Runs.

## Shared Tab Pattern

Each model tab should follow the same high-level workflow:

1. choose assumptions/shock inputs;
2. run or update the model output;
3. inspect model-native results;
4. read caveats and source/data vintage;
5. save the run;
6. send saved runs to Comparison.

## I-O Sector Shock MVP

The first analytical expansion should be I-O because the MCP server already has
an analytical shape for sector demand shocks.

### Controls

- demand bucket: consumption, government, investment, export;
- shock amount in billion UZS;
- distribution mode: output, GVA, equal, or sector-specific;
- optional sector selector by sector code/name;
- run/reset actions.

### Results

- total output effect;
- total value-added effect;
- employment effect;
- top affected sectors;
- sector-level output, value-added, employment effects;
- linkage class where available;
- source vintage and caveats.

### Copy Boundary

The tab must state that I-O results are sector transmission effects from a
Leontief final-demand shock. It must not describe the output as a macro forecast,
QPM scenario effect, or economy-wide general-equilibrium result.

## Saved Runs

Saved runs should preserve model-native output shape. Comparison can then render
the appropriate block by run type.

Initial saved-run model types:

```text
qpm_macro
io_sector_shock
dfm_nowcast
pe_trade_shock
cge_reform_shock
fpp_fiscal_path
```

## Comparison Hand-Off

When a user saves an I-O run, Comparison should receive a saved-run summary with:

- run id and title;
- model type `io_sector_shock`;
- shock definition;
- data vintage;
- total output/value-added/employment effects;
- top affected sector rows.

Comparison should show this in a separate sector-output section, not inside the
macro delta table.

## Staging

1. Add tab shell and keep Macro / QPM default.
2. Add I-O Sector Shock tab with local/public bridge data.
3. Add saved-run shape for I-O.
4. Add Comparison rendering for saved I-O output blocks.
5. Add Data Registry status references.
6. Add other model tabs only after their contracts are scoped.
