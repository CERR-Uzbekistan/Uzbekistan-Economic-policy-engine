# Uzbekistan Economic Policy Engine — Sprint 2 opening + TA-4b

**Date range:** 2026-04-20 evening → 2026-04-21 evening (Tashkent time)
**Participants:** Nozimjon Ortiqov (project owner) + Claude (advisor/reviewer)
**Prior chapter:** Sprint 1 closed (12 PRs merged to epic/replatform-execution). Sprint 2 opened with the QPM bridge on feat/sprint2-bridge-qpm-export. Codex had been in progress on TA-5 after a branch-confusion recovery.
**Context at session start:** Local epic at 412ab9f (merge of main into epic, bringing test-script fix forward). TA-5 landed on its branch at 5bc1d13 after the Option-2 stash-switch-pop recovery. QPM export branch untouched at a16bad6.

---

## Arc of this session

From "Sprint 1 closed, Sprint 2 has one branch in flight" to "QPM bridge fully operational, first Sprint 2 deliverable merged, trust-surface gap in Overview closed via an independent audit-and-amend cycle, build-then-review pattern established as the working method."

Five distinct actions executed, one of them deferred, plus one major audit-driven slice (TA-4b). Every action landed on epic/replatform-execution; main untouched since PR #70 on April 20.

---

## Executed actions

### Action 1 — TA-5 PR opened and merged (#69)
Codex's scenario-lab enrichment branch (feat/sprint1-ta-5-scenario-lab-enrichment, commit 5bc1d13) opened as PR #69, merged into epic/replatform-execution at 0cb7f89. This closed Sprint 1's final Track A slice. Delivered: preset chips replacing the select dropdown, URL-based preset hydration (?preset=<id> with fallback-on-unknown), progressive-disclosure technical-variable names, TB-P3-compliant AI attribution block on InterpretationPanel (template/assisted/reviewed with verbatim-locked disclaimer copy in EN/RU/UZ), safety interlock preventing "reviewed" mode without a named reviewer, and a new PageHeader meta slot for Scenario Lab.

### Action 2 — Test-script fix (#70)
Pre-existing bug from TA-2 (#62): `npm test` used `--test-isolation=none` (invalid Node 22+ flag) and an unquoted `**/*.test.js` glob that only expanded with bash globstar. Results on user's Node 24 Windows environment: `bad option: --test-isolation=none` exit, and even if that were fixed, the glob matched only 3 of 16 test files. Recovery loop (my first prescription `node --test <directory>` failed with MODULE_NOT_FOUND on v24; switched to internally-expanded quoted glob). Final fix: `node --experimental-specifier-resolution=node --test "./.test-dist/tests/**/*.test.js"`. PR #70 merged to **main** (not epic — user clicked the default dropdown; we reconciled later with a merge-forward).

### Action 3 — Scenario ID reconciliation decision doc (#71)
Written decision recording that the R solver (scripts/export_qpm.R) is the source of truth for scenario naming, and the frontend Scenario Lab mocks bend to it. The five QPM scenario IDs (baseline, rate-cut-100bp, rate-hike-100bp, exchange-rate-shock, remittance-downside) become canonical; the frontend retires balanced-baseline, external-slowdown, fiscal-consolidation, inflation-persistence. Doc committed as docs/data-bridge/01_scenario_id_reconciliation.md. Bundled with a small .gitignore addition for .tmp-dev-*.log and conversation-history-*.md files that had been appearing as untracked. Merged at 3274c09.

### Action 3.5 — Merge-forward: main into epic
PR #70 had merged to main, not epic. Without reconciliation, epic would have the scenario-ID doc but not the test-script fix, blocking Sprint 2 verification steps that depend on `npm test`. Ran `git merge origin/main --no-ff` directly on epic (no PR — this was long-running-branch maintenance). First attempt showed "Already up to date" because the local origin/main ref was stale from a partial pull; `git fetch --all` resolved it. Merge commit landed at 412ab9f. Lesson noted for future actions: always check the base-branch dropdown on GitHub is `epic/replatform-execution`, not `main`; GitHub defaults to main.

### Action 4 — QPM bridge PR (#72)
The big Sprint 2 opener. Amended the existing a16bad6 commit (R export script + sample JSON) to include four additions: a sixth caveat (qpm-baseline-disinflation-overshoot, explaining the Q1→T=8 disinflation overshoot is a hybrid-NK model dynamic, not a bug); the consumer contract doc at docs/data-bridge/00_qpm_contract.md (documents JSON shape, unit conventions with s_shock locked as percentage points, absent fields by design, Sprint 2 consumer wiring checklist); frontend Scenario Lab mock updated to match the reconciled IDs; one hardcoded `balanced-baseline` in scenario-lab-live.ts renamed to `baseline`.

After Claude Code's first amend (4eac689) completed, spotted three silent UX regressions the agent had flagged as "out of scope" — three risk cards on Overview still pointed to retired presets (external-slowdown, inflation-persistence, fiscal-consolidation). Second amend (7b01c1d) remapped risk-external-slowdown → remittance-downside, risk-inflation-persistence → rate-hike-100bp with label update ("Policy rate hike response"), risk-fiscal-slippage scenario_query removed entirely (button suppressed, label updated to "Fiscal discipline (requires CGE — Sprint 3+)"). PR #72 merged at 641877a. 9 files, +971/-48.

### Action 5 — Nightly CI workflow (#73)
The 30-line YAML that operationalizes TB-P2 Option B: `.github/workflows/data-regen.yml` runs `scripts/export_qpm.R` at 21:00 UTC daily (02:00 Asia/Tashkent) plus manual workflow_dispatch. Contents: write permission scoped minimum; 10-minute timeout; diff check prevents empty nightly commits when calibration hasn't moved. Single commit 9af69f4. Merged at ae1a5de.

### Action 5.5 — Cherry-pick onto main: DEFERRED
Discovered after merge that the workflow UI-discovery and cron triggers require the workflow file to exist on the default branch. Since PR #73 merged to epic (correct per our pattern), GitHub showed "This workflow does not exist" when trying to run it manually. Prepared a cherry-pick prompt to bring just the YAML file onto main without dragging the rest of epic. User asked whether this was necessary; I explained the tradeoff (scheduled cron won't fire until workflow is on main, but no consumers yet, and deferring keeps bridge-CI question separate from TB-P1 deployment migration). User chose to defer. Workflow file remains on epic only; nightly cron will not fire until someone enables it. No practical impact yet — no downstream consumers of `qpm.json` exist yet.

### Local cleanup pass
User's local repo had accumulated ~18 branches and 8 `.claude/worktrees/*` from past agent sessions. Cleaned via:
- `git fetch --prune` removed 12 stale `origin/*` tracking refs for branches already deleted on GitHub
- Batch `git worktree remove` loop cleared all 8 claude/* worktrees plus their branches (--force where needed because Claude Code sessions leave some commits unmerged by strict git definition)
- Regular `git branch -D` deletes for other merged feature branches
- Final state: clean, just `epic/replatform-execution` and `main` locally

---

## TA-4b — Audit-driven trust-surface slice (#74)

This was the substantive piece of the session. User commissioned a gap analysis from Codex between spec_prototype_1.html and the /overview implementation before committing to a broader buildout.

### Codex's audit produced four findings
- **P1-A** — Trust surfaces (caveats, references) present in data contract, never rendered on page
- **P1-B** — Activity feed is a stub (reforms column hardcoded empty, refresh column synthesized from headline-metric attribution)
- **P1-C** — Model-count contradicts itself between header (derived from attribution), snapshot's model_ids[], and mock (every KPI stamped with single synthetic model)
- **P2-A** — Source Sans 3 declared in tokens.css, never imported in index.html (silent fallback to system fonts)

Plus non-blocking items: saved-scenarios chip missing from shell (P2 minor, defer until TA-6), Knowledge Hub still placeholder (known TA-8 item), default mock-mode operation (reframed as "consumer wiring hasn't started" rather than bug).

### Build/review split established
Decision: Claude Code builds, Codex reviews. First use of this pattern; intended to persist for future audit-driven slices.

### Build pass (Claude Code, commit 7f4e0f8)
Prompt prescribed: Source Sans 3 import (smallest first), model-count reconciliation via snapshot.model_ids with an attribution-consistency unit test, CaveatPanel component (severity-sorted), ReferencesFooter component, OverviewActivityFeed contract with three named arrays (PolicyAction / DataRefresh / SavedScenarioActivity), adapter+guard updates, mock populated with representative entries, three locale additions (EN/RU/UZ). Went with Option A on the feed-shape question (three arrays, not tagged union) — rationale: maps directly to the prototype's three-column layout, per-stream types extend independently.

Claude Code verified via browser preview (spun up `npm run dev`, navigated to /overview, queried DOM to confirm MODELS·3 LIVE in header, three caveats sorted, three references at footer, three feed columns each with three entries, `getComputedStyle(body).fontFamily` confirming Source Sans 3 loaded). Beyond what the prompt required — good independent-verification instinct. Test count 48 (not the prescribed 47) because the agent noticed model_attribution was array-typed, not scalar, and rewrote the consistency test to iterate correctly — producing two test cases instead of one. Correct adaptation.

15 files, +626/-91. PR #74 opened.

### Review pass (Codex)
REQUEST CHANGES with four blocking items. All four real; three of them genuinely-broken-output rather than taste.

- **BLOCKING-1** — saved_scenarios from snapshot.activity_feed is dead data. OverviewFeeds.tsx renders the third column from scenarioStore (browser localStorage), not from activityFeed.saved_scenarios. The mock saved_scenarios entries I had Claude Code add are never rendered.
- **BLOCKING-2** — Guard permits missing activityFeed. Only warns on malformed nested arrays, accepts missing top-level field silently. Adapter silently backfills empty arrays. Live fixture (overview-live.ts) omits the field entirely. Runtime drift from type-level "required" contract.
- **BLOCKING-3** — CSS uses undefined tokens without fallbacks. overview.css references --space-1/2/3/4, --font-size-xs/sm, --color-surface-subtle — none of which exist in tokens.css. Browsers drop declarations silently. Panels render without intended spacing/typography/background. My fault twice: prescribed the names without verifying against tokens.css; Claude Code copy-pasted them without cross-checking. Browser-preview verification didn't catch it because visual collapse looked "okay" at a glance. Codex caught by actually reading tokens.css.
- **BLOCKING-4** — Insufficient tests on the fixed paths.

### Amend pass (Claude Code, commit c36bd34)
Chose Option A on saved_scenarios (render from snapshot only, drop scenarioStore dependency). Rationale: closes finding cleanly; browser-local scenarioStore as an Overview surface is a Sprint 3+ multi-user feature anyway; simpler code.

Amend executed: CSS rewrite with correct tokens (--space-xs/sm/md/lg, --color-surface-muted, literal 0.75rem/0.875rem font sizes, hex status colors with future-design-system-polish flagged as follow-up); OverviewFeeds stripped of useSyncExternalStore + scenarioStore imports, third column now reads from activityFeed.saved_scenarios; overview-feed-utils.ts dead helpers (buildSavedScenarioFeedRows, getSessionId) removed; "youShort" locale strings removed across EN/RU/UZ; guard now errors on missing activityFeed (not warning); adapter's defensive empty-array fallback preserved but commented as "guard is enforcement layer"; overview-live.ts populated with all three streams; three new tests added (guard missing / guard accepts / caveat-panel with three sub-tests).

53/53 tests passing (48 baseline + 5 net new after deleting the stale buildSavedScenarioFeedRows test). 19 files, +883/-283. Force-pushed c36bd34.

### Re-verification (Codex)
Targeted re-check against only the four blocking items, not a full re-review. APPROVE TO MERGE.

### Merged
PR #74 merged to epic/replatform-execution.

---

## State at session end (2026-04-21 evening)

### Merged to epic/replatform-execution during this session
- PR #69 — TA-5 scenario lab enrichment (preset chips, URL hydration, TB-P3 assisted/reviewed attribution block)
- PR #70 — test-script fix (merged to main, then merge-forward into epic)
- PR #71 — scenario ID reconciliation decision doc + .gitignore cleanup
- PR #72 — QPM bridge (R export script, consumer contract doc, scenario-ID-aligned frontend mocks, Overview risk-card remaps)
- PR #73 — nightly CI workflow YAML
- PR #74 — TA-4b Overview trust surfaces (caveats render, references render, typed activity feed, model-count reconciliation, Source Sans 3 loaded, amended once per Codex review)

### On branches, not merged
Nothing in flight. All local feature branches cleaned up after merges.

### Deferred decisions still open
- **TB-P1 (deployment migration)** — the sunset question for cerr-uzbekistan.github.io's legacy static site vs. eventual React-rebuild deployment. Deferred to Sprint 3+ pending headcount and clearer parity signal.
- **TB-P4 (named pilot users)** — deferred to Sprint 3+; mitigation is opportunistic informal review before Sprint 2 closes.
- **Nightly workflow activation** — cherry-pick onto main was deferred this session. Scheduled cron does not fire because workflow doesn't live on default branch. No consumers yet, so no impact.

### Workflow conventions established or refined
- **Build/review pattern** — Claude Code builds, Codex reviews with structured two-pass output (PASS/PARTIAL/FAIL verdicts on original findings, plus BLOCKING/NON-BLOCKING/NIT new findings). First used on TA-4b; intended to persist. One amend cycle worked cleanly (no new PR, no branch stacking — force-push-with-lease on existing branch).
- **Amend rather than stack** — when review requests changes, amend the existing commit and force-push (--force-with-lease), so PR picks up amended commit automatically. Used twice in session: once on Action 4 second amend (UX regressions), once on TA-4b.
- **STOP-on-unexpected-output** remains the load-bearing discipline — caught the Node flag issue on Action 2 (saved an expensive silent commit), caught the model_attribution scalar-vs-array assumption on TA-4b build (agent corrected mid-execution).
- **Pre-emptive note to reviewer** — when writing the review prompt, explicitly frame known quirks (test count adapted from 47 to 48 because of array iteration; status colors using hex fallbacks) so reviewer doesn't waste cycles relitigating them. Worked on TA-4b.
- **PowerShell-native commands** for Windows — switched from `grep`/`head`/`tail` to `Select-String`/`Get-Content -TotalCount`/`Get-Content -Tail` after observing PowerShell parser errors on bash-isms. Cheat-sheet established.
- **Base-branch check** — always verify GitHub PR creation form shows `epic/replatform-execution`, not default `main`. Mistake on Action 2 caused the main-vs-epic drift that required Action 3.5 merge-forward.

### Sprint 2 status
Deliverables merged: TA-4b (Overview trust surfaces), QPM bridge complete as a unit (solver port + JSON + contract + frontend alignment + nightly CI workflow written).

Sprint 2 remaining: TA-6 (Comparison enrichment — wire scenarioStore save/load to Comparison page end-to-end), TA-7 (Model Explorer polish), TA-8 (Knowledge Hub content port), TA-9 (AI surface treatment — uses the generation_mode schema from TB-P3 plus the reviewer fields from TA-5).

Model bridges remaining: DFM (target 2026-05-08), PE, IO, CGE, FPP. Same five-PR pattern as QPM (solver port + JSON export + consumer contract + frontend alignment + nightly CI), now established.

### Pending non-blocking follow-ups for backlog
- Status-color tokens in design system (currently hex-literal in overview.css) — design-system polish
- Bundle size optimization (881 KB JS; was 873 pre-TA-4b) — defer until a real performance complaint or measurable user signal
- Remaining CERR/MEF references noted in audit-test-fixture strings — pure test-local literals, no user-facing impact
- Component tests for ReferencesFooter and empty-feed-stream states — value-add, not regression-critical
- action_type enum on PolicyAction likely needs expansion when policy stream becomes production-backed (presidential decrees, ministerial orders) — Sprint 3+ concern
- Nightly workflow cherry-pick onto main — revisit when first consumer (TA-9 or TA-6) actually needs fresh JSON

### Lessons worth naming from this session
1. Build-then-review with independent auditor catches real bugs the builder can't see. TA-4b's CSS token mismatch would have shipped without review.
2. Amending-in-place beats stacking follow-up PRs for review-requested changes. Keeps the commit history clean and the PR description accurate.
3. Merging to main by accident (Action 2) creates silent drift that manifests later as "the tests don't work on epic." Branch-dropdown discipline is cheap; ignoring it is expensive.
4. Agent self-verification (running `npm test`, reading `git status`) catches some problems; browser-preview verification catches more; but neither replaces a reviewer with a standard to hold the work against. All three layers earned their place this session.
5. Scope-cutting the "out of scope" list explicitly in the prompt (and repeating it in the commit message) prevents mid-execution feature creep, without requiring the agent to ask permission for every adjacent fix.
