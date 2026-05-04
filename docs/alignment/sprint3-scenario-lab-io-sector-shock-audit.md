# Sprint 3 Scenario Lab I-O Sector Shock Audit

**Date:** 2026-04-25  
**Branch:** `epic/replatform-execution`  
**Scope:** Scenario Lab I-O Sector Shock MVP.

## What Was Implemented

Scenario Lab now has a model-level tab structure:

- Macro / QPM;
- I-O Sector Shock;
- Saved Runs shell;
- disabled Synthesis Preview.

The existing Macro / QPM workflow remains the default tab and preserves the
current assumptions, run, save, results, and interpretation behavior.

The I-O Sector Shock tab now loads the validated public `/data/io.json` bridge
artifact and maps it into page-native Scenario Lab analytics before rendering.
It supports:

- final-demand shock type: consumption, government, investment, export;
- shock amount in billion UZS or million USD;
- editable UZS/USD exchange-rate assumption for USD shocks;
- distribution by output shares, GVA shares, equal sector shares, or one selected
  sector;
- Leontief inverse propagation from final demand to sector output effects;
- value-added effects using sector GVA/output coefficients;
- value-added effects labeled as an I-O accounting contribution to GDP;
- employment effects using MCP-converted sector employment arrays;
- ranked top affected sectors;
- linkage classification from the existing I-O bridge adapter;
- source caveats and an explicit boundary statement.

## Boundary Kept

The panel does not claim macro forecast effects, QPM scenario effects, fiscal
effects, inflation effects, or general-equilibrium results.

Employment effects are now available because the public I-O artifact is enriched
with `EmpTotal`, `EmpFormal`, and `EmpInformal` arrays from the MCP-converted
I-O source. The UI labels them as linear employment-intensity estimates, not
labor-market forecasts.

## Architecture Notes

Bridge-native data remains in the existing I-O bridge types/client/guard.
Scenario Lab consumes page-native analytics through:

- `apps/policy-ui/src/data/adapters/scenario-lab-io-analytics.ts`;
- `apps/policy-ui/src/data/scenario-lab/io-analytics-source.ts`;
- `apps/policy-ui/src/components/scenario-lab/IoSectorShockPanel.tsx`.
- `apps/policy-ui/scripts/enrich-io-public-artifact.mjs` enriches the public
  bridge artifact with MCP employment arrays after sector-code alignment checks.

## Tests Added

Focused coverage was added for:

- mapping public I-O bridge data into Scenario Lab analytics workspace data;
- running a final-demand shock and returning ranked sector effects;
- preserving honest employment unavailability;
- rendering controls, KPI totals, top-sector table, and non-overclaiming copy;
- rendering a non-breaking fallback when I-O analytics is unavailable.

## Deferred

- Saving I-O sector shock outputs as first-class saved runs.
- Rendering saved I-O runs in Comparison as separate sector-output blocks.
- Using richer MCP employment arrays once exported through a validated public
- Adding English/Uzbek sector labels through a validated sector-name source.
- PE/CGE/FPP tabs and synthesis execution.
