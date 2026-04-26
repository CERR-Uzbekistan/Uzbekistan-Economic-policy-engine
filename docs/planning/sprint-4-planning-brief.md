# Sprint 4 Planning Brief

Date: 2026-04-26  
Source state: Sprint 3 internal preview release candidate  
Status: planning brief; do not treat as implementation authorization

## 1. Current Product State

The React policy UI is an internal preview release candidate for workflow and trust review. Sprint 3 closed with clean local app gates: lint passed, tests passed, production build passed with the accepted Vite large-chunk warning, and local browser QA passed across Overview, Scenario Lab, Comparison, Model Explorer, Data Registry, and Knowledge Hub.

The current surface is not pilot-ready. Named pilot evaluator sessions are deferred, hosted `/policy-ui/` smoke verification remains a gate, and human RU/UZ terminology review is still required before broader evaluator use. The branch also is not ready for a casual merge to `main`; the slice-based review ledger in the Sprint 3 main-merge plan remains the controlling path.

Product posture:

| Area | Current state | Sprint 4 implication |
|---|---|---|
| Overview | Decision dashboard with conservative provenance labels. | Preserve claim discipline; reduce inconsistent state labels. |
| Scenario Lab | Macro/QPM, I-O Sector Shock, and Saved Runs are actionable; PE/CGE/FPP/Synthesis are planned lanes. | Improve trust/context labeling before adding model breadth. |
| Comparison | Macro deltas and saved I-O sector evidence are separated. | Preserve model-native output boundaries. |
| Model Explorer | Method/readiness page with I-O bridge evidence. | Keep methodology separate from registry operations. |
| Data Registry | Read-only MVP showing implemented/planned artifacts and warnings. | Plan v2 around scanability, freshness semantics, and source ownership. |
| Knowledge Hub | Research/context surface. | Needs a static-content and source plan before content expansion. |
| Deployment/main | Hosted smoke and slice review are not complete. | Treat merge preparation as its own workstream, not a side effect. |

## 2. What Sprint 3 Achieved

Sprint 3 turned the replatform branch into a coherent internal preview candidate.

- Established the unified workspace shape: Overview, Scenario Lab, Comparison, Model Explorer, Data Registry, and Knowledge Hub.
- Added I-O as a visible second analytical model path without mixing I-O accounting effects into macro forecast rows.
- Made I-O bridge evidence visible in Model Explorer, including source artifact, 2022 vintage, 136-sector scope, Leontief framework, linkage classes, and caveats.
- Added Scenario Lab I-O run/save flow and Comparison saved I-O add flow.
- Added Data Registry MVP visibility for QPM, DFM, I-O implemented rows and PE, CGE, FPP planned rows.
- Added local-only saved-run disclosure and clarified that saved runs are browser-session/local storage, not server persistence.
- Tightened claim labels, context strips, chart descriptions, unit language, and model-lane separation after internal-preview UX clarification.
- Completed prototype/data-viz alignment review for the internal preview surface.
- Produced merge-control guidance requiring slice review before `main`.

## 3. What Remains Intentionally Not Claimed

Sprint 4 planning should preserve these boundaries unless an owner explicitly changes the release strategy.

- No claim that Sprint 3 is pilot-ready.
- No claim that named evaluator review has started or completed.
- No claim that hosted deployment has passed until the hosted smoke checklist is complete.
- No claim that RU/UZ terminology quality is complete before human review.
- No claim that QPM/DFM freshness warnings are resolved.
- No claim that I-O sector localization is complete.
- No claim that PE, CGE, FPP, or Synthesis are implemented.
- No claim that I-O sector transmission effects are macro forecasts or general-equilibrium results.
- No claim that Data Registry is a live data-governance system, scheduler, backend registry, or source-management UI.
- No claim that the branch can merge to `main` without slice acceptance.
- No claim that the app is validated for broad public use.

## 4. Sprint 4 Goals

Sprint 4 should be a readiness and decision sprint, not a broad feature sprint.

Primary goals:

1. Make trust, state, caveat, and provenance labels consistent across the internal-preview workspace.
2. Define and, if authorized later, implement Data Registry v2 as a clearer operational data-health surface.
3. Create a Knowledge Hub static-content and source plan before expanding research or policy notes.
4. Decide the next model-integration direction using explicit criteria: PE, deeper I-O, or DFM/QPM improvement.
5. Define a lightweight high-frequency indicators concept without pretending a DFM refresh pipeline exists.
6. Prepare the branch for possible main merge through slice review, hosted smoke, and claim control.

Success means Sprint 4 ends with fewer ambiguous states and a clearer next model path. It should not end with partially implemented PE/CGE/FPP/Synthesis lanes.

## 5. Candidate Workstreams

### A. Trust/State Label Consistency

Purpose: make model state, data state, storage state, and claim type readable and consistent.

Candidate scope:

- Normalize labels for `active`, `implemented`, `planned`, `disabled`, `warning`, `valid`, `missing`, `failed`, `local-only`, and `source vintage`.
- Align copy across Overview KPI pills, Scenario Lab context strips, Comparison saved-run sections, Model Explorer bridge evidence, and Data Registry rows.
- Keep trust labels visually quieter while preserving warning visibility.
- Confirm that planned PE/CGE/FPP/Synthesis lanes never read as broken or available.

Decision needed: choose a controlled vocabulary and decide whether it lives as a short planning doc first or goes straight into a UI copy/constants slice.

### B. Data Registry v2

Purpose: move from MVP inventory to a clearer data-health and artifact-readiness surface.

Candidate scope:

- Separate source vintage, artifact export timestamp, frontend validation, and model readiness.
- Improve scanability of QPM, DFM, I-O, and planned model rows.
- Clarify that guard validation is artifact-shape validation, not economic validation.
- Add owner/source placeholders only if they are true governance fields; otherwise label owner unknown/unavailable.
- Plan or implement status rules for DFM freshness, QPM artifact state, I-O base-year vintage, and planned PE/CGE/FPP rows.

Decision needed: Data Registry v2 should remain frontend-only unless a backend/data-ops contract is explicitly approved.

### C. Knowledge Hub Static-Content/Source Plan

Purpose: prevent Knowledge Hub from becoming unsourced policy prose.

Candidate scope:

- Define content types: literature note, reform note, model assumption note, source note, and methodology explainer.
- Define required fields: title, summary, source/citation, date/vintage, language status, related model, and caveat.
- Decide whether content is hardcoded, JSON-backed, markdown-backed, or later CMS-backed.
- Identify which Sprint 4 content is allowed as static internal-preview content.
- Keep Knowledge Hub separate from Model Explorer methods and Data Registry operations.

Decision needed: choose the first content storage format and minimum citation/source standard.

### D. High-Frequency Indicators Concept

Purpose: define a useful concept for nowcast/data freshness without building a fake live pipeline.

Candidate scope:

- Identify candidate indicator groups: prices, exchange market, trade, fiscal, activity, labor, external conditions.
- Define what can be static now versus what requires upstream data refresh.
- Specify how high-frequency indicators relate to DFM nowcast and Overview decision signals.
- Document freshness, source, and language requirements.
- Avoid building dashboards that imply live API connectivity or automatic refresh.

Decision needed: concept-only in Sprint 4 unless the data source, refresh cadence, and artifact contract are approved.

### E. Next Model Integration Decision

Purpose: pick one next analytical direction instead of expanding all planned lanes.

Options:

| Option | Why choose it | Main risk | Best Sprint 4 outcome |
|---|---|---|---|
| PE trade shock | Advances the intended PE -> I-O -> CGE -> FPP chain. | Needs trade-flow contract, elasticity assumptions, and product/partner scope. | Decision memo and data contract; maybe UI shell only if contract is ready. |
| Deeper I-O | Builds on the current I-O artifact and user-facing analytics. | Can overstate sector accounting as policy causality if not caveated. | Better sector evidence, localization plan, contribution/ranking clarity. |
| DFM/QPM improvement | Improves core macro trust and current-state usefulness. | May require artifact freshness or model refresh work beyond frontend. | Freshness plan, clearer nowcast/QPM provenance, targeted artifact improvements. |

Recommended default: choose deeper I-O or DFM/QPM improvement before PE unless PE has a ready data contract and owner. PE is strategically important, but starting it without contract clarity risks creating another planned lane with misleading surface area.

### F. Possible Main-Merge Preparation

Purpose: prepare `epic/replatform-execution` for review without treating merge as automatic.

Candidate scope:

- Complete the slice review ledger for deployment/base-path, bridge foundation, I-O analytics, saved-run workflow, trust/content/i18n, and Data Registry.
- Run or record hosted smoke under `/policy-ui/`.
- Confirm final CI on the selected merge candidate.
- Reconcile release-candidate claims after any Sprint 4 planning or implementation slices.
- Keep named evaluator pilot readiness separate unless the owner explicitly makes it a merge gate.

Decision needed: decide whether Sprint 4 includes merge preparation only, or whether it attempts the final merge after slice acceptance.

## 6. Recommended Sprint 4 Priority Order

1. Trust/state label consistency.
2. Main-merge preparation gate review and hosted smoke planning.
3. Data Registry v2 scope and first implementation slice, if authorized.
4. Next model integration decision memo.
5. Knowledge Hub static-content/source plan.
6. High-frequency indicators concept.
7. Optional implementation only after the above decisions are recorded.

Rationale: trust/state consistency and merge readiness protect the internal preview surface. Data Registry v2 is the most direct operational improvement. The next model decision should happen before any PE/CGE/FPP/Synthesis UI expansion.

## 7. Lightweight vs Full-Path Classification

| Workstream | Lightweight path | Full path | Recommended Sprint 4 classification |
|---|---|---|---|
| Trust/state labels | Vocabulary, copy alignment, visual weight pass. | Cross-app state taxonomy, tests, browser QA, i18n review. | Start lightweight; promote to full if labels touch shared components. |
| Data Registry v2 | Planning doc and scanability/copy improvements. | New view model, tests, warning rules, responsive QA. | Full path if implemented; lightweight if only scoped. |
| Knowledge Hub plan | Static schema/source plan. | Content pipeline, multilingual content review, citation QA. | Lightweight planning only. |
| High-frequency indicators | Concept note and source inventory. | Data contract, artifact generation, DFM integration, freshness UI. | Lightweight concept only. |
| Next model decision | Decision memo with criteria and owner. | Contract, fixtures, UI, tests, QA for selected model. | Lightweight decision only unless a contract is ready. |
| Main-merge preparation | Ledger fill-in and checklist review. | Hosted smoke, CI, owner approvals, final PR/merge. | Full path only if merge is actively pursued. |

## 8. Dependencies and STOP Conditions

Dependencies:

- Hosted `/policy-ui/` smoke result for deployment confidence.
- Owner decision on whether Sprint 4 is allowed to include any implementation.
- Human RU/UZ terminology review before pilot-facing evaluator claims.
- Named evaluator roster before pilot review resumes.
- Data/source owner for any high-frequency indicator or PE trade work.
- Explicit model contract before implementing PE, deeper DFM, CGE, FPP, or Synthesis behavior.
- Slice reviewers for any main-merge preparation.

STOP conditions:

- A workstream requires backend registry tables, scheduler controls, authenticated source management, or live refresh operations without an approved operations contract.
- A proposed model lane needs invented data fields, placeholder calculations, or fake bridge outputs.
- PE/CGE/FPP/Synthesis starts as UI implementation before its model/data contract is agreed.
- Trust copy starts claiming pilot readiness, production readiness, public validation, or main-merge readiness.
- Data Registry labels planned assets as failures or implemented assets as economically validated based only on frontend guard success.
- I-O output is merged into macro comparison rows or described as a macro forecast/general-equilibrium effect.
- Main merge is attempted before slice ledger, CI, hosted smoke, and release-claim review are complete.
- RU/UZ terminology issues affect navigation, task completion, or pilot-facing model meaning and no human reviewer is assigned.

## 9. Suggested First Three Implementation Slices

These are suggested only if Sprint 4 moves from planning into implementation.

### Slice 1: Trust/State Vocabulary and Copy Alignment

Deliverable:

- One shared vocabulary for model availability, artifact validation, freshness, storage, and claim type.
- Apply it to Overview, Scenario Lab, Comparison, Model Explorer, and Data Registry labels where wording is inconsistent.
- Preserve all existing caveats and warnings.

Verification:

- Focused tests only where labels are asserted today.
- Browser smoke for Overview, Scenario Lab, Comparison saved I-O, Model Explorer evidence, and Data Registry.

### Slice 2: Data Registry v2 Scanability

Deliverable:

- Clearer separation of source vintage, export timestamp, validation state, and model readiness.
- More scannable tables/cards for QPM, DFM, I-O, and planned PE/CGE/FPP rows.
- Explicit caveat that frontend guard validation is not economic/model validation.

Verification:

- Composer/rendering tests for valid, warning, missing/failed, stale, base-year, and planned states.
- Browser smoke at desktop and mobile widths.

### Slice 3: Next Model Decision Memo and Contract Stub

Deliverable:

- Decision memo choosing PE, deeper I-O, or DFM/QPM improvement.
- If PE is selected, define data fields, assumptions, scope, and disallowed claims before UI work.
- If deeper I-O is selected, define localization, contribution/ranking, and caveat improvements.
- If DFM/QPM is selected, define freshness/artifact and provenance improvements.

Verification:

- Planning review only unless implementation is authorized.
- No new active tab or model output without contract acceptance.

## 10. Explicit Non-Goals

- Do not implement app code as part of creating this planning package.
- Do not start PE, CGE, FPP, or Synthesis implementation without a model/data contract.
- Do not add named evaluator sessions to Sprint 4 by implication; they remain deferred until explicitly resumed.
- Do not treat internal preview as pilot-ready.
- Do not treat hosted smoke as passed until it is actually completed.
- Do not replace the legacy root experience as part of Sprint 4 planning.
- Do not add a backend, database, scheduler, admin workflow, upload flow, or live refresh button for Data Registry.
- Do not claim live high-frequency data, automated freshness, or DFM refresh unless the artifact pipeline proves it.
- Do not broaden Knowledge Hub content without source/citation rules.
- Do not remove warnings, caveats, provenance, or local-only saved-run disclosures to simplify the UI.
- Do not merge to `main` casually or as an unreviewed mega-PR.
