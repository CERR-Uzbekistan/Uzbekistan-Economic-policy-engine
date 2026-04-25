# Sprint 3 Data Registry MVP Plan

**Date:** 2026-04-25  
**Scope:** Practical Sprint 3 plan for adding a first-class Data Registry page to the policy engine frontend.  
**Status:** Planning only. Do not implement code from this document until the slice is explicitly started.

## Decision

Add a read-only **Data Registry** page in Sprint 3 as the platform's data
infrastructure surface.

The MVP should show what public model data artifacts exist, what vintages they
represent, whether the frontend can validate them, and where data freshness or
model-input coverage is incomplete. It should not introduce a backend,
database, scheduler UI, manual refresh workflow, or new data governance system.

## Page Purpose

Data Registry answers operational data questions:

- Which data sources and model inputs are currently represented in the app?
- Which public bridge artifacts are available for frontend consumption?
- What source vintages and export timestamps are being used?
- Which artifacts validate successfully, fail validation, or are missing?
- Which model data domains are still planned rather than implemented?
- Where should a user look next: Scenario Lab for analysis, Model Explorer for
  methods, or Comparison for saved-output comparison?

It is not a policy interpretation page and not a methodology page.

## MVP Scope

The Sprint 3 MVP is a frontend-only, read-only page backed by current public
artifacts and existing bridge validation code.

In scope:

- route and navigation entry for Data Registry;
- artifact cards for `/data/qpm.json`, `/data/dfm.json`, and `/data/io.json`;
- validation status using existing bridge clients/guards where available;
- source vintage, export timestamp, solver/version labels, and source artifact
  labels where those fields exist;
- model-input inventory for active, staged, and planned model families;
- stale/missing warnings derived from artifact presence, guard failures, and
  timestamp thresholds;
- links or cross-references to relevant Model Explorer entries;
- browser QA for successful and failed registry states.

Out of scope for Sprint 3:

- backend registry tables;
- database migrations;
- admin editing;
- authenticated data-source management;
- manual refresh buttons that imply live regeneration;
- GitHub Actions run history UI;
- new PE, CGE, FPP, or Synthesis data contracts;
- changing the existing QPM, DFM, or I-O bridge contracts unless a guard bug is
  discovered while implementing the page.

## Route And Navigation Placement

Use:

```text
/data-registry
```

Navigation placement should follow the unified framework order:

```text
Overview
Scenario Lab
Comparison
Model Explorer
Data Registry
Knowledge Hub
```

Rationale:

- Model Explorer explains model methodology and readiness.
- Data Registry then shows the underlying data artifacts and freshness state.
- Knowledge Hub remains research and policy context, not data operations.

The Data Registry page can also be linked from Model Explorer bridge evidence
panels, but Model Explorer should not become the primary registry surface.

## Page Sections

### 1. Data Sources

Purpose: show source domains and provider/source labels at a human-readable
level.

MVP rows:

| Domain | Current status | Notes |
|---|---|---|
| Macro/QPM inputs | Active bridge artifact | Derive from `qpm.json` attribution/metadata where available. |
| DFM indicators | Active bridge artifact | Derive from `dfm.json` indicators, attribution, factor metadata, and caveats. |
| I-O table | Active bridge artifact | Derive from `io.json` metadata, source title/source, base year, framework, units, and sector count. |
| PE trade flows | Planned | Placeholder only; no Sprint 3 contract. |
| CGE SAM / reform inputs | Planned | Placeholder only; no Sprint 3 contract. |
| FPP fiscal series | Planned | Placeholder only; no Sprint 3 contract. |

The table should distinguish **source vintage** from **export timestamp**.

### 2. Model Inputs

Purpose: show which model families have consumable frontend inputs.

MVP rows:

- QPM / Macro Scenario: public bridge exists; Scenario Lab macro workflow uses
  current execution paths.
- DFM Nowcast: public bridge exists; freshness has two meanings, nightly JSON
  regeneration and upstream EM refit timestamp.
- I-O Sector Shock: public bridge exists and is consumed by Scenario Lab I-O
  analytics; employment effects are available only because the public artifact
  has been enriched and validated.
- PE Trade Shock: planned/disabled model tab; no data input contract yet.
- CGE Reform Shock: planned/disabled model tab; no data input contract yet.
- FPP Fiscal Path: planned/disabled model tab; no data input contract yet.

Avoid displaying planned rows as failures. They should be marked **planned**,
not **missing**, unless the UI expected an implemented artifact and could not
load it.

### 3. Bridge Outputs

Purpose: list public frontend artifacts and their validation state.

MVP artifact cards:

| Artifact | Model area | Derivable MVP fields |
|---|---|---|
| `/data/qpm.json` | Macro / QPM | attribution, run id, data version, timestamp, scenarios/outputs supported by existing guard and adapter. |
| `/data/dfm.json` | DFM nowcast | attribution, current quarter, indicators count, factor status, caveats, metadata export/source timestamps. |
| `/data/io.json` | I-O sector analytics | attribution, sectors count, matrices presence, totals, metadata source/framework/units/base year, caveats. |

Each card should show:

- load status: loaded, missing, validation failed, or unavailable;
- data vintage;
- export timestamp;
- source artifact/source title where present;
- caveat count and highest caveat severity where present;
- consumer surfaces: Overview, Scenario Lab, Comparison, Model Explorer.

Do not use Data Registry to emit page-native `ComparisonContent` or scenario
results. It should display bridge evidence and validation state only.

### 4. Vintages

Purpose: make model-input snapshots visible without implying live source
management.

MVP vintage treatment:

- QPM: use `ModelAttribution.data_version` and `timestamp`.
- DFM: show both JSON export timestamp and upstream source-artifact refit
  timestamp when `metadata.source_artifact_exported_at` is present.
- I-O: show source table vintage (`data_version`/base year 2022) separately
  from deterministic export timestamp.
- Saved runs: do not make saved browser-session runs the primary registry
  source, but the page may mention that Scenario Lab saved runs preserve their
  own data vintage and source artifact labels.

Required copy boundary:

> Source vintage and export timestamp are different. A current export can still
> contain an older source table.

### 5. Validation And Update Status

Purpose: expose frontend trust state.

MVP statuses:

- **Valid:** artifact loaded and passed the existing guard.
- **Warning:** artifact loaded but caveats or stale thresholds indicate user
  attention is needed.
- **Failed:** artifact was fetched but failed guard validation.
- **Missing:** expected Sprint 3 artifact was not found or could not be fetched.
- **Planned:** model family has no Sprint 3 artifact by design.

Use current bridge clients/guards as the authority:

- `qpm-client` / `qpm-guard`;
- `dfm-client` / `dfm-guard`;
- `io-client` / `io-guard`.

Update status should be conservative:

- show `exported_at`/`timestamp` values;
- show "manual/workflow status unavailable in frontend" if no public artifact
  carries regeneration status;
- do not claim that scheduled freshness is active unless the artifact or current
  deployment documentation proves it.

### 6. Stale And Missing Warnings

Purpose: surface actionable data health issues without inventing monitoring.

MVP warning rules:

- DFM JSON export older than 48 hours: show a visible stale warning.
- DFM JSON export older than 7 days: escalate to a higher-severity caveat-style
  warning.
- I-O source vintage older than current year is not automatically stale because
  the official I-O table is a base-year structural dataset; label it as
  **base-year vintage** rather than **stale**.
- Missing QPM/DFM/I-O public artifact: show missing implemented artifact.
- Failed QPM/DFM/I-O guard: show validation failed and list path-level issues if
  the guard exposes them.
- PE/CGE/FPP absence: show planned, not missing.
- Unknown provider update cadence: show cadence unavailable, not stale.

Do not add warning rules that require a backend, registry database, or external
API call.

## What Can Be Derived From Current Public Artifacts

The MVP can derive:

- artifact existence for `/data/qpm.json`, `/data/dfm.json`, and `/data/io.json`;
- model attribution fields: model id/name, module, version, run id, data
  version, timestamp;
- DFM nowcast current quarter, history, indicators count/categories, factor
  convergence fields, caveats, and metadata timestamps;
- I-O source title/source, framework, units, base year, sector count, matrix
  presence, totals presence, caveats, and linkage/sector evidence already used
  by Model Explorer and Comparison;
- validation pass/fail state from existing guards;
- consumer mapping from existing app architecture:
  - Overview consumes QPM/DFM-style headline and chart outputs;
  - Scenario Lab consumes QPM and I-O analytics;
  - Comparison consumes saved macro runs and saved I-O sector runs separately;
  - Model Explorer consumes model catalog and bridge evidence.

## What Must Remain Mock Or Planned

Keep these clearly marked as planned, unavailable, or future work:

- PE trade-flow source inventory;
- CGE SAM source inventory;
- FPP fiscal source inventory;
- Synthesis cross-model propagation inputs;
- backend validation logs;
- scheduler run history;
- provider API health;
- manual refresh/update actions;
- editable source ownership metadata;
- multilingual I-O sector label reconciliation;
- Type II I-O multipliers;
- full data lineage beyond what public artifact metadata already exposes.

Avoid placeholder numbers for planned domains. Use plain planned-state labels
and short explanatory copy.

## Relationship To Model Explorer

Model Explorer remains the model-methodology and readiness page.

Data Registry should complement it:

- Model Explorer: equations, parameters, caveats, data-source notes,
  validation summaries, and model-specific bridge evidence.
- Data Registry: cross-model inventory of data sources, model inputs, bridge
  artifacts, vintages, validation status, update status, and stale/missing
  warnings.

Recommended interaction:

- Data Registry rows can link to the relevant Model Explorer model detail.
- Model Explorer bridge evidence can link to Data Registry for full artifact
  context.
- Duplicate only compact facts that help orientation; do not copy full
  methodology, equations, or validation prose into Data Registry.

## What Not To Implement In Sprint 3

Do not implement:

- a registry backend or database;
- a CRUD interface for data sources;
- upload/import workflows;
- source credential management;
- workflow dispatch buttons;
- live GitHub Actions status polling;
- new model computations;
- PE/CGE/FPP data contracts;
- Synthesis execution;
- registry-driven saved-run migration;
- automatic artifact regeneration;
- broad refactors of bridge contracts or Scenario Lab saved-run storage.

## Implementation Steps

1. Add route and navigation.
   - Add `/data-registry`.
   - Place Data Registry after Model Explorer in the main nav.
   - Add page title and concise intro copy focused on data infrastructure.

2. Create a small registry data composer.
   - Load QPM, DFM, and I-O through existing bridge clients.
   - Normalize load results into a registry-specific view model.
   - Preserve model-specific validation errors rather than flattening them into
     generic messages.

3. Build page sections.
   - Summary status strip: valid, warning, failed, missing, planned counts.
   - Data sources table.
   - Model inputs table.
   - Bridge outputs cards.
   - Vintages panel.
   - Validation/update status panel.
   - Stale/missing warnings panel.

4. Wire status rules.
   - Implement DFM 48-hour and 7-day stale thresholds.
   - Treat I-O 2022 as base-year vintage, not automatically stale.
   - Treat PE/CGE/FPP as planned.
   - Show missing/failed only for artifacts expected in Sprint 3.

5. Add links to related surfaces.
   - Link QPM/DFM/I-O rows to Model Explorer where matching entries exist.
   - Link I-O consumer status to Scenario Lab and Comparison only as consumer
     references, not as data owners.

6. Add focused tests.
   - Composer tests for valid, missing, failed, stale, and planned states.
   - Rendering tests for each required section.
   - Route/nav smoke test.
   - Regression test that planned PE/CGE/FPP rows are not reported as failed.

7. Run verification.
   - `npm test`
   - `npm run lint`
   - `npm run build`
   - Browser QA listed below.

## Tests And Browser QA Required

Automated tests:

- route renders the Data Registry page;
- nav includes Data Registry in the intended order;
- valid QPM/DFM/I-O fixtures produce valid registry cards;
- missing artifact state renders without crashing;
- guard failure state shows validation failed;
- DFM stale thresholds work at 48 hours and 7 days;
- I-O 2022 source table is labelled as base-year vintage, not stale;
- PE/CGE/FPP planned rows render as planned;
- no registry data is merged into Comparison macro rows.

Browser QA:

- open `/data-registry`;
- verify all required sections are visible at desktop and mobile widths;
- verify QPM, DFM, and I-O artifact cards render with vintage/export facts;
- verify planned PE/CGE/FPP rows are visibly planned, not broken;
- verify links to Model Explorer and consumer pages work;
- verify a simulated missing/failed artifact state is understandable;
- verify no console errors;
- verify nav layout does not wrap or overlap on mobile;
- verify the page remains read-only and has no misleading refresh/update action.

## STOP Conditions

Stop implementation and reassess if any of these occur:

- the page requires a backend, database, or authenticated admin workflow to meet
  the accepted MVP;
- QPM, DFM, or I-O guard behavior must be changed in a way that affects existing
  Overview, Scenario Lab, Comparison, or Model Explorer behavior;
- the implementation needs to invent PE/CGE/FPP data fields rather than marking
  them planned;
- stale/update status cannot be derived from public artifact metadata without
  misleading users;
- the registry starts duplicating Model Explorer methodology content instead of
  linking to it;
- Data Registry changes cause saved-run or Comparison macro-row regressions;
- browser QA shows overlapping layout, unreadable mobile tables, or console
  errors that cannot be fixed inside the planned frontend-only slice;
- any proposed action implies live data regeneration or workflow dispatch without
  an implemented and verified operations contract.
