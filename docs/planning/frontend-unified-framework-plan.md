# Frontend Unified Framework Plan

**Date:** 2026-04-25  
**Scope:** Product and frontend architecture direction for the replatformed policy engine.  
**Status:** Planning baseline for continuing Sprint 3+ work without restarting the app.

## Decision

Continue the current React app and reframe it as a unified policy modeling workspace.
Do not restart the frontend. The existing Overview, Scenario Lab, Comparison,
Model Explorer, and Knowledge Hub surfaces already match the right direction.
The next step is to make their responsibilities explicit and add the missing
Data Registry and Synthesis layers in a staged way.

## Page Responsibilities

| Page | Primary job | What belongs here | What does not belong here |
|---|---|---|---|
| Overview | Decision layer | macro snapshot, risks, model readiness, quick actions into analysis | detailed model controls, full methodology, raw data management |
| Scenario Lab | Analysis workspace | model-specific shock tabs, controls, results, save-run actions | methodology-only text, unrelated data audit tables |
| Comparison | Saved-output comparison | compare saved scenario runs, preserve output-type boundaries | running new simulations, mixing sector outputs into macro rows |
| Model Explorer | Methodology and readiness | equations, data sources, calibration notes, limitations, bridge health | primary simulation workflow |
| Data Registry | Data infrastructure | sources, vintages, update status, model inputs, validation logs, bridge outputs | policy interpretation or model equations as the main content |
| Synthesis | Unified framework | cross-model shock propagation and reconciliation | early single-model experiments without a tested contract |
| Knowledge Hub | Research and policy context | literature, reforms, policy notes, citations, assumptions | model-run controls or bridge health dashboards |

## Operating Principle

```text
Overview = decision dashboard
Scenario Lab = run analysis
Comparison = compare saved outputs
Model Explorer = understand model methods and readiness
Data Registry = manage model data infrastructure
Synthesis = integrate models into one framework
Knowledge Hub = research and policy context
```

## Scenario Lab Model Tabs

Scenario Lab should become the common place where researchers run model-specific
analysis. Each tab should use controls and outputs appropriate to the model.

| Tab | Natural question | Core controls | Core outputs |
|---|---|---|---|
| Macro / QPM Scenario | What macro path follows from a policy/macro assumption set? | policy rate, fiscal impulse, exchange pressure, external demand | inflation, GDP gap, policy rate, exchange-rate path, reserves/fiscal rows where supported |
| DFM Nowcast | What does the latest indicator set imply now? | data vintage, indicator group, nowcast refresh mode | nowcast level, revisions, signal decomposition, stale/missing indicators |
| I-O Sector Shock | Which sectors transmit a final-demand shock? | demand bucket, amount, distribution, sector selector | output, value-added, employment effects, top affected sectors, linkage class |
| PE Trade Shock | What is the direct trade impact of tariff/import-price changes? | tariff, product group, partner, elasticity/scenario | import/export effects, prices, affected HS/product groups |
| CGE Reform Shock | How does a structural reform reallocate the economy? | productivity, taxes, tariffs, energy, labor/capital assumptions | welfare/GDP/sector reallocations, prices, distributional indicators where supported |
| FPP Fiscal Path | Is a fiscal path sustainable? | revenue, expenditure, financing, debt assumptions | deficit, debt, financing gap, fiscal buffers, risk flags |

## Comparison Boundary

Comparison should compare saved outputs. It should not become the place where
model simulations are run.

The existing seven macro rows remain macro rows. Sectoral I-O results should
appear in separate saved-run blocks, for example:

- total output effect;
- value-added effect;
- employment effect;
- top affected sectors;
- linkage classifications.

This preserves model meaning and avoids implying that I-O sector transmission
values are macro forecasts.

## Data Registry

The platform needs a Data Registry because the models depend on updated,
auditable data vintages. The Data Registry should eventually become a first-class
page, but it can start as a smaller Model Explorer/Data Health surface if needed.

Minimum Data Registry domains:

- data sources: GDP, CPI, trade, fiscal, employment, sector accounts, I-O table;
- model inputs: QPM inputs, DFM indicators, I-O matrices, PE trade flows, CGE SAM,
  FPP fiscal series;
- update status: last updated, stale status, missing series, validation status;
- vintages: model-input snapshots by date/quarter/year;
- bridge outputs: public JSON artifacts and validation logs.

## Synthesis Direction

Synthesis is the future integration layer. It should not be forced before each
model has a clean single-model contract and saved-run shape.

The intended chain from the legacy prototype remains the target:

```text
PE trade shock -> I-O sector propagation -> CGE economy-wide reallocation -> FPP fiscal path
```

QPM and DFM support this chain as macro consistency and nowcast layers:

- QPM: macro-policy path and consistency checks;
- DFM: current-state/nowcast evidence and data freshness.

## Implementation Order

1. Keep the current Sprint 3 I-O bridge and Model Explorer enrichment.
2. Treat the Comparison I-O evidence panel as a transitional second consumer,
   not as the final I-O analytics destination.
3. Add Scenario Lab internal tabs while preserving the existing Macro Scenario
   workflow as the default tab.
4. Implement the I-O Sector Shock tab using an MCP-aligned analytics contract.
5. Add saved-run support for I-O shock outputs.
6. Upgrade Comparison to compare saved I-O outputs in a separate sector block.
7. Add a Data Registry MVP.
8. Add Synthesis only after PE/CGE/FPP contracts are ready.

## Non-Goals For The Immediate Next Slice

- Do not restart the frontend.
- Do not merge I-O values into the existing macro comparison rows.
- Do not start PE/CGE/FPP implementation before their contracts are scoped.
- Do not imply I-O sector shocks are macro forecasts.
- Do not modify deployment workflows.
