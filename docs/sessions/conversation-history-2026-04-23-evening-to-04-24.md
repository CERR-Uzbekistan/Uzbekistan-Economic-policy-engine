# Uzbekistan Economic Policy Engine — Five-page audit + Shot 1 alignment slice

**Date range:** 2026-04-23 evening → 2026-04-24 evening (Tashkent time)
**Participants:** Nozimjon Ortiqov (project owner) + Claude (advisor/reviewer) + Claude Code (builder) + Codex (reviewer; also did pre-build prompt review)
**Prior chapter:** TA-6a merged (PR #75) closed silent-corruption hazard on saved scenarios; QPM bridge fully operational; build/review pattern proven through three slices. DFM bridge PRs 2–3 merged (PR #86 consumer wiring, PR #87 Overview integration). PR #88 — Codex's experimental one-shot MVP branch — opened but never merged; treated as reference-only artifact. Sprint 2 mid-flight.
**Context at session start:** New Claude thread opening. User had run a five-page audit (one Claude Code, one Codex self-audit) comparing Codex's MVP branch against `spec.html` prototype. 12 LARGE findings concentrated on Model Explorer (5), Comparison (4), Knowledge Hub (2), Scenario Lab (2 codex-side additions), Overview (1). Three patterns identified: editorial compression, visual register flattening, interaction model shift (workbench vs document).

---

## Arc of this session

From "we have audit findings on five pages, what do we do" to "Shot 1 prototype alignment merged after one amend cycle." Six per-page screenshot reviews to lock alignment decisions. Five prompt iterations including one full Codex prompt-review pass that surfaced 16 findings before any code was written. One Claude Code build delivering all five page rebuilds in seven commits. One Codex three-pass review surfacing two real BLOCKING data-integrity bugs. One amend cycle. Final APPROVE TO MERGE after targeted re-verification.

The shape of the work: longest single conversation we've run on this project. Most ambitious slice scope (five pages simultaneously). Most disciplined pre-build process. Validated three meta-conventions that previous slices only hinted at.

---

## Per-page screenshot review — five alignment decisions locked

User uploaded prototype + Codex-build screenshots for each page in sequence. Each pair adjudicated in one round.

### Decisions locked (in order discussed)

| Page | Decision | Rationale |
|---|---|---|
| **Knowledge Hub** | A — full alignment | Codex's filterable-database UI vs prototype's two-column timeline + briefs. Prototype reads as institutional, Codex reads as product. Same content survives the rebuild. |
| **Model Explorer** | A — full alignment, keep Codex's 6-model content | Most credibility-establishing page on the product. Prototype's inline math, severity-coded status badges (six different labels), numbered caveats with severity borders, parameter tables with inactive flags, validation summaries — all of these are institutional trust surfaces. Codex's flat catalog cards + 4-tab generic detail vs prototype's 6-card severity-coded catalog + 5-tab two-column body. Sole rebuild where I called out "even stronger A than Knowledge Hub." |
| **Overview** | Mixed — accept structure + 5 polish items | Codex's structural work was actually 80% aligned. Five polish items: `<em>` emphasis on key numbers, named-reviewer provenance line, contextual footnotes per KPI tile (Shot 2 sentinels), remove "Core indicators" section head, revert delta chip-pills to inline arrow text. Keep CaveatPanel and ReferencesFooter (additive trust-surface, not drift). |
| **Scenario Lab** | Mixed — restore prototype interaction patterns; keep Codex's 8 assumptions | The hardest call. Codex's additions were substantive (scenario metadata, saved-scenarios inline, 8 assumptions vs prototype's 5). Codex's losses were also substantive (sliders → number inputs, time-series impulse-response → horizontal-bar chart, AI disclaimer hidden by default, dead suggested-next links). Mixed call: restore sliders + impulse-response chart + always-visible disclaimer + clickable suggested-next + scenario metadata in collapsed `▶ Scenario details` + saved-scenarios via modal not inline. |
| **Comparison** | A — full alignment rebuild | Sharpest "workbench vs document" divergence. Prototype's three-step policymaker workflow (chip rail → 3 summary cards → 7-row delta table → editorial trade-off summary) vs Codex's analyst workbench (full-panel selector → small KPI cards → 4-row delta table → comparative chart panel → template-generated summary). Drop the chart panel, drop tag dropdowns. Trade-off summary handled via hybrid template shells + sentinel fallback. |

### Cross-cutting choices

- **Codex's MVP branch stays alive as reference branch.** Each alignment slice pulls specific files via `git checkout codex/mvp-replatform-finish -- <path>` when needed. Nothing from PR #88 merges directly.
- **Editorial content is Shot 2** — KPI footnotes, trade-off shells, Model Explorer caveat prose, validation summaries. Owned by @nozim + CERR staff. Structure ships with `[SME content pending]` sentinel chips visible in UI.
- **Builder/reviewer split:** Claude Code builds Shot 1 (mechanical structural alignment as single PR). Codex reviews three-pass.

---

## Shot 1 prompt drafting — five iterations, one Codex prompt-review pass

### Iteration arc

Prompt drafting was the second-largest cost of the session after the build itself. Five iterations:

1. **v1 draft.** Written from spec.html alone; my first end-to-end read of the file. 1050 lines / 61 KB. Saved to chat as artifact.
2. **Pause for review-before-build decision.** Default would have been to ship v1 to Claude Code immediately. User's instinct: "may be to give this prompt to Codex first for review?" Significant convention move — explicitly requested **prompt-review pass with the designated reviewer before build**, not just review-after-build. I pushed back lightly for honest framing but the request was stronger than my default.
3. **Codex prompt-review.** Codex read v1 against actual `epic/replatform-execution` branch state. Returned **10 BLOCKING + 6 NON-BLOCKING + 3 NIT** findings. Every BLOCKING was a factual claim the prompt made that didn't match the codebase: `spec.html` at root was 95-line markdown loader (not the 2831-line prototype I assumed), ChartRenderer at `components/system/` not `components/charts/`, locales at `src/locales/` not `public/locales/`, scenarioStore at `src/state/` not `src/data/scenarios/`, route is `/scenario-lab` not `/lab`, Model Explorer fields are `model_type` + `frequency` + `status: 'active'/'staging'/'paused'` not the names I invented, `ReactNode` in serializable contract would break guards/raw-payloads, `.ui-chip--warn` doesn't exist in base.css, and several others.
4. **v2 draft.** All 16 findings adjudicated and incorporated. Three of my own decisions: prototype path becomes `docs/alignment/spec_prototype.html` (committed by supervisor as setup), JSX-in-mock with id lookup keeps contract serializable, `--color-uncertainty` alpha preserved (not changed to prototype parity — load-bearing for DFM three-band rendering). 1182 lines / 66 KB.
5. **v2 verification by Codex.** Targeted re-review pass: do v1→v2 corrections land correctly + is JSX-in-mock pattern sound. First v2-verification attempt returned all FAIL — turned out user had attached v1 to Codex by mistake. Second attempt with v2 actually attached: **all 10 BLOCKING PASS, JSX-in-mock SOUND.**

### Cost vs value

Five iterations. Cost: real, several hours of supervisor + Codex time before Claude Code began. Value: Codex's prompt-review pass surfaced 16 errors that would have produced wrong build output. Estimated savings: 1-2 days of build-then-discover-then-amend cycles avoided. Worth it. Established as convention (see Conventions section below).

### Note on v1-vs-v2 attachment confusion

When Codex's first re-verification of v2 returned all FAIL (claiming "v2 corrections not landed"), I stopped instead of accepting the verdict. Verified my sandbox file had the corrections (it did). Diagnosed three possible failure modes; user discovered the actual cause — v1 was attached to Codex by habit (since we'd discussed v1 first). Re-attached v2 explicitly. All 10 PASS. Catching this saved an iteration cycle of "amend toward corrections that v2 already has" which would have produced v3 worse than v2.

Lesson: when transferring files to agents, **verify filename matches what was just produced**, and ideally open the file once and confirm one known-changed line matches. 10 seconds, catches this class of error before propagating.

---

## Shot 1 build (Claude Code) — seven commits, single push sequence

Branch: `feat/prototype-alignment-shot-1` off `epic/replatform-execution`. Two precondition commits by supervisor (spec_prototype.html committed at `docs/alignment/`, prompt v2 committed alongside). Branch pushed before Claude Code began.

### Read-before-write audit phase

Claude Code's first commit on the branch was `e3c4dd2 docs(alignment): shot-1 pre-build audit` — `docs/alignment/01_shot1_audit.md`. Per-page state summaries for all five pages, contract additivity strategies for four tension points, cross-page shared-component impact matrix, sentinel inventory, test surface projection, STOP-condition checklist.

Verdict: **BUILD-READY.** All preconditions PASS. Four cross-cutting items surfaced (Source Sans 3 missing `@import`, four missing tokens, `.ui-chip--warn` absent, `chart-label-utils.ts` pull is no-op since helper already in epic) — all addressable in cross-cutting setup commit.

Key adjudications I made on the audit:

- **Model Explorer parallel-types choice blessed.** Keep existing `ModelExplorerModelEntry`/`ModelExplorerModelDetail`; add `ModelCatalogEntry` + `catalog_entries_by_model_id` in parallel. `ModelExplorerTabId` extended additively with `'overview'`.
- **Comparison composition layer in adapter blessed.** Derive `ComparisonContent` from existing `ComparisonWorkspace` + selection state inside `data/adapters/comparison.ts`. QPM bridge stays on existing shape.
- **Overview reviewerInfo gate removal blessed.** Existing `EconomicStateHeader` had a `"TA-9 / TB-P3 gate"` comment hiding the reviewer prop; removed per spec, sentinel chip handles absent reviewer_name.
- **Model Explorer tab pattern: filter-to-section.** Overview tab shows full 2-col body; other four tabs filter to their respective section.
- **scenarioStore pull skipped.** Audit recommended skip; accepted to keep slice scoped.

### Build phase

Claude Code executed in one continuous session (the agent was kept on it; user did not interrupt). Commit sequence:

```
c5aaf05 test(alignment): shot 1 — adapter + component coverage  (133 tests, +19)
8eb218c feat(alignment): shot 1 — Model Explorer                 (6 models, 5-tab)
d3a1ad4 feat(alignment): shot 1 — Comparison rebuild              (chip-rail, 7-row)
3a8bb24 feat(alignment): shot 1 — Scenario Lab restoration        (sliders, modal)
b678b1a feat(alignment): shot 1 — Overview polish (5 items)       (em, provenance)
568b055 feat(alignment): shot 1 — Knowledge Hub                   (greenfield 2-col)
d1da503 chore(alignment): shot 1 — tokens, primitives, contract  (cross-cutting)
e3c4dd2 docs(alignment): shot-1 pre-build audit
```

Final stats: ~2,300 LOC added / ~400 removed across ~35 unique files, within the prompt's +1500–2500 LOC / 15-25 files target (Knowledge Hub greenfield + Model Explorer's 14 component files explained the file-count overage). 133 tests passing (+19 new). Bundle size in line with prior slices.

### Browser preview verification before PR

User asked Claude Code to run preview. Claude Code spun dev server, walked all five pages, took screenshots, ran DOM queries to verify each success criterion. All five pages PASS visual + interaction verification. RU locale spot-checked. No console errors. Preview stopped cleanly.

### PR opened

PR #89 against `epic/replatform-execution` (base-branch dropdown checked — same trap as PR #70 in April-21 session). Title: `feat(alignment): shot 1 — structural prototype alignment across five pages`. Description structured for Codex's three-pass review with all required sections (summary, per-page status table, contract changes, cross-cutting setup, Shot 2 placeholders inventory, dropped/kept from Codex branch, known carve-outs, judgment calls, tests, verification steps, out-of-scope).

---

## Codex three-pass review (cycle 1) — REQUEST CHANGES with two real BLOCKING bugs

Codex got stuck on Pass 3 dev-server spawning (known PowerShell limitation from April 22 session). User noticed. I sent a follow-up to skip live-render, complete Pass 3 via static analysis, return verdict on what was already gathered. Codex then completed and returned full structured findings.

### Findings

**BLOCKING-1 — Comparison disconnected from QPM/source pipeline.** `ComparisonPage.tsx:10` imports `comparisonContentMock` directly. New UI never goes through `data/adapters/comparison.ts` or `data/comparison/source.ts`. QPM bridge data has no path to reach the rebuilt UI. **This violated audit §3.4 which committed to building the composition layer.** Claude Code's PR description honestly *flagged* this as a carve-out, but the audit had explicitly committed to the work as part of Shot 1. Catching the gap between "audit said build this" and "PR description said defer this" was exactly the kind of finding only an external reviewer catches.

**BLOCKING-2 — Overview guard drops structured narrative summaries.** `overview-guard.ts:174` coerces `summary` with `asString()`. Contract widened `MacroSnapshot.summary` to `string | NarrativeSegment[]`, but guard silently strips the array form. Live payloads sending the structured shape would be downgraded. Textbook "guard not extended in lockstep with contract widening" bug. Audit §3.2 had flagged the risk; build evidently missed handling it.

**NON-BLOCKING-1 — Baseline switcher missing.** `ComparisonSelector.tsx:12-14` documents the baseline switcher was not reintroduced. Spec said keep it. Codex graded NON-BLOCKING because data model still has `default_baseline_id` so underlying state isn't broken — only the UI affordance is missing. I lifted to BLOCKING for the amend (same surgery zone as BLOCKING-1, bundling cleaner than separate amend cycle).

**NON-BLOCKING-2 (PR description only) — Knowledge Hub mock-only carve-out.** PR description listed Comparison live-wiring as Shot 2 carve-out but didn't mention Knowledge Hub source's mock-only state. Asymmetric, fixable in PR description without code change.

### Pass 1 anchors

All 5 pages PASS on visual anchors. Comparison flagged as "STATIC PASS, ARCH FAIL" — visually correct, architecturally wrong. Right separation.

### Pass 3 runtime

`npm install` clean, `npm test` 133 passing, `npm run build` clean (existing chunk warning, not regression), 5 pages loaded with no console warnings/errors, RU/UZ no missing-key warnings, interactions verified (saved modal opens, preset hydration, slider/number-input mirror, chip removal, tab switching).

---

## Shot 1 amend cycle 1 — single commit, four items resolved

Claude Code received targeted amend prompt. All four items closed in commit `bdf4f66`:

### What landed in the amend

- **BLOCKING-1 fix.** Added `composeComparisonContent(workspace, selectedIds, baselineId): ComparisonContent` to `data/adapters/comparison.ts`. `ComparisonPage.tsx` rewired to consume `loadComparisonSourceState` → composer pipeline. Hardcoded mock kept as test fixture only. New adapter test (`tests/data/adapters/compose-comparison-content.test.ts`).
- **BLOCKING-2 fix.** New `asSummary()` helper in `overview-guard.ts` validates and preserves both `string` and `NarrativeSegment[]` forms. Rejects malformed with error-severity (propagates `ok: false`). New guard test (`tests/data/adapters/overview-guard-summary.test.ts`).
- **NON-BLOCKING-1 fix.** Baseline switcher restored as labeled `<select>` in `ComparisonSelector`. Re-derives content on baseline change. New baseline-switcher test.
- **NON-BLOCKING-2 fix.** PR #89 description updated on GitHub with Knowledge Hub mock-only carve-out bullet.

### Stealth bug caught by preview verification

While running `npm run dev` for amend verification, Claude Code discovered duplicate `comparison.tradeoff` keys in all three locale JSON files (en/ru/uz). The second occurrence was overwriting the first; JSON parses fine but locale resolution silently picked the wrong text block. Fixed by merging the duplicate keys into single blocks per locale. **Third instance in the project of "preview verification catches what tests don't"** — worth marking as a convention point.

### Test count after amend

133 → 150 (+17 net new across the three new test files). `npm run build` clean.

### Commit strategy

Single amend commit `bdf4f66` force-pushed-with-lease. Amend semantics rather than stack — keeps the per-page commit history truthful about what each commit delivers (Comparison rebuild commit now actually wires the page to the source pipeline rather than a misleading "rebuild" + "fix" sequence).

---

## State at session end (2026-04-24 evening, in progress)

### Branch state
- `feat/prototype-alignment-shot-1` at `bdf4f66`
- 8 commits total: 2 supervisor preconditions + audit + cross-cutting setup + 5 page commits + tests commit + amend
- 150 tests passing
- Bundle build clean

### PR state
- PR #89 open against `epic/replatform-execution`
- Description updated with KH carve-out + amend-cycle section
- Amend summary comment posted for Codex
- Codex re-verifying targeted scope (4 items) at session pause point

### Final close (post amend cycle 2)
PR #89 merged to `epic/replatform-execution` via squash merge. Codex's targeted re-verification on amend cycle 1 surfaced a new BLOCKING — when default live mode rendered the rebuilt Comparison page, only 4 metric rows appeared (the QPM bridge supplies 4 metrics, not the 7 the Shot 1 anchor required). The original Shot 1 PR had hidden this gap because `ComparisonPage` read a hardcoded 7-row mock; cycle 1's BLOCKING-1 fix removed the hardcoded mock and exposed the live-source content gap. Codex resolved this in-place at commit `5395f46` rather than handing back through full amend cycle: introduced `SHOT1_COMPARISON_METRICS` scaffold (the 7 canonical metrics in canonical order) plus `toShot1MetricDefinitions()` merger that always emits 7 rows, preserving live QPM values where available and rendering unresolved cross-model rows as `—`. Plus regression test ("keeps the Shot-1 7-row table when live QPM supplies only core metrics") and the doc-comment nit on `comparison-content.ts:4-5`.

Claude Code independently verified Codex's fix: 151/151 tests pass, build clean (only pre-existing Vite chunk-size warning), branch in sync with `5395f46`. PR mergeable, reviewDecision cleared. Sprint 2's largest deliverable closed.

### Sprint 2 status (post-Shot-1 merge)
- All five pages structurally aligned with prototype
- Editorial content gap flagged systematically via sentinel chip pattern
- DFM PR 4 nightly regen workflow still pending (deferred from earlier in session)
- Remaining Sprint 2 work: TA-9 (AI surface treatment — consumes TB-P3 fields), Shot 2 editorial content drafts, model bridges for PE/IO/CGE/FPP

### Backlog items added this session
- Editorial content Shot 2: 8 KPI footnotes (Overview), 5 model validation summaries (Model Explorer), trade-off Shell A + Shell C (Comparison), full equation sets for DFM/PE/IO/CGE/FPP (Model Explorer), RU/UZ Shell B translations, RU/UZ Knowledge Hub reform/brief content
- Live wiring backlog: `+ Add saved scenario` modal on Comparison (stub onClick today), live-mode QPM impulse-response chart on Scenario Lab, `unemployment_avg` and `real_wages_cumulative` from real model outputs, Knowledge Hub VITE_* mode parametrization
- Duplicate `comparison.tradeoff` locale key bug — fixed in amend; lesson noted for future locale-merge work

---

## Conventions established or refined this session

### New convention: prompt-review pass before build for multi-surface slices

User's "may be to give this prompt to Codex first for review?" became the strongest workflow innovation of the session. Should be the default for any prompt that:
- Touches more than one extend-existing-surface slice (i.e., 2+ pages affected)
- Exceeds ~40 KB in size
- Will produce builds expected to exceed ~500 LOC

Cost per pass: 30-60 minutes Codex time. Value: catches factual errors that would otherwise produce wrong build output. Codex's value here is **catching prompt assumptions that don't match codebase reality** — exactly the failure mode my prior prompts had silently exhibited.

### New convention: spec/reference files committed by supervisor as branch preconditions

Before builder begins, supervisor commits primary references (in this case `spec_prototype.html` + the prompt itself) as the first commits on the branch. Builder verifies these exist before starting audit. Establishes a clean audit trail: "what reference was the build held against?" answers itself by reading the branch.

### Refined convention: targeted re-verification after amend, not full re-review

Codex's first review used the full three-pass framework. Re-verification after amend used a **targeted four-item check** — only the four flagged findings. Took ~5 minutes vs ~30 minutes for full re-review. No new finding scope. This restraint is what makes the amend-cycle pattern affordable.

### Refined convention: amend-in-place via force-push-with-lease as default

Two amend cycles in the session, both used force-push amend rather than stacked commits. Keeps per-commit history truthful (e.g., "Comparison rebuild commit" doesn't exist as "rebuild that didn't wire the page" + "later fix that did" — it exists as one commit that does the work the message claims).

### Validated convention: preview verification before PR

Three instances now of preview-only-catches in the project (TA-4b CSS token mismatch was the first; today's amend caught the duplicate locale key). The pattern: tests verify what was thought-of; preview verification catches what wasn't. Both layers earn their place. **Builder running `npm run dev` and walking the rendered output before PR opens is now a hard precondition for PR opening on any structural slice.**

### Three-tier review pattern continues to validate

- Builder self-verification (caught duplicate locale key when running preview)
- Supervisor pre-PR review (caught the v1-vs-v2 file confusion via path verification)
- Reviewer post-PR review (caught composition layer gap + guard widening miss)

Each tier catches different failures. Removing any tier loses bugs.

---

## Lessons worth naming from this session

### 1. Prompt-vs-codebase drift compounds when supervisor lacks primary repo access

I wrote v1 of the alignment prompt against conversation summaries plus the spec.html file alone. I never verified paths, field names, or routes against the actual epic branch — I had no way to. Codex's prompt-review pass surfaced 16 factual errors. Without that pass, those errors would have manifested at build time as scope mismatches, contract drift, or worse, hidden in the eventual PR.

**Mitigation going forward:** prompt-review pass becomes default for multi-surface slices. Optionally, user pastes key repo files (package.json, contract, one page implementation) at slice-start so I have primary sources rather than summaries.

### 2. Carve-outs in PR description aren't a substitute for following the spec

Claude Code honestly flagged the Comparison composition layer as "Shot 2 carve-out" in the PR description. But the *audit* — which Claude Code itself wrote and which I blessed before build began — had explicitly committed to building the composition layer in the adapter as part of Shot 1. The "honest flag in PR" felt like good practice, but it was actually **silently revising the contract between audit and PR.**

Codex caught this by reading the audit alongside the PR. The right response wasn't "Codex is wrong, the carve-out is documented" — it was "the audit committed to this work and the work didn't land; build the missing piece."

**Mitigation going forward:** amend prompts should explicitly cite the audit's commitments when the PR description tries to defer them. If a carve-out genuinely needs to defer audit-committed work, that's a STOP condition during build, not a PR-description footnote after build.

### 3. Editorial register decisions resist agent-side reversal

Pattern across Knowledge Hub, Model Explorer, Comparison reviews: Codex's MVP build flattened editorial register in consistent ways. Filterable card grids replaced timelines. Generic "Active/Staging" status replaced six different severity-coded labels. Template-generated comparison sentences replaced editorial prose. None of these were errors per se — they were defaults the agent reached for when editorial guidance wasn't tight enough in the original prompt.

The Shot 1 prompt was tight enough that Claude Code didn't reproduce these defaults. But this pattern suggests: **when editorial register matters, it has to be encoded specifically into the prompt**, not just gestured at via "match the prototype." The Shot 1 prompt's per-page sections cited specific class names, specific copy, specific arrangement. That specificity was load-bearing.

### 4. The five-page audit phase shouldn't be skipped even when prior session has full context

User loaded the prior conversation history files into the project, but I still asked for screenshots before drafting the prompt. Reasoning: summary fidelity has limits, especially for visual decisions. The screenshots produced five Mixed/A decisions that drove every per-page spec in the build prompt. Without them, the prompt would have been written against my mental model of "Codex's build is wrong" — which would have been less accurate than per-page adjudication.

**Pattern:** when starting a new slice that touches existing surfaces, **screenshot review is the first step**, not "I'll work from memory of prior session findings."

### 5. Tools that work for builder don't always work for reviewer in same environment

Codex hung on `npm run dev` background spawning during Pass 3 — same environmental issue documented April 22. Meanwhile, Claude Code ran `npm run dev` cleanly during preview verification on the same machine. The difference: Claude Code uses a different process-spawning approach than Codex on Windows PowerShell.

**Mitigation going forward:** Pass 3 runtime verification for Codex on Windows defaults to "static analysis + supervisor handles live render." Don't ask Codex to spawn dev servers in this environment.

### 6. Reviewers can fix in-place when the fix is bounded and verification is independent

Cycle 2 BLOCKING (7-vs-4 metric rows in default live mode) was resolved by Codex committing the fix directly at `5395f46` rather than handing back to Claude Code as REQUEST CHANGES. Claude Code independently re-verified the result (build, tests, branch state) — preserving the review/verify separation even though the build/review separation softened.

Pattern works when:
- The fix is small (~50 LOC, single composer function + one test + one doc comment)
- The bug is narrow (one specific anchor failure, not architectural)
- An independent verifier exists to run build + tests + state confirmation

Not a default — judgment call by the reviewer about whether round-trip cost exceeds in-place fix cost. Worth marking for Flavor A retrospective: is "reviewer fixes when bounded" a good convention to adopt explicitly, or a one-off situational call?

### 7. Amend cycles can surface findings hidden by prior bugs

BLOCKING-1 in cycle 1 was "Comparison disconnected from source pipeline." Fixing it correctly exposed the 4-vs-7-metric gap that was previously masked because the page read a hardcoded 7-row mock. Test coverage didn't catch this because the unit test used the mock workspace (7 metrics, structurally correct mapping). Only runtime verification with default live config surfaced it.

**Pattern:** when an amend fixes architecture, re-verify against the success criteria the prompt originally anchored on, not just the BLOCKING items being fixed. Codex did this correctly here — the targeted re-verification specifically checked "does default live mode satisfy §4.3's 7-row anchor?" rather than just "is BLOCKING-1's symptom fixed?"

**Mitigation going forward:** targeted re-verification prompts should re-run the original success criteria checks for any anchor whose enforcement depended on the buggy code being fixed, not just verify the bug is gone.

---

## Carry-forward to next session

### What landed this session
- Shot 1 prototype alignment merged via PR #89 (squash) — five pages structurally aligned with `spec_prototype.html`, all trust surfaces wired (sentinels, AI disclaimers, provenance), 151 tests passing.
- Editorial slot inventory now visible in UI via `[SME content pending]` sentinel chips — the structural placeholders Shot 2 will fill.
- Two new conventions formalized: prompt-review pass before build for multi-surface slices; spec/reference files committed as branch preconditions.

### What's pending immediately
- **Strategic review of project state** — three flavors prepared (process/conventions retrospective, codebase architectural review, roadmap and priority review). User opted to proceed to strategic review next session. Prompts saved as `strategic_review_prompts.md`. Sequencing: A first, then B with A's output as input, then C with both as input. Each is its own Codex session.
- **Editorial content drafts (Shot 2)** — off-agent work owned by @nozim + CERR. Can begin any time. Each draft commits as a small content/i18n PR; no architectural work needed.
- **DFM PR 4 nightly regen workflow** — still pending. Drafted and adjudicated in prior session; deferred when prototype-alignment took priority. ~30 min of Codex build time once resumed.

### Strategic decisions still open (carried forward)
- **TB-P1 (deployment migration)** — legacy cerr-uzbekistan.github.io vs React rebuild deployment. Likely surfaces in the Flavor C roadmap review.
- **TB-P4 (named pilot users)** — Sprint 3+ with mitigation via opportunistic informal review. Likely surfaces in Flavor A retrospective and Flavor C roadmap.
- **DFM PR 4 nightly cron activation** — workflow file still on epic only, doesn't fire because not on default branch. Becomes live-question once Shot 2 wires real consumers.

---

## Session-end metrics

- **Duration:** longest single conversation on the project to date (multi-day, multiple Codex sessions in parallel)
- **Prompt iterations on Shot 1:** 5
- **Codex review passes:** 4 (prompt-review pre-build + three-pass post-PR + targeted re-verification of cycle 1 + targeted re-verification of cycle 2)
- **Codex in-place fix:** 1 (cycle 2 BLOCKING resolved at `5395f46`, Claude Code verified independently)
- **Build commits:** 7 on Shot 1 branch (audit + cross-cutting setup + 5 page commits + tests)
- **Amend commits:** 2 (cycle 1 single amend `bdf4f66`; cycle 2 Codex in-place fix `5395f46`)
- **Tests added across all cycles:** 114 → 151 (+37 net new)
- **Supervisor file artifacts produced:** alignment prompt v1, alignment prompt v2, Codex review meta-prompt, Codex re-verification prompt for cycle 1, amend cycle 1 prompt, amend cycle 2 prompt, three strategic review prompts, this conversation history file
- **Bugs caught before merge:** 16 (prompt-review) + 3 (post-build review) + 1 (cycle 1 amend-time preview catch on duplicate locale key) + 1 (cycle 2 7-vs-4 metric anchor) = **21 distinct bugs caught before code reached `epic/replatform-execution`**

The single highest-leverage moment of the session was the user's instinct to ask "may be to give this prompt to Codex first for review?" Without that pass, Shot 1 build would have shipped a prompt with 10 BLOCKING errors and produced an estimated 1–2 days of avoidable rework. Convention worth keeping; documented in §9 above.

The second-highest-leverage moment was the cycle 1 review surfacing the audit-vs-PR-description gap (the Comparison composition layer was in the audit but deferred in the PR description). That was a class of finding only an external reviewer catches — neither builder self-verification nor supervisor pre-PR review would have caught it because both had blessed the audit and trusted the PR description as honest summary. Codex reading both side-by-side surfaced the silent revision.

The third-highest-leverage moment was the cycle 2 review surfacing the 7-vs-4 anchor failure that the cycle 1 fix had exposed by removing the bug that hid it. This is the "amend cycles surface findings hidden by prior bugs" pattern (Lesson 7) which is now formalized.

---

## Handoff to next session

The next session opens with three Codex strategic reviews in flight (Flavors A, B, C — see `strategic_review_prompts.md`). Sequencing is mandatory: A → B → C, with each downstream review consuming prior outputs. Total estimated Codex time: 3.5–5 hours across the three. Total supervisor adjudication time after each: 30–60 minutes per flavor.

Sprint 3 planning happens after all three reviews return — that's its own working session, likely worth its own conversation history file.

Until then: Shot 1 is closed. Sprint 2's largest deliverable shipped. The codebase is in stable state for the architectural review to run against without moving-target friction.
