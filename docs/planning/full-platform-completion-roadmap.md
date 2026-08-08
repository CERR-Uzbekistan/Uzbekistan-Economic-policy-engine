# Full-Platform Completion Roadmap

Date: 2026-04-27  
Branch posture: `epic/replatform-execution` remains the internal-preview branch  
Status: practical completion roadmap; no implementation authorized by this document

## 1. Current Platform State

The React policy UI is a coherent internal-preview platform, not yet a pilot-ready or production/data-platform release. Sprint 3 completed the internal-preview release candidate, and Sprint 4 completed the foundation trust/state label pass. The current goal should be to finish the platform through bounded slices that preserve model contracts, data-state honesty, and deployment discipline.

### Already Working

- Unified workspace with Overview, Scenario Lab, Comparison, Model Explorer, Data Registry, and Knowledge Hub.
- Overview decision dashboard with conservative provenance and trust/state labels.
- Scenario Lab Macro / QPM workflow and I-O Sector Shock workflow.
- Scenario Lab local run/save behavior for supported internal-preview runs.
- Comparison view that keeps macro saved outputs and I-O sector saved outputs separate.
- Model Explorer methodology/readiness surface with I-O bridge evidence.
- Data Registry MVP showing implemented QPM, DFM, and I-O artifacts plus planned PE, CGE, and FPP rows.
- Knowledge Hub as a static internal-preview research/context surface with visible static-content/source-review warnings.
- Shared trust/state vocabulary applied across major surfaces for mock fixtures, live bridge JSON, fallback mock state, local browser drafts, planned lanes, guard validation, source vintage, artifact export, and registry generation.
- Local app gates recorded as passed for Sprint 3 internal preview: lint, tests, production build with accepted Vite large-chunk warning, and local browser QA.

### Preview-Only

- `epic/replatform-execution` is an internal-preview sidecar branch, not the stable `main` branch.
- Saved runs are browser-session/local-storage behavior, not server-side persistence.
- Data Registry is frontend-only and read-only.
- Knowledge Hub content is static curated preview content, not a governed source workflow.
- Hosted `/policy-ui/` behavior remains a required release-control gate until smoke results are recorded for the selected candidate.
- RU/UZ terminology is still under human-review gate before broader pilot-facing use.

### Mock, Static, Or Planned

- Overview and Comparison can still use mock/fallback states when bridge data is unavailable.
- Knowledge Hub content remains static and lightly sourced; it is not a content pipeline.
- PE Trade Shock, CGE Reform Shock, FPP Fiscal Path, and Synthesis are planned lanes only.
- DFM Nowcast tab and high-frequency indicator dashboard are not implemented as full analytical workflows.
- Data Registry v2, backend/database architecture, source ownership, scheduler status, and governance workflows are planned.
- Server-side saved scenarios, evaluator sessions, and pilot observation capture are planned/deferred.

### Must Not Be Claimed Yet

- Do not claim pilot-ready, production-ready, public launch, or broad public validation.
- Do not claim the hosted deployment passed before the hosted smoke checklist is completed.
- Do not claim `main` merge readiness before the slice ledger, hosted smoke, final CI, release-claim check, and owner acceptance are recorded.
- Do not claim QPM/DFM freshness warnings are resolved.
- Do not claim I-O sector localization is complete across EN/RU/UZ.
- Do not claim Data Registry is a live governance system, backend registry, scheduler, source-management UI, or economic validation layer.
- Do not claim PE, CGE, FPP, or Synthesis are implemented.
- Do not describe I-O sector transmission effects as macro forecasts, causal policy effects, or general-equilibrium results.

## 2. Definition Of Full Complete

### Milestone A: Internal Preview Complete

Status: mostly complete, pending release-control evidence for merge readiness.

Complete means:

- Six core surfaces are usable for internal workflow/trust review.
- QPM, DFM, and I-O public artifacts are visible and guarded where currently wired.
- Scenario Lab supports Macro/QPM and I-O internal-preview workflows.
- Comparison preserves model-native saved-output boundaries.
- Data Registry MVP exposes implemented/planned model-data status.
- Trust/state labels are consistent enough to prevent overclaims.
- Local lint, tests, build, and browser QA are recorded.
- Hosted `/policy-ui/` smoke, final CI, and slice-review ledger are recorded before any `main` promotion.

### Milestone B: Pilot-Ready Complete

Complete means:

- Hosted `/policy-ui/` smoke passes on the selected SHA.
- Named evaluator roster is confirmed.
- Human RU/UZ terminology review is complete for navigation, model labels, provenance, caveats, and pilot-facing sector/model wording.
- Pilot observation workflow exists and is ready to capture evaluator feedback.
- Data Registry v2 clearly separates source vintage, export timestamp, frontend guard validation, model readiness, freshness, and planned states.
- Knowledge Hub has a minimum source/citation schema and approved static content set.
- Server-side persistence is either implemented for pilot sessions or explicitly deferred with clear local-only disclosure.
- Any P0/P1 hosted, pilot, language, or release-control findings are resolved or explicitly blocked from pilot scope.

### Milestone C: Institution-Ready Complete

Complete means:

- Authentication/roles and server-side scenario persistence are implemented if institutional users need shared, auditable runs.
- Backend/database architecture supports saved scenarios, source metadata, artifact registry records, evaluator feedback, and content/source review records.
- Data governance workflow exists for source ownership, vintages, validation logs, stale-state rules, and review status.
- Knowledge Hub content has a repeatable source workflow with citation, date/vintage, language status, related model, caveats, and reviewer metadata.
- High-frequency indicators and nowcasting dashboard are backed by explicit source cadence and artifact contracts.
- PE Trade Shock, CGE Reform Shock, and FPP Fiscal Path have accepted model/data contracts before active tabs are exposed.
- Cross-model synthesis rules are documented and tested against saved model-native outputs.
- Accessibility, responsive, performance, and i18n checks move beyond smoke coverage.

### Milestone D: Production/Data-Platform Complete

Complete means:

- Scheduled data refresh and/or explicit manual operations exist with observable run history.
- Backend registry/database is the authority for artifact metadata, source ownership, validation status, and governance events.
- Data artifacts have versioned contracts, automated validation, rollback/previous-vintage access, and freshness alerts.
- Server-side scenarios have audit trails, user/session ownership, export/share behavior, and retention policy.
- Model tabs are contract-backed and tested end to end.
- Synthesis layer can reconcile PE -> I-O -> CGE -> FPP outputs without flattening model meaning.
- Deployment, CI, smoke, release notes, rollback plan, and post-release validation are routine.
- Public or institutional claims are limited to what the data/model/review process actually validates.

## 3. Remaining Workstreams

### High-Frequency Indicators / Nowcasting Dashboard

Goal: make current-state evidence useful without pretending a live DFM refresh pipeline exists.

Needed:

- Indicator groups: prices, exchange market, trade, fiscal, activity, labor, credit/financial, and external conditions.
- Source inventory with cadence, owner, language, vintage, and reliability.
- Static artifact contract for the first MVP if live refresh is not approved.
- UI relationship to Overview and a future DFM Nowcast tab.
- Clear stale/missing rules and caveats.

STOP if the slice needs invented data, unapproved external APIs, hidden manual refresh, or claims of live nowcasting.

### Data Registry V2 And Data Governance

Goal: turn the MVP inventory into the platform spine for data state and model readiness.

Needed:

- Separate source vintage, export timestamp, frontend guard validation, model readiness, freshness, ownership, and review state.
- Registry rows for QPM, DFM, I-O, high-frequency indicators, PE, CGE, FPP, and Synthesis inputs.
- Owner/source placeholders only where governance semantics are accepted.
- Guard wording that keeps frontend artifact validation separate from economic/model validation.
- Backend-ready schema thinking, even if the first implementation remains frontend-only.

STOP if Registry v2 implies scheduler controls, backend authority, source CRUD, or economic validation before those systems exist.

### Backend/Database Architecture

Goal: design the smallest backend foundation that can support persistence and governance without forcing a premature platform rewrite.

Needed:

- Entity model for users/roles, scenario runs, saved comparisons, data artifacts, source records, validation events, Knowledge Hub notes, review events, and pilot observations.
- Decision on backend stack and deployment constraints.
- Migration path from local saved runs and static artifacts.
- API boundaries for read-only public data, authenticated saved runs, registry records, and content workflow.
- Security, audit, backup, and retention expectations.

STOP if architecture design starts rewriting the frontend or adding production auth/database work before the owner accepts the contract.

### Server-Side Scenario Persistence

Goal: move from browser-local saved runs to auditable, shareable saved scenarios.

Needed:

- Canonical saved-run shape for `qpm_macro`, `io_sector_shock`, future `dfm_nowcast`, `pe_trade_shock`, `cge_reform_shock`, and `fpp_fiscal_path`.
- Server IDs, timestamps, user/session ownership, source vintage, caveats, and model version.
- Migration or coexistence plan for current local-only drafts.
- Comparison consumption of server-backed runs while preserving model-native output blocks.

STOP if persistence erases local-only disclosure before the server path is actually working.

### Knowledge Hub Source Workflow

Goal: prevent Knowledge Hub from becoming unsourced policy prose.

Needed:

- Content schema for literature note, reform note, model assumption note, source note, and methodology explainer.
- Required metadata: title, summary, source/citation, date/vintage, language status, related model, caveat, reviewer, and status.
- Storage decision: JSON/markdown first, backend/CMS later.
- RU/UZ review hooks before pilot-facing claims.

STOP if content expansion outruns source/citation and review metadata.

### PE Trade Shock Tab

Goal: implement the first trade-policy model lane once its contract exists.

Needed:

- Trade-flow source contract, product/HS grouping, partner scope, tariff/import-price assumptions, elasticity assumptions, units, and caveats.
- Result shape for import/export effects, price/direct incidence, affected product groups, and handoff potential to I-O.
- Saved-run shape and Comparison block.

STOP if the tab requires placeholder trade data, invented elasticities, or claims beyond partial-equilibrium direct effects.

### CGE Reform Shock Tab

Goal: expose economy-wide structural reform simulations only after a SAM/model contract is accepted.

Needed:

- SAM/source contract, base year, closure rules, calibration, reform controls, welfare/output/price/distribution outputs, and caveats.
- Clear relationship to I-O and PE results without pretending automatic synthesis.

STOP if CGE is reduced to a decorative tab or static generic claims without a model contract.

### FPP Fiscal Path Tab

Goal: support fiscal sustainability analysis with transparent assumptions.

Needed:

- Fiscal series contract, debt/revenue/expenditure/financing assumptions, risk flags, units, and source cadence.
- Result shape for deficit, debt, financing gap, buffers, and sensitivity cases.
- Relationship to QPM macro assumptions and future synthesis.

STOP if the tab cannot distinguish assumptions from official forecasts or validated fiscal projections.

### Cross-Model Synthesis Layer

Goal: reconcile model-native outputs into the intended PE -> I-O -> CGE -> FPP chain.

Needed:

- Accepted contracts for the participating model outputs.
- Handoff definitions and conversion rules.
- Reconciliation/caveat layer that preserves model boundaries.
- Saved synthesis run shape.

STOP if Synthesis starts before PE/CGE/FPP contracts exist or if it merges outputs into a single false precision score.

### RU/UZ Terminology Review

Goal: make pilot-facing language reliable.

Needed:

- Human review of navigation, model labels, trust/state labels, caveats, provenance, registry states, and sector/model terminology.
- Specific review of I-O Russian sector labels and EN/UZ reconciliation.
- Issue log with accepted terms and unresolved translation risks.

STOP if terminology affects task completion or model meaning and no reviewer is assigned.

### Pilot/Evaluator Workflow

Goal: move from internal preview to structured evaluator review.

Needed:

- Named evaluator roster.
- Hosted smoke complete before sessions.
- Observation capture format and severity categories.
- Task script covering Overview, Scenario Lab, Comparison, Model Explorer, Data Registry, Knowledge Hub, language switch, and saved-run behavior.
- Clear distinction between pilot feedback and production validation.

STOP if pilot sessions are used to claim public readiness.

### Deployment/Main Merge/Release Hygiene

Goal: promote safely when approved, without mixing feature expansion into release control.

Needed:

- Complete Sprint 3 slice review ledger.
- Hosted `/policy-ui/` smoke on final candidate.
- Final CI on selected SHA.
- Exclude unrelated untracked local artifacts.
- Confirm release claims do not say pilot-ready, production-ready, public launch, or complete RU/UZ review.
- Preserve legacy root behavior and React sidecar path.

STOP if merge becomes an unreviewed mega-PR or includes new model/back-end scope.

## 4. Recommended Execution Order

1. Data Registry v2 and governance semantics.
2. Backend/database architecture decision, limited to design and contracts.
3. Server-side scenario persistence contract, then implementation after backend acceptance.
4. High-frequency indicators MVP with static artifact contract and nowcasting dashboard surface.
5. Knowledge Hub source workflow and pilot-safe content schema.
6. Pilot/evaluator workflow and RU/UZ terminology review.
7. PE Trade Shock tab contract and implementation.
8. CGE Reform Shock and FPP Fiscal Path contracts and implementation.
9. Cross-model synthesis after PE/I-O/CGE/FPP saved-run contracts are stable.
10. Main merge/release hygiene when owner chooses to promote the sidecar; keep it separate from feature expansion.

Rationale: Data Registry v2 and backend architecture are the foundation for trust, governance, persistence, and high-frequency data. The next model tabs are valuable, but implementing them before data/source contracts creates misleading surface area. Synthesis should wait until model-native outputs exist and are stable.

## 5. Fast-Track Bundles

### Bundle 1: Data Registry V2 Governance Spine

Goal: upgrade Data Registry from MVP inventory to a clearer data-health and readiness surface.

Scope:

- Separate source vintage, export timestamp, frontend guard validation, freshness, model readiness, owner/source, and review state.
- Add rows/placeholders for high-frequency indicators and future PE/CGE/FPP/Synthesis inputs without marking them failed.
- Keep implementation frontend-only unless backend architecture has already been approved.

Likely touched:

- `docs/planning/sprint-3-data-registry-mvp-plan.md`
- `docs/planning/full-platform-completion-roadmap.md`
- `apps/policy-ui/src/pages/DataRegistry*`
- `apps/policy-ui/src/data/registry*`
- bridge guard/client tests for registry composer behavior

Tests needed:

- Registry composer states: valid, warning, stale, missing, failed, planned, source-vintage, export-timestamp.
- Rendering tests for planned rows not appearing as failed.
- Browser smoke desktop/mobile.

STOP conditions:

- Requires backend tables, scheduler controls, admin source editing, or live refresh.
- Requires changing QPM/DFM/I-O contracts beyond guard bug fixes.
- Labels guard validation as economic validation.

Expected risk: medium. The concept is clear, but status language can easily overclaim.

Path: full path if implemented; lightweight if kept as a doc/schema pass.

### Bundle 2: Backend And Persistence Architecture Contract

Goal: define the minimum backend/database architecture before any server persistence or governance implementation.

Scope:

- Entity model and API boundaries for users, scenario runs, comparisons, artifacts, sources, validation events, Knowledge Hub notes, review events, and pilot observations.
- Choose stack direction and deployment assumptions.
- Define migration/coexistence with local saved runs.

Likely touched:

- new `docs/planning/backend-database-architecture-plan.md`
- new `docs/planning/server-side-scenario-persistence-plan.md`
- possibly `docs/data-bridge/*` only for references, not contract changes

Tests needed:

- None for planning-only.
- If prototyped later: API contract tests, migration tests, persistence/retrieval tests, authorization tests.

STOP conditions:

- Owner has not accepted backend scope.
- Design requires rewriting the frontend before value is proven.
- Auth/security assumptions are unclear.

Expected risk: medium-high. Backend choices shape the rest of the platform.

Path: lightweight first; full path only after architecture approval.

### Bundle 3: High-Frequency Indicators MVP

Goal: add a useful nowcasting/data-freshness surface without claiming live refresh.

Scope:

- Source inventory and static artifact contract for initial indicator groups.
- Dashboard surface connected to Overview and/or future DFM Nowcast tab.
- Freshness and missing-data warnings.
- Clear distinction between current static artifact, DFM refit timestamp, and any future scheduled refresh.

Likely touched:

- new `docs/data-bridge/05_high_frequency_indicators_contract.md`
- new `docs/planning/high-frequency-indicators-mvp-plan.md`
- `apps/policy-ui/public/data/*` only if an approved static artifact is available
- `apps/policy-ui/src/data/bridge/*`
- Overview/Scenario Lab DFM Nowcast surface depending on chosen placement

Tests needed:

- Guard tests for indicator artifact.
- Dashboard rendering tests for fresh, stale, missing, and partial indicator groups.
- Browser smoke for Overview/DFM placement and mobile layout.

STOP conditions:

- No approved source inventory or artifact.
- UI implies live API connectivity, automatic refresh, or fresh DFM refit without evidence.
- Indicator values require manual copy/paste without provenance.

Expected risk: medium. High product value, but freshness claims are fragile.

Path: lightweight first if only concept/source inventory; full path if artifact and UI are implemented.

### Bundle 4: Knowledge Hub Source Workflow

Goal: make content expansion safe and reviewable.

Scope:

- Content schema, status labels, source/citation metadata, language status, reviewer fields, and content type taxonomy.
- First approved internal-preview content set.
- Keep separate from Model Explorer methodology and Data Registry operations.

Likely touched:

- new `docs/planning/knowledge-hub-source-workflow-plan.md`
- Knowledge Hub static data files/components
- i18n strings if pilot-facing labels change

Tests needed:

- Rendering tests for source metadata and static-content warning.
- Schema validation if content moves to JSON/markdown.
- RU/UZ review checklist before pilot.

STOP conditions:

- Notes lack source/citation or date/vintage.
- Content makes policy claims beyond model/source evidence.

Expected risk: low-medium.

Path: lightweight first; full path if schema-backed content is implemented.

### Bundle 5: PE Trade Shock Contract And MVP Tab

Goal: implement partial-equilibrium trade shock analysis after contract acceptance.

Scope:

- Trade-flow contract, elasticity assumptions, product/partner controls, direct effects, caveats, saved-run shape, Comparison block.
- Keep PE outputs separate from I-O, CGE, FPP, and macro forecasts unless a handoff is explicitly implemented.

Likely touched:

- new `docs/data-bridge/06_pe_trade_shock_contract.md`
- `docs/planning/scenario-lab-model-tabs-plan.md`
- Scenario Lab PE tab components/composers
- saved-run and Comparison model-type renderers

Tests needed:

- Contract/guard tests.
- Tab control/result rendering tests.
- Saved-run and Comparison block tests.

STOP conditions:

- No trade-flow data contract.
- Elasticities are invented or undocumented.
- UI claims economy-wide or fiscal effects.

Expected risk: high.

Path: full path only after contract approval.

### Bundle 6: CGE And FPP Contract Pair

Goal: scope the two downstream model lanes before UI implementation.

Scope:

- CGE SAM/model contract, closure assumptions, reform controls, result shape.
- FPP fiscal series contract, fiscal path controls, result shape.
- Saved-run schemas for both.

Likely touched:

- new `docs/data-bridge/07_cge_reform_shock_contract.md`
- new `docs/data-bridge/08_fpp_fiscal_path_contract.md`
- `docs/planning/scenario-lab-model-tabs-plan.md`

Tests needed:

- Planning review first.
- Later guard/composer tests after artifacts exist.

STOP conditions:

- No accepted SAM/fiscal source.
- Model assumptions cannot be explained in pilot-facing language.

Expected risk: high.

Path: lightweight contract path first.

### Bundle 7: Server-Side Scenario Persistence

Goal: replace or supplement local-only saved runs with auditable server-backed saved scenarios.

Scope:

- Persistence API, database tables, run ownership, run versions, source vintage, caveats, comparison membership, and migration/coexistence from local saved runs.

Likely touched:

- backend app/database files after stack decision
- `apps/policy-ui/src/state/*` or saved-run storage modules
- Scenario Lab and Comparison persistence adapters
- docs for local-only/server-backed state labels

Tests needed:

- Save/read/update/delete or archive tests, depending on accepted workflow.
- Frontend integration tests for server-backed and local-only states.
- Authorization and audit tests if auth exists.

STOP conditions:

- Backend architecture is not approved.
- Security/ownership assumptions are unresolved.
- Server persistence breaks existing local internal-preview flows.

Expected risk: high.

Path: full path only after Bundle 2.

### Bundle 8: Synthesis Planning And Later MVP

Goal: define and eventually implement cross-model propagation only after model-native outputs are stable.

Scope:

- Handoff definitions for PE -> I-O -> CGE -> FPP.
- Reconciliation rules, caveats, saved synthesis run shape, and comparison view.

Likely touched:

- new `docs/planning/cross-model-synthesis-plan.md`
- future Synthesis page/tab components
- saved-run schema and Comparison renderers

Tests needed:

- Contract tests for accepted handoff shapes.
- Rendering tests for preserving model boundaries.
- Regression test that synthesis does not overwrite model-native outputs.

STOP conditions:

- PE/CGE/FPP contracts are not accepted.
- Synthesis requires placeholder model outputs.
- Results collapse into a false single score.

Expected risk: high.

Path: lightweight planning now; full path later.

## 6. First Three Bundles In Detail

### Next Bundle 1: Data Registry V2 Governance Spine

Do next:

1. Write or update a Data Registry v2 implementation brief that defines the canonical status vocabulary and row model.
2. Treat Registry v2 as the source of truth for platform-facing data state labels, but keep it frontend-only for the first slice.
3. Implement only data states derivable from current artifacts: QPM, DFM, I-O, high-frequency planned, PE planned, CGE planned, FPP planned, Synthesis planned.
4. Add explicit copy that frontend guard validation is artifact-shape validation, not economic/model validation.
5. Add tests for stale, warning, missing, failed, planned, and base-year vintage states.

Expected output:

- A clearer Data Registry page that can support pilot trust review and later backend migration.
- No backend, no scheduler, no live refresh, no new model calculations.

### Next Bundle 2: Backend/Database Architecture Contract

Do next:

1. Create a backend/database architecture plan before implementation.
2. Define entities and ownership for scenario runs, comparisons, artifacts, sources, validation events, Knowledge Hub notes, review events, and pilot observations.
3. Decide which parts must exist before pilot and which can wait until institution-ready.
4. Define how local saved runs coexist with or migrate to server-backed runs.
5. Record security, audit, retention, and deployment assumptions.

Expected output:

- An accepted architecture contract that prevents ad hoc persistence work.
- A clear decision on when server-side scenario persistence should start.

### Next Bundle 3: High-Frequency Indicators MVP

Do next:

1. Write a high-frequency indicators contract before UI work.
2. Choose the smallest useful indicator set: prices, exchange market, trade, fiscal, activity, and external conditions.
3. Define source, cadence, latest observation date, artifact export timestamp, missing-data behavior, and caveats for each group.
4. Decide placement: Overview current-state panel first, then DFM Nowcast tab later.
5. Implement only after an artifact/source inventory exists.

Expected output:

- A product-valuable nowcasting dashboard that improves current-state usefulness without pretending the DFM refit or live refresh pipeline is complete.

## 7. Explicit Non-Goals

- Do not merge `epic/replatform-execution` to `main` as part of this roadmap.
- Do not implement code in this roadmap pass.
- Do not start PE, CGE, FPP, or Synthesis implementation before accepted data/model contracts.
- Do not start backend/database implementation before architecture is accepted.
- Do not add live refresh, scheduler buttons, source CRUD, or admin workflows to Data Registry without an operations contract.
- Do not remove local-only saved-run disclosures before server persistence exists.
- Do not broaden Knowledge Hub content before source/citation and review metadata exist.
- Do not claim high-frequency indicators are live, automatically refreshed, or DFM-refit-backed unless the pipeline proves it.
- Do not treat planned PE/CGE/FPP/Synthesis rows as missing or failed.
- Do not mix I-O sector outputs into macro comparison rows.
- Do not use pilot feedback, hosted smoke, or internal preview as public validation.
- Do not bundle release hygiene, backend work, new model tabs, and synthesis into one mega-slice.

## 8. Final Recommendation

The next implementation should start with **Data Registry v2**, not the next model tab, synthesis planning, or backend/database implementation.

Reason:

- It has the strongest dependency leverage: it clarifies data state, model readiness, freshness, source vintage, and planned lanes before the platform adds more analytical breadth.
- It directly supports high-frequency indicators, backend governance, Knowledge Hub sourcing, and pilot trust review.
- It can be implemented without overclaiming live data, server persistence, or new model capabilities.
- It reduces the risk that PE/CGE/FPP/Synthesis tabs become attractive but weak placeholders.

Recommended immediate path:

1. Implement Data Registry v2 as the governance spine.
2. Write the backend/database architecture contract immediately after or in parallel as a planning artifact.
3. Start the high-frequency indicators MVP only after its source inventory and static artifact contract are accepted.

