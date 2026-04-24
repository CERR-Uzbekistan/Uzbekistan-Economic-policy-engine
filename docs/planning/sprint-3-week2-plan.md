# Sprint 3 Week 2 Plan

**Date:** 2026-04-24  
**Branch:** `epic/replatform-execution`  
**Scope:** Week 2 planning and implementation prompts only. This document does not implement code, content, translation, bridge, or deployment work.

## 1. Week 1 Status Recap

Week 1 foundation is complete on the Sprint 3 epic path.

Completed:

- Model Explorer now loads through the source pipeline. Mock mode preserves the six-card Shot 1 catalog, and live legacy payloads can adapt into minimal catalog entries.
- DFM PR 4 workflow is complete enough for manual dispatch on epic. Default-branch scheduled activation remains deferred until TB-P1 deployment migration lands on `main`.
- Frontend env typing now covers current `VITE_*` keys, and page data-mode defaults are documented.
- Sentinel inventory test is complete and is the Shot 2 burn-down ledger.
- Duplicate-key locale JSON guard is complete for EN/RU/UZ locale files.
- Week 1 verification passed for `npm test` and `npm run build` in `apps/policy-ui`; local R export remains blocked because `Rscript` is unavailable on this machine.

Shot 2 English/source editorial content can begin for inventoried surfaces:

- Overview KPI context notes: 8 items.
- Model Explorer validation summaries: 5 items.
- Model Explorer non-QPM equation detail sets: 5 model sets.
- Comparison trade-off Shell A/C: 2 shell templates.

Still blocked or deferred:

- RU/UZ translation is blocked pending English/source-copy stability. Translation ownership is now assigned to the project owner.
- TB-P1 implementation is not Week 2 unless explicitly approved later.
- TB-P4 named pilot users remain an identification task owned by the project owner before pilot readiness is claimed.
- No IO/PE/CGE/FPP bridge work has started.

## 2. Week 2 Priorities and Sequencing

Week 2 should stay in the content-and-trust lane. The goal is to make the existing five-page React surface more credible without turning the week into bridge expansion, deployment migration, or a broad AI Advisor workflow.

Recommended order:

| Order | Work item | Priority | Tier | Start condition |
|---|---|---:|---|---|
| 1 | Owner decision checkpoint | Complete | Decision | Resolved by project owner on 2026-04-24; see section 5. |
| 2 | Shot 2 English/source editorial content packet | Must-do-first | Lightweight by default | Sentinel inventory is complete; English/source only. |
| 3 | Testing philosophy doc | Do-first | Lightweight | Can run in parallel with content drafting. |
| 4 | TA-9 AI surface treatment prompt | Important | Full | Governance gate is closed; scope remains bounded display/trust treatment only. |
| 5 | Accessibility sweep | Important | Lightweight initially | Best after first content/trust changes are visible; escalate only for blocking regressions. |
| 6 | Translation ownership decision | Complete | Decision | Project owner owns the pipeline; RU/UZ work still waits for stable EN/source. |
| 7 | TB-P4 named pilot-user decision | In progress | Decision | Project owner owns naming; Week 4 deadline remains. |
| 8 | Stakeholder cadence decision | Complete | Decision | Project owner chairs biweekly check-ins. |

Sequencing rules:

- Shot 2 content is English/source first. Do not start RU/UZ translation in Week 2.
- TA-9 is a full-path trust-surface slice, not a full AI Advisor review workflow.
- Accessibility starts lightweight: keyboard, focus, landmarks, labels, live regions, and obvious contrast/overflow checks across the five pages.
- The testing philosophy doc should codify current contract-level testing strategy; it should not recommend broad component-test expansion.
- Knowledge Hub remains curated/static in Sprint 3 unless pilot feedback creates a freshness requirement.
- React rebuild remains the intended Sprint 3 pilot deployment, but TB-P1 implementation is explicitly deferred from Week 2.

## 3. Tier Classification

| Slice | Tier | Rationale |
|---|---|---|
| Shot 2 English/source editorial content packet | Lightweight by default | Content-only work against existing sentinel inventory. Reclassify to full if contracts, page IA, data shapes, or component behavior must change. |
| TA-9 AI surface treatment | Full | Affects AI provenance, governance language, generation-mode semantics, and demo trust surfaces. Requires read-before-write audit and audit-to-PR commitment ledger. |
| Accessibility sweep | Lightweight initially | Expected to be a focused audit and small fixes. Reclassify if it discovers cross-page component rewrites, navigation changes, or blocking accessibility regressions. |
| Testing philosophy doc | Lightweight | Documentation-only slice preserving existing strategy. |
| Translation ownership decision | Decision, not implementation | Owner/resource decision; no RU/UZ strings change in this slice. |
| TB-P4 named pilot-user decision | Decision, not implementation | Names, evaluator lenses, schedule expectations, and feedback capture path. |
| Stakeholder cadence decision | Decision, not implementation | Calendar/ownership decision and standard agenda. |

## 4. Slice Prompts Ready for Implementation

These prompts are intended for later implementation sessions. They intentionally preserve Week 2 scope limits.

### Slice 1 - Shot 2 English/Source Editorial Content Packet

**Tier:** Lightweight by default  
**Priority:** Must-do-first  
**Branch target:** `epic/replatform-execution`  
**Runtime verifier:** Claude Code owns runtime preview on Windows if UI-visible content changes land.

**Prompt:**

Create the Shot 2 English/source editorial content packet from the Week 1 sentinel inventory. Do not start RU or UZ translation. Begin by reading the sentinel inventory test and current source strings to identify the exact pending English/source slots. Keep this as content replacement only unless the inventory proves a slot cannot be filled without a contract or UI change.

Required outcomes:

- Replace English/source sentinel content for the inventoried Week 1 surfaces where source wording is ready:
  - Overview KPI context notes: 8 items.
  - Model Explorer validation summaries: 5 items.
  - Model Explorer non-QPM equation detail sets: 5 model sets.
  - Comparison trade-off Shell A/C: 2 shell templates.
- Preserve visible caveats, provenance, model limitations, and uncertainty language.
- Keep content concise and policy-register consistent.
- Leave RU/UZ strings untouched except for any mechanical placeholder alignment strictly required by existing tests; if that appears necessary, stop and ask for owner adjudication.
- Update the sentinel inventory only to reflect English/source slots actually filled.

Verification:

- Run the sentinel inventory test.
- Run locale/content tests affected by the changed strings.
- Runtime preview the affected pages if the slice changes visible UI copy.

STOP conditions:

- Filling a slot requires changing a contract, data adapter, page layout, or model source shape.
- English/source wording is not stable enough for translation handoff.
- A requested string depends on IO/PE/CGE/FPP bridge output that does not exist yet.
- RU/UZ translation becomes necessary to make tests pass.
- The work starts to rewrite Knowledge Hub freshness or source mode.

### Slice 2 - TA-9 AI Surface Treatment

**Tier:** Full  
**Priority:** Important  
**Branch target:** `epic/replatform-execution`  
**Runtime verifier:** Claude Code owns runtime preview on Windows.

**Prompt:**

Implement TA-9 as a bounded AI trust-surface treatment, not a full AI Advisor review workflow. Start with a read-before-write audit of `docs/ai-governance.md`, `NarrativeBlock` and `NarrativeGenerationMode` contracts, current narrative rendering paths, Scenario Lab interpretation surfaces, Overview trust surfaces, tests, and any existing reviewer/provenance fields. Confirm the AI governance sign-off gate is closed before editing implementation files.

Required outcomes:

- Template-generated narrative remains visually unframed by AI disclaimers.
- AI-assisted or reviewed narrative states render honest, visible provenance treatment according to the adopted governance rules.
- Reviewed/unreviewed states are distinguishable only to the extent supported by the current signed governance and contracts.
- Any local draft/review/audit surface is minimal and directly required by governance; do not build a full queue workflow unless explicitly approved.
- Export or citation gating is documented as out of scope unless the current code already contains a narrow hook that must be guarded.
- PR includes an audit-to-PR commitment ledger.

Verification:

- Run targeted contract and narrative-rendering tests.
- Run typecheck/build.
- Runtime preview affected pages and capture the visible trust-state behavior.

STOP conditions:

- `docs/ai-governance.md` sign-off remains incomplete or ambiguous.
- The slice requires building a full AI Advisor review queue, reviewer collaboration workflow, or export pipeline.
- The work requires broad Model Explorer architecture changes.
- Governance wording needs RU/UZ translation before English/source treatment can land.
- Generation-mode contract changes would break existing saved-run or source-state behavior beyond a small, auditable migration.

### Slice 3 - Accessibility Sweep Across Five Pages

**Tier:** Lightweight initially  
**Priority:** Important  
**Branch target:** `epic/replatform-execution`  
**Runtime verifier:** Claude Code owns keyboard/browser walkthrough on Windows.

**Prompt:**

Run a lightweight accessibility sweep across the five React pilot pages after the first Week 2 content/trust changes are visible. Focus on regressions in keyboard access, focus visibility, landmarks/section labels, tab semantics, loading/error live regions, form labels, contrast-obvious issues, and text overflow. Keep fixes small and local.

Required outcomes:

- Document the pages checked and the interaction paths used.
- Fix small clear regressions discovered during the sweep.
- Preserve existing skip-link, focus-ring, aria-live, and section-label patterns.
- Escalate instead of continuing if the sweep reveals a structural accessibility problem.

Verification:

- Keyboard walkthrough for Overview, Scenario Lab, Comparison, Model Explorer, and Knowledge Hub.
- Run affected tests and build/typecheck if code changes land.
- Runtime preview any changed interaction state.

STOP conditions:

- A fix requires cross-page component redesign or navigation architecture changes.
- The sweep finds a blocking regression that affects pilot usability.
- Accessibility changes would alter product semantics, hide trust language, or remove visible caveats.
- The sweep grows into a full design-system refactor.

### Slice 4 - Testing Philosophy Doc

**Tier:** Lightweight  
**Priority:** Do-first  
**Branch target:** `epic/replatform-execution`

**Prompt:**

Create a short testing philosophy document at `docs/testing-philosophy.md`. Preserve the project's current contract-level testing strategy. Do not recommend broad component-test expansion.

Required outcomes:

- Explain why the project prioritizes guards, adapters, sources, state transitions, bridge contracts, and targeted page flows.
- Name where component tests are appropriate: accessibility-critical interactions, cross-page reusable components, or regressions that cannot be protected at contract/source level.
- Document that bridge work should test bridge-native output and page adapter/composer behavior separately.
- Document that sentinel inventory and locale duplicate-key tests are intentional content-trust guards.
- Keep the doc short enough for new contributors to read before writing tests.

Verification:

- Documentation review only.
- Confirm the doc does not contradict current test layout or Sprint 3 tiering.

STOP conditions:

- The doc proposes a broad testing rewrite.
- The doc requires reorganizing the current test tree.
- The doc treats Knowledge Hub live mode or bridge expansion as testing prerequisites.

### Slice 5 - Translation Pipeline Record

**Tier:** Decision, not implementation  
**Priority:** Complete for ownership; record before RU/UZ translation  
**Branch target:** planning/docs only if recorded.

**Prompt:**

Record the Week 2 translation pipeline before any RU/UZ Shot 2 work starts. Ownership is assigned to Nozimjon Ortiqov for Sprint 3 unless a named CERR translator is appointed later. This is a planning/decision slice, not a translation slice.

Required outcomes:

- Record the translation owner path: Nozimjon Ortiqov owns pipeline and final terminology review for Sprint 3.
- Decide whether English/source content needs approval before translation starts.
- Decide translation handoff format: locale JSON PRs, spreadsheet/doc handoff, or PR comments.
- Name the final RU/UZ reviewer for policy-register terminology consistency.

STOP conditions:

- No named owner is available.
- English/source content remains unstable.
- The proposed process would create one large uncontrolled translation dump.

### Slice 6 - TB-P4 Named Pilot-User Identification

**Tier:** Decision, not implementation  
**Priority:** Must resolve by Week 4 at latest  
**Branch target:** planning/docs only if recorded.

**Prompt:**

Identify the TB-P4 pilot-user path for Sprint 3. Nozimjon Ortiqov owns the decision and Week 4 deadline. Name 2-3 candidate evaluators or record exactly why names cannot be assigned yet. Assign each evaluator a testing lens and define how feedback becomes Sprint 4 input.

Required outcomes:

- 2-3 named pilot evaluators or a concrete owner/date for final naming.
- Lenses assigned across policy narrative and interpretability, model credibility and assumptions, and operational usability/workflow.
- Feedback capture path identified, using `docs/frontend-replatform/13_pilot_observations.md` or a successor if the file is renamed.
- Week 4 latest deadline preserved.

STOP conditions:

- Pilot readiness is claimed without named evaluators.
- Sessions are treated as guided demos rather than observational tests.
- Feedback has no path into Sprint 4 prioritization.

### Slice 7 - Stakeholder Cadence Record

**Tier:** Decision, not implementation  
**Priority:** Complete for ownership; record first meeting timing  
**Branch target:** planning/docs only if recorded.

**Prompt:**

Record the Sprint 3 stakeholder cadence. Nozimjon Ortiqov schedules and chairs the check-ins. Default to a biweekly 30-minute check-in unless the project owner chooses another cadence.

Required outcomes:

- Name the scheduler/chair.
- Choose the first meeting window.
- Use the standard agenda: what shipped, what is next in the next two weeks, what needs CERR/@nozim input, and which decisions block delivery.
- Record where decisions from the meeting will live.

STOP conditions:

- No owner can schedule or chair the meeting.
- The meeting becomes a broad status forum with no decision log.
- Stakeholder feedback starts changing Week 2 scope without explicit re-planning.

## 5. Owner Decisions

Resolved by project-owner decision on 2026-04-24:

- **TA-9 sign-off:** unblocked. `docs/ai-governance.md` is signed by Nozimjon Ortiqov as project owner, product owner, and interim analytical owner. TA-9 remains bounded to display/trust-surface treatment in Week 2.
- **Translation ownership:** Nozimjon Ortiqov owns the translation pipeline and final terminology review for Sprint 3 unless a named CERR translator is appointed later. RU/UZ translation still does not start until English/source content is stable.
- **Shot 2 source approval:** Nozimjon Ortiqov approves English/source content before merge. Codex/Claude may draft concise English/source wording, but any invented model validation or equation prose must remain reviewable draft content and preserve caveats.
- **TB-P4 owner:** Nozimjon Ortiqov owns pilot-user identification and the Week 4 deadline. If named evaluators are not available by Week 4, the project must stop claiming pilot readiness and record the blocker.
- **Stakeholder cadence owner:** Nozimjon Ortiqov schedules and chairs biweekly Sprint 3 check-ins. Default cadence: 30 minutes every two weeks, starting after the first Week 2 content/trust PR is ready for review.
- **Decision log location:** material Sprint 3 owner decisions live in planning docs or PR descriptions, not only in conversation history.

Additional implementation choices:

- **TA-9 scope:** display/trust treatment only in Week 2. No full draft queue, reviewer collaboration workflow, or export/citation pipeline.
- **Pilot feedback capture:** use `docs/frontend-replatform/13_pilot_observations.md` if present; otherwise create a Sprint 3-specific successor under `docs/planning/`.
- **First stakeholder check-in timing:** after the first Week 2 content/trust PR is ready, so stakeholders react to concrete output rather than an abstract plan.

## 6. STOP Conditions

Global Week 2 STOP conditions:

- Any PR targets `main` instead of `epic/replatform-execution` without explicit hotfix adjudication.
- RU/UZ translation starts before translation ownership and English/source stability are resolved.
- Shot 2 content work requires IO/PE/CGE/FPP bridge output.
- Any slice starts TB-P1 deployment migration without explicit approval.
- TA-9 expands into a full AI Advisor review workflow, export pipeline, or broad draft-queue product.
- Model Explorer architecture changes beyond planning become necessary.
- Knowledge Hub curated/static mode is reopened without pilot or stakeholder freshness evidence.
- A lightweight slice discovers contract, persistence, source-state, or demo-surface changes and continues without reclassification.
- Accessibility sweep finds blocking regressions and treats them as small polish.
- Testing philosophy doc recommends broad component-test expansion or a test-tree rewrite.
- Trust-surface language, caveats, provenance, or freshness wording is hidden to make the UI look cleaner.

## 7. Explicitly Deferred Work

Deferred from Week 2:

- RU/UZ translation work.
- IO, PE, CGE, and FPP bridge work.
- TB-P1 deployment migration implementation.
- Default-branch DFM scheduled cron activation.
- Comparison `+ Add saved scenario` modal.
- Scenario Lab legacy metadata retirement.
- Scenario Lab saved-run restore integration test.
- Bridge fetch helper extraction.
- Model Explorer parallel-type consolidation.
- Knowledge Hub live/source-mode implementation.

Deferred unless explicitly re-approved:

- Full AI Advisor review workflow.
- Export/citation pipeline for AI-assisted drafts.
- Backend/API/SDK migration.
- Multi-user collaboration.
- Broad component-test expansion.

Conditional later in Sprint 3:

- IO bridge with helper extraction belongs in Weeks 4-8 if content/trust and pilot-readiness decisions stay on track.
- PE bridge starts only after IO completion and an explicit bridge-decision gate.
- Knowledge Hub freshness reopens only if pilot or stakeholder feedback creates a real freshness requirement.
- TB-P1 implementation starts only after explicit deployment-migration approval and owner assignment.
