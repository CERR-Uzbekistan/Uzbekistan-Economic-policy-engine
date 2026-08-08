# Uzbekistan Economic Policy Engine — TA-6a execution (Sprint 2)

**Date range:** 2026-04-21 evening → 2026-04-22 evening (Tashkent time)
**Participants:** Nozimjon Ortiqov (project owner) + Claude (advisor/reviewer) + other Claude thread (builder prompt-drafter) + Claude Code (builder) + Codex via other Claude thread (reviewer)
**Prior chapter:** TA-4b merged (PR #74) closed Overview trust-surface gaps. QPM bridge operational (PR #72, #73). Sprint 2 remaining work: TA-6 (Comparison enrichment), TA-7, TA-8, TA-9. All local branches clean; epic/replatform-execution at the TA-4b merge commit.
**Context at session start:** Next session opening after previous day's TA-4b close. User uploaded both conversation-history files to the Claude project; new Claude thread picked up context. TA-6 scoping began with three rounds of clarifying questions before a single line of code got written.

---

## Arc of this session

From "TA-6 needs scoping" to "TA-6a merged with silent-corruption hazard closed before TA-6b's non-deterministic bridge data source lands." Three rounds of strategic questions, five prompt iterations, one catastrophic scope mismatch caught at the audit stage, one PR opened, one Codex review cycle returning REQUEST CHANGES with two real data-integrity bugs, one amend cycle, final APPROVE TO MERGE. The build/review pattern from TA-4b held through meaningfully harder scope than TA-4b had.

Key shape of the work: TA-6 turned out to require more specification than TA-4b because it reaches into a pre-existing surface rather than adding a new one. Every round of clarifying questions and every prompt iteration was paying for precision the slice genuinely needed, not procrastination. TA-4b took 1 round of questions / 2 prompt iterations. TA-6a took 3 rounds / 5 iterations. That's a real cost, worth budgeting for future "extend existing surface" slices.

---

## Three rounds of scoping questions — decisions adopted

### Round 1 (three questions)
- **Q1 — QPM consumption scope:** Option 3 (TA-6 reads QPM in Comparison only, not in Scenario Lab). Decouples scope, makes Comparison the natural first bridge consumer, sets a one-page-at-a-time bridge adoption pattern.
- **Q2 — Save semantics:** Option 1 (append-only with auto-generated IDs). Scope note added: include a visible delete affordance in TA-6 so users can curate. scenarioStore was UUID-keyed already from PR #64.
- **Q3 — Comparison selector count:** Option 2 (up to 3; baseline + 2 alternatives). Matches prototype's table column count. On ties: star all tied scenarios, no tiebreaker logic — rendered precision makes true ties rare, "identical on this dimension" is more honest than arbitrary pick.

Plus scope-critical addendum: when Scenario Lab saves to the store, it must save the **full results bundle** (headline metrics + chart data + interpretation), not just assumptions. Otherwise Comparison has to re-run scenarios client-side, colliding with the QPM-in-Comparison call. The save payload is the snapshot of a run; the QPM bridge provides the data for QPM-scenario baselines. This addendum shaped everything that followed.

### Round 2 (three questions)
- **Q1 — QPM reference scenarios in selector:** Option 1 (pre-loaded QPM baseline in slot 1; user can swap). Solves the empty-state problem for first-time users, teaches the baseline+alternatives model, is cheap to escape.
- **Q2 — Schema drift on saved runs:** Option 1 (render with schema-drift caveat badge; degraded but visible). Matches TA-4b precedent — surface limitations as visible UI. Scope note: for TA-6, drift detection is the simplest possible check (y_axis_label + metric_id set match); don't build a schema-versioning system.
- **Q3 — Chart overlay when scenarios disagree:** Option 2 (small-multiples). Overlay risks implying numerical comparability where none exists. Small-multiples puts visual comparison back in the user's head. Layout: delta table first, small-multiples row second, tradeoff prose third.

Plus scope clarification on the save-run flow: replace the existing "save assumptions" semantics entirely rather than co-exist. Dual-track save UX would create confused save semantics; old concept had no consumer anyway.

### Round 3 (architectural split)
**Split TA-6 into TA-6a (store-side) + TA-6b (consumer-side).** Reasoning: TA-4b's amend cycle proved review quality drops when too many unrelated concerns share a PR. The "unused button" failure mode if TA-6b slips (a Save-run button writing to a schema nothing reads yet) is recoverable in one follow-up PR. The "half-wired Comparison hanging in review" failure mode of a single-slice slip is materially worse. Plus the atomic rename benefits from standing alone — reviewer can skim it in five minutes and trust the type system caught drift.

Boundary adjustment: move the pre-loaded QPM baseline slot (Round-2 Q1) out of TA-6a into TA-6b with the rest of Comparison wiring. TA-6a shouldn't touch the Comparison page at all. Keeps TA-6a reviewable in under an hour.

---

## Five prompt iterations — the path to a prompt that fit the codebase

### Iteration 1 (initial)
Written by new Claude thread based on conversation-history files. Specified Scenario → SavedRun type rename, saveRun/listRuns API, new "Save run" button with inline-name-input UX (toggle pattern), bundle-size cap at +10 KB.

### Iteration 2 (post round-3 decisions)
Split into TA-6a. Same rename/rename-API framing. Integrated the four-phase commit-squash discipline and atomic rename ordering.

### Iteration 3 (first advisor pass, 5 adjustments)
Commit-sequencing discipline aligned to repo's squash-merge convention (develop in phases, squash before push). Governance round-trip test paired with plain round-trip test so they're written together. Migration-safety test matches TA-3's actual key rather than assumed shape. Bundle-size budget widened from +10 KB to "report and investigate > +20 KB." Interaction edge cases for name input (Enter/Escape/toggle/no-save-on-blur) specified explicitly. Confirmation auto-dismiss after 4 seconds or on next Run click.

### Iteration 4 (NarrativeBlock catch)
New Claude thread caught one more material mismatch before freezing: TB-P3 governance metadata rides on `ScenarioLabInterpretation & { generation_mode?, reviewer_name?, reviewed_at? }` (an `InterpretationWithMetadata` intersection pattern InterpretationPanel.tsx:8-12 reads through a cast), NOT on `NarrativeBlock`. Prompt gained an explicit "if you find yourself typing this as NarrativeBlock, stop — that's a different surface" guardrail. Without this catch we'd have hit the same type-mismatch class TA-5 had.

### Iteration 5 (final, sent to Claude Code)
Five iterations earned the prompt's fit. Cost: real. Value: avoided a catastrophic prompt/codebase mismatch that would have cost orders of magnitude more to discover at build time.

---

## Claude Code's audit STOP — the big save of the session

Claude Code received the iteration-5 prompt, did a read-before-write audit, and surfaced a fundamental scope mismatch before touching a file:

**What the prompt assumed:** "TA-5 never wired save, so the store has no real consumer yet" and "TA-6b will wire Comparison to read from the store."

**What the codebase actually had:** Both false. TA-5 shipped a full save/load/delete UI in ScenarioLabPage.tsx:311-385 with scenario-type picker, tags, description, confirm-delete dialog. ComparisonPage.tsx:19-20 already imports toComparisonScenario and listScenarios; ComparisonPage.tsx:46,72 subscribes to the store and merges saved scenarios into the comparison workspace.

**Root cause:** The TA-5 commit diff showed ScenarioLabPage.tsx +148 lines. I read it as "UI wiring for the preset chip flow" and didn't dig into what the +148 specifically did. Neither the new Claude nor I had this context. The conversation-history files didn't capture the TA-5 save/load surface.

**Blast radius if Claude Code had executed as written:** would have forced editing ComparisonPage.tsx (explicitly forbidden by the prompt), rewritten every consumer of the store, shipped ~1000+ LOC across files the prompt said not to touch.

**Claude Code offered three paths:** (A) re-baseline the prompt against reality, (B) proceed and blow past locked scope, (C) do only the non-conflicting slice.

**Response:** Path A, but before rewriting the prompt, ordered a full read-before-write audit. Five files: state/scenarioStore.ts, state/scenarioComparisonAdapter.ts, ScenarioLabPage.tsx:150-400, ComparisonPage.tsx:40-100, and the two existing test files. Produced a factual writeup of the existing surface before any prescription was made.

**What the audit revealed:** The real gap TA-6a needs to close is that TA-5 persists the recipe (assumptions + metadata) but not the artifact (results + interpretation + attribution). The scenarioComparisonAdapter compensates by calling buildScenarioLabResults(assumptions) at display time — works only because the mock engine is deterministic. The moment TA-6b wires Comparison to the QPM bridge (non-deterministic, with run_id / data_version / ModelAttribution tied to the run that produced them), re-running on display would silently corrupt saved scenarios with fresh numbers and strip TB-P3 governance metadata. TA-6a's real job: persist the run snapshot, not just the assumptions recipe.

**Reframe for the new prompt:** no rename; extend SavedScenarioRecord with optional run_* fields; bump localStorage key to policy-ui:scenario.v2:; keep existing API names; update handleSaveScenario/handleLoadSavedScenario to capture and restore the full bundle; flip scenarioComparisonAdapter to prefer persisted run_results over re-running.

---

## TA-6a execution — build, pre-PR review, amend, PR, Codex review, second amend

### Build pass (Claude Code, commit d56041d)
Fresh audit-backed prompt. 10 files / +486/-18. Tests 53 → 57 (+4: round-trip, governance round-trip, migration safety, optional-field tolerance). The existing roundtrip-comparison test updated with sentinel values (gdp_growth: 42, -7) proving the persisted path is live.

### Pre-PR review (other Claude thread, supervisor role)
Caught three gaps in Claude Code's self-report before the PR opened:
1. **Stale-edit gating missing.** Prompt specified two disabled states (no-run AND stale-edits); agent implemented only the first. Live data-integrity bug: user runs, edits assumption, clicks Save → persists {assumptions: B, results: A}.
2. **Inline-name-input behavior unverified.** Four behaviors (Enter-submits, Escape-closes, second-click-toggles, no-save-on-blur) not tested end-to-end.
3. **Rename-vs-extend decision silent.** Agent extended rather than renamed; judgment defensible but needed explicit documentation in commit body so TA-6b's prompt knows which type to reference.

### First amend (Claude Code, commit 154be34)
4 files, +18/-5. GAP-1 closed: canSaveScenario = successfulRunAttribution.length > 0 && !hasPendingEdits; new scenarioSaveStaleEdits i18n key in EN/RU/UZ. GAP-3 closed: rename-vs-extend paragraph added to commit body; stale-edit bullet added to the scope list.

**GAP-2 surfaced as a scope mismatch, not a fix.** Agent found no inline-name-input component in d56041d — the Save flow uses the page-level scenario_name text input, not a click-to-open affordance. The amendment prompt assumed a component never introduced. Agent correctly stopped short of fabricating one; surfaced the finding for adjudication. **Accepted as shipped.** The form-field-at-any-time pattern from TA-5 is functional and satisfies the data-integrity concern behind the B1-B4 checklist — blur-saves-silently can't happen because there's no click-to-open input flow. Original TA-6a prompt reached for a UX pattern without verifying the existing save form was already adequate.

### PR #75 opened (head 154be34, 10 files / +502/-21)
Title: `feat(policy-ui) · TA-6a — persist run snapshot on saved scenarios`. Description includes context, full change list, test count (53→57), bundle delta (<+5 KB), reviewer pre-empts (v1 untouched by design, run_id derivation rationale, InterpretationWithMetadata not NarrativeBlock, all-tabs persistence, rename-vs-extend decision), and explicit out-of-scope TA-6b list.

### Codex review pass (two BLOCKING items)
Pass 1 anchor verifications returned 3 PASS + 1 FAIL:
- ANCHOR-1 (governance round-trip integrity): PASS
- ANCHOR-2 (migration-safety path): PASS
- ANCHOR-3 (disabled-button state machine): **FAIL** — visible predicate correct, but loading a saved record with no run_results leaves the prior run snapshot alive; page misclassifies the loaded scenario as saveable and persists assumptions-B with results-A. Silent corruption.
- ANCHOR-4 (persisted-path durability): PASS

Pass 2 found one more BLOCKING item:
- **Persisted-snapshot guard too loose.** isPersistedRunResults() treats charts_by_tab as loose object ("unknown tab keys tolerated"); isChartSpec() only validates 5 top-level fields. A v2 record with missing tab or incomplete chart passes validation, then load/render path dereferences chart.x / chart.y unguarded and crashes. Guard contract should be "valid for every renderer OR filtered from listScenarios."

Overall verdict: REQUEST CHANGES.

### Second amend (Claude Code, commit 6e9118a)
3 files, +211/-3 (47 source LOC, 167 fixture-heavy test LOC). Under budget. Bundle: +0.42 kB raw / +0.14 kB gzip — under +1 KB budget.

**BLOCKING-1 fix (handleLoadSavedScenario else-path):**
- activeRunIdRef.current += 1 (cancels any in-flight run)
- latestSuccessfulAttributionRef.current = []
- sourceState set to status:'ready', error:null, results:null
- Comment in code cites ANCHOR-3 as the failure mode being prevented — good documentation hygiene.
- Automated coverage deferred: ScenarioLabPage integration mounting wasn't feasible in the test harness. Manual verification is the coverage; commit body documents. Noted as NON-BLOCKING follow-up.

**BLOCKING-2 fix (guard tightness):**
- New isChartAxis helper validates label/unit/values[]
- isChartSpec now requires subtitle, x (via isChartAxis), y (via isChartAxis), uncertainty[], takeaway — in addition to previous fields
- New REQUIRED_CHART_TABS constant: ['headline_impact', 'macro_path', 'external_balance', 'fiscal_effects']
- isPersistedRunResults iterates REQUIRED_CHART_TABS and rejects snapshots missing any
- Two regression tests added: missing-tab and malformed-chart (x: null). 57 → 59 tests.
- Critical cross-check: previously-passing output-roundtrip test still passes, confirming the save path writes records the tightened guard accepts. No save-path bug lurking behind the guard change.

### Codex re-verification
Targeted re-check of only the two BLOCKING items, not a full re-review. Both FIXED. APPROVE TO MERGE.

### Merged
PR #75 merged to epic/replatform-execution at 6e9118a.

---

## State at session end (2026-04-22 evening)

### Merged to epic/replatform-execution during this session
- PR #75 — TA-6a persist run snapshot on saved scenarios (2 amend cycles: pre-PR gaps + Codex BLOCKING fixes)

### On branches, not merged
Nothing in flight. All local feature branches cleaned up after merge.

### Sprint 2 status
Deliverables merged: TA-4b (Overview trust surfaces), QPM bridge complete as a unit, TA-6a (run-snapshot persistence + stale-edit gating + tightened guard).

Sprint 2 remaining:
- **TA-6b** — Comparison enrichment. Reads saved runs from store (shape now exists post-6a), reads QPM canonical scenarios from bridge (qpm.json exists, contract documented at docs/data-bridge/00_qpm_contract.md), two-section selector, up-to-3 slots with QPM baseline pre-loaded in slot 1, small-multiples chart layout, schema-drift caveat badges. All scoping decisions adjudicated across the three rounds above.
- **TA-7** — Model Explorer polish
- **TA-8** — Knowledge Hub content port
- **TA-9** — AI surface treatment (consumes TB-P3 generation_mode + reviewer fields now confirmed to round-trip through save/load via 6a's governance test)

Model bridges remaining: DFM (target 2026-05-08), PE, IO, CGE, FPP. Same five-PR pattern as QPM.

### Deferred decisions still open
- **TB-P1 (deployment migration)** — legacy cerr-uzbekistan.github.io vs. React-rebuild deployment. Sprint 3+ territory.
- **TB-P4 (named pilot users)** — Sprint 3+; mitigation is opportunistic informal review.
- **Nightly workflow activation** — cherry-pick onto main still deferred. Scheduled cron doesn't fire because workflow doesn't live on default branch. **Becomes live-question the moment TA-6b wires Comparison to qpm.json.** Should be resolved before TA-6b ships consumer wiring, or the consumer will read a JSON that isn't being refreshed.

### New backlog items from this session
- **BLOCKING-1 automated coverage.** Load-handler state reset currently manual-verification-only. Either extract state-reset into testable helper, or add ScenarioLabPage integration mounting to test harness. NON-BLOCKING at merge, worth capturing so it doesn't become the regression-nobody-thought-to-test.
- **Status-color tokens in design system** (carried forward from TA-4b) — overview.css still uses hex-literal status colors. Design-system polish.
- **Bundle size** — now at 884.07 kB raw / 261.23 kB gzip. Tracking but below actionable threshold.

### Conventions established or refined this session
- **Read-before-write audit pattern earned its first emergency save.** Claude Code's audit stopped a 1000-LOC scope-mismatch PR before a line was written. TA-4b's CSS-token miss was the first instance of "prescribe what exists, not what you think exists"; TA-6a's audit pre-empt is the second. Going forward, any slice that reaches into a pre-existing surface should start with a formal read-pass before prompt drafting, not after.
- **Three-tier review pattern validated.** Builder self-verification → supervisor pre-PR review → Codex post-PR review. Each tier caught different bugs. Self-verification caught the Node version mismatch. Supervisor caught the stale-edit gating gap. Codex caught the load-handler else-path corruption and the guard looseness. Removing any tier loses bugs distinct from what the other tiers catch.
- **Scoping-answer preservation across sessions matters.** The round-1 and round-2 question adjudications need to survive context compaction so TA-6b doesn't re-derive decisions. Store these in the conversation-history file explicitly, which this file does.
- **Prompt iteration cost budget.** TA-4b took 1 round of questions / 2 prompt iterations. TA-6a took 3 rounds / 5 iterations. "Extend existing surface" slices cost materially more than "add new surface" slices in scoping time. TA-6b should budget for ~2-3 rounds even though scoping decisions are inherited — the build prompt will need audit-backed precision.
- **Amend-in-place is the second-time-proven default.** Used twice this session (pre-PR amend and Codex amend). Force-push-with-lease each time. No stacked commits, no follow-up PRs, clean commit history. Pattern is now default.

### Lessons worth naming from this session
1. **Prompt precision and codebase reality can diverge silently.** The original TA-6a prompt's premises were derived from conversation-history summaries, which didn't capture TA-5's full save/load surface. The divergence was invisible to everyone (new Claude, supervisor, original session Claude) until Claude Code read the actual code. Summary fidelity has limits; "extend existing surface" slices should always open with fresh reads.
2. **Codex's value is catching things the builder didn't know to look for.** The load-handler else-path corruption wasn't visible in the agent's self-report because the agent didn't know it was supposed to reset state there. Codex read the canSaveScenario logic against the load handler and traced the bug. No self-verification check would have caught it.
3. **"Accept the mismatch and ship" is sometimes the right answer.** The inline-name-input component the amend prompt chased didn't exist; the existing form-field pattern satisfied the underlying invariant. Not every prompt-vs-reality gap is a bug. Ask whether the reality satisfies the concern, not whether it matches the prescription.
4. **The two BLOCKING bugs in Codex review were both live data-integrity bugs, not style issues.** Load-handler else-path → silent corruption of saved data. Guard looseness → page crash on malformed record. Both would have manifested in production within days of TA-6b shipping. The review pattern's cost (time, iteration friction) is insurance against exactly this class of bug. Two real catches in two slices (TA-4b's saved_scenarios dead data + this session's two) confirms the insurance is valued.
5. **Codex reviews exhibit restraint the session should honor.** Two BLOCKING, zero NON-BLOCKING, zero NIT. No piling on follow-ups. The amend prompt matched that restraint — fixed exactly what was flagged. Don't expand scope under review pressure.
