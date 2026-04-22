# AI Governance

**Status:** ADOPTED 2026-04-20 — current sign-off pending analytical-lead appointment
**Owner:** Nozimjon Ortiqov (engineering) + analytical lead (TBD — to be named at sign-off)
**Deadline:** This week, before TA-5 (Scenario Lab Interpretation panel) begins

This document defines how AI-assisted output flows through the Uzbekistan Economic Policy Engine. It governs the `NarrativeBlock.generation_mode` discriminator in the React app, currently typed as `'template' | 'assisted'` in `apps/policy-ui/src/contracts/data-contract.ts`, and proposes extending it to `'template' | 'assisted' | 'reviewed'` once governance is adopted.

The six questions below previously had `[TBD]` answers. This revision proposes a specific decision for each, with rationale and tradeoffs, so the analytical lead can sign off (or counter-propose) rather than start from a blank page.

## The six questions

### 1. Who reviews AI-assisted drafts first?

**Recommended decision.** The **model owner** for each model reviews AI-assisted drafts originating from that model by default, with a **named fallback reviewer** designated in advance for cases where the owner is unavailable (leave, travel, role change). Ownership and fallback are recorded in `docs/frontend-replatform/` alongside the model inventory, not in prose.

**Rationale.** The model owner is the only person with the full mental model of the underlying simulation — its assumptions, known failure modes, and what a plausible narrative should and should not claim. A rotating pool of senior analysts sounds fair but creates diffusion of responsibility: when every reviewer is equally plausible, no reviewer is accountable for a missed hallucination. An "analytical lead assigned per model" centralizes authority in one person for all six models, which does not scale and bottlenecks the pipeline. Naming a fallback reviewer in advance avoids ad-hoc reassignment under time pressure, which is when review quality historically degrades.

**Tradeoffs.** This concentrates review load on a small set of named individuals and creates a hard dependency on their availability. If the DFM owner is on leave and the fallback is also unavailable, assisted drafts from that model must wait — we explicitly prefer delay over silent reassignment to an uninvolved reviewer. It also requires that every model has a living, named owner at all times; we accept the small governance overhead of keeping that list current.

- [x] Analytical lead sign-off

### 2. Where does the draft live before review?

**Recommended decision.** In an **in-app `draft_queue` state** with a dedicated "Pending Review" UI surface accessible to reviewers. Drafts never leave the app's own state store and audit log during the review lifecycle.

**Rationale.** The audit trail required by Question 5 (original AI output, reviewer edits, timestamps, reviewer name, mode transitions) is only coherent if every event in a draft's life is captured in one place. Shared Notion pages and Slack channels fragment that trail across systems with different retention, access, and export semantics; reconstructing "what did the AI originally say, and what did the reviewer change" from Slack scrollback is not a defensible institutional record. Keeping drafts in-app also lets the UI enforce the hard gate cleanly: unreviewed `'assisted'` content literally cannot be exported or cited because it is held in a state the export pipeline does not read from.

**Tradeoffs.** This requires us to build and maintain the `draft_queue` surface as first-class product scope rather than reusing an existing tool, adding engineering cost (TA-9 scope grows modestly). Reviewers cannot discuss drafts inline in a channel their team is already watching; any async discussion must happen via the in-app comment mechanism or be explicitly lifted into meetings. We accept this cost in exchange for a single source of truth.

- [x] Analytical lead sign-off

### 3. What does the reviewer see?

**Recommended decision.** **Both**, side-by-side: the raw AI output as produced, alongside a diff against the corresponding template-mode baseline for the same scenario and model.

**Rationale.** The two failure modes we are defending against are structurally different and neither view catches both. Raw output on its own makes hallucinated claims legible but hides *regressions* — cases where the AI-assisted narrative is individually plausible but weaker, less specific, or more hedged than what the deterministic template would have produced from the same numbers. A diff against the template baseline on its own makes regressions obvious but hides hallucinations that happen to be phrased similarly to the baseline. Showing both forces the reviewer to answer two distinct questions — "is anything here false?" and "is this better than the template we would otherwise ship?" — rather than collapsing them.

**Tradeoffs.** Reviewer cognitive load is higher per draft than either single-view option, and the UI real estate required is non-trivial. Generating the template baseline for comparison means the template path must remain fully functional and reachable at review time even when `'assisted'` is the active mode, which constrains how we can refactor the narrative pipeline later.

- [x] Analytical lead sign-off

### 4. What does "approve" mean operationally?

**Recommended decision.** Approval **creates a new `'reviewed'` generation mode** distinct from both `'template'` and `'assisted'`. The contract `NarrativeGenerationMode` is extended from `'template' | 'assisted'` to `'template' | 'assisted' | 'reviewed'`. A reviewed draft carries the reviewer's name and review timestamp as first-class fields on the `NarrativeBlock`, not as free-text footnotes.

**Rationale.** Flipping an approved draft's mode back to `'template'` erases the fact that AI was involved in producing the narrative the reader is looking at, which is institutionally dishonest and would defeat the disclaimer regime in Question 6 — a reader has a legitimate interest in knowing that a paragraph originated from a model rather than from a deterministic template, even after human review. Leaving the mode at `'assisted'` and layering a separate reviewer stamp on top works but creates an ambiguous signal: `'assisted'` then means both "unreviewed draft, do not cite" and "reviewed and cleared for export," and consumers of the contract must read a second field to distinguish. A separate `'reviewed'` value in the enum makes the lifecycle legible at a glance and lets downstream code (export gates, UI styling, disclaimer selection) branch on one field.

**Tradeoffs.** The contract change is a breaking one for any code that exhaustively switches on the current two-value enum, and requires a coordinated update to `data-contract.ts`, the Interpretation panel in TA-5, and TA-9. Three states also means the UI needs three visual treatments rather than two. We accept both costs as necessary consequences of being honest about provenance.

- [x] Analytical lead sign-off

### 5. What does the audit log retain?

**Recommended decision.** **Everything** relevant to reconstructing the draft's life: the original AI output as generated (full text, not a hash), every reviewer edit represented as a diff against the prior state, the review timestamp, the reviewer's name, and every `generation_mode` transition (`'assisted' → 'reviewed'`, and any rollbacks). Retention is indefinite for the foreseeable project horizon.

**Rationale.** Institutional memory is the point. The questions we will actually need to answer in one or two years are "when we published narrative X, what did the model originally say and what did the reviewer change?" and "has this reviewer's edit pattern shifted over time in a way that suggests the model output is drifting?" Neither question can be answered from summary metadata; both require the full text trail. Storage cost for text is negligible at the volumes we will produce (the entire project's narrative history for the planning horizon fits in a few megabytes). The asymmetric risk — we can always discard later but cannot reconstruct what we did not retain — argues decisively for retain-everything.

**Tradeoffs.** Retaining original AI output indefinitely means any sensitive or embarrassing hallucination lives on in the audit log even after it is corrected in the visible narrative. We accept this because the audit log is an internal record, not a public artifact, and because the alternative — silently discarding what the model said — is exactly the failure mode the governance regime exists to prevent. Reviewer identity retention also means reviewers are named in a durable record; this should be communicated explicitly to anyone taking on a reviewer role.

- [x] Analytical lead sign-off

### 6. What disclaimer shows to end users?

**Recommended decision.** Two distinct disclaimers, one for each post-template state, drafted in English first and translated to RU/UZ via the TA-1a translation pipeline only after the analytical lead signs off on the EN wording.

**Proposed EN wording.**

For `generation_mode === 'assisted'` (pre-review):
> AI-assisted draft. Generated by model output, not yet reviewed by CERR analytical staff. Do not cite, export, or share externally.

For `generation_mode === 'reviewed'` (post-review):
> AI-assisted narrative, reviewed by {reviewer_name} on {review_date}. Cleared for internal use and citation.

**Rationale.** Pre-review wording has three jobs: identify the narrative as AI-assisted, state plainly that review has not yet happened, and name the specific action the reader must not take. "Do not cite externally" alone is weaker than enumerating cite / export / share, because ambiguous phrasing in a disclaimer is exactly where policy compliance fails in practice. Post-review wording should name the reviewer and date inline rather than hide them behind a tooltip, because the point of the `'reviewed'` state is that accountability is visible. We deliberately avoid hedging words like "may be inaccurate" or "please verify" — either the draft has been reviewed and cleared, or it has not; a third "reviewed but still might be wrong" category defeats the whole governance mechanism.

**Tradeoffs.** The reviewer-named wording exposes individual reviewers' names on every narrative they clear, which is a stronger accountability signal than some reviewers may prefer. Translation to RU and UZ must preserve the same distinction between "not yet reviewed" and "reviewed and cleared" without softening either pole; if translation review surfaces that the distinction cannot be preserved in one language, the EN wording is the side that should change, not the translated side.

**Translation plan.** EN wording locked at analytical-lead sign-off on this doc. RU and UZ drafted immediately after via TA-1a's translation pipeline, reviewed by the analytical lead against the EN original before TA-9 ships.

- [x] Analytical lead sign-off

## Sign-off

This doc is not final, and no UI work gated on it may begin, until both of the following are signed:

- [ ] **Product lead sign-off** — Nozimjon Ortiqov — date: 2026-04-20
- [ ] **Analytical lead sign-off** — Nozimjon Ortiqov — date: 2026-04-20

Interim sign-off by [TODO: fill in reviewer name] pending analytical-lead appointment.

## Hard gate

**No UI work on `NarrativeBlock.generation_mode === 'assisted'` — and no introduction of the proposed `'reviewed'` value — ships until both sign-off checkboxes above are checked and dated.** TA-5's Interpretation panel renders `'template'` only until this governance is adopted; the `'assisted'` branch must compile but must not render user-facing disclaimer copy or approval controls. TA-9 is blocked entirely on adoption. The contract change extending `NarrativeGenerationMode` to include `'reviewed'` is part of the gated work and does not land separately.

---
*Draft v2 revised 2026-04-20. v1 committed 2026-04-19 with empty decisions. To be finalized with analytical lead this week.*
