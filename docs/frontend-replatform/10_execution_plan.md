# Frontend Replatform — Execution Plan

**Document:** `docs/frontend-replatform/10_execution_plan.md`
**Date:** 2026-04-18
**Status:** Draft for team review — live verification completed, execution edits pending
**Scope:** Four-week execution plan (2 sprints × 2 weeks) covering the agreed Track A / Track B replatform work

---

## 0. How to read this document

> **⚠ Live-verification note.** This plan now includes a completed live verification pass against the running React app. The acceptance criteria below have been adjusted where the rendered product already satisfies part of the work or where source-only assumptions proved inaccurate. Execution may start once the remaining approval-gate items in §8 are complete.

Each work item has:

- **ID** (TA-* for Track A UI migration, TB-* for Track B decisions)
- **What** — one-paragraph scope statement
- **Acceptance criteria** — testable/checkable conditions for "done"
- **Depends on** — IDs that should be complete first
- **Blocks** — IDs that cannot start until this is complete
- **Size** — engineering days, excluding review and translation QA
- **Owner** — to be assigned
- **Live verification notes** — evidence from the rendered React app that confirms, corrects, or narrows scope

---

## 1. Summary table

### Track A — UI migration (sequential with some parallelism)

| ID | Title | Size | Depends on | Blocks |
|----|-------|-----:|------------|--------|
| **TA-1a** | i18n plumbing + shell strings (EN/RU/UZ) | 2 d | — | TA-5 |
| **TA-1b** | Editorial shell polish (serif display, header rhythm, attribution badge) | 1 d | — | TA-7 |
| **TA-2** | Shared ChartRenderer component | 2 d | TA-1b (soft) | TA-4, TA-5, TA-6 |
| **TA-3** | Real scenario store (localStorage, full provenance) | 1 d | — *(align with TB-P2 when available; not a hard blocker)* | TA-4, TA-6 |
| **TA-4** | Overview page enrichment | 2 d | TA-2, TA-3 | — |
| **TA-5** | Scenario Lab enrichment | 3 d | TA-1a, TA-2, TB-P3 | — |
| **TA-6** | Comparison page enrichment | 2 d | TA-2, TA-3 | — |
| **TA-7** | Model Explorer presentation pass | 2 d | TA-1b | TA-8 (deep-linking, if adopted) |
| **TA-8** | Knowledge Hub content port | 3 d | TB-P1, TA-7 *(only if deep-link routing is adopted)* | — |
| **TA-9** | AI surface treatment | 2 d | TB-P3 (done+adopted) | — |
| | **Track A total** | **20 d** | | |

### Track B — Parallel non-optional decisions (not optional, not deferrable)

| ID | Title | Size | Deadline | Gates |
|----|-------|-----:|----------|-------|
| **TB-P1** | Deployment migration decision + doc | 1.5 d | Before TA-3 ships | TA-8 |
| **TB-P2** | Model bridge decision + memo | 0.5 d | **Before TA-3** *(earlier than ChatGPT plan)* | TA-4 |
| **TB-P3** | AI governance doc | 0.5 d | **This week** *(earlier than ChatGPT plan)* | TA-5, TA-9 |
| **TB-P4** | Three named pilot users + sessions | 2 d | During the week of [YYYY-MM-DD to YYYY-MM-DD], before TA-4 begins | TA-4, TA-5, TA-6 reprioritization |
| | **Track B total** | **4.5 d** | | |

**Combined effort:** ~25 engineering days + ~4.5 days of non-engineering decision/coordination work. Fits a 4-week window for 1–2 frontend engineers running Track A with product lead running Track B in parallel.

---

## 2. Track A — Detailed specifications

### TA-1a · i18n plumbing + shell strings

**What.** Install `react-i18next` + `i18next` + `i18next-browser-languagedetector`. Create `src/locales/{en,ru,uz}/common.json` with all shell chrome strings (nav labels, page titles, page descriptions, button labels, loading/error state messages). Wire `I18nextProvider` into `AppShell`. Replace hardcoded English strings in `nav.ts`, page headers, `PageContainer`/`PageHeader`, and error/loading states with `t()` calls. Page *body content* remains English for now; this is a chrome-only translation pass.

Source material: the `i18n` object in the prototype's inline JavaScript contains ~25 canonical translations for EN/RU/UZ. Use those as the seed for `common.json`. Expand as each page's chrome is wired.

**Acceptance criteria.**

- [ ] `react-i18next` installed and configured; `LanguageProvider` delegates to it or is replaced by `I18nextProvider`
- [ ] `src/locales/{en,ru,uz}/common.json` exist and contain: nav labels (5 items), page titles (5 pages), page descriptions (5 pages), common button labels (Save, Run, Retry, Cancel, at minimum), loading/error state strings, language switcher label
- [ ] Switching the language via `LanguageSwitcher` updates all shell chrome within the tick; no page reload required
- [ ] Missing-translation fallback is English, not a crash or raw key-string
- [ ] `document.documentElement.lang` updates on language change
- [ ] No console errors or `react-i18next` warnings in dev mode after switch
- [ ] Existing tests still pass

**Depends on.** None.  
**Blocks.** TA-5 (Scenario Lab assumption labels will render in policy language — better to have translation machinery present before adding text volume).  
**Size.** 2 days.  
**Owner.** Nozimjon Ortiqov.

_Live verification notes:_
- Confirmed entirely greenfield. `package.json` has no `i18next`/`react-i18next` dependency; `grep` over `src/` returns no `i18next`, `t(`, or `useTranslation` references.
- `LanguageProvider` (`src/state/language-provider.tsx`) is a thin React context that only stores a `LanguageCode` string — it never touches DOM lang or any translation table.
- Live check: changing the `<select>` in `LanguageSwitcher` to `ru` re-renders the provider but produces no visible change. `document.documentElement.lang` stays `"en"`. Nav labels (`Overview`, `Scenario Lab`, …) and `<h1>` text are unchanged. So criterion #3 and #5 currently fail.
- `nav.ts` ships hardcoded English label strings; `PageHeader` accepts hardcoded `title`/`description` props; loading/error strings (`'Loading latest overview snapshot…'`, `'Scenario data is currently unavailable.'`, etc.) are inline literals across all five pages. Inventory of strings to lift is sizeable but mechanical.
- No regression risk to call out — there is currently no translation behavior to preserve.
- Sequencing OK as written: TA-1a is genuinely Day-1 work and remains a blocker for TA-5 text volume.
- **Phase 0 readiness pass (2026-04-19, commit c65eacc):** Re-confirmed via live app on port 5180. Switched `LanguageSwitcher` select to `ru` — nav labels (`Overview`, `Scenario Lab`, `Comparison`, `Model Explorer`, `Knowledge Hub`), h1, page descriptions, and `<html lang>` all stayed English. Criterion #3 and #5 remain unsatisfied; criteria as written are correct and testable. Outcome: **Correct as written.**


---

### TA-1b · Editorial shell polish

**What.** Raise the institutional register of the shell without a full redesign. Three small changes: (a) add a display serif for `h1` and `h2` only (Newsreader, Source Serif 4, or IBM Plex Serif — pick one; IBM Plex Serif pairs most cleanly with existing Source Sans 3); (b) introduce a reusable `<AttributionBadge>` component for model IDs; (c) standardize the `PageHeader` metadata slot (date, model set, version line) with the monospaced small-caps treatment from the prototype.

Do **not** redesign the sidebar. Do **not** replace Source Sans 3 in body. This is a surgical polish pass, not an aesthetic overhaul.

**Acceptance criteria.**

- [ ] One display serif loaded via `@font-face` or `@import` in `tokens.css`; applied to `h1` and `h2` only; body remains Source Sans 3
- [ ] `<AttributionBadge model_id="qpm" />` component exists under `src/components/system/`; renders the 2–4 letter model code in monospaced uppercase with a thin border
- [ ] `PageHeader` component accepts a `meta` slot rendering `{date}`, `{models}`, `{version}` lines in the monospaced treatment
- [ ] No regressions: all existing `PageHeader` usages still render
- [ ] Source `base.css` and per-page CSS updated consistently

**Depends on.** None.  
**Blocks.** TA-7 (Model Explorer relies on the AttributionBadge for model catalog cards).  
**Size.** 1 day.  
**Owner.** Nozimjon Ortiqov.

_Live verification notes:_
- `tokens.css` defines only `--font-sans: "Source Sans 3", …` — no `--font-display`, no serif `@import`, no `@font-face` declarations. Inspecting the live `<h1>` confirms `font-family: "Source Sans 3", "Noto Sans", "Helvetica Neue", sans-serif` and `font-weight: 650` for both h1 and h2. Criterion #1 entirely unsatisfied.
- `src/components/system/` currently contains only `LanguageSwitcher.tsx`. No `AttributionBadge` exists; grep confirms zero references repo-wide.
- `PageHeader.tsx` accepts only `title` and `description` props. There is no `meta` slot, no monospaced treatment, no children passthrough — so adding `meta` is a typed signature change rather than a CSS-only tweak.
- Note for TA-7 sequencing: the Model Explorer catalog already renders a status chip via `ui-chip ui-chip--neutral` plus model name — when AttributionBadge lands, decide whether it replaces or complements the existing model-name strong element.
- **Phase 0 readiness pass (2026-04-19, commit c65eacc):** Live inspect of `<h1 class="ui-page-title">` confirms `font-family: "Source Sans 3", "Noto Sans", "Helvetica Neue", sans-serif` and `font-weight: 650` on both h1 and h2. Grep for `AttributionBadge` repo-wide returns zero matches. `PageHeader` exports only `title`/`description` props. All three acceptance criteria unsatisfied as expected. Outcome: **Correct as written.**

---

### TA-2 · Shared ChartRenderer

**What.** Introduce a charting library and build a single `<ChartRenderer spec={ChartSpec} />` wrapper that consumes the existing `ChartSpec` contract type. The renderer must respect:

- `ChartSeries.semantic_role` → color mapping (`baseline`=slate `#17253b`, `alternative`=brand `#1f3658`, `downside`=muted red, `upside`=muted green, `other`=neutral grey)
- `UncertaintyBand.is_illustrative` → band styling (solid translucent fill if empirical/false; hatched or dashed if illustrative/true, with a visible label "Illustrative" in the chart subtitle)
- `ChartSpec.model_attribution` → `<AttributionBadge>` rendered in the chart card frame
- `ChartSpec.takeaway` → rendered as subtitle or caption beneath the chart

Wire the renderer into two places as the first consumers: `NowcastForecastBlock` (Overview) and the primary Scenario Lab results chart. Do not extend to every chart surface in this step — just prove the contract in the two pages whose chart contracts are already the clearest. Comparison adopts the renderer in TA-6.

**Library recommendation:** Recharts for the clean React 19 fit and the fact that the entire API is declarative React components (matches the contract-driven pattern). ECharts-for-React is acceptable if the team has prior experience. Chart.js is **not** recommended — it's imperative and fights the React tree.

**Acceptance criteria.**

- [ ] One chart library installed; confirmed React 19 compatibility
- [ ] `<ChartRenderer spec={ChartSpec} />` component in `src/components/system/`
- [ ] Semantic role → color token mapping defined in `tokens.css` and consumed by the renderer
- [ ] Uncertainty bands render visibly; `is_illustrative: true` produces visually distinct styling (hatched, dashed, or reduced opacity) with explicit label
- [ ] AttributionBadge appears in the chart card frame, populated from `spec.model_attribution`
- [ ] `NowcastForecastBlock` renders a real chart (not text/table) from its `ChartSpec`
- [ ] Scenario Lab primary results chart renders via the shared renderer without regressing current run-state behavior
- [ ] No console errors on mount, resize, or language switch
- [ ] Existing tests still pass; add one rendering snapshot/shape test for the wrapper

**Depends on.** TA-1b (soft — the AttributionBadge is from that step, though the two can ship together).  
**Blocks.** TA-4, TA-5, TA-6.  
**Size.** 2 days (day 1: renderer + Overview; day 2: Scenario Lab + polish).  
**Owner.** Nozimjon Ortiqov.

_Live verification notes:_
- Greenfield. `package.json` has no charting library; grep returns no `recharts`, `echarts`, `chart.js`, or `d3` import.
- Confirmed against rendered Overview: `NowcastForecastBlock` produces a three-tile summary plus a bordered HTML table, not a chart.
- Confirmed against rendered Comparison: `ComparisonChartPanel` is still a hand-rolled CSS-bar list, which is why Comparison should adopt the shared renderer after the first proof point, not as the first proof point.
- Tokens for `baseline` slate `#17253b` and brand `#1f3658` already exist in `tokens.css` — semantic-role mapping can reuse them; only `downside`, `upside`, `other` need new tokens.
- Recommend Recharts for the same reason the source-only review gave: the `ScenarioLab` and `Overview` pages already pass a `ChartSpec` shape to renderers, so a declarative React mapping fits.
- **Phase 0 readiness pass (2026-04-19, commit c65eacc):** Live DOM check — `document.querySelector('svg.recharts-surface, canvas')` returns `null` on Overview, Scenario Lab, and Comparison. `NowcastForecastBlock` renders the tabular "Estimate path (real GDP growth, %)" caption + `<table>`; Comparison's chart slot renders the hand-rolled bar panel with headings like `Comparison Chart · GDP Growth` but no SVG. Acceptance criteria are all correct as written. Outcome: **Correct as written.**

---

### TA-3 · Real scenario store

**What.** Replace the current `handleSaveScenario` toast-message with a real persistence layer. Create `src/state/scenarioStore.ts` exposing `saveScenario`, `loadScenario(id)`, `listScenarios()`, `deleteScenario(id)`. Use `localStorage` with a namespaced key prefix (e.g., `policy-ui:scenario:<id>`). On save, populate **every** provenance field declared in the `Scenario` type — no nulls permitted for required fields.

Specifically, `created_by` should be populated from a session identifier (can be a generated UUID stored in localStorage for the session — auth is not required for v1 but the field must not be empty). `data_version` must be captured from the *best currently available* `ModelAttribution.data_version` coming from the last-run output or loaded attribution. TB-P2 may later change where that value originates, but it does not block the v1 store implementation.

Wire the Comparison page's `ScenarioSelectorPanel` to read from the store so the Scenario Lab → Comparison flow becomes end-to-end real for the first time.

**Acceptance criteria.**

- [ ] `scenarioStore` module exists with save/load/list/delete
- [ ] Save round-trip preserves: `scenario_id`, `scenario_name`, `scenario_type`, `tags`, `description`, `created_at` (ISO 8601), `updated_at`, `created_by` (non-empty session ID), `assumptions[]` (populated), `model_ids[]` (populated from the last run, not the workspace defaults)
- [ ] `data_version` is captured from current attribution data, not from `Date.now()`
- [ ] Scenarios persist across page reloads
- [ ] `Comparison` `ScenarioSelectorPanel` lists all saved scenarios from the store
- [ ] Saving a scenario in Lab then navigating to Comparison shows the new scenario within the selector; deletion removes it
- [ ] Tests: one unit test per store method; one integration test for Lab-save → Comparison-list round trip
- [ ] No schema validation errors when re-loading a saved scenario against the current `Scenario` type

**Depends on.** None. *(Soft alignment with TB-P2 when that memo lands.)*  
**Blocks.** TA-4 (Overview feed block reads from the store), TA-6 (Comparison depends on store for real scenario selection).  
**Size.** 1 day.  
**Owner.** Nozimjon Ortiqov.

_Live verification notes:_
- Confirmed greenfield. `src/state/` contains only `language-context.ts`, `language-provider.tsx`, `useLanguage.ts` — no scenario store. Grep returns zero `scenarioStore`, `localStorage` references in `src/`.
- `handleSaveScenario` in `ScenarioLabPage.tsx:170-178` writes only a transient `saveStatus` string ("Saved to local session at HH:MM, DD MMM"). Live click on **Save draft** confirms: nothing persists; reload clears the message; nothing visible in `localStorage`.
- `ComparisonPage.tsx` reads scenarios from `loadComparisonSourceState()` → mock workspace, not from any user-saved store. The Lab → Comparison loop is not wired at all today.
- The `Scenario` contract (`data-contract.ts:21-32`) already declares `created_by`, `data_version`-bearing `model_ids` etc. as required strings — so the no-nulls constraint is already type-enforced; the work is filling them honestly.
- `overview-live.ts` already includes example `dataVersion` fields, so TA-3 can proceed before TB-P2 is finalized.
- **Phase 0 readiness pass (2026-04-19, commit c65eacc):** Clicked Save draft in the running app; before/after `Object.keys(localStorage)` both returned `[]`. UI message "Saved to local session at HH:MM, DD MMM" appears but does not persist — reload clears it. Confirms TA-3 greenfield status. Acceptance criteria are testable as written. Outcome: **Correct as written.**

---

### TA-4 · Overview page enrichment

**What.** Fill out the Overview page with real content, not placeholders. Port the prototype's strongest composition patterns *without* regressing on the React app's current honesty around deltas and degraded states:

1. **Economic state narrative** — one serif paragraph summarizing macro state, generated from the current `MacroSnapshot.summary`, with an attribution line that reflects actual provenance. If narrative generation metadata exists later, it must follow TB-P3 rules rather than hardcoding "AI-assisted · reviewed".
2. **KPI strip** — preserve the current neutral delta treatment and enrich freshness/context treatment only
3. **Nowcast/forecast focal chart** — uses `ChartRenderer` from TA-2; 70% confidence band visible; attribution badge on frame
4. **Ranked risk rail** — 3 top risks with one-click "Test →" buttons that route to Scenario Lab with a preset query param
5. **Three feed blocks** — Recent reforms (from Knowledge Hub data once TA-8 ships, stub for now), Data refreshes (from `ModelAttribution.data_version` across models), Recent saved scenarios (from `scenarioStore.listScenarios()`)

The prototype's "quick actions" block is **not** part of this step — it mixes scenario-start actions with export actions and needs redesign. Skip it for v1.

**Acceptance criteria.**

- [ ] All 5 Overview blocks render with non-placeholder content
- [ ] **Regression guard:** existing neutral KPI delta coding is preserved
- [ ] Risk rail "Test →" buttons route to Scenario Lab with working preset query params
- [ ] Scenario feed reads live from `scenarioStore`
- [ ] Data-refresh feed derives from `ModelAttribution.data_version` values present in loaded snapshots
- [ ] Reform feed either renders seed data (if TA-8 is in flight) or gracefully shows an empty state with "Content coming from Knowledge Hub"
- [ ] Focal chart uses `ChartRenderer`
- [ ] Attribution badges appear at least on the focal chart and KPI strip where model attribution is available
- [ ] Must not regress current honest handling of missing, partial, or unavailable data
- [ ] Page loads in <3s on office broadband (matches Frontend Spec §22.1 perf target)

**Depends on.** TA-2, TA-3.  
**Blocks.** None.  
**Size.** 2 days.  
**Owner.** Nozimjon Ortiqov.

_Live verification notes:_
- Live capture of `/overview`: blocks present today are EconomicStateHeader (✓), KpiStrip (✓ with 8 indicators), NowcastForecastBlock (table form, ✗ no chart), RiskPanel (3 risks, no Test→ wiring), QuickActions (renders the deprecated block — this plan correctly skips it). The three feed blocks (reforms / data refreshes / saved scenarios) are entirely absent.
- **Already satisfied — KPI neutral coding.** Confirmed via live inspection on `.overview-kpi-trend`: computed `color: rgb(23, 37, 59)` and muted-surface background; classes `ui-chip ui-chip--neutral`. `KpiStrip.tsx` exposes direction glyph + word, no green/red semantic branching.
- RiskPanel currently renders risks but nothing routes to Scenario Lab; the page also has no query-param reading. Criterion #3 needs reciprocal wiring on both pages.
- `headline_metrics[i].model_attribution[].data_version` is already populated in the live mock payload — data-refresh feed can be assembled today without TB-P2 closing first.
- **Phase 0 readiness pass (2026-04-19, commit c65eacc):** Risk rail **is already partially wired** — Overview risks render as anchors with `href="/scenario-lab?preset=external-slowdown"`, `.../preset=tariff-change`, `.../preset=inflation-risk`, etc., plus Quick Actions anchors with the same shape. Navigating to `/scenario-lab?preset=exchange-rate-shock` directly, however, leaves the preset `<select>` on "Balanced baseline" — **ScenarioLabPage does not yet read the URL query param**. So the existing note "nothing routes to Scenario Lab" should be narrowed: Overview-side links exist; Scenario Lab-side query-param consumption is the actual gap. Flagging as scope clarification, not a rewrite. Acceptance criterion #3 remains valid. Outcome: **Correct as written (with scope clarification above).**

**Phase 0 drift alignment (2026-04-20, post-TA-2 merge):**

- Economic state header needs attribution/provenance line per spec §9.1.A — drafted-from / AI-assisted / reviewed-by pattern (e.g., "State narrative · drafted from DFM + QPM baseline · AI-assisted · reviewed 16 Apr · M. Usmanov"). Current version only has update timestamp.
- Quick actions tiles need explicit kind labels (Analysis / Output) above titles per prototype.
- Verify feed blocks (Reforms / Data refreshes / Recent saved scenarios) exist below the fold; if not, add per spec §9.1.F.
- Small vertical-alignment CSS fix on Overview two-column (chart + risk rail) layout — columns start at different y-positions currently.
- Topbar polish (spec §7.3): add data freshness indicator, saved scenarios count, and export/help utilities — current topbar is language switcher only.

---

### TA-5 · Scenario Lab enrichment

**What.** Port the prototype's presentation patterns while **preserving** the React app's existing state honesty. This step is primarily a presentation and ergonomics pass, not a run-lifecycle rewrite.

**Existing behaviors that must survive unchanged (regression guards):**
- `activeRunIdRef` drops stale responses
- separate `assumptionValues` vs `lastRunAssumptions`
- stale-results banner when they diverge
- loading / error / retry behavior
- `beginRetry` helper
- advanced assumptions still hidden in `<details>`
- tabbed results + five interpretation subsections already working

**Add, from the prototype:**
- **Preset chips** as a horizontal chip row (replacing the current `<select>` dropdown)
- **Assumption field polish** — grouped by `AssumptionCategory` with policy-language labels; helper text per field; technical variable name still hidden behind the existing toggle
- **Headline metrics strip** — preserve neutral-coded deltas; add better visual composition only
- **Structured interpretation rail polish** — improve hierarchy and scanability without altering the contract

**Critical constraint on the Interpretation panel:** the rendering must respect `NarrativeBlock.generation_mode`. Even before TA-9, the component should branch explicitly:
- `'template'` → ordinary rendering, no AI framing
- `'assisted'` → defer actual disclaimer copy to TB-P3, but do not silently render it as template output

**Acceptance criteria.**

- [ ] Preset chip row replaces the dropdown; click switches assumption values and updates scenario name
- [ ] Assumption fields show policy-language labels + helper text; technical names toggle still works
- [ ] Headline metrics strip preserves neutral-coded deltas while improving layout
- [ ] **Regression guard:** tabbed results area continues to navigate between `ScenarioLabResultTab` values
- [ ] **Regression guard:** all 5 interpretation subsections continue to render from `ScenarioLabInterpretation`
- [ ] **Regression guard:** stale-results banner, retry behavior, `activeRunIdRef`, and advanced assumptions behavior remain intact
- [ ] `generation_mode` is explicitly checked in the Interpretation panel, even if only `'template'` is active in this sprint
- [ ] Keyboard navigation works: tab order through assumptions; space/enter on preset chips
- [ ] Must not regress current honest handling of stale, partial, failed, or rerun states

**Depends on.** TA-1a, TA-2, TB-P3.  
**Blocks.** None.  
**Size.** 3 days.  
**Owner.** Nozimjon Ortiqov.

_Live verification notes:_
- **Already satisfied — state honesty.** `ScenarioLabPage.tsx` keeps `activeRunIdRef`, separate `assumptionValues` vs `lastRunAssumptions`, the `beginRetry` helper, and `assumptionsEqual` comparison. Live render shows the stale banner ("Results reflect the previous run…") when an assumption differs from the last run. `<details>` advanced section is in `AssumptionsPanel.tsx`.
- **Already satisfied — interpretation 5 subsections.** `InterpretationPanel.tsx` already iterates all five categories from the contract; live capture confirms "What changed / Why it changed / Key risks / Policy implications / Suggested next scenarios" all rendering.
- **Already satisfied — tabbed results.** `ResultsPanel` consumes `activeTab`/`onTabChange` for `ScenarioLabResultTab` values.
- **Not satisfied — preset chips.** `AssumptionsPanel.tsx` is still a native `<select>` dropdown; live render confirms this.
- `generation_mode` is not checked anywhere in the current Interpretation panel. Today this is harmless because all mock content is effectively template content, but the branch needs to become explicit before later AI-adjacent work lands.
- Keyboard nav for chip-row presets will be net-new and should be manually tested.
- **Phase 0 readiness pass (2026-04-19, commit c65eacc):** Confirmed in live DOM — `<select>` with four options (`Balanced baseline`, `External slowdown`, `Fiscal consolidation`, `Inflation persistence`), `<details><summary>Advanced assumptions</summary>`, `Save draft` and `Run scenario` buttons, `Show technical variable names` toggle, and all five interpretation headings (`What changed`, `Why it changed`, `Key risks`, `Policy implications`, `Suggested next scenarios`) all present. Source grep confirms stale banner copy "Results reflect the previous run. Run scenario to update with current assumptions." exists at `ScenarioLabPage.tsx:243` behind `hasPendingEdits`. Criteria as written remain correct. Outcome: **Correct as written.**

**Phase 0 drift alignment (2026-04-20, post-TA-2 merge):**

- Preset chips replace `<select>` dropdown (already in main acceptance criteria — reiterated for emphasis).
- `/scenario-lab?preset=*` URL consumption: ScenarioLabPage must read the `preset` query param and hydrate assumption values (Phase 0 pass confirmed Overview-side anchors already emit these URLs; consumption side is the gap).
- Headline metrics area: render as 4×1 horizontal strip, not 3×2 grid.
- AI attribution block on Interpretation rail (blocked on TB-P3 adoption before this slice opens).
- Stale banner verification once TA-3 scenario store ships.
---

### TA-6 · Comparison page enrichment

**What.** Scenario chip selector (2–4 active), richer per-scenario summary cards, denser comparison table, trade-off summary block, and migration of the chart area onto the shared renderer. Preserve the corrected React behaviors around baseline framing, delta semantics, zero-centered chart logic, and honesty under missing data.

The "best-on-metric" indicator from the prototype (★) is acceptable only with an explicit tooltip clarifying that it means *numerically highest/lowest*, not "best policy outcome."

**Acceptance criteria.**

- [ ] Scenario chip selector with 2–4 active scenarios; chips read from `scenarioStore`
- [ ] Per-scenario summary cards render with the existing `ComparisonScenario` type
- [ ] Delta table renders with baseline-vs-scenario columns for each metric in `metric_definitions[]`
- [ ] "Best-on-metric" indicator, if used, has explicit "numerically highest/lowest" tooltip
- [ ] Missing metrics render `—` with explanatory tooltip; no silent substitution
- [ ] Trade-off summary block can render prose from contract **or** continue with generated summary text, but must remain explicit about which trade-offs are being described
- [ ] Chart view uses `ChartRenderer`
- [ ] Scenario chips use appropriate selection semantics; **if sorting is added**, sortable table headers use `aria-sort`
- [ ] Must not regress current honest handling of missing, partial, or degraded comparison data

**Depends on.** TA-3, TA-2.  
**Blocks.** None.  
**Size.** 2 days.  
**Owner.** Nozimjon Ortiqov.

_Live verification notes:_
- **Partially satisfied — selector + delta table.** `ScenarioSelectorPanel` already enforces 2–4 active scenarios and a baseline pick. `HeadlineComparisonTable.tsx` renders baseline + delta columns with arrow glyph + signed magnitude. Live render confirms all of this. The gap is criterion #1's *source*: chips read from the mock workspace, not from a user store.
- **Not satisfied — ChartRenderer wiring.** `ComparisonChartPanel.tsx` is a hand-rolled CSS-bar list, not a chart from the shared renderer.
- **Not satisfied — `aria-sort`.** Tables are not sortable today. If sorting is added later, add `aria-sort`; it should not be a blocker for this step.
- **Not satisfied — best-on-metric tooltip.** No star indicator or tooltip exists in the live render.
- **Not satisfied — missing-data tooltip.** Current rendering does not yet surface `—` + explanation consistently.
- Trade-off summary panel exists today (`TradeoffSummaryPanel`) and produces generated text; this is acceptable for now as long as the summary remains explicit and honest.
- **Phase 0 readiness pass (2026-04-19, commit c65eacc):** Live `/comparison` renders headings `Scenario selector`, `Headline comparison`, `Comparison Chart · GDP Growth`, `Trade-off summary` (with `Strongest growth`, `Strongest stability`, `Main compromise` subsections). Scenario chip labels include `Baseline`, `Alternative`, `Stress`. View toggles `Level view / Delta view / Risk view` render. No SVG chart, no `—` dash cells, no star/best-on-metric indicator, no tooltip content. Criteria as written remain correct. Outcome: **Correct as written.**

**Phase 0 drift alignment (2026-04-20, post-TA-2 merge):**

- Scenario cards need semantic border-top color by role: baseline slate / alternative blue / stress red.
- Comparison chart bar colors: semantically distinct per `toSemanticRole` — currently all three scenarios render in similar blue shades, should differentiate by semantic role.
- ★ best-on-metric indicator on Headline comparison table, with "policy judgment separate" tooltip.
- Fix "Comparison Chart · GDP Growth" title — misleading since chart shows 4 metrics, not just GDP growth.
- Optional: card-row overview above Headline comparison table per prototype §9.3.
---

### TA-7 · Model Explorer presentation pass

**What.** Upgrade the current Model Explorer's visual presentation without touching the existing data architecture. Port from the prototype:

- catalog-card treatment with AttributionBadge + status chip
- equation blocks
- stronger parameter presentation
- caveat severity treatment
- source/vintage presentation

Do **not** add LaTeX rendering. The HTML-math / styled-text approach is sufficient for this pass.

**Acceptance criteria.**

- [ ] All currently seeded model catalog entries render with AttributionBadge + status chip
- [ ] QPM detail pane fully populated (seed data): Overview, Equations (4), Parameters (6+), Caveats (5+), Data sources (4+)
- [ ] Equation blocks render in serif with italic variables
- [ ] Parameter presentation is upgraded only after verifying the current contract can support symbol/range fields; if not, use a cleaner list/table hybrid instead of inventing unsupported fields
- [ ] Caveats render with severity-coded visual treatment
- [ ] Source list renders vintage in monospace
- [ ] Tabs navigation preserves existing ARIA
- [ ] Optional parity stretch: seed 3 additional placeholder cards if the team wants a six-model catalog visual in this sprint
- [ ] Add URL deep-link support for model and tab (`?model=qpm&tab=equations`) if TA-8 cross-links are meant to land in this sprint

**Depends on.** TA-1b.  
**Blocks.** TA-8 cross-links if deep-linking is required.  
**Size.** 2 days.  
**Owner.** Nozimjon Ortiqov.

_Live verification notes:_
- Live count of catalog cards: 3, not 6. Current seeded models are QPM Uzbekistan, DFM Nowcast, FPP Fiscal Block.
- **Already satisfied — status chips (partial).** Each catalog card already renders a status chip via `ui-chip ui-chip--neutral` with `STATUS_LABELS[model.status]`. What's missing is the AttributionBadge for model code.
- **Already satisfied — tabs ARIA.** `ModelExplorerPage.tsx` already wires `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, and `tabIndex`.
- **Not satisfied — equation styling.** Equations render via `<pre><code>` with no serif/italic treatment.
- **Not satisfied — parameter presentation.** Current "Assumptions" tab renders a flat list of blocks, not a richer symbol/range-driven presentation. Verify contract support before committing to a specific table layout.
- **Not satisfied — caveat severity styling.** Severity exists in the data but is not currently visualized.
- **Not satisfied — vintage in monospace.** Vintage is still plain body text.
- **Phase 0 readiness pass (2026-04-19, commit c65eacc):** Live `/model-explorer` renders three catalog entries: `QPM Uzbekistan` (Active), `DFM Nowcast` (Active), `FPP Fiscal Block` (Staging). Tab list present with `Assumptions`, `Equations`, `Caveats`, `Data sources`. No `.attribution-badge` anywhere; no `<pre>`/`<code>` equation blocks visible on default catalog pane. Criteria as written remain correct; six-model parity is correctly scoped as an "optional stretch." Outcome: **Correct as written.**


**Phase 0 drift alignment (2026-04-20, post-TA-2 merge):**

- Seed PE (Partial Equilibrium), I-O (Input-Output), and CGE 1-2-3 models into catalog mock data. Current app shows only QPM, DFM, FPP — 3 of 6 expected models.
- `<AttributionBadge>` on each catalog card (component already exists from TA-1b).
- Status badges with severity-coded methodology-issue counts per ROADMAP — not just Active/Staging. Examples: QPM shows "2 Fixes" linking issues #23 and #25; PE shows "Fix" linking #24; CGE shows "Gap"; FPP shows "CA exog." linking #30.
- Rich equation tab: 4 equations per model in monospaced blocks with italic serif variables (IS, Phillips, Taylor, UIP for QPM and analogous sets for other models).
- Severity-coded caveat list tying to ROADMAP known-methodology-issues.
- Parameter table with symbol / name / value / range / description columns per spec §9.4.
- Data sources list with institution / frequency / vintage / notes columns.

**TA-7 parallel coordination required:** R modeling team should produce the analytical content (equations, parameter tables, caveats, source lists) before this slice opens. This is analytical content, not engineering — Codex cannot invent it. Start the content-sourcing conversation by end of Week 1 so content is ready when TA-7 opens in Sprint 2.
---

### TA-8 · Knowledge Hub content port

**What.** Promote the Knowledge Hub from one-line placeholder to the four-section structure: Reform tracker (timeline), Research briefs (list), Literature (grouped by model), Model-linked references.

Source material: the legacy static site already has populated content for Policy Tracker, Research, and Literature. Port that content into adapter-compatible mock data (`src/data/mock/knowledge-hub.ts`) and create the data contract type (add `KnowledgeHubWorkspace` to `data-contract.ts` following the pattern of the other workspaces).

Do **not** auto-curate from lex.uz or academic APIs in this step. Manual content port only. Auto-curation (ROADMAP Phase 3.5) is Sprint 3+ territory and gates on TB-P3 adoption.

**Acceptance criteria.**

- [ ] `KnowledgeHubWorkspace` type added to `data-contract.ts` with four sections
- [ ] `src/data/mock/knowledge-hub.ts` seeded with ≥10 reforms, ≥6 research briefs, ≥15 literature entries (port from legacy site)
- [ ] `KnowledgeHubPage.tsx` replaces placeholder with four-section layout
- [ ] Reform timeline renders with dates, categories, and model-link badges
- [ ] Research briefs render with author attribution; AI-drafted briefs explicitly labeled per TB-P3
- [ ] Literature list grouped by model; each entry links to DOI/URL when available
- [ ] Cross-links: clicking a model badge on a reform/brief navigates to Explorer; if TA-7 deep-linking lands, navigate directly to the target model/tab
- [ ] Page loads <3s

**Depends on.** TB-P1, and TA-7 if model+tab deep-link routing is required for cross-links.  
**Blocks.** TA-4 reform feed (which stubs until this ships).  
**Size.** 3 days (most of it is content port, not coding).  
**Owner.** TBD; content work may need analytical lead input.

_Live verification notes:_
- Confirmed greenfield. Live `/knowledge-hub` renders only the placeholder div ("Knowledge Hub v1 scaffold"). `KnowledgeHubPage.tsx` is minimal; no data fetching, no source-state plumbing, no contract type for it.
- `src/data/mock/` contains `comparison.ts`, `model-explorer.ts`, `overview.ts`, `scenario-lab.ts`. No `knowledge-hub.ts`. No adapter, no guard, no live mock.
- Explorer does not currently support deep-link to a specific model + tab via URL. If cross-links need that precision in this sprint, wire it in TA-7.
- **Phase 0 readiness pass (2026-04-19, commit c65eacc):** Live `/knowledge-hub` body text confirmed as literal: `"Knowledge HubPolicy context and references scaffold (post-MVP expansion area).Knowledge Hub v1 scaffold"`. Only `h1` renders. Confirms full-scope port per TA-8. Outcome: **Correct as written.**

---

### TA-9 · AI surface treatment

**What.** Render `NarrativeBlock.generation_mode === 'assisted'` honestly, per the rules adopted in TB-P3. This step is **UI treatment + review-state signaling only**. It does not assume an export engine already exists.

Minimum behavior expected:

- **When `generation_mode === 'template'`:** no disclaimer, no badge
- **When `generation_mode === 'assisted'`:** visible disclaimer, semantically distinct styling, and explicit reviewed/unreviewed state
- **Draft queue surfacing:** if TB-P3 requires one, provide a minimal surface for unresolved assisted drafts
- **Audit trail:** implement only the minimum local event/state logging required by TB-P3; do not invent a larger telemetry system in this sprint

No AI generation logic is built in this step. No export logic is built in this step.

**Acceptance criteria.**

- [ ] `generation_mode: 'template'` renders with no AI framing
- [ ] `generation_mode: 'assisted'` renders with disclaimer + distinct styling per TB-P3 spec
- [ ] Reviewed vs unreviewed assisted states are visually distinguishable
- [ ] Draft queue surface exists if TB-P3 specifies one
- [ ] Minimal local audit/event log exists only if TB-P3 requires it
- [ ] If an export pipeline is added later, unreviewed assisted content remains blocked by default until that export work explicitly adopts the governance rules

**Depends on.** TB-P3 must be written, adopted, and signed off.  
**Blocks.** None. This is the last UI step.  
**Size.** 2 days.  
**Owner.** Nozimjon Ortiqov.

_Live verification notes:_
- Confirmed greenfield. `NarrativeGenerationMode` is declared in `data-contract.ts` but no component branches on it. Everything renders as if template today.
- No export pipeline exists yet; export-gating should not be treated as in-scope implementation for this step.
- No audit log infrastructure exists. If TB-P3 requires one, keep it minimal and local in this sprint.
- Sequencing remains correct: do not start TA-9 until TB-P3 is signed off and TB-P4 returns evidence pilot users want AI-assisted narrative at all.
- **Phase 0 readiness pass (2026-04-19, commit c65eacc):** Nothing new verifiable in the live app because TB-P3 is still unstarted (no `docs/ai-governance.md`). Per readiness-doc §4 guidance this is expected. Criteria as written are correct; entry condition (TB-P3 signed off) is not met. Outcome: **Correct as written.**

---

## 3. Track B — Detailed specifications

### TB-P1 · Deployment migration decision + doc

**What.** Decide three things, write them as one page:

1. **Preview URL for `apps/policy-ui`.** Vercel, Netlify, or GitHub Pages on a subdomain or subpath. Password-protect if public-readiness isn't there yet. **Commit a specific URL this week.**
2. **Public rollout criterion.** What specific condition flips policy-ui from preview to primary? Options: (a) feature parity with legacy site, (b) Track A steps 1-7 complete, (c) stakeholder sign-off from named person, (d) all four pilot users (TB-P4) give green-light. Pick one.
3. **Legacy site content freeze date.** A specific calendar date past which no new reforms, data refreshes, or research briefs land on the legacy static site — everything new goes in policy-ui. Without this, double maintenance is permanent.

Write as `docs/frontend-replatform/09_deployment_migration.md`. One page. No more.

**Acceptance criteria.**

- [ ] `09_deployment_migration.md` committed to repo
- [ ] Preview URL is live and team-accessible within the week
- [ ] Public rollout criterion is specific and testable
- [ ] Legacy freeze date is a real calendar date, not "when ready"
- [ ] Named owner for each of the three decisions

**Deadline.** Before TA-3 ships, i.e., by end of Week 1.  
**Gates.** TA-8 (Knowledge Hub port depends on knowing whether legacy content is being retired or mirrored).  
**Size.** 0.5 day decision + 1 day writing + infra setup time (varies by platform).  
**Owner.** Product lead or frontend lead — this is a scope decision, not a task assignment.

_Live verification notes:_
- `docs/frontend-replatform/` currently contains 00–08; no `09_deployment_migration.md` exists. Item is unstarted.
- Repo root still has the legacy static site (`index.html`, per-model directories) committed alongside `apps/policy-ui` — confirms the dual-maintenance risk the item flags is live.
- No CI/CD or deploy config visible at repo root (no `vercel.json`, `netlify.toml`, GitHub Pages workflow). Decision needs to come with the infra wiring, not just the doc.
- **Phase 0 readiness pass (2026-04-19, commit c65eacc):** Re-confirmed `ls docs/frontend-replatform/` shows `00_mvp_scope.md` through `08_release_readiness.md`, then `10_execution_plan.md` and `11_phase0_readiness.md`. No `09_deployment_migration.md`. All three decisions (preview URL, rollout criterion, legacy freeze date) still outstanding; no named owner. Blocker for Sprint 1 per plan §8 gate #4. Outcome: **Correct as written.**


**Decision — 2026-04-20 (solo-run phase):** DEFERRED. No preview URL
provisioned for Sprint 1. Rationale: with TB-P4 deferred and no external
audience, a preview URL has no consumer. Development continues on
localhost. When a consumer emerges (opportunistic reviewer, future
pilot, presentation), deploy as a GitHub Pages subpath (e.g.
`cerr-uzbekistan.github.io/policy-ui/` or `cerr-uzbekistan.github.io/v2/`)
to preserve all existing legacy model URLs. Vercel deferred pending
actual need.

**Constraint carried forward:** the existing legacy site
(`cerr-uzbekistan.github.io`, models in `qpm_uzbekistan/`, `dfm_nowcast/`,
`fpp_model/`, `cge_model/`, `pe_model/`, `io_model/`) must remain live
and reachable at current URLs during the entire replatform. Any
deployment change that breaks those URLs is out of scope until a formal
migration plan is adopted.

---

### TB-P2 · Model bridge decision + memo

**What.** Decide how `apps/policy-ui` will consume real model output. Three options, summarized from v2 §6.1:

- **Option A.** Thin FastAPI / Express / plumber backend wrapping R; `live-client.ts` files hit real HTTP endpoints.
- **Option B.** Extend the existing `shared/` registry approach — nightly R → JSON regeneration via GitHub Actions, served as static files through the existing data-contract adapter layer.
- **Option C.** Port model math (at minimum the light-touch IRF calculations for QPM and the Kalman update for DFM) to TypeScript; R stays for calibration and batch work only.

The `shared/synth-engines.js` in the repo suggests the team is already experimenting with Option C for cross-model synthesis. Confirm the scope of that work before deciding.

Commit the decision as `docs/frontend-replatform/11_model_bridge.md` (one page). Include rough timeline for bridge to become live.

**This item is moved earlier than ChatGPT's plan** (before TA-3 rather than "by TA-4") because early alignment is helpful for provenance semantics and live-data planning, even though TA-3 no longer requires it as a hard blocker.

**Acceptance criteria.**

- [ ] `11_model_bridge.md` committed to repo
- [ ] One of A / B / C committed in writing with rationale
- [ ] Estimated timeline for bridge-live
- [ ] Relationship between the decision and existing `shared/synth-engines.js` documented
- [ ] Named engineering owner for the bridge implementation

**Deadline.** Before TA-4 begins — ideally within the first week.  
**Gates.** TA-4 (Overview real-data path), future live-data work.  
**Size.** 2-hour meeting + 0.5 day memo.  
**Owner.** Engineering lead + modeling team lead (joint).

_Live verification notes:_
- No `11_model_bridge.md` in `docs/frontend-replatform/`. Item is unstarted.
- Confirmed `shared/synth-engines.js` exists in the repo root's `shared/` directory — the plan's claim that Option C work is already underway lines up with the file system.
- The React app's `*-live.ts` raw payloads are TS-typed mocks; none currently fetch a real endpoint. So the bridge decision affects near-term architecture, but not any currently working data path.
- **Phase 0 readiness pass (2026-04-19, commit c65eacc):** `docs/frontend-replatform/` contains no model-bridge doc at any number. The numbering collision flagged by the readiness doc (§5 / TB-P2 note: `11_*` would collide with this readiness file) is real — recommend `12_model_bridge.md` when the memo lands. Flagged as unclear in plan, not rewriting. Outcome: **Correct as written (minor naming clarification in readiness doc note).**

---

### TB-P3 · AI governance doc

**What.** Answer six questions in one page, as `docs/ai-governance.md`:

1. Who reviews AI-assisted drafts first? (Analytical lead? Assigned reviewer per model? Rotating pool?)
2. Where does the draft live before review? (Database? Notion page? Slack channel? A draft queue in the app itself?)
3. What does the reviewer see? (Raw AI output only? Diff against template baseline? Both side-by-side?)
4. What does "approve" mean operationally? (Does it flip `generation_mode` from `'assisted'` back to `'template'` once reviewed? Does it add a reviewer stamp? Does it retain the `'assisted'` tag but unlock export?)
5. What does the audit log retain? (Original AI output? Reviewer edits? Review timestamp? Reviewer name?)
6. What disclaimer shows to end users? (Before approval vs after approval? Same wording in EN/RU/UZ?)

**This is moved earlier than ChatGPT's plan** (from "before TA-9" to "this week") because TA-5's Interpretation panel needs to know how to render `generation_mode` *before* the panel is built, not after.

Not a big doc. Half a day of product-lead work. Non-negotiable because the repo's `NarrativeBlock.generation_mode` type already assumes this governance exists — shipping UI that renders `'assisted'` without having answered these questions is the worst-case sequencing.

**Acceptance criteria.**

- [ ] `docs/ai-governance.md` committed to repo
- [ ] All six questions answered in specific, actionable language (not "TBD")
- [ ] Explicit link between governance rules and `NarrativeBlock.generation_mode` transitions
- [ ] Disclaimer wording drafted for EN (RU/UZ can follow via TA-1a)
- [ ] Signed off by analytical lead, not just engineering

**Deadline.** This week — before TA-5 begins.  
**Gates.** TA-5 (Interpretation panel), TA-9 (AI surface treatment).  
**Size.** 0.5 day.  
**Owner.** Product lead or analytical lead (not engineering alone — this is policy, not code).

_Live verification notes:_
- `docs/ai-governance.md` does not exist anywhere under `docs/`. Item is unstarted.
- Confirmed `NarrativeGenerationMode = 'template' | 'assisted'` is already in `data-contract.ts`, which makes the missing governance doc a real risk — type-level promise without operational rules. Plan sequencing is correct.
- **Phase 0 readiness pass (2026-04-19, commit c65eacc):** Re-confirmed `docs/ai-governance.md` does not exist under `docs/`. All six questions still unanswered; disclaimer wording not drafted; no analytical-lead sign-off. Hard blocker for TA-5 (Interpretation panel must branch on `generation_mode`) and TA-9. Outcome: **Correct as written.**

---

### TB-P4 · Three named pilot users

**What.** Pick three specific people at CERR, CBU, or MinFin who will try the stakeholder-demo build this month. Write their names down. Schedule 30-minute sessions between TA-3 completion and TA-4 start. Watch them use the app without guiding. Capture observations. Reprioritize TA-5/6/7 enrichment scope based on what they actually do versus what the plan assumed.

This is the highest-leverage item in the whole plan and also the easiest to let slip because it doesn't produce a tangible artifact. Treat it as a deadline, not a task.

**Acceptance criteria.**

- [ ] Three named users identified; invitations sent
- [ ] Three 30-minute sessions completed, all in the same week before TA-4 begins
- [ ] Sessions are observational, not guided demos — user drives, team watches
- [ ] Written observations doc committed to repo as `docs/frontend-replatform/12_pilot_observations.md`
- [ ] At least one concrete reprioritization decision made as a result (e.g., "User X never used the risk rail — deprioritize TA-4 risk-rail polish" or "User Y expected comparison table sort — add to TA-6 scope")
- [ ] Observations surface back to the team before TA-4 sprint kickoff

**Deadline.** Sessions complete during the week of [YYYY-MM-DD to YYYY-MM-DD], before TA-4 begins.  
**Gates.** TA-4, TA-5, TA-6 scope prioritization.  
**Size.** 0.5 day coordination + 1.5 days of session time (3 × 30min sessions + 3 × 20min observation writeup).  
**Owner.** Product lead.

_Live verification notes:_
- `docs/frontend-replatform/12_pilot_observations.md` does not exist. Item is unstarted.
- Recommend pairing each pilot session with lightweight route/console capture around the session window so the team can see which areas were actually exercised.
- **Phase 0 readiness pass (2026-04-19, commit c65eacc):** Re-confirmed `docs/frontend-replatform/12_pilot_observations.md` does not exist. No three names / three dates recorded anywhere in the repo. Plan's §2 week-of placeholder `[YYYY-MM-DD to YYYY-MM-DD]` still unfilled — flagging as unclear (needs a concrete session week before Sprint 1 opens), not proposing a rewrite. Outcome: **Correct as written (dates to be filled by product lead).**


**Decision — 2026-04-20 (solo-run phase):** DEFERRED to Sprint 3 or later.
Rationale: in the current solo-run phase (one person holds engineering,
analytical, and product lead roles), pilot-user feedback cannot be
meaningfully substituted and external outreach has not been prioritized
for Sprint 1. The cost of deferral is acknowledged: TA-4 through TA-8
ship without outside-eye feedback, raising rework probability for
Sprint 3+. Mitigation: opportunistic informal review with one trusted
economist before Sprint 2 closes (target: one 10-minute informal
walkthrough, no structured session required). Formal three-user pilot
scheduled for when the project has additional headcount.
---

## 4. Suggested sprint calendar

Assumes 2 frontend engineers running Track A in parallel + product lead running Track B. Adjust if the team is smaller.

### Sprint 1 — Weeks 1–2

**Week 1:**

| Day | Track A | Track B |
|-----|---------|---------|
| Mon | TA-1a begins (eng 1) · TA-1b begins (eng 2) | TB-P3 drafted (product lead) |
| Tue | TA-1a continues · TA-1b completes | TB-P3 reviewed + signed off |
| Wed | TA-2 begins (eng 2) · TA-1a completes (eng 1) | TB-P2 decision meeting (2 hr) |
| Thu | TA-2 continues | TB-P2 memo written · TB-P1 decision |
| Fri | TA-2 completes · TA-3 begins | TB-P1 doc written + preview URL stood up |

**Week 2:**

| Day | Track A | Track B |
|-----|---------|---------|
| Mon | TA-3 completes | TB-P4 sessions scheduled |
| Tue–Wed | (buffer) | TB-P4 sessions run (3 × 30min) |
| Thu | TA-4 begins with TB-P4 feedback baked in | TB-P4 observations doc written |
| Fri | TA-4 continues | |

### Sprint 2 — Weeks 3–4

**Week 3:**

| Day | Track A |
|-----|---------|
| Mon | TA-4 completes |
| Mon–Wed | TA-5 (Scenario Lab enrichment — 3 days) |
| Thu–Fri | TA-6 (Comparison enrichment — 2 days) |

**Week 4:**

| Day | Track A |
|-----|---------|
| Mon–Tue | TA-7 (Model Explorer presentation) |
| Wed–Fri | TA-8 (Knowledge Hub content port) |

**TA-9 (AI surface) is deliberately not scheduled in the initial 4-week plan.** It runs in Sprint 3 or later, only after: TB-P3 is not just written but *adopted*; pilot users from TB-P4 have weighed in on whether an AI narrative is wanted; and the rest of the platform has stabilized. Do not force it into this window.

---

## 5. Risk register

Four risks worth naming explicitly:

1. **TB-P4 slips because it's "soft" work.** Mitigation: make the session dates calendar commitments, not aspirational plans, by end of Week 1.
2. **TB-P2 decision gets deferred because it's hard.** Mitigation: if no decision by end of Week 1, default to Option B (nightly R→JSON) — it's the lowest-risk bridge that keeps the static deployment working. Better to default than to stall.
3. **TA-1a gets compressed into a 1-day task and translations ship with only EN populated.** Mitigation: treat RU/UZ population as an acceptance criterion, not a stretch goal. If native RU/UZ speakers on the team can't own it, flag externally and sequence the UI work around it.
4. **TA-9 creeps earlier than planned.** Mitigation: explicit rule — no AI UI work until TB-P3 is adopted AND TB-P4 sessions have returned feedback on whether AI narrative is wanted at all. If pilot users don't want it, TA-9 deprioritizes further.

---

## 6. Non-goals (explicitly out of scope for these 4 weeks)

Do not expand scope to include any of:

- New economic models (DSA, BVAR, ABM, Climate, Labor) — ROADMAP Phase 4 territory
- REST API or SDK — defer until internal adoption is proven
- User accounts, auth, SSO — defer until collaboration is a real need
- Auto-curation pipelines (lex.uz scraping, Semantic Scholar ingestion) — defer until TB-P3 is firmly in place
- Natural-language scenario builder — nice-to-have, not must-have
- Backend migration for persistence — localStorage is fine for v1
- Replatforming the legacy site UI — it's being sunsetted, not upgraded

If any of these enters the conversation during Sprint 1 or 2, respond: *"Deferred per execution plan §6. Revisit in Sprint 3."*

---

## 7. Verification maintenance

The initial live verification pass is complete and reflected in each item's **Live verification notes** block.

For subsequent updates:
1. When a TA item changes materially, append a short verification note describing what changed in the running app.
2. When a live note proves an acceptance criterion is already satisfied, convert that criterion into a **regression guard** rather than leaving it as new work.
3. When a live note proves a criterion is impossible within current scope, narrow the criterion rather than leaving a hidden blocker in the plan.
4. Prefer short manual/browser verification notes over abstract source-only restatements.

---

## 8. Approval gate

This plan is ready to move to execution when all four of the following are true:

1. ✅ Team reads and signs off on scope
2. ✅ Live verification pass completed and incorporated into this document
3. ⬜ Owners assigned to every TA-* and TB-* item
4. ⬜ TB-P1, TB-P2, TB-P3 decisions made and docs committed

---

*Document author: external review, 2026-04-18. Expected next update: once owners are assigned and TB-P1/TB-P2/TB-P3 land. Subsequent updates: end of each sprint.*
