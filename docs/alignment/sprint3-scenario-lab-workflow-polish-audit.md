# Sprint 3 Scenario Lab Workflow Polish Audit

**Date:** 2026-04-25  
**Branch:** `epic/replatform-execution`  
**Scope:** Saved-run workflow, I-O run clarity, model-tab readiness, and Comparison hand-off polish.

## Implemented

- Scenario Lab Saved Runs now acts as a unified saved-output index with filters for All, Macro/QPM, and I-O runs.
- Saved-run cards show model type, saved timestamp, data vintage, source vintage/source artifact where available, and model-native key outputs.
- Macro saved runs keep load and delete behavior; I-O runs keep delete behavior and remain model-native.
- Saved runs can hand off to Comparison through router state, avoiding URL/query route hacks.
- I-O Sector Shock now shows a compact run summary with demand bucket, amount/currency, USD FX assumption when relevant, distribution mode, selected sector for single-sector mode, and data vintage.
- I-O copy continues to state the boundary: sector transmission only, value-added as I-O accounting contribution to GDP, and employment as a linear employment-intensity estimate.
- PE Trade Shock, CGE Reform Shock, and FPP Fiscal Path now have planned/disabled placeholders with expected inputs, expected outputs, and integration boundaries. No PE/CGE/FPP computation was implemented.
- Comparison continues to keep saved I-O runs outside the seven macro rows and now shows a clearer empty/add state when saved I-O runs exist but have not been selected.

## Boundary Kept

- I-O saved runs are not merged into the macro Comparison table.
- The macro Comparison table remains the existing seven macro rows.
- PE, CGE, and FPP tabs are readiness placeholders only.
- Deployment workflows were not changed.

## Tests Added Or Updated

- Saved Runs filter helper coverage for All, Macro/QPM, and I-O.
- Saved Runs render coverage for model type, timestamps, vintages, key outputs, and Comparison actions.
- I-O panel coverage for run summary and employment boundary copy.
- Model tab coverage for planned PE/CGE/FPP placeholders.
- Comparison saved I-O panel coverage for the empty/add prompt.
