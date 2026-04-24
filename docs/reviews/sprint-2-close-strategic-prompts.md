# Strategic Review Prompts for Codex — Three Flavors

**Context:** Pause point near the end of Sprint 2. PR #89 (Shot 1 prototype alignment) merging shortly. Sprint 3 scoping ahead. We want three different lenses on the project's state.

**Sequencing:** Run Flavor A first. Read its output. Decide whether to run B and C as scheduled or adjust. Do NOT run all three concurrently — review-of-review value depends on prior outputs being available.

**For each prompt:** open a fresh Codex session. Attach the four `conversation-history-*.md` files plus the relevant artifacts mentioned in the prompt. Make sure Codex has full repo read access on `epic/replatform-execution` and the open `feat/prototype-alignment-shot-1` branch.

---

## Flavor A — Process and Conventions Retrospective

**Estimated Codex time:** 45–75 minutes.
**Expected output size:** 1500–3000 words structured per the four sections below.
**What it answers:** Are the workflow conventions we've adopted earning their cost? Where is process drift happening silently?

### Prompt to paste

> **Process and Conventions Retrospective — Sprint 2 close**
>
> You are reviewing the *process* by which the Uzbekistan Economic Policy Engine project has been built over the last ~10 days, not the code itself. The goal is to surface which workflow conventions are working, which are silently broken or underused, and what process improvements should land before Sprint 3 begins.
>
> ## Inputs to read
>
> 1. The four conversation history files (attached or at `docs/sessions/conversation-history-*.md`): from 2026-04-18 through 2026-04-24.
> 2. `docs/alignment/01_shot1_prompt.md` — the Shot 1 prompt (v2 after your prior prompt-review pass).
> 3. `docs/alignment/01_shot1_audit.md` — Claude Code's pre-build audit.
> 4. `docs/alignment/spec_prototype.html` — the prototype reference, for understanding what "alignment" meant.
> 5. The `git log` of `feat/prototype-alignment-shot-1` and the merged history on `epic/replatform-execution` for the last 30 days.
> 6. Any review comments you yourself left on PRs #74, #75, #87, #89 — for self-baseline on review patterns.
>
> Do NOT read the actual code in this pass. This is process review, not code review.
>
> ## What to evaluate
>
> The project has accumulated these stated conventions across the four sessions:
>
> 1. **Read-before-write audit per slice** — builder produces a state summary before writing code.
> 2. **Three-tier review pattern** — builder self-verification → supervisor pre-PR review → reviewer post-PR review.
> 3. **Alternating builder/reviewer** — Claude Code builds, Codex reviews, alternated across slices.
> 4. **Amend-in-place via force-push-with-lease** — REQUEST CHANGES outcomes amend the existing commit rather than stack new ones.
> 5. **Runtime verification mandatory for demo-track slices** — `npm run dev` walk-through before PR opens.
> 6. **Honest-over-convenient attribution** — model bridges and contracts always carry truthful provenance.
> 7. **Trust surfaces stay visible to all audiences** — sentinel chips, AI-attribution disclaimers always render.
> 8. **ASCII in technical metadata, pretty-printing in display** — separation of machine and human strings.
> 9. **Prompt-review pass before build for multi-surface slices** — newly established this session; prompt goes through Codex review before reaching builder. Triggering criteria: 2+ pages affected, >40 KB prompt, >500 LOC expected build.
> 10. **Spec/reference files committed by supervisor as branch preconditions** — newly established this session.
> 11. **Targeted re-verification after amend, not full re-review** — refined this session.
> 12. **Preview verification catches what tests don't** — promoted from anecdote to convention this session (third confirmed instance).
>
> ## Return four sections
>
> ### Section 1 — Conventions earning their cost
>
> For each of the 12 above, judge: is this convention earning its cost? Use these dimensions:
>
> - **Demonstrated value** — name specific session moments where it caught a real bug or saved real work. If it can't be named with examples, the convention may be aspirational rather than active.
> - **Cost of compliance** — how much friction does following this add per slice (rough estimate in hours or % overhead)?
> - **Failure rate** — how often is this convention skipped or short-circuited? Patterns of skipping reveal underlying friction or unclear triggering criteria.
>
> Bucket each convention into one of: STRONG (clearly earning), MARGINAL (earning but barely), AT-RISK (slipping or unclear), DROP (not pulling weight).
>
> ### Section 2 — Conventions missing
>
> What workflow patterns *should* exist but don't, based on failure modes you've seen across the four sessions? Be specific. Look for:
>
> - Patterns where the same class of bug surfaced multiple times before being caught (suggests missing convention)
> - Patterns where supervisor + builder + reviewer needed coordination that was ad-hoc rather than systematic
> - Patterns where context loss between sessions caused rework
>
> Propose 1–4 new conventions. For each: name it, describe trigger conditions, describe what it would have prevented in past sessions.
>
> ### Section 3 — Process drift
>
> Where has the project's *actual* practice diverged from its *stated* conventions? This is the most important section because drift compounds. Examples to look for (not exhaustive):
>
> - Conventions adopted in early sessions that are no longer being honored
> - Conventions that have informally evolved into something different than originally documented
> - Cases where supervisor's framing in chat differs from what eventually shipped
> - Cases where builder's PR description differs from what the audit committed to (this happened in Shot 1 cycle 1 — surface other instances)
>
> For each drift instance: name it, cite the specific session/commit, judge severity (critical / moderate / minor), recommend action (re-affirm / formalize new practice / let it lapse).
>
> ### Section 4 — Recommendations for Sprint 3
>
> Based on Sections 1–3, what should change in how we work before Sprint 3 begins? Frame as 3–6 concrete actions, each with:
>
> - The action
> - Why now (what triggered the recommendation)
> - Cost to implement
> - Expected benefit
>
> Include both adoptions (start doing X) and abandonments (stop doing Y). Do not propose anything that requires more than ~2 hours of supervisor or builder time to implement — this is a process tuning pass, not a process overhaul.
>
> ## Constraints
>
> - Do NOT propose technical/architectural changes — that's a separate review (Flavor B).
> - Do NOT propose roadmap or priority decisions — that's a separate review (Flavor C).
> - Do NOT compliment process choices unless the compliment carries new information about *why* something is working. "X is good" without explanation isn't useful; "X is good because it caught Y in session Z and would have been missed by W" is.
> - Be willing to say "I don't have enough evidence" rather than guessing. Some conventions may not have run often enough for fair evaluation.
> - If you find that the project has been over-engineering process — too many conventions, too much overhead — say so plainly. Process discipline can be its own form of drift.
>
> Return as a structured markdown document. Length: 1500–3000 words. Do not pad.

---

## Flavor B — Codebase Architectural Review

**Estimated Codex time:** 90–120 minutes.
**Expected output size:** 2000–4000 words plus an issues list.
**What it answers:** Where is technical debt accumulating? What's the cleanest architectural shape we should aim for at Sprint 3 close?

**Trigger before running:** Shot 1 + DFM PR 4 + any pending Sprint 2 closing work all merged to epic. Architectural review on a moving target produces noise. Wait for stable state.

### Prompt to paste

> **Codebase Architectural Review — post-Sprint 2 stable state**
>
> You are reviewing the *codebase* of the Uzbekistan Economic Policy Engine — specifically `apps/policy-ui/` — at the conclusion of Sprint 2. Goal: surface where technical debt is accumulating, where patterns are inconsistent across pages, where parallel types we adopted in Shot 1 need consolidation, and what the cleanest architectural shape would look like at Sprint 3 close.
>
> ## Scope
>
> In scope:
> - `apps/policy-ui/src/` — all of it
> - `apps/policy-ui/tests/` — all of it
> - `apps/policy-ui/public/` if anything material lives there
> - Build configuration: `package.json`, `tsconfig*.json`, `vite.config*`
> - Bridge files at `apps/policy-ui/src/data/bridge/`
>
> Out of scope:
> - The R modeling code (`scripts/export_*.R`)
> - The legacy static surface (`policy-ui/` at repo root, the markdown-loader `spec.html`)
> - GitHub Actions workflows
> - Deployment configuration
>
> ## Inputs to read
>
> 1. The repo at `epic/replatform-execution`, current tip.
> 2. `docs/alignment/01_shot1_prompt.md` and `01_shot1_audit.md` — these document the architectural choices Shot 1 made (parallel types, composition layers).
> 3. The four `conversation-history-*.md` files — these explain *why* certain architectural choices were made, which helps you judge whether the reasons still hold.
> 4. The Shot 1 PR description (#89) for the kept-from-Codex / dropped-from-Codex inventory.
>
> ## Return five sections
>
> ### Section 1 — Architectural shape today
>
> Describe the current architecture in 3–5 paragraphs. What are the major boundaries? Where do they hold strongly? Where do they leak? Specifically address:
>
> - The data pipeline (raw → guard → adapter → source → live-client → page)
> - Contract layer's role and its current consumers
> - Bridge layer's role (QPM today, DFM today, others pending)
> - State management (scenarioStore, source-state hooks, useSyncExternalStore patterns)
> - Component composition (page → page-section → leaf-component vs cross-cutting shared)
> - i18n boundary
> - Testing harness placement
>
> Aim for a shared mental model the supervisor and the next builder can hold. If the architecture differs from what `01_shot1_audit.md` described, surface the difference.
>
> ### Section 2 — Technical debt inventory
>
> List specific debt items. For each:
>
> - **What it is** — file:line if scoped, or pattern description if cross-cutting
> - **Why it accumulated** — usually traceable to a slice that introduced it under time pressure or via deliberate carve-out
> - **Cost of carrying it** — what does it slow down or break going forward
> - **Cost of fixing it** — rough estimate in hours and slice-equivalents
> - **Severity** — critical (blocks Sprint 3 work) / serious (slows Sprint 3 work) / moderate (will compound) / minor (cosmetic)
>
> Specific debt items I want you to look for explicitly (not exhaustive):
>
> - **Parallel types from Shot 1 §3.3 / §3.4** — `ModelCatalogEntry` alongside `ModelExplorerModelEntry`; `ComparisonContent` alongside `ComparisonWorkspace`. Both adopted as additive to keep existing consumers (QPM bridge) working. When does the legacy half retire? What forces or blocks consolidation?
> - **Editorial content layer** — `[SME content pending]` sentinel chips across Overview KPI footnotes, Model Explorer validation, Comparison trade-off shells. The sentinel pattern was deliberate. But: how does the codebase signal which sentinels Shot 2 has filled vs which remain pending? Is there an inventory mechanism?
> - **Mock vs live mode parametrization** — `VITE_*_DATA_MODE` exists for some pages, missing for Knowledge Hub. Codex flagged this as NON-BLOCKING in PR #89. What's the consolidated story across all five pages?
> - **Dual `suggested_next` fields on Scenario Lab interpretation** — new typed `suggested_next` plus legacy `suggested_next_scenarios: string[]` for back-compat. When does the legacy retire?
> - **`MacroSnapshot.summary` union widening** — `string | NarrativeSegment[]` widened the contract. Adapter-side handling exists. But: what live consumers send the legacy string form vs the structured form? Does anything on the bridge side need changes to populate the structured form?
> - **`comparisonContentMock` dual role** — was the page mock, became the test fixture + composer mock-padding source after Shot 1 amend cycles. The leading comment was updated but is its scope clear?
> - **Test surface gaps** — areas where coverage is thin given how often the surface changes (presentation components, adapter composition logic, guard tolerance for new shapes)
> - **Bundle size** — currently in 800–900 KB raw / 250–300 KB gzip range. Tracking-but-not-actionable per prior session notes. Has anything changed?
>
> ### Section 3 — Inconsistencies across pages
>
> Five pages now have similar surfaces (data → guard → adapter → component). Where do they diverge in ways that aren't architecturally justified? Examples to look for:
>
> - Data-source state machine: do all five pages handle loading / ready / error / empty consistently, or do some pages roll their own?
> - Component file naming: any pages using different conventions for similar components?
> - Test colocation: do all pages have tests in the same relative locations?
> - i18n key namespacing: any pages using different patterns?
> - CSS scoping: any pages using different scoping strategies (per-page CSS vs scoped-component CSS)?
>
> Inconsistencies aren't always bad — sometimes they reflect genuine differences in page complexity. But unjustified inconsistencies pay compounding rent.
>
> ### Section 4 — What "Sprint 3 close" architecture should look like
>
> Imagine the codebase in 4–6 weeks after Sprint 3 closes. What's the *cleanest* shape it could have? Specifically:
>
> - Which Shot 1 parallel-types should consolidate, and what's the consolidation path?
> - Which deferred bridges (PE/IO/CGE/FPP) should land first, and what does each unlock?
> - What architectural primitives that don't exist today should exist by Sprint 3 close?
> - What primitives that exist today should be removed by Sprint 3 close?
>
> Be opinionated. The current state is workable but it inherits historical compromises. State the destination.
>
> ### Section 5 — Recommended technical actions for Sprint 3
>
> List 5–10 concrete technical actions. For each:
>
> - The action
> - Severity (do-this-first / important / nice-to-have)
> - Effort (hours or slice-equivalents)
> - Dependencies (what blocks it; what it unblocks)
> - Risk if deferred
>
> Prioritize actions that reduce Sprint 3 friction or unlock substantial work, not aesthetic improvements.
>
> ## Constraints
>
> - Do NOT propose process changes — that's a separate review (Flavor A).
> - Do NOT propose roadmap or business priority decisions — that's a separate review (Flavor C).
> - Be willing to say "this is fine" about something we've worried about. Architectural debt panic is its own form of debt.
> - If you recommend deleting something, name what depends on it and why deletion is safe.
>
> Return as a structured markdown document. Length: 2000–4000 words plus the prioritized issues list. Do not pad.

---

## Flavor C — Roadmap and Priority Review

**Estimated Codex time:** 60–90 minutes.
**Expected output size:** 2000–3500 words structured around scenarios.
**What it answers:** Given everything in the backlog, in what order should we tackle it? What's the minimum viable state to aim for given different timelines?

**Trigger before running:** Flavors A and B have returned. Codex has the process and architectural baselines as inputs. Without those, roadmap recommendations are guesses.

### Prompt to paste

> **Roadmap and Priority Review — Sprint 3 entry**
>
> You are reviewing the project's *backlog* and *priorities* for the Uzbekistan Economic Policy Engine. Goal: produce a defensible priority ordering across the substantial list of deferred work, plus scenarios for what minimum viable state to aim for given different timelines.
>
> ## Inputs to read
>
> 1. The four conversation history files. Specifically look for "deferred" and "Sprint 3+" tags throughout — these accumulate a backlog that's never been consolidated.
> 2. PR #89 description's "Known carve-outs" section — Shot 1 deferrals.
> 3. `docs/alignment/01_shot1_prompt.md` §0 "Out of scope" — explicit deferrals.
> 4. Output of Flavor A review (process retrospective) — tells you process-level constraints on how fast work can move.
> 5. Output of Flavor B review (architectural review) — tells you technical-priority dependencies.
>
> Do not read code in this pass. Roadmap review against backlog and process/architecture context is enough.
>
> ## Backlog inventory to consolidate
>
> Across the four sessions, the following items have been deferred or are in flight. Verify, complete, and prioritize:
>
> **Shot 2 editorial content (drafted by @nozim + CERR staff, off-agent):**
> - 8 KPI contextual footnotes per locale (Overview)
> - 5 model validation summaries (Model Explorer DFM/PE/IO/CGE/FPP; QPM has prototype content)
> - Full equation sets for DFM/PE/IO/CGE/FPP (currently 1–2 stub equations each)
> - Trade-off Shell A (single-alternative-vs-baseline) + Shell C (stress-vs-baseline-robustness) for Comparison
> - RU/UZ translations of Shell B prose
> - RU/UZ translations of Knowledge Hub reform titles + brief summaries
>
> **Live wiring backlog:**
> - `+ Add saved scenario` modal on Comparison (stub onClick today)
> - Live-mode QPM impulse-response chart on Scenario Lab (chart is stub today)
> - `unemployment_avg` and `real_wages_cumulative` from live model outputs (mock-padded today, marked as `is_prototype_value` after Shot 1 amend cycle 2)
> - Knowledge Hub `VITE_*_DATA_MODE` parametrization (mock-only today)
>
> **Deferred slices:**
> - DFM PR 4 nightly regen workflow (drafted, adjudicated, never built — deferred when prototype-alignment work took priority)
> - TA-9 (AI surface treatment — consumes TB-P3 fields)
> - Model bridges for PE / IO / CGE / FPP (5-PR pattern per QPM precedent: solver port + JSON export + consumer contract + frontend alignment + nightly CI; ~2 weeks per bridge if QPM-precedented)
>
> **Strategic decisions still open:**
> - **TB-P1 (deployment migration)** — legacy cerr-uzbekistan.github.io vs React rebuild deployment. Sprint 3+ territory. Forces itself the moment a real consumer (CERR staff, IMF visit, etc.) needs the React build. The DFM nightly cron also doesn't fire until workflow file lands on default branch.
> - **TB-P4 (named pilot users)** — Sprint 3+ pending headcount. Mitigation has been opportunistic informal review. Without named users, all priority decisions are made on supervisor's intuition rather than user signal.
>
> **Consolidation work (from Flavor B review, if available):**
> - Retire parallel types (`ModelCatalogEntry` ↔ `ModelExplorerModelEntry`, `ComparisonContent` composition layer)
> - Retire dual `suggested_next` fields
> - Other items per Flavor B
>
> ## Return five sections
>
> ### Section 1 — Backlog completeness check
>
> Did I miss anything in the inventory above? Read the conversation histories and Shot 1 artifacts for items I didn't enumerate. Specifically look for:
>
> - Items mentioned as deferred in passing but never logged in a backlog section
> - Items implied by "we'll handle this later" without "later" being defined
> - Items that surfaced as side-effects of decisions (e.g., the `is_prototype_value` chip introduced in Shot 1 amend cycle 2 will eventually need cleanup once live wiring lands — was that captured?)
>
> Add anything missing to the inventory.
>
> ### Section 2 — Dependency analysis
>
> For each backlog item, what does it depend on? What does it unblock? Specifically:
>
> - Which items can run in parallel (no shared dependencies)?
> - Which items must serialize (one blocks another)?
> - Which items have cross-track dependencies (e.g., model bridges depend on R modeling work that the supervisor doesn't directly control)?
>
> Build a dependency graph in prose or a simple text diagram. Identify the items that block the most other work — these are leverage points.
>
> ### Section 3 — Three priority orderings for three timelines
>
> Build three orderings, each optimized for a different timeline:
>
> **A. 4-week timeline (urgent demo / external review pressure).** What's the minimum viable Sprint 3 deliverable that closes the most user-visible gaps without compromising trust surfaces? Assume 4 weeks of supervisor + Claude Code + Codex time, plus whatever editorial content @nozim/CERR can produce in parallel.
>
> **B. 8-week timeline (Sprint 3 + Sprint 4 closure target).** What's the natural extension that turns minimum viable into "good enough to put in front of named pilot users"?
>
> **C. 12-week timeline (Sprint 3 through Sprint 5).** What's the path to "all five model bridges live, all editorial content drafted, deployment migrated, pilot users actively using the tool"?
>
> For each timeline:
> - Ordered list of items
> - Expected end state
> - What's deliberately NOT in scope for that timeline
> - What new risks appear at that scope
>
> Be honest about which items don't fit any timeline because they're still genuinely undefined (e.g., TB-P4 pilot users without headcount).
>
> ### Section 4 — Strategic decisions that need adjudication before Sprint 3
>
> The following decisions have been deferred for sessions and continue to be deferred. They likely cannot remain deferred for all three timelines above. For each:
>
> - **TB-P1 deployment migration.** What forces a decision in each timeline? What's the cost of continued deferral?
> - **TB-P4 pilot users.** What forces a decision? What's the cost of continued deferral?
> - **DFM nightly cron activation.** Workflow exists on epic only. What forces activation? What breaks if activation continues to be deferred?
>
> For each decision: state your recommendation with reasoning. The supervisor can disagree, but should disagree explicitly rather than continue silent deferral.
>
> ### Section 5 — Risks the roadmap should account for
>
> What are the 3–5 highest risks to the project succeeding at the timelines above? For each:
>
> - The risk
> - Probability (rough)
> - Impact if it materializes
> - Mitigation that should land in Sprint 3
>
> Examples to consider (not exhaustive):
> - SME content (@nozim/CERR) doesn't keep pace with the structural slots Shot 1 created
> - One of the deferred model bridges (PE/IO/CGE/FPP) turns out to be much harder than QPM/DFM precedent suggested
> - Pilot users surface a register decision we made wrong (e.g., the workbench-vs-document calls on Scenario Lab or Comparison)
> - Process drift compounds (Flavor A's findings on this)
> - Architectural debt (Flavor B's findings on this) blocks a deferred item we hadn't planned to touch
>
> ## Constraints
>
> - Do NOT propose process changes (Flavor A) or architectural changes (Flavor B). Those are inputs, not your output.
> - Do NOT make priority calls based on "what would be cool to build." Make them based on dependency analysis, user-visible gap closure, and risk reduction.
> - Be willing to recommend "do less than you think you can." Process discipline degrades when scope outpaces capacity.
> - If a strategic decision (TB-P1, TB-P4) is genuinely unresolvable without external input, say so plainly and identify what input is needed from whom.
>
> Return as a structured markdown document. Length: 2000–3500 words. Include the dependency graph and three timeline orderings as the load-bearing artifacts.

---

## How to use these prompts

1. **Wait for Shot 1 amend cycle 2 to merge.** Don't run any of these reviews against a moving target.
2. **Run Flavor A first.** Wait for output. Read it. Decide whether the findings change what you want B and C to look at. Update the prompts inline if needed.
3. **For Flavor B**, attach Flavor A's output as additional context. Codex benefits from knowing what process state will look like during Sprint 3 when judging architectural priorities.
4. **For Flavor C**, attach both Flavor A and Flavor B outputs. The roadmap depends on both.
5. **Save each review's output** to the project's docs folder (e.g., `docs/reviews/sprint-2-close-flavor-A.md` etc.) so they're versioned and Sprint 3 planning can reference them.
6. **After all three are done**, the supervisor (me) and you sit with the three documents and decide what changes for Sprint 3. That conversation is its own session — probably worth its own conversation history file.

## What I'll do with the outputs

For each flavor, when you paste me the output, I'll:

- **Read it carefully** before reacting (these are dense documents, not chat exchanges)
- **Adjudicate findings** — agree, disagree, reframe — same pattern as code review adjudication
- **Surface tension between flavors** — sometimes A and B will recommend conflicting things; resolving the conflict is supervisor's job
- **Help you translate findings into action** — not every recommendation needs to be acted on; some are FYI

Don't expect me to instantly bless every Codex finding. Some will be wrong. Some will be right but at the wrong level of priority. The reviews are inputs, not verdicts.

End of strategic review prompts.
