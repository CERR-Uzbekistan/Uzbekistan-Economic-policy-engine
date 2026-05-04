# Prototype Alignment — Shot 1 Pre-Build Audit

**Branch:** `feat/prototype-alignment-shot-1`
**Base:** `epic/replatform-execution`
**Prompt reference:** `docs/alignment/01_shot1_prompt.md` (v2, codex-reviewed)
**Builder:** Claude Code
**Audit date:** 2026-04-24

> This document is the §2 read-before-write output required by the Shot 1 prompt. No implementation code is modified in the audit commit.

---

## 1. Prerequisite verification

| Check | Expected | Actual | Status |
|---|---|---|---|
| `docs/alignment/spec_prototype.html` exists | yes | yes | ✅ |
| Prototype line count | 2831 | 2831 | ✅ |
| Prototype byte count | 115,835 | 115,835 | ✅ |
| `docs/alignment/01_shot1_prompt.md` exists | yes | yes (65,958 bytes, 1,182 lines) | ✅ |
| All §2.1 paths exist on epic | yes | yes (see §2 below) | ✅ |
| Routes match spec (`/overview`, `/scenario-lab`, `/comparison`, `/model-explorer`, `/knowledge-hub`) | yes | yes (`apps/policy-ui/src/app/router.tsx:14–19`) | ✅ |
| Codex pulls resolvable on `codex/mvp-replatform-finish` | yes | yes — `apps/policy-ui/src/data/mock/model-explorer.ts` (blob 2fed404e), `apps/policy-ui/src/data/raw/model-explorer-live.ts` (blob 8e965750), `src/state/scenarioStore.ts` (blob 2f412040), `src/components/system/chart-label-utils.ts` (blob ce0b239a) | ✅ |
| `Source Sans 3` font is actually imported in `tokens.css` | yes | **No — declared only; `@import` missing** | ⚠️ to add during cross-cutting setup |
| Contract changes this slice proposes are additive | yes | mostly yes — see §3 for the three fields to watch | ⚠️ flagged |

---

## 2. Path inventory (files read in full)

All §2.1 reads are resolved on epic and compile against the current tree.

**Contracts and shared:**
- `apps/policy-ui/src/contracts/data-contract.ts` — 341 LOC; reviewed end-to-end.
- `apps/policy-ui/src/styles/tokens.css` — 38 LOC; only `IBM Plex Mono` + `IBM Plex Serif` are `@import`-ed. `Source Sans 3` is declared in `--font-sans` but never fetched.
- `apps/policy-ui/src/styles/base.css` — 469 LOC; provides `.ui-chip`, `.ui-chip--neutral`, `.ui-chip--accent`, `.segmented-control`, `.page-section-head`, `.attribution-badge`, etc. **`.ui-chip--warn` is absent.**
- `apps/policy-ui/src/components/system/ChartRenderer.tsx` — reviewed; `toBandMeta` already lives at L108 in this file. **No separate `chart-label-utils.ts` helper is needed — §5 chart-label-utils pull is a no-op.**
- `apps/policy-ui/src/components/system/chart-label-utils.ts` — 18 LOC (thin helper). Already present on epic.

**i18n:**
- `apps/policy-ui/src/locales/en/common.json` (341 LOC), `…/ru/common.json` (341 LOC), `…/uz/common.json` (341 LOC). Only one file per locale — no page-specific locale files discovered. All new keys will land in `common.json` per §3.3.

**Per-page current implementations (all read in full):**
- Overview: `pages/OverviewPage.tsx`, `components/overview/{CaveatPanel,EconomicStateHeader,KpiStrip,NowcastBanner,NowcastForecastBlock,OverviewFeeds,QuickActions,ReferencesFooter,RiskPanel,overview-feed-utils}.tsx`, `pages/overview.css`.
- Scenario Lab: `pages/ScenarioLabPage.tsx`, `components/scenario-lab/{AssumptionsPanel,InterpretationPanel,ResultsPanel,preset-chip}.tsx`, `pages/scenario-lab.css`, `pages/scenario-lab-preset.ts`.
- Comparison: `pages/ComparisonPage.tsx`, `components/comparison/{ComparisonChartPanel,HeadlineComparisonTable,ScenarioSelectorPanel,TradeoffSummaryPanel}.tsx`, `pages/comparison.css`.
- Model Explorer: `pages/ModelExplorerPage.tsx`, `pages/model-explorer.css`. **No `components/model-explorer/` directory exists today — catalog and detail logic live inline in the page.**
- Knowledge Hub: `pages/KnowledgeHubPage.tsx` — 14-line placeholder rendering `placeholder-card`. **No `components/knowledge-hub/`, no mock, no adapter, no source, no live-client, no raw-live.**

**Data pipeline:**
- `apps/policy-ui/src/data/adapters/{overview,comparison,model-explorer,scenario-lab}.ts` + guard siblings — all present.
- `apps/policy-ui/src/data/mock/{overview,comparison,model-explorer,scenario-lab}.ts` — all present.
- `apps/policy-ui/src/data/raw/{overview-live,comparison-live,model-explorer-live,scenario-lab-live}.ts` — all present.
- `apps/policy-ui/src/data/{overview,comparison,model-explorer,scenario-lab}/{source,live-client}.ts` — all present.
- No data pipeline exists for Knowledge Hub — confirmed. Full stack to be built in §4.1.

**Scenario store:** `apps/policy-ui/src/state/scenarioStore.ts` — 473 LOC. One `try`/`catch` around a localStorage write at L308–315 exists. The codex-branch version is a separate blob (2f412040); diff not yet taken. Per §5 this is an optional cleanup pull, not required for alignment; I recommend **skip by default** to keep this slice scoped and flag any scenarioStore change as out of scope unless a specific defect surfaces.

**Routing:** `apps/policy-ui/src/app/router.tsx` — all five routes match the spec. `/scenario-lab` confirmed (not `/lab`).

**Prototype:** `docs/alignment/spec_prototype.html` — read end-to-end. Line-number anchors in §1 of the prompt verified against the committed file.

---

## 3. Contract additivity review

The prompt requires all contract changes to be additive. Three fields need explicit attention:

**3.1 ScenarioLabInterpretation.suggested_next_scenarios (string[]).**
Existing epic field. Spec §4.4 introduces `suggested_next: SuggestedNextScenario[]`. To stay additive, keep the existing `suggested_next_scenarios` string field and add `suggested_next` as a new field alongside. The new UI renders `suggested_next`; if absent it can fall back to the legacy string form. Mark `suggested_next_scenarios` as legacy in a comment; remove in a future slice. No consumer rename.

**3.2 MacroSnapshot.summary (string) → string | NarrativeSegment[].**
Technically additive via union expansion, but requires `EconomicStateHeader` to branch on type. Adapter/mock emits the structured form; existing string values still deserialize. Overview guard needs a tolerance check.

**3.3 ModelExplorer detail shape.**
Epic has `ModelExplorerModelDetail { assumptions, equations, caveats, data_sources }` keyed off `details_by_model_id`. Spec §4.2 proposes a new `ModelCatalogEntry` type with different inner shapes (`parameters` not `assumptions`; `equations: { id, label }` not `{ equation_id, title, expression, explanation }`; `caveats` gains `number`, `severity: 'info' | 'warning' | 'critical'`, `issue_refs`, `target_version`; `data_sources` uses `institution / description / vintage_label` not `name / provider / frequency / vintage / note`). To stay additive:
- Keep existing `ModelExplorerModelEntry`, `ModelExplorerModelDetail`, and their inner types untouched.
- Add a parallel `ModelCatalogEntry` type + `catalog_entries_by_model_id?: Record<string, ModelCatalogEntry>` on `ModelExplorerWorkspace`.
- New UI reads from `catalog_entries_by_model_id`; mocks populate it. Guard accepts either shape.
- Existing `ModelExplorerTabId` ('assumptions' | 'equations' | 'caveats' | 'data_sources') gains an additional `'overview'` value — additive union extension.

**3.4 Comparison contract.**
Spec §4.3's `ComparisonContent`, `ComparisonScenarioMeta`, `ComparisonMetricRow`, `TradeoffSummary`, `ScenarioRole` are new. The existing `ComparisonWorkspace` + `ComparisonScenario` + `ComparisonMetricDefinition` types are heavily consumed by the QPM bridge (`data/bridge/qpm-types.ts`, `state/scenarioComparisonAdapter.ts`). To stay additive:
- Add the new types alongside; do not rename or reshape existing ones.
- Introduce a composition layer in the Comparison adapter that derives `ComparisonContent` from the existing workspace + selected-ids + baseline-id state. The QPM bridge stays on the existing shape.
- Downstream: the new `ComparisonPage` consumes `ComparisonContent`; QPM bridge pipeline is untouched.

**Verdict on additivity:** all four are mechanically additive. Flag 3.3 + 3.4 in the PR description so Codex can challenge the parallel-types choice if it prefers in-place extension.

---

## 4. Cross-page shared component impact

| Component | Used by | Change in this slice | Risk |
|---|---|---|---|
| `ChartRenderer` (`src/components/system/ChartRenderer.tsx`) | Overview nowcast today; Scenario Lab impulse-response new | No API change. New caller constructs a 3-series line `ChartSpec`. | Low. Verify `ChartSpec` 3-line rendering produces the prototype's deviation-from-baseline band shape. |
| `toBandMeta` (L108 of `ChartRenderer.tsx`) | Overview nowcast three-band (PR #87) | None. `chart-label-utils.ts` pull from codex branch is redundant. | None. |
| `.ui-chip` / `.ui-chip--neutral` / `.ui-chip--accent` | All pages (KPI, catalog, status chips, saved activity) | Add `.ui-chip--warn` alongside; existing variants untouched. | Low. Additive. |
| `tokens.css` color vars | Every page | Add `--color-baseline`, `--color-alternative`, `--color-warn-soft`, `--color-crit-soft`; also `@import` for `Source Sans 3`. Preserve `--color-uncertainty` alpha (rgba(77,93,116,0.25)) per §3.1. Verify and keep any `--color-warn` / `--color-border-strong` etc. — `--color-warn` not present today; add if prototype caveat rendering needs it. | Low if alpha preserved; check DFM three-band contrast. |
| `scenarioStore` | Scenario Lab (save/load/delete), Comparison (list for merging) | No change planned this slice. | None. |
| `PageHeader`/`PageContainer`/`AttributionBadge`/`LanguageSwitcher` | All pages | No change. | None. |

---

## 5. Per-page state summaries

### 5.1 Overview (Mixed — accept + polish five)

**Current state on epic.**
`OverviewPage.tsx` composes `EconomicStateHeader` (summary as plain string, output CTA link, drafted-from + updated-at meta; `reviewerInfo` prop exists but is gated off with a "TA-9 / TB-P3 gate" comment at L74–75), `KpiStrip` (renders a `.page-section-head` "Core indicators" heading + helper above the grid; each tile's delta renders as `ui-chip ui-chip--neutral` chip-pill with arrow glyph + signed number + context line showing `period` only), `NowcastForecastBlock` + `RiskPanel` in a two-column wrapper, `NowcastBanner` degraded-state banner, `CaveatPanel`, `QuickActions`, `OverviewFeeds`, `ReferencesFooter`. i18n uses `overview.*` keys from `common.json`. Contract shape: `MacroSnapshot.summary: string`; `HeadlineMetric` has `delta_abs`, `delta_pct`, `direction` but no `context_note`, no `delta_label`.

**Delta from spec (§4.5).**
1. Replace the plain-string summary render with `<em>`-aware rendering over `NarrativeSegment[]`.
2. Replace the gated `reviewerInfo` prop with a visible provenance line ("STATE NARRATIVE · drafted from DFM + QPM baseline" + "AI-assisted · reviewed 16 Apr · M. Usmanov"), populated from a new `MacroSnapshot.provenance?: StateProvenance` field. Sentinel chip when `reviewer_name` is absent.
3. Add `HeadlineMetric.context_note?: string` + `delta_label?: string`. Mock populates `context_note` with the `[SME content pending]` sentinel for all 8 KPIs.
4. Remove the "Core indicators" `.page-section-head` wrapper inside `KpiStrip`; KPI grid flows directly from the state header.
5. Convert the KPI delta from `.ui-chip.ui-chip--neutral` chip-pill to inline arrow-plus-text (`↑ +0.3 pp vs prior estimate`).

Keep: `CaveatPanel`, `ReferencesFooter`, 8-KPI coverage, feed structure, nowcast chart, risk rail, quick actions.

**Risk flags.**
- The `reviewerInfo` gate comment suggests there was a governance-adoption reason for hiding the reviewer line. The spec supersedes that comment by instructing the slice to render the provenance line (with sentinel when the name is absent). Proceed as spec instructs; remove the gate comment and ungate rendering.
- `MacroSnapshot.summary: string | NarrativeSegment[]` union affects `data/adapters/overview-guard.ts` — guard must accept either form.
- Existing Overview tests assert on KPI delta chip classes; those tests will need updates after the chip → inline arrow-text conversion.

### 5.2 Scenario Lab (Mixed — restore + keep Codex's 8 assumptions)

**Current state on epic.**
`ScenarioLabPage.tsx` manages preset/scenario state, runs `loadScenarioLabSourceState`, persists via `scenarioStore` (`saveScenario`, `listScenarios`, `loadScenario`, `deleteScenario`, `subscribeScenarioStore`), supports URL preset hydration. `AssumptionsPanel` renders preset chips, then a `<form>`-style block containing scenario name input + `scenarioType` select + `scenarioDescription` textarea + `scenarioTags` fieldset + Run/Save buttons + the inline `scenario-saved-list` of persisted scenarios. `AssumptionField` in this panel is number-input only; no slider. `ResultsPanel` renders a 4-tab segmented control and, for `headline_impact`, a bar chart (`ScenarioMainChart` branch with `chart_type === 'bar'`); other tabs render an HTML table. `InterpretationPanel` renders four interpretation sections + a `suggested_next_scenarios: string[]` bullet list; the AI-attribution block is **conditional** on `effectiveMode === 'assisted' | 'reviewed'` — it does **not** render in template mode.

**Delta from spec (§4.4).**
- **Sliders.** Add a `<input type="range">` to `AssumptionField` alongside the existing number input, with min/max/step sourced from `ScenarioLabAssumptionInput` (already carries these).
- **Scenario details collapsed.** Move `scenarioType` / `scenarioDescription` / `scenarioTags` into a `<details>` disclosure under the scenario-name input.
- **Load saved scenario modal.** Remove the inline `scenario-saved-list` from the panel; add a "Load saved scenario" text link that opens a focus-trapped modal component (`SavedScenarioModal`).
- **Impulse-response chart.** Drop the bar chart in `headline_impact` tab; render a 3-series line chart (GDP gap / Inflation / Policy rate, 12 quarters) via `ChartRenderer`. Add attribution badge "QPM · FPP" and "IMPULSE RESPONSE" eyebrow. Headline-metric strip stays.
- **Always-visible AI attribution.** Remove the `effectiveMode === 'assisted' | 'reviewed'` branch. Render the disclaimer in all three modes; switch copy based on `generation_mode`.
- **Clickable suggested next.** Add `SuggestedNextScenario[]` to the interpretation contract; render as `<Link>` with `to={target_route + ?preset=...}` and text label. Keep `suggested_next_scenarios: string[]` as legacy fallback for back-compat.
- **Metadata on interpretation.** Add `ScenarioLabInterpretationMetadata { generation_mode, reviewer_name?, reviewed_at? }`; move the informal casts in `InterpretationPanel` (`interpretation as InterpretationWithMetadata`) onto the typed `metadata` field.

**Risk flags.**
- No modal primitive exists in the codebase today — `SavedScenarioModal` is net-new and must own focus trap + keyboard close. Success criterion §6 calls for a focus-trap test.
- `suggested_next` vs `suggested_next_scenarios`: additive contract (see §3.1).
- `ResultsPanel`'s `headline_impact` bar chart is currently wired through the simulate pipeline; the slice drops the bar-chart path and adds `ImpulseResponseChart` as a separate card. If the impulse-response `ChartSpec` is constructed in `data/scenario-lab/` adapter (not in the component), the adapter needs a new field on `ScenarioLabResultsBundle` (e.g., `impulse_response_chart: ChartSpec`) — **additive**, contract change approved.
- Codex's 8 assumptions preserved per spec (Monetary/External/Fiscal + Trade extras). Prototype has 5 sliders; Codex's 3 extras (`tax_revenue`, `tariff_adjustment`, `external_demand_shift`) render under the existing `advanced`/`trade` categories.

### 5.3 Comparison (Option A — full rebuild)

**Current state on epic.**
`ComparisonPage.tsx` renders `ScenarioSelectorPanel` (full-panel selector with tag dropdowns per scenario + baseline switcher), `HeadlineComparisonTable`, `ComparisonChartPanel`, `TradeoffSummaryPanel`. `COMPARISON_SLOT_LIMIT = 3` confirmed. QPM bridge feeds `qpmReferenceScenarios`; saved scenarios from `scenarioStore` are merged via `toComparisonScenario`. Existing tags are `ComparisonScenarioTag = 'preferred' | 'balanced' | 'aggressive' | 'downside_stress'` — not tied to a role color.

**Delta from spec (§4.3).**
- **Chip-rail selector.** New `ComparisonSelector` replaces `ScenarioSelectorPanel`; renders `ScenarioChip` list with close `×` affordance + "+ Add saved scenario" ghost button. Baseline switcher preserved.
- **Three scenario summary cards.** New `ScenarioSummaryCards` renders top-border color per role + tag line + 5-metric summary.
- **Delta table.** Replace `HeadlineComparisonTable` with `DeltaTable` — 7 rows (GDP 3y avg, Inflation terminal, CA %GDP, Fiscal %GDP, Reserves end, Unemployment avg, Real wages cumulative) with delta columns + star decoration on numerically highest/lowest + policy-judgment footnote.
- **Drop comparative chart.** Delete `ComparisonChartPanel.tsx` and remove its page-level rendering. Any fields on existing contract exclusively used by that panel stay (separate cleanup later).
- **Editorial trade-off.** Rewrite `TradeoffSummaryPanel` internals (keep filename to preserve import statements) to render prose from 3 template shells (single-alt-vs-baseline, fiscal-vs-growth, stress-vs-baseline-robustness) with sentinel fallback.
- **Remove per-scenario tag dropdowns.** `tagsByScenarioIdOverride` logic + `ComparisonScenarioTag` UI dropdown removed.
- **Page-header meta strip.** Add "Comparing · N · Horizon · <range> · Mode · Deltas vs. Baseline".

**Risk flags.**
- QPM bridge pipeline (`scenarioComparisonAdapter.ts`, `bridge/qpm-adapter.ts`) feeds the existing `ComparisonScenario` shape. Keep that pipeline untouched; derive new `ComparisonContent` in a composition step inside `data/adapters/comparison.ts` from the existing workspace + selection state. See §3.4.
- `default_selected_ids`/`default_baseline_id` on `ComparisonWorkspace` are still authoritative; the chip-rail selector reads them.
- 7-metric coverage: `unemployment_avg` and `real_wages_cumulative` are not in the current adapter — stub with prototype mock values for this slice; flag in PR that live wiring is Shot 2+.
- `TradeoffSummary` mode=`shell` + Shell B EN is the minimum deliverable; Shells A + C + RU/UZ for B surface as sentinel if not written.

### 5.4 Model Explorer (Option A — rebuild; use Codex's content)

**Current state on epic.**
`ModelExplorerPage.tsx` renders a vertical catalog of 3 models (QPM, DFM, FPP) as full-width buttons, each with `ui-chip--neutral` status ("Active"/"Staging"/"Paused"), a model-type · frequency meta line, and summary. Clicking a model switches the 4-tab segmented control (`assumptions` / `equations` / `caveats` / `data_sources`); each tab renders a vertical list of articles. Equations render as `<pre><code>{expression}</code></pre>` (no italic vars, no Unicode subscripts). Caveats render severity as a neutral chip (no numbered prefix, no severity border). Data sources render `name / provider · frequency · vintage / note`. No `components/model-explorer/` directory exists today.

**Delta from spec (§4.2).**
- **Content seed.** Pull Codex's `apps/policy-ui/src/data/mock/model-explorer.ts` + `apps/policy-ui/src/data/raw/model-explorer-live.ts` (6-model content; both blobs confirmed available on `codex/mvp-replatform-finish`). Map Codex's 3-state `status` onto the prototype's six severity-coded labels (QPM `2 Fixes` warn, DFM `Active` ok, PE `Fix` crit, I-O `Active` ok, CGE `Gap` warn, FPP `CA exog.` warn).
- **Contract (additive, parallel types per §3.3).** Add `ModelStatusLabel`, `ModelStatusSeverity`, `ModelEquation`, `ModelParameter`, `ModelCaveat` (augmented with `number`, severity-coded borders, `issue_refs`, `target_version`), `ModelDataSource` (institution / description / vintage_label), `ModelCatalogEntry` (title, full_title, lifecycle_label, methodology_signature, stats[], purpose, equations, parameters, caveats, data_sources, validation_summary). Add `catalog_entries_by_model_id?` on `ModelExplorerWorkspace`. Extend `ModelExplorerTabId` to add `'overview'`.
- **Catalog.** Build `ModelCatalog` + `ModelCatalogCard` — 3-col grid, severity-coded status badge, methodology signature, description, 3 stats, `.active` styling on selected.
- **Detail.** Build `ModelDetail`, `ModelDetailTabs` (5 tabs), `ModelOverviewBody` (2-col), `EquationBlock` (takes equation + JSX lookup), `ParameterTable` (4-col with inactive red), `CaveatList` (numbered prefix, severity-coded left border), `DataSourceList` (3-col grid), `ValidationSummary` (paragraphs + sentinel).
- **Equations JSX sidecar.** `src/components/model-explorer/equations/<model-id>-equations.tsx` for 6 models, each exporting `Record<string, ReactNode>`. Contract remains serializable.
- **Implementation choice — tabs other than Overview.** Default plan: Overview tab shows everything (2-col body). Equations / Parameters / Data sources / Caveats tabs filter to their section. Document in PR description (§7).
- **Meta strip.** "Models · N live · Last calibration audit · <month> · Open methodology issues · N".

**Risk flags.**
- Existing `ModelExplorerModelDetail` fields (assumptions/equations/caveats/data_sources) ship with current mocks. Keep them; do not rename. New UI reads `catalog_entries_by_model_id`. Legacy tab ids remain valid if `'overview'` is added as a union extension.
- Tab state on the page is `activeTab: ModelExplorerTabId`; default becomes `'overview'` after the extension.
- Codex branch `status` is `'active' | 'staging' | 'paused'`; mapping to prototype's six-label severity set is baked into the mock, not a runtime inference — documented in the mock file.
- Issue refs display as plain text per success criteria (no hyperlink) — per §4.2 out-of-scope notes.

### 5.5 Knowledge Hub (Option A — full greenfield build)

**Current state on epic.**
`KnowledgeHubPage.tsx` is a 14-line placeholder: `<PageContainer><PageHeader /><div className="placeholder-card">{t('pages.knowledgeHub.placeholder')}</div></PageContainer>`. No `components/knowledge-hub/`, no `data/knowledge-hub/`, no adapter, no mock, no source, no live-client, no raw-live.

**Delta from spec (§4.1).**
- **Contract (additive).** Add `ReformStatus`, `ReformTrackerItem`, `ResearchBrief`, `KnowledgeHubContent` to `data-contract.ts`.
- **Full data stack.** Build `data/knowledge-hub/{source,live-client}.ts`, `data/raw/knowledge-hub-live.ts`, `data/mock/knowledge-hub.ts`, `data/adapters/{knowledge-hub,knowledge-hub-guard}.ts`.
- **Components.** Build `components/knowledge-hub/{ReformTimeline,TimelineItem,ResearchBriefList,BriefCard}.tsx`.
- **Page rewrite.** Rewrite `KnowledgeHubPage.tsx` to render: page header (eyebrow + title + description + meta strip with three counts), 2-column body (1.2fr reform tracker + 1fr research briefs). Collapse to 1-col below 1100px via `pages/knowledge-hub.css`.
- **Content seed.** Prototype verbatim (4 reforms + 3 briefs from `spec_prototype.html:2332–2412`). AI-drafted brief uses `.ui-chip--warn`.

**Risk flags.**
- Fresh greenfield — lowest integration surface. No cross-page coupling risk.
- New locale keys required across EN/RU/UZ for reform titles, mechanisms, byline roles, brief titles/summaries, meta strip labels. Keys added to `common.json`.

---

## 6. Editorial sentinel inventory (`[SME content pending]`)

| Page | Field | Count | Owner (Shot 2) |
|---|---|---|---|
| Overview | `HeadlineMetric.context_note` | 8 | @nozim / CERR |
| Overview | `MacroSnapshot.provenance.reviewer_name` (sentinel only when absent; populated in mock as "M. Usmanov" per prototype) | 0 in happy-path mock, sentinel-enabled for degraded state | CERR |
| Model Explorer | `ModelCatalogEntry.validation_summary` | 6 (one per model) | CERR |
| Comparison | `TradeoffSummary` (when mode === 'empty' or shell-missing for current locale) | up to 1 per view | @nozim |
| Knowledge Hub | — (prototype verbatim; no Shot 1 sentinels) | 0 | — |

---

## 7. Tests (expected add/update surface)

Projected delta: +25 to +50 tests.

**Adapter tests to add/update:**
- `tests/data/adapters/knowledge-hub.test.ts` (new)
- `tests/data/adapters/knowledge-hub-guard.test.ts` (new)
- `tests/data/adapters/model-explorer.test.ts` (extend for new catalog entry shape + sentinel)
- `tests/data/adapters/comparison.test.ts` (extend for `ComparisonContent` composition)
- `tests/data/adapters/overview.test.ts` (extend for `context_note`, `provenance`, `NarrativeSegment[]` summary)
- `tests/data/adapters/scenario-lab.test.ts` (extend for `suggested_next` + `metadata`)

**Component tests:**
- `DeltaTable` star placement logic
- `SavedScenarioModal` focus-trap
- `AssumptionField` slider + number input mirroring
- `InterpretationPanel` AI-attribution always-visible across three `generation_mode` values
- `SuggestedNextScenarios` `<Link>` targets
- `ValidationSummary` sentinel chip rendering
- `KpiTile` context-note branch (value / sentinel / absent)
- `ReformTimeline` status-dot variants

---

## 8. Cross-cutting setup commit scope

This slice's single "setup" commit is expected to land:

1. `tokens.css` — add `@import` for `Source Sans 3` (Google Fonts family=Source+Sans+3:wght@400;600;650&display=swap); add `--color-baseline: #1f3658`, `--color-alternative: #2f7b8a`, `--color-warn-soft: #f4e8d0`, `--color-crit-soft: #f5dfd6`; add `--color-warn` if audit-time rendering needs it for `.caveat-item` border; preserve existing `--color-uncertainty` rgba alpha.
2. `base.css` — add `.ui-chip--warn` (warn-soft background + amber border + dark-text) once, shared across pages.
3. `data-contract.ts` — additive types per §3 above (one consolidated commit touching only the contract).

Any page work comes in its own per-page commit afterward.

---

## 9. STOP-condition checklist (§2.3)

**Prerequisites**
- [x] `docs/alignment/spec_prototype.html` exists, is 2831 lines / 115,835 bytes.
- [x] All file paths in §2.1 exist in the tree (no renames discovered).
- [x] All `git checkout codex/mvp-replatform-finish -- <path>` targets exist on that branch (model-explorer mock + raw-live, scenarioStore, chart-label-utils).
- [x] All route paths match `router.tsx`.
- [x] Font imports — **⚠️ `Source Sans 3` declared but not imported. Surfaced; addition is part of the cross-cutting setup commit, not a blocker.**

**Contract and component impact**
- [x] Contract changes are all additive (with explicit strategies for the three tension points in §3).
- [x] Cross-page shared component impact is documented (§4). `ChartRenderer` API unchanged; `scenarioStore` unchanged; `tokens.css` additions only; `.ui-chip--warn` is new (additive).

**Scope**
- [x] Editorial placeholder pattern is understood and inventoried (§6).
- [x] No per-page spec assumes a component/file that doesn't exist without this audit calling it out: Knowledge Hub (whole stack), Model Explorer components directory, `SavedScenarioModal`, `ImpulseResponseChart`, `AssumptionField` slider — all flagged as net-new.

---

## 10. Verdict

**BUILD-READY.**

All preconditions are satisfied. Two items surface for the cross-cutting setup commit (Source Sans 3 `@import`, four color tokens, `.ui-chip--warn`) and three contract tension points have documented additive strategies (§3.1, §3.3, §3.4). No STOP condition triggers.

Commit sequence from here:
1. This audit commit (`docs(alignment): shot-1 pre-build audit`) — pushed before any implementation.
2. Cross-cutting setup commit (`chore(alignment): shot 1 — tokens, primitives, contract`).
3. Per-page commits (`feat(alignment): shot 1 — <page>`) in whatever order best isolates review.
4. Tests commit(s) (`test(alignment): shot 1 — <scope>`).
5. PR opened to `epic/replatform-execution` per §7 of the prompt.
