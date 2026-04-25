# Sprint 3 Execution Plan

**Date:** 2026-04-24  
**Scope:** Sprint 3 planning and Week 1 execution prompts only. This document does not implement code changes.

## Inputs

- `docs/reviews/sprint-2-close-flavor-A.md`
- `docs/reviews/sprint-2-close-flavor-A-adjudication.md`
- `docs/reviews/sprint-2-close-flavor-B.md`
- `docs/reviews/sprint-2-close-flavor-B-adjudication.md`
- `docs/reviews/sprint-2-close-flavor-C.md`
- `docs/reviews/sprint-2-close-flavor-C-adjudication.md`

## Sprint 3 Operating Shape

Sprint 3 is a consolidation sprint with one or two high-leverage product expansions. It should not become a broad feature sprint. The first priority is to make the five-page React rebuild credible as a pilot surface: source pipelines consistent, data-mode behavior explicit, DFM freshness operationally honest, and visible editorial sentinels tracked before content fill begins.

The sprint has three phases:

1. **Week 1 foundation:** Model Explorer source pipeline, DFM PR 4, env/data-mode cleanup, sentinel inventory, duplicate locale-key guard.
2. **Weeks 2-4 content and trust:** Shot 2 editorial packet, TA-9 AI surface treatment, accessibility sweep, testing philosophy doc, stakeholder check-in, pilot-user criteria.
3. **Weeks 4-8 pilot readiness:** IO bridge with bridge helper, Comparison add-saved-scenario workflow, Scenario Lab metadata retirement, TB-P1 deployment migration implementation, named pilot onboarding.

Weeks 8-12 remain conditional and should bend around pilot feedback.

## 1. Pre-Decided Sprint 3 Policies and Product Decisions

### Process Policies

- **Branch policy:** all Sprint 3 changes route through `epic/replatform-execution`. Hotfixes cherry-pick from epic to `main` when needed.
- **PR base check:** every PR creation must verify the base branch is `epic/replatform-execution` before opening.
- **Tiered process:** every slice is classified at kickoff.
  - **Lightweight path:** small docs, copy, tests, guards, mechanical hardening. Builder plus supervisor pre-PR check; no separate read-before-write audit unless something surprising appears.
  - **Full path:** demo-track surfaces, contracts, data-integrity work, multi-page behavior, persistence semantics, bridge work. Full audit, builder self-check, supervisor pre-PR review, reviewer post-PR review, targeted re-verification after amend.
- **Read-before-write audit:** required for full-path slices. The audit must identify actual files, active consumers, and codebase reality before implementation.
- **Audit-to-PR commitment ledger:** any slice with an audit document must include a PR table with `Audit commitment`, `PR delivery`, and `Status`.
- **Supervisor enforcement of audit commitments:** the supervisor reads the audit and PR description together before dispatching reviewer work.
- **Transfer-file verification:** every cross-agent handoff verifies filename/version and one known-changed line before review or build begins.
- **Runtime verification ownership:** slice prompts name the runtime verifier explicitly. Default: Claude Code owns preview/runtime verification on Windows; Codex can provide static review where dev-server reliability is limited.
- **Reviewer-fixes-in-place brake:** default is request changes and builder amends. Reviewer may commit only if the bug is narrow, no more than 50 LOC, supervisor approves in chat before commit, and an independent verifier checks the result.
- **Process-debt backlog:** maintain `docs/process/backlog.md` with a maximum of 5 active items. If a sixth item appears, close or prune the bottom 2 before adding more.
- **Review persistence:** consequential review verdicts should be preserved in PR comments or committed review notes, not only in conversation history.

### Architecture Policies

- **Consolidation over rewrite:** Sprint 3 strengthens proven boundaries instead of rebuilding the app architecture.
- **Page source rule:** pages should read through source modules; page components should not import mock data directly except in tests.
- **Bridge adapter boundary:** bridge adapters produce bridge-native shapes. Page adapters and composers transform bridge-native data into page-native view models.
- **Comparison boundary:** bridges must not emit `ComparisonContent`. That remains a page presentation view model behind the Comparison composer.
- **Model Explorer type consolidation timing:** parallel Model Explorer types are not consolidated until the source pipeline is wired and at least one post-DFM bridge validates the new pipeline.
- **Bridge helper timing:** the shared fetch/timeout helper lands inside the first new bridge slice, expected to be IO, rather than as an abstract standalone refactor.
- **Testing philosophy:** preserve contract-level focus, especially guards, adapters, sources, state, and targeted page flows. Document this once in Sprint 3.

### Product Decisions

- **TB-P1 deployment:** React rebuild becomes the pilot deployment in Sprint 3.
- **DFM cron activation:** DFM PR 4 completes on epic with manual dispatch until the TB-P1 deployment migration lands on `main`. Default-branch activation happens after that sequence, not before.
- **Knowledge Hub source mode:** Knowledge Hub remains curated/static in Sprint 3. This is a product choice, not unresolved technical debt, unless pilot feedback creates a freshness requirement.
- **Shot 2 editorial sequencing:** English/source content comes first; RU/UZ translation follows after English strings stabilize.
- **Stakeholder communication:** Sprint 3 should include a biweekly 30-minute stakeholder check-in covering what shipped, what is next, and what input is needed.
- **Week 8 review:** if pilots are active, Week 8 includes a pilot-signal review that can redirect Sprint 4 priorities.

## 2. Week 1 Work Queue

| Order | Work item | Priority | Tier | Owner decision needed? | Notes |
|---|---|---:|---|---|---|
| 1 | Wire Model Explorer through source pipeline | Must-do-first | Full | No | No other Model Explorer content work proceeds before this. |
| 2 | Complete DFM PR 4 workflow | Must-do-first | Full | No, policy locked | Manual dispatch until TB-P1 lands on `main`; do not count default-branch cron activation as done yet. |
| 3 | Update env typing and normalize data-mode defaults | Do-first | Lightweight | No | Should land early to reduce silent mock/live divergence. |
| 4 | Create sentinel inventory test | Do-first | Lightweight | No | Gate before Shot 2 editorial burn-down begins. |
| 5 | Add duplicate-key locale JSON guard | Do-first | Lightweight | No | Cheap protection before RU/UZ string volume expands. |
| 6 | Week 1 planning handoff note | Lightweight | Lightweight | No | Summarize what landed, what stopped, and whether Week 2 content can begin. |

### Week 1 Sequencing Rules

- Model Explorer source wiring is first. Do not run parallel Model Explorer slices.
- Sentinel inventory must land before Shot 2 content work starts.
- Duplicate locale-key guard should land before any broad translation PR.
- DFM PR 4 can run in parallel with lightweight env/sentinel/locale work if there are separate builders.
- If Week 1 capacity tightens, defer the Week 1 handoff note before deferring any foundation item.

## 3. Slice Prompts for Week 1 Tasks

These prompts are intended as kickoff prompts for implementation sessions. They intentionally require the builder to verify code paths during audit rather than treating this planning document as code truth.

### Slice 1 - Model Explorer Source Pipeline Wiring

**Tier:** Full  
**Priority:** Must-do-first  
**Expected effort:** 4-8 hours  
**Branch target:** `epic/replatform-execution`

**Prompt:**

Wire Model Explorer through its source pipeline so the page no longer imports mock catalog data directly. Start with a read-before-write audit. Verify the current Model Explorer page, source, guard, adapter, mock catalog, contracts, and tests before editing. Treat `ModelCatalogEntry` as the canonical near-term page shape. Preserve existing visible Shot 1 behavior unless the audit finds a contradiction that requires supervisor adjudication.

Required outcomes:

- The Model Explorer page consumes source-state output rather than importing mock catalog entries directly.
- Mock mode still renders the current catalog experience.
- Live-mode path is structurally possible through the source pipeline, even if live payload coverage remains limited.
- Existing Model Explorer source/guard tests are aligned with the path the page actually consumes.
- No Model Explorer type consolidation beyond what is necessary for this wiring.

Verification:

- Run targeted tests for Model Explorer source, adapter/guard, and page behavior.
- Runtime preview required, with Claude Code as default runtime verifier on Windows.
- PR must include audit-to-PR commitment ledger.

STOP conditions:

- The source pipeline cannot represent current catalog content without broad contract redesign.
- Fixing the bypass requires retiring legacy Model Explorer types in the same slice.
- Any proposed change would alter Shot 1 visible content or page IA beyond source plumbing.
- The page needs a real live backend contract that has not been defined.

### Slice 2 - DFM PR 4 Workflow Completion

**Tier:** Full  
**Priority:** Must-do-first  
**Expected effort:** one slice  
**Branch target:** `epic/replatform-execution`

**Prompt:**

Complete DFM PR 4 as the DFM nightly regeneration workflow slice. Start with a read-before-write audit of existing DFM bridge artifacts, workflow expectations, data-version/freshness semantics, and any existing DFM documentation. The product decision is locked: workflow completion on epic uses manual dispatch until TB-P1 deployment migration lands on `main`; default-branch cron activation is not required for Week 1 completion.

Required outcomes:

- DFM regeneration workflow is complete enough to run manually from the epic branch arrangement.
- Freshness semantics remain honest: distinguish data vintage from export time and workflow run time.
- Documentation states the activation sequence: manual dispatch now, cron/default-branch activation after TB-P1 lands on `main`.
- No claim that user-facing freshness is fully automated until default-branch deployment supports it.

Verification:

- Run the workflow or the nearest local validation available without requiring default-branch cron activation.
- Validate generated/expected artifacts according to the existing DFM contract.
- PR must include audit-to-PR commitment ledger.

STOP conditions:

- The workflow requires secrets, production deployment settings, or default-branch permissions not available in Week 1.
- Regeneration changes the DFM JSON contract unexpectedly.
- Freshness wording would imply automation that is not actually active for users.

### Slice 3 - Env Typing and Data-Mode Defaults

**Tier:** Lightweight  
**Priority:** Do-first  
**Expected effort:** 2-4 hours  
**Branch target:** `epic/replatform-execution`

**Prompt:**

Update frontend env typing and normalize data-mode defaults across the policy UI. This is a lightweight slice, but begin by checking current env-key usage before editing. The goal is to make live/mock configuration explicit and typed, not to redesign source-state behavior.

Required outcomes:

- All currently used `VITE_*` data-mode and data-url keys are represented in frontend env typing.
- Page data-mode defaults are documented or normalized where Sprint 2 adjudication identified inconsistency.
- Comparison fallback-to-mock remains an explicit Comparison strategy, not silently generalized to all pages.
- Knowledge Hub remains curated/static per Sprint 3 product decision.

Verification:

- Run targeted tests affected by source configuration.
- Run typecheck or the repo's equivalent frontend validation.

STOP conditions:

- Normalizing defaults would change visible runtime behavior for a demo surface without explicit adjudication.
- A data-mode key is ambiguous and no source owner can identify its intended page/model.
- Knowledge Hub live mode appears necessary to satisfy this slice; defer and escalate because product mode is locked static for Sprint 3.

### Slice 4 - Sentinel Inventory Test

**Tier:** Lightweight  
**Priority:** Do-first  
**Expected effort:** 2-4 hours  
**Branch target:** `epic/replatform-execution`

**Prompt:**

Create a sentinel inventory mechanism and test that identifies visible editorial placeholders remaining after Shot 1. Use it as the burn-down source of truth before Shot 2 content work begins. Keep the mechanism small and test-oriented; do not rewrite content or fill sentinels in this slice.

Required outcomes:

- A central or discoverable inventory of sentinel/editorial-placeholder strings exists.
- Test coverage fails when expected sentinel inventory changes without updating the inventory.
- Inventory covers at least the known areas from Sprint 2 close: Overview KPI notes, Model Explorer validation summaries, Comparison tradeoff fallback, equation placeholders, and translation-sensitive visible strings where applicable.
- Output is useful to CERR/@nozim as a Shot 2 content checklist.

Verification:

- Run the sentinel inventory test.
- Confirm the test reports enough context to guide content burn-down.

STOP conditions:

- Sentinel detection requires broad UI refactor rather than a small inventory/test.
- The test would force immediate content writing before translation ownership is decided.
- Inventory cannot distinguish intentional permanent caveats from temporary placeholders.

### Slice 5 - Duplicate-Key Locale JSON Guard

**Tier:** Lightweight  
**Priority:** Do-first  
**Expected effort:** 1-2 hours  
**Branch target:** `epic/replatform-execution`

**Prompt:**

Add a guard that detects duplicate keys in locale JSON files before normal JSON parsing can silently overwrite them. Keep this as a focused validation/test slice. It should protect the expanding RU/UZ translation workload without changing translation content.

Required outcomes:

- Duplicate keys in locale JSON cause a deterministic test or validation failure.
- The guard covers all active locale files.
- Existing valid locale files pass.
- Documentation or test naming makes clear why this exists: JSON parsing hides duplicates.

Verification:

- Run the duplicate-key guard/test.
- Run the normal locale-related test subset if one exists.

STOP conditions:

- The guard requires replacing the i18n stack or changing runtime locale loading.
- Existing locale files contain duplicates that require product/editorial adjudication rather than a mechanical fix.
- The validation cannot report file path and duplicate key clearly enough to be actionable.

### Slice 6 - Week 1 Planning Handoff Note

**Tier:** Lightweight  
**Priority:** Support  
**Expected effort:** 30-60 minutes  
**Branch target:** `epic/replatform-execution`

**Prompt:**

Create a short Week 1 handoff note after the foundation queue completes or stops. Summarize completed slices, blocked slices, STOP conditions encountered, whether Shot 2 content can begin, and which Week 2 owner decisions are still open. This is a planning artifact, not an implementation slice.

Required outcomes:

- Clear statement of Week 1 completion status.
- Explicit call on whether sentinel inventory is ready for content burn-down.
- Explicit call on whether TB-P1, TB-P4, and translation ownership need immediate owner attention.
- Links to PRs or docs created during Week 1.

STOP conditions:

- Do not write around missing status. If a slice is unknown, mark it unknown and assign follow-up.

## 4. Dependencies and STOP Conditions

### Cross-Slice Dependencies

- **Model Explorer source pipeline -> Model Explorer content and bridge work.** No new Model Explorer content or bridge-consumption work until the page consumes its source pipeline.
- **Sentinel inventory -> Shot 2 editorial work.** Content burn-down begins only after inventory exists.
- **English content stability -> RU/UZ translation.** RU/UZ translation starts after English/source strings are stable enough to avoid churn.
- **DFM PR 4 -> deployment activation.** Workflow completion can happen on epic; cron activation waits for TB-P1 migration to `main`.
- **Env typing -> deployment migration.** TB-P1 implementation is less brittle after env keys and data-mode defaults are explicit.
- **IO bridge -> PE decision gate.** PE starts only after IO completion and an explicit bridge-decision gate.
- **Saved-run integration coverage -> Scenario Lab metadata retirement.** Retire legacy metadata after migration and restore behavior are protected.
- **Pilot users -> Week 8 prioritization.** Pilot feedback should redirect Sprint 4 planning if it contradicts the default bridge-heavy path.

### Global STOP Conditions

- **Wrong branch target:** any PR targeting `main` during epic-active Sprint 3 without explicit hotfix adjudication.
- **Audit commitment mismatch:** PR defers or changes audit-committed work without supervisor adjudication.
- **Scope expansion:** a lightweight slice reveals contract, persistence, data-integrity, or demo-surface changes. Reclassify before proceeding.
- **Trust-surface removal:** visible provenance, caveats, AI attribution, sentinels, or freshness wording are hidden to improve polish.
- **Bridge boundary violation:** bridge emits page-native presentation shape instead of bridge-native shape without explicit architecture adjudication.
- **ComparisonContent leakage:** a bridge or model-native adapter emits `ComparisonContent` directly.
- **Mock/live ambiguity:** behavior depends on implicit defaults not represented in env typing or documentation.
- **Translation churn:** RU/UZ strings begin before source copy is stable or before translation ownership is assigned.
- **Pilot decision latency:** TB-P4 remains unowned by Week 4 while pilot readiness is still claimed.
- **Off-ramp trigger:** IO bridge or pilot feedback invalidates the assumed Sprint 3 direction. Pause expansion and re-plan.

## 5. Explicitly Deferred

Deferred past Week 1:

- Shot 2 editorial content writing, until sentinel inventory lands.
- RU/UZ translation, until English/source strings stabilize and translation ownership is assigned.
- TA-9 AI surface treatment, until the first foundation package lands.
- Accessibility sweep, after Shot 1 surfaces and early trust/content changes are visible.
- Testing philosophy doc, unless Week 1 capacity is unexpectedly available.
- Comparison `+ Add saved scenario` modal.
- Scenario Lab saved-run restore integration test.
- Scenario Lab legacy metadata retirement.
- TB-P1 deployment migration implementation.

Deferred past Sprint 3 unless pilot signal changes priority:

- CGE bridge.
- FPP bridge.
- Full AI Advisor review workflow.
- Backend/API/SDK migration.
- Multi-user collaboration.
- Broad component-test expansion.
- Auto-curation or daily Knowledge Hub live source mode.
- Model Explorer parallel-type consolidation.

Conditional within Sprint 3:

- PE bridge starts only after IO completion and explicit bridge-decision gate.
- Real `unemployment_avg` and `real_wages_cumulative` rows land only where bridge output supports them.
- Live-mode Scenario Lab impulse-response chart lands only after relevant model output exists.
- Knowledge Hub source mode reopens only if pilot or stakeholder feedback creates a freshness requirement.

## 6. Open Owner Decisions

### TB-P4 - Named Pilot Users

**Status:** open owner decision.  
**Deadline:** identify by Week 4 at latest; earlier if TB-P1 deployment migration lands quickly.

Decision needed:

- Name 2-3 pilot evaluators.
- Assign each evaluator a testing lens:
  - policy narrative and interpretability
  - model credibility and assumptions
  - operational usability and workflow
- Decide how feedback is captured and converted into Sprint 4 backlog.

STOP condition:

- Do not claim pilot readiness without named evaluators and a feedback loop.

### Translation Ownership and Pipeline

**Status:** open owner decision.  
**Deadline:** before RU/UZ Shot 2 translation begins.

Decision needed:

- Who owns translation: CERR in-house translators, @nozim, another named reviewer, or deferred translation.
- Whether English/source editorial content receives approval before translation.
- Whether translators work directly in locale JSON, through a spreadsheet/doc handoff, or through PR comments.
- Who performs final RU/UZ review for policy register and terminology consistency.

Recommendation:

- Use English/source-first flow.
- Translate only stable strings.
- Keep duplicate-key guard in place before translation PRs.
- Use small translation PRs grouped by surface, not one broad string dump.

STOP condition:

- Do not start RU/UZ translation if ownership is ambiguous or English copy is still moving.

### Stakeholder Communication Cadence

**Status:** recommended but needs calendar owner.  
**Decision needed:** who schedules and chairs biweekly 30-minute Sprint 3 stakeholder check-ins.

Default agenda:

- What shipped.
- What is next in the next two weeks.
- What needs CERR/@nozim input.
- Which decisions are blocking delivery.

### Off-Ramp Planning

**Status:** needs owner acknowledgement before Week 4 expansion.

Decision needed:

- What triggers a re-plan if IO bridge exceeds expected duration.
- What happens if pilot users reject the React surface or prioritize different workflows.
- Whether Sprint 3 pivots toward content/trust/deployment if bridge work stalls.

Default off-ramp:

- If IO takes 1.5x precedent time, do not start PE in Sprint 3.
- If pilot feedback contradicts the 12-week bridge-heavy plan, Week 8 review redirects Sprint 4 planning.
- If deployment migration blocks pilot access, prioritize TB-P1 over new bridge expansion.

### TB-P1 Deployment Migration Implementation

**Status:** implementation path selected in `codex/sprint3-tb-p1-pilot-deployment`.
**Decision:** publish the React rebuild as the Sprint 3 GitHub Pages sidecar pilot under `/policy-ui/`, while preserving the legacy root.

Constraints:

- DFM cron activation depends on this sequence.
- Pilot users need a stable public surface.
- Do not treat workflow-on-epic as full freshness automation.

Implementation notes:

- Pages deployment follows `epic/replatform-execution` and `main`, not the older `epic/frontend-replatform` branch.
- Pilot users access the React rebuild at `/policy-ui/#/overview` on the repository GitHub Pages host.
- Default-branch DFM scheduled activation remains pending until this deployment path is promoted to `main`.

### Slice Size Cap

**Status:** open process question.  
**Decision needed:** whether Sprint 3 caps slices to avoid another multi-day Shot 1-style build, or accepts large slices when a single coherent build is unavoidable.

Default recommendation:

- Cap slices by default.
- Allow large slices only with supervisor approval, explicit audit, and planned mid-slice checkpoint.

## Week 1 Definition of Done

Week 1 is done when:

- Model Explorer source pipeline wiring is merged or explicitly stopped with a documented blocker.
- DFM PR 4 is merged or explicitly stopped with a documented blocker.
- Env typing/data-mode defaults are merged or explicitly stopped with a documented blocker.
- Sentinel inventory test is merged and usable as the Shot 2 content burn-down source, or content work remains blocked.
- Duplicate-key locale guard is merged before broad translation work.
- Week 1 handoff identifies whether Week 2 can begin content/trust work.

Week 1 is not done if:

- Model Explorer still imports mock catalog data directly in production page code.
- Shot 2 content starts without sentinel inventory.
- RU/UZ translation starts without ownership.
- DFM freshness is described as automated before the deployment/default-branch sequence supports it.
- Any PR silently targets `main`.
