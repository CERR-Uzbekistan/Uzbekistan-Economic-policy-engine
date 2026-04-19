# Phase 0 — Execution Readiness Checklist

**Document:** `docs/frontend-replatform/11_phase0_readiness.md`
**Purpose:** The non-negotiable gate between plan approval and Sprint 1 Codex work.
**Owner:** Claude Code (executes) + Product lead (signs off)
**Expected duration:** Half a day for the live-app pass; one meeting for sign-off.

---

## 0. Why this gate exists

The execution plan (`10_execution_plan.md`) was written source-only — against files on disk, not the rendered React app. The workflow adopted for this project (Codex builds, Claude reviews) uses the plan's acceptance criteria as the truth Codex will build against. If those criteria are wrong or ambiguous in even a few places, Codex will ship correctly-executed work against the wrong spec — and each such mistake costs a commit and a review cycle to undo.

This checklist exists so that **before any Codex thread opens**, the plan is verified against the live app, corrected where wrong, and explicitly signed off. The total cost is approximately four hours of Claude Code's time plus one 30-minute sign-off meeting. The cost of skipping it is measured in wasted Codex threads and rework.

**This gate is binary.** Either it passes and Sprint 1 begins, or it fails and the plan is updated before Sprint 1 begins. There is no partial pass.

---

## 1. Pre-pass setup (5 minutes)

Before Claude Code begins the verification pass:

- [ ] `apps/policy-ui` runs locally — `npm install && npm run dev` opens a working app on localhost
- [ ] Browser opens to Overview and all five sidebar routes render without crashes
- [ ] Claude Code has read access to the full `docs/frontend-replatform/` directory, including `10_execution_plan.md`
- [ ] A blank `docs/frontend-replatform/11_phase0_readiness.md` file is created (this document will be filled in place)
- [ ] Branch `chore/phase0-readiness` is open for any plan corrections that come out of the pass

If any of the above fails, resolve before continuing. A plan verification pass against a non-running app produces only more source-only assessment, which is what we are trying to get past.

---

## 2. The verification pass

Claude Code works through every TA and TB item in `10_execution_plan.md` in order. For each item, one of three outcomes applies:

### Outcome A — Already satisfied

The acceptance criterion is already met in the current app. Mark it in the item's **Live verification notes** block and remove from Codex scope.

**Example:** *TA-1b acceptance criterion "PageHeader accepts a `meta` slot rendering `{date}`, `{models}`, `{version}` lines" — verify if the current `PageHeader` component supports this; if yes, annotate "Already satisfied as of [commit hash]; remove from TA-1b scope."*

### Outcome B — Correct as written

The criterion is well-defined, testable, and nothing in the live app contradicts it. Annotate "Verified against live app; no change needed."

### Outcome C — Needs correction

The criterion is wrong, ambiguous, or the live app reveals something the source review missed. Annotate with the specific correction and sign it.

**Example:** *TA-4 criterion "KPI deltas are neutral-coded" — observed in live app: current `KpiStrip` component already applies semantic green/red based on direction; criterion needs to be rewritten as "Remove semantic direction coloring from `KpiStrip`; deltas render in neutral ink color with arrow glyph only."*

---

## 3. What to check on each page

For items whose acceptance criteria are UX-driven, the verification pass must actually use the app, not just read the component tree. The following checks are required for each of the five pages:

### 3.1 Every page (shell-level)

- [ ] Does the sidebar navigation match the five-section IA exactly? (If not, flag as a TA-scope correction.)
- [ ] Does the language switcher change anything visible? (If not, confirm TA-1a scope.)
- [ ] Is the top bar present and populated with utilities?
- [ ] Are loading states `aria-live`? Trigger a loading state by disabling network and reload.
- [ ] Are error states `role="alert"`? Trigger by breaking a mock import temporarily.
- [ ] Keyboard navigation: can you Tab through the whole page and reach every interactive element?
- [ ] Focus rings: visible and consistent on every focusable element?
- [ ] Color contrast: does the text pass WCAG 2.1 AA at the default zoom? (Use browser DevTools contrast checker on 3 random text/background pairs.)

### 3.2 Overview

- [ ] How many blocks does the page render? Compare against spec §9.1 (A–F: state header, KPI strip, nowcast block, risk panel, quick actions, feed)
- [ ] Do any KPI deltas use green/red semantic coloring? Flag as TA-4 correction if yes.
- [ ] Is there any chart rendered, or is the nowcast slot text/tabular? (Confirms TA-2 scope.)
- [ ] If charts are present, do they carry a model attribution badge?
- [ ] Is the state header AI-attribution visible, or buried?
- [ ] Does the risk rail have working "Test →" buttons? Do they route to Scenario Lab with query params?
- [ ] Are feed blocks populated with real content or placeholder text?

### 3.3 Scenario Lab

- [ ] Is the three-column layout intact at 1280px+ width? Does it collapse gracefully below?
- [ ] Do the assumption sliders actually update values?
- [ ] Does changing an assumption trigger a stale-results banner?
- [ ] Is the "Run scenario" button wired? Does clicking it re-run and update results?
- [ ] Is the "Save draft" button wired, or is it a no-op? (Confirms TA-3 scope.)
- [ ] Are preset chips a chip row, or still a dropdown? (Confirms TA-5 scope.)
- [ ] Is the technical-variable-names toggle present and working?
- [ ] Is the interpretation panel populated with structured text?
- [ ] Is there any AI-attribution on the interpretation panel? (If not, confirms TA-9 scope.)
- [ ] Run the stale-results-then-run cycle three times; does the `activeRunIdRef` drop behavior work correctly under rapid clicks?

### 3.4 Comparison

- [ ] Does the scenario selector read from a scenario store, or only from mock data?
- [ ] If saved scenarios exist from Scenario Lab, are they visible here? (Confirms TA-3 dependency.)
- [ ] Does the delta table render? Are deltas computed or hardcoded?
- [ ] When a metric is missing in a scenario, does it render as `—` or is a mock value substituted?
- [ ] Any "best on metric" marker — is it value-neutral (star, not color)?
- [ ] Is the trade-off summary populated or a placeholder?

### 3.5 Model Explorer

- [ ] Does the model catalog render six cards?
- [ ] Do any cards show honest status badges (fix needed, known gap, etc.)?
- [ ] Can you navigate into a model's detail pane?
- [ ] Do the tabs (Assumptions / Equations / Caveats / Data sources) work?
- [ ] Are caveats severity-coded visually?
- [ ] Are equations rendered with any math styling, or plain text?
- [ ] Is there a validation summary section? (If absent, confirm whether TA-7 scope should add one.)

### 3.6 Knowledge Hub

- [ ] Is the page a one-line stub, or has content been added since source review?
- [ ] If content exists, does it show reform timeline + research briefs + literature per spec §9.5?
- [ ] If stub, confirm TA-8 is full-scope port.

---

## 4. What to check on every TA item specifically

For each of the 9 Track A items, after the page-level checks above, go through the item's acceptance criteria one-by-one and mark each:

**TA-1a · i18n plumbing**
- [ ] Is `react-i18next` installed? Check `package.json` in the running environment.
- [ ] Is the `LanguageProvider` consuming anything, or is it a state holder only?
- [ ] Does changing the language produce any visible effect?
- [ ] Are there any `t()` calls anywhere in the component tree?

**TA-1b · Editorial shell polish**
- [ ] Is any serif font loaded?
- [ ] Does any `h1` or `h2` render in serif?
- [ ] Is there an `AttributionBadge` component? Check source.
- [ ] Does `PageHeader` accept a meta slot?

**TA-2 · ChartRenderer**
- [ ] Is any chart library in `package.json`? (Recharts, ECharts, Chart.js)
- [ ] Does any chart render anywhere?
- [ ] Is `ChartSpec` from the contract consumed anywhere?
- [ ] Are uncertainty bands rendered anywhere?

**TA-3 · Scenario store**
- [ ] Does `scenarioStore` exist as a module?
- [ ] Does "Save draft" persist to localStorage?
- [ ] Can saved scenarios be listed somewhere?
- [ ] Do saved scenarios appear in Comparison's selector?

**TA-4 · Overview enrichment**
- [ ] Are all 5–6 Overview blocks populated with non-placeholder content?
- [ ] Are KPI deltas neutral-coded?
- [ ] Do risk rail buttons route with preset query params?
- [ ] Does the page load <3s?

**TA-5 · Scenario Lab enrichment**
- [ ] Preset chip row present?
- [ ] Helper text on assumptions?
- [ ] Headline metrics strip rendering?
- [ ] Tabbed results area?
- [ ] Structured interpretation rail (5 subsections)?
- [ ] `NarrativeBlock.generation_mode` branching visible in UI?

**TA-6 · Comparison enrichment**
- [ ] Scenario chips reading from store?
- [ ] Delta table with computed deltas?
- [ ] Best-on-metric marker value-neutral?
- [ ] Missing data rendered as `—` explicitly?
- [ ] Chart in Comparison uses `ChartRenderer`?

**TA-7 · Model Explorer presentation pass**
- [ ] AttributionBadge on catalog cards?
- [ ] Equation blocks styled with serif/monospace?
- [ ] Parameter table with symbol column?
- [ ] Severity-coded caveats?
- [ ] Source list with vintage?

**TA-8 · Knowledge Hub content port**
- [ ] `KnowledgeHubWorkspace` type in `data-contract.ts`?
- [ ] Four-section layout on the page?
- [ ] ≥10 reforms, ≥6 briefs, ≥15 literature items?
- [ ] Cross-links from reforms/briefs to Model Explorer working?

**TA-9 · AI surface treatment**
- [ ] `NarrativeBlock.generation_mode === 'assisted'` renders with disclaimer + distinct styling?
- [ ] Export flows gated on review status?
- [ ] Audit log captures `generation_mode` transitions?

*Expected finding: TA-9 has almost nothing verifiable yet because the scope depends on TB-P3 adoption. Mark criteria accordingly.*

---

## 5. What to check on every TB item

Track B items produce documents, not code, so verification is different:

**TB-P1 · Deployment migration decision**
- [ ] Does `docs/frontend-replatform/09_deployment_migration.md` exist?
- [ ] Are all three decisions (preview URL, rollout criterion, legacy freeze date) specific?
- [ ] Is each decision dated and owned?

**TB-P2 · Model bridge decision**
- [ ] Does `docs/frontend-replatform/11_model_bridge.md` exist? *(Note: numbering collision with this readiness doc — rename TB-P2 output to `12_model_bridge.md` if needed.)*
- [ ] Is one of Options A/B/C committed in writing?
- [ ] Is the relationship to existing `shared/synth-engines.js` documented?

**TB-P3 · AI governance**
- [ ] Does `docs/ai-governance.md` exist?
- [ ] Are all six questions (reviewer, draft location, reviewer view, approval semantics, audit log, disclaimer) answered specifically?
- [ ] Is the disclaimer wording drafted?
- [ ] Has the analytical lead signed off? (Not engineering alone.)

**TB-P4 · Pilot users**
- [ ] Are three names recorded?
- [ ] Are three session dates on a calendar, not "this month"?
- [ ] Is a blank `12_pilot_observations.md` template created and ready for session day?

---

## 6. Output format — what the readiness pass produces

Claude Code appends output to the bottom of this document in this structure:

```markdown
## Readiness pass output

**Date run:** YYYY-MM-DD
**Commit verified against:** [git SHA]
**Live app URL:** [localhost port]
**Duration:** [e.g., 3h 45m]

### Summary

- Total TA items checked: 9
- Already satisfied: [N]
- Correct as written: [N]
- Needs correction: [N]
- Total TB items checked: 4
- Status of each: [TB-P1 status, TB-P2 status, ...]

### Corrections needed before Sprint 1 opens

**Blockers** (must be fixed before Day 1 Codex thread opens):
- [item ID]: [correction needed]
- [item ID]: [correction needed]

**Soft corrections** (can be fixed during Sprint 1 without blocking):
- [item ID]: [correction needed]

### Items already satisfied — scope removal

- [item ID]: [what is already done; remove from Codex scope]

### New issues observed in live app (not in current plan)

- [description, proposed item ID, proposed owner]

### Overall verdict

[ ] PASS — Sprint 1 may open
[ ] PASS WITH CORRECTIONS — Sprint 1 may open after blockers fixed
[ ] FAIL — plan needs rewrite before Sprint 1 opens
```

---

## 7. Sign-off procedure

After Claude Code fills in §6 above:

1. Product lead reads the readiness pass output
2. If verdict is **PASS**, commit this document and open Sprint 1
3. If verdict is **PASS WITH CORRECTIONS**, assign each blocker to an owner with a fix-by-date *before Day 1*, then re-run the affected criteria once fixes land
4. If verdict is **FAIL**, schedule a plan revision session; do not open Sprint 1

The sign-off itself is a single commit to this file with the product lead's name and date appended.

---

## 8. Scope discipline for the readiness pass itself

A meta-risk: the readiness pass becomes its own rabbit hole and expands into a full re-audit of the codebase. Guard against this:

- **Time-box to 4 hours total.** If the pass isn't done in 4 hours, something is wrong — either the plan is far more broken than expected (which is the signal to pause and rewrite the plan), or the pass is over-scoped (which means stop and ship what you have).
- **Do not rewrite the plan during the pass.** Note corrections; commit them in a separate pass after the readiness run is complete. Mixing verification with revision makes both worse.
- **Do not propose new items.** If the live app reveals something that isn't in the plan, note it in the "New issues observed" section, but do not add it to TA-/TB- scope within the readiness pass itself. New items get triaged after Sprint 1 opens.
- **Do not verify Sprint 2 items deeply.** TA-4 through TA-9 only need their *entry conditions* verified, not their full acceptance criteria, because Sprint 1 work will change the state of those pages before Sprint 2 begins anyway.

---

## 9. What happens after a clean pass

Day 1 morning:

1. The readiness doc is committed with PASS verdict
2. Owners for every TA and TB item are assigned and on the calendar
3. TB-P4 session dates are locked (three names, three dates, three invitations sent)
4. TB-P3 first draft is on the product lead's calendar for today or tomorrow
5. First Codex thread opens with scope `TA-1a · i18n plumbing + shell strings` and a pointer to this document's annotations for that item

The workflow then runs per `10_execution_plan.md` §4 calendar.

---

*Readiness check protocol v1. Expected to run once per sprint branch; can be re-run if the plan is materially revised mid-sprint.*

---

## Readiness pass output

**Date run:** 2026-04-19
**Commit verified against:** `c65eacc770f510d62f923f15206fbc6776364ed4` (branch `chore/phase0-readiness`)
**Live app URL:** `http://localhost:5180/` (vite dev server, `apps/policy-ui`)
**Duration:** ~2h (within the §8 four-hour box)

### Summary

- Total TA items checked: **9**
  - Already satisfied (item-level): **0**
  - Correct as written: **9** (TA-1a, TA-1b, TA-2, TA-3, TA-4, TA-5, TA-6, TA-7, TA-8, TA-9)
  - Needs correction (criteria-level): **0** — one scope-clarification note added to TA-4 (see below); no acceptance criterion is wrong as written.
- Total TB items checked: **4**
  - TB-P1 — **unstarted**; doc absent; no infra; no owner named.
  - TB-P2 — **unstarted**; memo absent; minor naming concern (use `12_model_bridge.md` to avoid collision with `11_phase0_readiness.md`).
  - TB-P3 — **unstarted**; `docs/ai-governance.md` absent; six questions unanswered.
  - TB-P4 — **unstarted**; no names, no dates, no observations doc; plan's `[YYYY-MM-DD to YYYY-MM-DD]` placeholder still unfilled.

### Corrections needed before Sprint 1 opens

**Blockers** (must be resolved before Day 1 Codex thread opens — these are the approval-gate items in plan §8, not plan rewrites):

- **TB-P1**: Commit `docs/frontend-replatform/09_deployment_migration.md` with specific preview URL, specific rollout criterion, specific legacy-freeze calendar date, and named owner. Stand up the preview URL itself. Plan §8 gate #4 cannot close without this.
- **TB-P2**: Commit a `docs/frontend-replatform/12_model_bridge.md` (renamed from `11_*` per plan's own note to avoid collision with this readiness doc) picking one of Options A/B/C with rationale, timeline, and a named engineering owner.
- **TB-P3**: Commit `docs/ai-governance.md` answering all six questions; draft EN disclaimer wording; require analytical-lead sign-off (not engineering-only). Hard blocker for TA-5 (Interpretation panel must branch on `NarrativeBlock.generation_mode` before panel enrichment lands) and TA-9.
- **TB-P4**: Record three named pilot users and three specific session dates (replace the `[YYYY-MM-DD to YYYY-MM-DD]` placeholder in plan §2); create blank `docs/frontend-replatform/12_pilot_observations.md`. Owner is product lead.
- **Owner assignment** (plan §8 gate #3): every TA-* and TB-* item still reads `Owner. TBD.`. Assign before Day 1.

**Soft corrections** (can be fixed during Sprint 1 without blocking):

- **TA-4 scope clarification**: existing live note said "nothing routes to Scenario Lab." Live verification refines this — Overview risk-rail anchors and Quick Actions anchors already emit `href="/scenario-lab?preset=<id>"`; the actual gap is that `ScenarioLabPage` does not yet read the `preset` query param and hydrate the assumption set. TA-4 criterion #3 ("Risk rail 'Test →' buttons route to Scenario Lab with working preset query params") therefore implies reciprocal Scenario-Lab-side consumption work; consider making that explicit when the Codex thread for TA-4 opens. Appended to TA-4's Live verification notes.
- **TB-P2 doc name**: plan already flags the collision; confirm `12_model_bridge.md` at the time the memo lands.

### Items already satisfied — scope removal

No TA items are *fully* satisfied at the item level. However, a number of criteria inside items are already met in the live app and should be converted to regression guards (the plan already does this in many places — listing here for Codex-thread bookkeeping):

- **TA-4 · neutral KPI delta coding**: `KpiStrip` computed color `rgb(23, 37, 59)`, bg `rgb(242, 244, 247)`, class `ui-chip--neutral`. Keep as regression guard.
- **TA-4 · Overview-side preset anchors**: risk rail + Quick Actions already route to `/scenario-lab?preset=*`. Only Scenario-Lab-side consumption is missing.
- **TA-5 · state-honesty regression guards**: `activeRunIdRef`, separate `assumptionValues` vs `lastRunAssumptions`, `beginRetry`, five interpretation subsections, tabbed results, `<details>` Advanced assumptions — all present in source and rendering. Keep as regression guards; criteria already list them as such.
- **TA-6 · selector 2–4 enforcement + delta table arrows**: `ScenarioSelectorPanel` + `HeadlineComparisonTable` already render per existing live note. Keep as regression guard.
- **TA-7 · tabs ARIA**: `role="tablist"` / `role="tab"` / `aria-selected` / `aria-controls` present in `ModelExplorerPage.tsx`. Keep as regression guard.

### New issues observed in live app (not in current plan)

Per plan §8 ("Do not propose new items"), these are flagged-only:

- Quick Actions block on Overview links to four preset scenarios (`snapshot-brief`, `tariff-change`, `fiscal-comparison`, `inflation-risk`) that the current ScenarioLab `<select>` does not enumerate; consumer side is the same issue as the TA-4 scope clarification above. Not proposing a new item — triage after Sprint 1.
- Comparison page renders a `Comparison Chart · GDP Growth` header above the hand-rolled bar panel; this is spec-consistent with TA-6 scope, calling out only because any change to the heading label during TA-6 chart-renderer migration should be an explicit decision.
- Console during a five-route sweep produced zero warnings or errors beyond the standard React DevTools info line — no hidden runtime issues to fold into scope.

### Overall verdict

- [ ] PASS — Sprint 1 may open
- [x] **PASS WITH CORRECTIONS** — Sprint 1 may open after blockers fixed
- [ ] FAIL — plan needs rewrite before Sprint 1 opens

**Rationale.** Zero acceptance criteria in `10_execution_plan.md` are wrong as written; the live app state matches the plan's assessment for all 9 TA items and all 4 TB items. The readiness-pass blockers are exactly the approval-gate items already listed in plan §8 (owners assigned, TB-P1/TB-P2/TB-P3 docs committed) plus TB-P4 session scheduling. None of them require revising the plan itself. Sprint 1 may open as soon as §8 gates #3 and #4 close and TB-P4's date placeholder is filled.

