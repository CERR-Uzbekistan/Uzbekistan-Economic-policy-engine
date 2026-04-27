# Contract Index And Implementation Readiness Map

Date: 2026-04-27  
Branch verified: `epic/replatform-execution`  
Candidate SHA verified: `efb889f`
Status: index/map only; source contracts remain authoritative

No code implementation is currently allowed on any listed gated workstream. Permitted next actions are updates to existing authoritative docs, gate clearing, owner decisions, source-owner outreach, and contract acceptance only.

Operational preview gate: passing after commit `efb889f`.

Operational-preview planning freeze: no new planning, contract, or readiness documents for gated workstreams in this operational-preview phase. Existing contracts are frozen. Implementation resumes only when the named owner signals the gate has cleared, and then work should proceed directly into code, not another planning document.

## One-Line Readiness Summary

- HFI: gated - pending source owner/license confirmations - forbidden: create `/data/hfi_snapshot.json`
- FPP: gated - pending final workbook freeze/signoff - forbidden: frontend integration
- PE: gated - pending accepted implementation gate - forbidden: PE artifact or `pe_data.js` regeneration
- CGE: gated - pending accepted implementation gate - forbidden: active-preview implementation
- Knowledge Hub: gated - current implementation is pending-only; internal-preview route has mock content hidden - next: accept source/citation schema and reviewer model - forbidden: backend/API CRUD or external citation
- Backend artifact registry: gated - pending operations/fallback acceptance - forbidden: FastAPI/Postgres implementation
- Registry API/static fallback adapter: gated - next: owner acceptance of API/static precedence and source-state labels - forbidden: frontend API wiring
- Data Registry: implemented - next: preserve static/read-only registry semantics and update source docs with contract changes - forbidden: backend authority, scheduler status, or source CRUD claims
- I-O: implemented - next: contract acceptance for any stronger analytics/saved-run scope - forbidden: macro forecast, causal policy, or general-equilibrium claims
- QPM/DFM: implemented - next: maintain static bridge/freshness disclosures - forbidden: API ownership switch or freshness override without owner acceptance
- Main merge readiness: gated - next: complete slice ledger, hosted smoke, final CI, and owner acceptance - forbidden: main merge with new model/backend scope

## Status Vocabulary

Use exactly these mutually exclusive statuses:

- `draft`
- `accepted`
- `gated`
- `cleared`
- `implemented`

Do not use `conditional`. If something has conditions, status = `gated` and the gates are listed.

## Source-Of-Truth Rule

This index points to contracts; it does not restate or supersede them.

If a contract changes, this index must be updated in the same commit.

STOP conditions must be quoted or line-referenced from source contracts where possible.

## Workstream Blocks

### HFI

- Status: `gated`
- Last verified: 2026-04-27 on `epic/replatform-execution` at `efb889f`
- Source-of-truth doc path: `docs/data-bridge/06_hfi_contract.md`
- Supporting docs: `docs/planning/hfi-source-inventory.md`, `docs/planning/hfi-source-owner-outreach.md`, `docs/planning/hfi-static-pilot-artifact-gate.md`
- Current implementation status: planning/source inventory only; no HFI artifact, frontend wiring, backend storage, scheduler, DFM refit, or Data Registry promotion is authorized.
- Blocking STOP conditions: `docs/data-bridge/06_hfi_contract.md:319` says stop before adding HFI code, data files, backend tables, API endpoints, charts, Overview panels, or dashboards; `docs/data-bridge/06_hfi_contract.md:322-339` list unresolved source access, cadence/lag, owner assignment, `/data/hfi_snapshot.json` schema acceptance, Data Registry vocabulary review, stale/missing rules, licensing/usage restrictions, backend/fallback acceptance, invented data, mock `/data/` HFI, and live-refresh/model-forecast claims. `docs/planning/hfi-source-inventory.md:151-161` also blocks row promotion, shortlist artifacts, and implementation until ownership, license/access, DFM-overlap, no-FPP-values, no-composite, no-mock, vintage, stale/missing, display rights, and no backend/frontend/scheduler/Data Registry implementation are resolved.
- Blocks / blocked-by: blocks HFI artifact, HFI Overview/Data Registry display, HFI backend/API/storage, and any HFI-derived model claims; blocked by source-owner confirmations, inventory row acceptance, Data Registry vocabulary acceptance, backend ops/fallback acceptance if API/storage is proposed, and RU/UZ review.
- Next allowed action: continue source-owner outreach and write accepted answers back to `docs/planning/hfi-source-inventory.md`.
- Next forbidden action: create `/data/hfi_snapshot.json`, HFI frontend/backend code, mock HFI data, composite index, heat score, traffic-light aggregate, dashboard light, or DFM refit/backfill path.
- Owner decision needed: HFI source-inventory owner/source owner: "For each internal-preview indicator, who is the accountable source owner, what license/access and display rights apply, and what vintage/stale/missing rule is accepted in writing?"

### FPP

- Status: `gated`
- Last verified: 2026-04-27 on `epic/replatform-execution` at `efb889f`
- Source-of-truth doc path: `docs/data-bridge/07_fpp_contract.md`
- Supporting docs: `docs/planning/fpp-implementation-gate-clearing.md`, `docs/planning/backend-operations-contract.md`, `docs/planning/registry-api-fallback-adapter.md`
- Current implementation status: planning/gate-clearing only; no FPP artifact, frontend implementation, backend implementation, Scenario Lab activation, or Data Registry promotion is authorized.
- Blocking STOP conditions: `docs/data-bridge/07_fpp_contract.md:250-262` says any one missing means STOP and includes workbook freeze/sheet map, workbook owner/license/redistribution, authority table, Data Registry entry shape, simulator schema acceptance, backend operations + fallback contracts, and output catalogue acceptance. `docs/planning/fpp-implementation-gate-clearing.md:90-100` says no FPP implementation may start until all blocking gates are accepted and no backend reads/writes, app code, artifact generation, Scenario Lab activation, Data Registry promotion, Comparison integration, or push is authorized.
- Blocks / blocked-by: blocks FPP static artifact, FPP Scenario Lab tab, FPP backend, FPP Data Registry promotion, and FPP Comparison integration; blocked by the 11 FPP gate checklist, backend ops/fallback owner acceptance, FPP workbook/source owner acceptance, caveat review, authority table acceptance, parity/identity tests, and output catalogue acceptance.
- Next allowed action: clear Gate 1 by confirming canonical `unified-v1` workbook file/location, frozen snapshot id/date/hash, owner, and sheet/range map.
- Next forbidden action: begin FPP frontend integration, generate `/data/fpp_baseline.json`, implement FastAPI/database support for FPP, or activate FPP in Scenario Lab/Data Registry/Comparison.
- Owner decision needed: FPP workbook owner: "What exact `unified-v1` workbook file/location, snapshot id/date/hash, and sheet/range map are accepted as canonical for future FPP export?"

### PE

- Status: `gated`
- Last verified: 2026-04-27 on `epic/replatform-execution` at `efb889f`
- Source-of-truth doc path: `docs/data-bridge/08_pe_contract.md`
- Current implementation status: planning contract only; no PE artifact, frontend implementation, backend implementation, live refresh, or `pe_data.js` regeneration is authorized.
- Blocking STOP conditions: `docs/data-bridge/08_pe_contract.md:292-309` says any one missing means STOP and includes WITS vintage/owner/license, `pe_data.js` provenance/version pin, HS coverage reconciliation, authority table, output catalogue, Data Registry shape, simulator schema acceptance, backend operations + fallback acceptance, and Comparison-table boundary acceptance. `docs/data-bridge/08_pe_contract.md:346` says no PE frontend implementation, backend implementation, artifact generation, `pe_data.js` regeneration, HFI overlap, or push is authorized by the contract.
- Blocks / blocked-by: blocks PE artifact, PE Scenario Lab tab, PE backend, PE comparison block, and PE Data Registry promotion; blocked by WITS/source freeze, owner/license acceptance, source script provenance, coverage reconciliation, authority acceptance, identity/parity tests, caveats, backend/fallback acceptance, and comparison boundary acceptance.
- Next allowed action: freeze WITS/source vintage and document owner/license/provenance for `pe_data.js`.
- Next forbidden action: generate `/data/pe_baseline.json`, regenerate `pe_data.js`, wire PE frontend/backend code, or include PE in the macro Comparison table.
- Owner decision needed: PE model/data owner: "What frozen WITS/source vintage, `pe_data.js` source script/input set, HS coverage scope, and license/redistribution class are accepted?"

### CGE

- Status: `gated`
- Last verified: 2026-04-27 on `epic/replatform-execution` at `efb889f`
- Source-of-truth doc path: none accepted for operational-preview implementation; legacy folder `cge_model/` remains reference/simulator only.
- Current implementation status: deferred; no active-preview CGE implementation, bridge artifact, backend integration, Scenario Lab activation, Data Registry promotion, or legacy-folder promotion is authorized.
- Blocking STOP conditions: no accepted CGE contract/readiness gate exists for active-preview implementation, and operational-preview planning freeze blocks creating another planning/contract/readiness document in this phase.
- Blocks / blocked-by: blocks CGE active-preview code, artifacts, backend/API wiring, and release claims; blocked by named owner gate clearance and accepted implementation authority.
- Next allowed action: wait for the named owner to signal that the CGE gate has cleared.
- Next forbidden action: implement CGE in `apps/policy-ui`, generate CGE bridge artifacts, promote `cge_model/` as active preview product, or create another CGE planning/readiness document.
- Owner decision needed: CGE owner: "Has the CGE active-preview implementation gate cleared, and what exact implementation authority replaces the current deferred status?"

### Knowledge Hub

- Status: `gated`
- Last verified: 2026-04-27 on `epic/replatform-execution` at `efb889f`
- Source-of-truth doc path: `docs/data-bridge/09_knowledge_hub_contract.md`
- Current implementation status: Knowledge Hub remains route-visible but pending-only for the operational internal preview; seeded static reform/brief/literature content is hidden behind the shared pending surface. Governed source/citation workflow, backend/API source records, external citation, live ingest, and CRUD remain gated.
- Blocking STOP conditions: `docs/data-bridge/09_knowledge_hub_contract.md:405-426` says stop before app code, backend work, API wiring, CRUD, live ingest, content expansion, external citation, or export if schema governance, AI governance binding, source/citation lineage, reform-status authority, model-ref whitelist, citation scope, correction/takedown, RU/UZ review, reviewer sign-off, static/legal-currentness caveats, and read-only API/static fallback acceptance remain unresolved. `docs/data-bridge/09_knowledge_hub_contract.md:121-125` blocks external citation/export of AI-drafted content without reviewed/accepted source state and actual reviewer sign-off.
- Blocks / blocked-by: blocks Knowledge Hub backend/API CRUD, source records, external citation/export, live ingest, and content expansion; blocked by source/citation schema acceptance, AI governance binding, reviewer-of-record model, RU/UZ review process, model-ref whitelist, and backend ops/fallback acceptance before API work.
- Next allowed action: accept the source/citation schema, reviewer-of-record process, and static/legal-currentness caveat model.
- Next forbidden action: implement Knowledge Hub API wiring, backend CRUD, live ingest, external citation/export, or broaden content without item-level lineage and review.
- Owner decision needed: Knowledge Hub content owner/reviewer-of-record: "Who signs off each item class, what citation permission/license class applies, and which items are accepted for external citation versus internal-only preview?"

### Backend Artifact Registry

- Status: `gated`
- Last verified: 2026-04-27 on `epic/replatform-execution` at `efb889f`
- Source-of-truth doc path: `docs/planning/backend-database-architecture-plan.md`
- Supporting docs: `docs/planning/backend-operations-contract.md`, `docs/planning/registry-api-fallback-adapter.md`
- Current implementation status: architecture plan only; no backend implementation, database migrations, FastAPI skeleton, or Postgres schema is authorized.
- Blocking STOP conditions: `docs/planning/backend-database-architecture-plan.md:449-463` blocks backend implementation until operations/fallback contracts, deploy target, operational owner, Postgres host, auth for writes, server-side saved-run decision, artifact registry semantics, HFI/Knowledge Hub contract status, retention/audit expectations, static `/data/*.json` compatibility, and planned-lane handling are accepted. `docs/planning/backend-operations-contract.md:285-299` blocks backend code until the operations contract, fallback adapter, deploy target, ops owner, secrets path, CI/deploy split, backup/restore, retention, ingestion auth, first-backend scope, frontend dependency, and static-app fallback are accepted.
- Blocks / blocked-by: blocks artifact registry API, validation logs, source records, server-side saved runs, Knowledge Hub source records, and HFI storage/API; blocked by backend operations acceptance, registry fallback adapter acceptance, architecture acceptance, named ops owner, host/Postgres choice, secrets/backup/retention/auth decisions.
- Next allowed action: accept backend operations and fallback contracts, then record backend artifact registry architecture owner decisions.
- Next forbidden action: implement FastAPI, database migrations, Postgres schema, backend ingestion endpoints, or frontend API dependency.
- Owner decision needed: operations owner: "Who owns backend operations, which FastAPI/Postgres host is accepted, and what secrets, backup/restore, retention, and ingestion-auth posture is approved?"

### Registry API/Static Fallback Adapter

- Status: `gated`
- Last verified: 2026-04-27 on `epic/replatform-execution` at `efb889f`
- Source-of-truth doc path: `docs/planning/registry-api-fallback-adapter.md`
- Current implementation status: planning contract only; no frontend API wiring or behavior change is authorized.
- Blocking STOP conditions: `docs/planning/registry-api-fallback-adapter.md:306-320` blocks frontend API wiring until the adapter contract and backend operations contract are accepted, API mode flag/switch and response schemas are documented, static/artifact compatibility tests are accepted, divergence labels and ownership fields are accepted, DFM freshness ownership switch is accepted, bridge guards remain active, API failure cannot break Data Registry, planned rows are not treated as failed, and wiring does not require saved runs, Knowledge Hub CRUD, HFI storage, PE, CGE, FPP, or synthesis. `docs/planning/registry-api-fallback-adapter.md:293-299` says no API calls, no new absent-API error state, and exact static behavior until API mode is enabled.
- Blocks / blocked-by: blocks frontend API mode for Data Registry and backend metadata display; blocked by owner acceptance of precedence rules, source-state labels, response schemas, field ownership, DFM freshness ownership, and fallback tests.
- Next allowed action: owner acceptance of API-prefer/static-fallback rules and exact source-state labels.
- Next forbidden action: add API calls, make Data Registry depend on backend availability, or let API metadata override frontend guard failure.
- Owner decision needed: Data Registry owner: "Are the static fallback baseline, API-prefer metadata-only precedence, divergence label, field ownership split, and DFM freshness ownership rule accepted exactly as written?"

### Data Registry

- Status: `implemented`
- Last verified: 2026-04-27 on `epic/replatform-execution` at `efb889f`
- Source-of-truth doc path: `docs/planning/sprint-3-data-registry-mvp-plan.md`
- Supporting docs: `docs/alignment/sprint4-data-registry-v2-audit.md`, `docs/planning/registry-api-fallback-adapter.md`
- Current implementation status: frontend-only, read-only, artifact-based Data Registry is implemented for current static QPM, DFM, and I-O artifacts with planned HFI/PE/CGE/FPP/Synthesis states.
- Blocking STOP conditions: current implementation is complete only within the static/read-only scope. `docs/planning/sprint-3-data-registry-mvp-plan.md:370-388` says stop if the page requires backend/database/auth admin workflow, invents PE/CGE/FPP data, cannot derive stale/update status from public metadata, duplicates Model Explorer methodology, causes saved-run or Comparison regressions, or depends on an unverified operations contract. `docs/alignment/sprint4-data-registry-v2-audit.md:22-25` records that no backend/database/scheduler/admin/upload/refresh action was added and planned model families are not treated as missing/failed.
- Blocks / blocked-by: supports QPM/DFM/I-O provenance and planned-lane visibility; blocked from backend authority, scheduler, source CRUD, API mode, and new model promotion until the related contracts are accepted.
- Next allowed action: maintain source-contract references and update this index in the same commit if Data Registry contracts change.
- Next forbidden action: claim Data Registry is a live governance database, scheduler, backend registry, source-management UI, or economic/model validation layer.
- Owner decision needed: Data Registry owner: "Which future fields, if any, move from frontend/static ownership to backend/API ownership, and what acceptance record authorizes that switch?"

### I-O

- Status: `implemented`
- Last verified: 2026-04-27 on `epic/replatform-execution` at `efb889f`
- Source-of-truth doc path: `docs/data-bridge/03_io_contract.md`
- Supporting docs: `docs/data-bridge/04_io_analytics_contract.md`, `docs/planning/sprint-3-io-page-integration-gate.md`, `docs/planning/sprint-3-io-second-consumer-gate.md`
- Current implementation status: static `/data/io.json` bridge and current read-only/evidence consumers are implemented; stronger Scenario Lab analytics and macro handoff claims require separate acceptance.
- Blocking STOP conditions: `docs/data-bridge/03_io_contract.md:67-78` says the bridge has no `ComparisonContent`, no Type II arrays, no English/Uzbek sector labels, and no live UI consumption in that slice. `docs/data-bridge/04_io_analytics_contract.md:34-36` says the current public bridge should not be used to claim employment effects or sector shock simulation until analytics fields are exported and validated. `docs/data-bridge/04_io_analytics_contract.md:119-129` says it does not claim macro GDP growth changes, inflation changes, fiscal deficit effects, general-equilibrium reallocation, or causal reform impacts.
- Blocks / blocked-by: supports existing evidence and internal-preview I-O workflows; blocks PE only historically through first-consumer readiness, but PE now has its own gates. Future richer I-O work is blocked by analytics contract acceptance, label reconciliation, Type II/employment-field validation, saved-run/server contract if persistence is proposed, and no macro-claim acceptance.
- Next allowed action: accept a stronger I-O analytics/saved-run contract for any future Scenario Lab sector-shock expansion.
- Next forbidden action: put I-O values in macro scenario rows, claim macro forecasts/causal reform effects/general-equilibrium results, or expose sector rankings in EN/UZ without label reconciliation.
- Owner decision needed: I-O model owner/product owner: "Which I-O analytics outputs, labels, employment fields, and saved-run semantics are accepted for user-facing Scenario Lab or Comparison use?"

### QPM/DFM

- Status: `implemented`
- Last verified: 2026-04-27 on `epic/replatform-execution` at `efb889f`
- Source-of-truth doc path: `docs/data-bridge/00_qpm_contract.md`; `docs/data-bridge/02_dfm_contract.md`
- Supporting docs: `docs/planning/registry-api-fallback-adapter.md`
- Current implementation status: QPM and DFM static bridge artifacts are implemented for their current frontend consumers; freshness and source-vintage semantics remain static-artifact/guard based unless an accepted owner switch changes them.
- Blocking STOP conditions: `docs/data-bridge/00_qpm_contract.md:44-46` locks QPM shock scaling and says not to rescale on the consumer side. `docs/data-bridge/02_dfm_contract.md:99-103` locks fan-chart scaling and says not to rescale on the consumer side. `docs/data-bridge/02_dfm_contract.md:143-152` says nightly JSON regeneration and upstream EM refit are separate freshness concepts and both vintages should be surfaced. `docs/planning/registry-api-fallback-adapter.md:256-270` says backend may own DFM freshness only after an explicit switch is accepted.
- Blocks / blocked-by: supports current Scenario Lab/Overview/Data Registry surfaces; blocked from backend/API freshness ownership changes, model refits, or contract-breaking consumer rescaling without model owner acceptance.
- Next allowed action: maintain static bridge provenance and freshness disclosure, and record any proposed API/freshness ownership change as an owner decision before code.
- Next forbidden action: change QPM shock scaling, DFM uncertainty scaling, conflate DFM JSON export with EM refit, or let API metadata override frontend DFM freshness before explicit acceptance.
- Owner decision needed: QPM/DFM model owners: "Are any scale, freshness, source-vintage, or backend ownership semantics changing, and if so what exact contract amendment accepts the change?"

### Main Merge Readiness

- Status: `gated`
- Last verified: 2026-04-27 on `epic/replatform-execution`; readiness review source candidate `541db7c`, local HEAD `efb889f`
- Source-of-truth doc path: `docs/planning/sprint-4-main-merge-readiness-review.md`
- Supporting docs: `docs/planning/sprint-4-main-merge-readiness.md`, `docs/planning/sprint-3-main-merge-plan.md`, `docs/frontend-replatform/14_sprint3_release_candidate_readiness.md`
- Current implementation status: release-control readiness is not accepted for main merge; remaining work is evidence/owner acceptance, not new product scope.
- Blocking STOP conditions: `docs/planning/sprint-4-main-merge-readiness-review.md:44-50` blocks main merge until slice review ledger, hosted smoke, final CI, P0/P1 disposition, and untracked-artifact exclusion are complete. `docs/planning/sprint-4-main-merge-readiness-review.md:103-112` says no main merge with unresolved route/asset/JSON 404s, legacy root breakage, unowned P0/P1 findings, prohibited release claims, local untracked artifacts, new PE/CGE/FPP/Synthesis/HFI/backend/scheduler/live-source/model-calculation work, or missing final CI/hosted smoke.
- Blocks / blocked-by: blocks promotion to `main`; blocked by release-control evidence, hosted smoke, final CI, owner acceptance, and exclusion of unrelated untracked local artifacts.
- Next allowed action: complete the slice review ledger, hosted `/policy-ui/` smoke, final CI confirmation, release-claim check, and owner acceptance record.
- Next forbidden action: merge to `main` while adding new model/backend scope or including unrelated untracked guide/showcase/extract artifacts.
- Owner decision needed: release owner: "Is named evaluator readiness separate from main merge, and are final CI, hosted smoke, P0/P1 disposition, release claims, and excluded local artifacts accepted for the selected candidate SHA?"

## Recommended Next Three Actions

1. Clear FPP Gate 1 by recording the canonical `unified-v1` workbook freeze, owner, hash/date, and sheet/range map - do NOT begin FPP frontend integration.
2. Assign and contact HFI source owners for the internal-preview shortlist, then write accepted answers into the source inventory - do NOT create an HFI artifact or `/data/hfi_snapshot.json`.
3. Accept backend operations and registry fallback contracts with named owners and explicit negative authority - do NOT implement FastAPI, database migrations, or frontend API wiring.

## Deferred Contract Topics

The following topics are not authorized for new planning, contract, or readiness documents during this operational-preview phase:

- CGE contract
- synthesis contract
- server-side saved runs contract
- production auth/roles contract
- export/citation workflow contract
- I-O Scenario Lab analytics acceptance contract
- internal-preview/evaluator observation capture contract
- RU/UZ terminology review acceptance plan

Do not expand these into new scope from this index.

## Risks

- Drift: source contracts change without this index being updated in the same commit.
- False completeness: an indexed workstream is mistaken for accepted implementation readiness.
- Starting code before gates clear: frontend/backend/artifact work begins from a planning map rather than accepted source contracts.
- Owner decisions not named: unresolved roles create ambiguous acceptance.
- Source-of-truth contract changes not reflected here: STOP conditions, statuses, or canonical doc paths become stale.

No code implementation is authorized by this index.

This document authorizes only docs, gate clearing, owner decisions, and source-owner outreach.
