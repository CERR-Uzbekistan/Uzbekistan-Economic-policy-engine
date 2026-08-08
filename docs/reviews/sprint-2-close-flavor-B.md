# Codebase Architectural Review — Post-Sprint 2 Stable State

**Scope.** This review covers `apps/policy-ui/` architecture at the Sprint 2 close after PR #89. Inputs included the current `epic/replatform-execution` tree, Flavor A, Shot 1 prompt/audit, data-bridge contracts, and the relevant source/test/config files. This is not a process or roadmap review.

## Section 1 — Architectural Shape Today

The React app is now a five-page policy workspace with a stable shell boundary: `AppShell` owns left-rail navigation, language switching, topbar freshness, and the routed page outlet; pages own their own source loading and rendering. The page set is exactly the replatform IA: Overview, Scenario Lab, Comparison, Model Explorer, Knowledge Hub. Shared UI primitives are intentionally thin: `PageContainer`, `PageHeader`, `AttributionBadge`, `ChartRenderer`, and app-level source-state helpers. Most page composition is page-specific, which is appropriate at this stage because the five pages are still converging toward their final contracts.

The strongest architectural boundary is the data path. For Overview, Scenario Lab, Comparison, and Model Explorer, the intended pattern is raw payload -> guard -> adapter -> source -> page. Guards normalize unknown inputs into typed raw payloads with path-level issues; adapters produce domain contracts; sources decide mock/live mode and error state. The pattern holds most cleanly in Overview and Scenario Lab. Comparison now has a hybrid: source loads QPM bridge output by default, converts it into `ComparisonWorkspace`, then `composeComparisonContent()` derives the Shot 1 presentation shape. Knowledge Hub has only the outer source-state shell; it is explicitly mock-only. Model Explorer is the major exception: source/adapter/guard files still exist for the older `ModelExplorerWorkspace`, but the page directly imports `modelCatalogEntries` from `data/mock/model-catalog.ts` instead of calling `loadModelExplorerSourceState()`.

The bridge layer is separate from page adapters and currently covers QPM and DFM. QPM maps naturally into Comparison through `toComparisonWorkspaceFromQpm()`, but only four QPM metrics exist, so Shot 1's seven-row Comparison table is preserved through a scaffold merger in `composeComparisonContent()`. DFM is more bridge-native: `dfm-adapter.ts` returns DFM-shaped views; `overview/dfm-composition.ts` reshapes those into Overview `ChartSpec`. This split is sensible because DFM is a nowcast/factor artifact, not a page-ready workspace. PE, IO, CGE, and FPP bridges are absent.

State management is deliberately local except for two small stores. Scenario persistence lives in `state/scenarioStore.ts` with localStorage, schema guards, v2 keying, snapshot caching, and `useSyncExternalStore` subscriptions. Page freshness is another module-level store used by Overview and read by `AppShell`. Scenario Lab uses component state for the active run, stale-edit detection, URL preset hydration, and persisted-run restore logic. This is still manageable, but Scenario Lab is the densest page and the only one close to needing a reducer or state-machine extraction.

The contract layer is doing double duty. `data-contract.ts` is both stable shared contract and temporary transition ledger: comments explain widened unions, parallel Model Explorer catalog types, `ComparisonContent`, and legacy `suggested_next_scenarios`. That is good for auditability after Shot 1, but it should not remain the permanent destination. Tests are broad for adapters, bridges, state, and selected components. The main coverage gap is not raw count; it is that several page-level integration flows are still tested indirectly or manually.

## Section 2 — Technical Debt Inventory

1. **Model Explorer bypasses its own source pipeline.** `ModelExplorerPage.tsx:7` imports `modelCatalogEntries` directly, and lines 12-47 render from that mock array. The older `data/model-explorer/source.ts` pipeline still exists, but it does not feed the page or the new `ModelCatalogEntry` catalog. Why it accumulated: Shot 1 optimized for prototype alignment and used the richer catalog mock as source of truth. Cost of carrying: Model Explorer cannot switch to live mode without a page rewrite, and its guard/source tests are testing a path the page does not consume. Cost to fix: 4-8 hours. Severity: **serious**.

2. **Parallel Model Explorer types need a retirement path.** `ModelExplorerModelEntry` starts at `data-contract.ts:299`; `ModelCatalogEntry` starts at `data-contract.ts:407`; `catalog_entries_by_model_id` is optional at line 355. This was the right additive move for Shot 1, but the legacy shape is now mostly a compatibility shell. Cost of carrying: every future model-bridge consumer has to decide which model-explorer contract to populate. Cost to fix: 1-2 slices, depending on live-data requirements. Severity: **serious**.

3. **Comparison has a transitional presentation scaffold.** `SHOT1_COMPARISON_METRICS` at `data/adapters/comparison.ts:300` forces seven canonical rows, including `unemployment_avg` and `real_wages_cumulative` at lines 306-307, while QPM supplies only four metrics. Why it accumulated: cycle 2 correctly preserved the Shot 1 visual anchor after live QPM exposed the 4-row gap. Cost of carrying: table rows can imply cross-model readiness before live bridge values exist, even though missing cells render as dashes. Cost to fix: 4-8 hours once the relevant bridge outputs exist. Severity: **moderate**, not critical.

4. **`ComparisonContent` is useful but should stay a view model, not become a second domain model.** `ComparisonWorkspace` begins at `data-contract.ts:232`; `ComparisonContent` begins at line 279. The composer boundary is clean today, but if future bridges populate `ComparisonContent` directly, the architecture will fork. Cost of carrying: low now, higher if copied. Cost to fix: keep the composer as the only boundary and document deletion conditions for the old workspace fields after bridge parity. Severity: **moderate**.

5. **Mock/live mode configuration is inconsistent.** Overview, Scenario Lab, and Model Explorer default to mock unless `VITE_*_DATA_MODE=live`; Comparison defaults to live with mock fallback; Knowledge Hub hard-codes mock at `data/knowledge-hub/source.ts:22-23`. `vite-env.d.ts` only types Overview env keys at lines 4-6, while the code reads many QPM/DFM/Comparison/Scenario/Model Explorer env vars. Cost of carrying: surprising local behavior and weak type support for deployment configuration. Cost to fix: 2-4 hours. Severity: **serious**.

6. **Knowledge Hub has no guard/live-client despite having an adapter.** `data/adapters/knowledge-hub.ts` exists, but `data/knowledge-hub/source.ts` returns mock content directly. This was an explicit Shot 1 carve-out. Cost of carrying: low until live reform/research feeds exist; high once Shot 2 content needs provenance or update cadence. Cost to fix: 4-6 hours. Severity: **moderate**.

7. **Editorial sentinel slots lack an inventory mechanism.** Sentinels are scattered across Overview KPI notes, Model Explorer validation summaries, and Comparison tradeoff fallback. The visible-chip pattern is good, but there is no single test or registry answering "which sentinels remain?" Cost of carrying: Shot 2 may fill content unevenly without a complete burn-down view. Cost to fix: 2-4 hours with a centralized sentinel constant and inventory test. Severity: **moderate**.

8. **Dual Scenario Lab suggested-next fields and metadata compatibility remain.** Contract keeps `suggested_next_scenarios` at `data-contract.ts:481` and adds `suggested_next` at line 483. The adapter still emits legacy top-level generation metadata (`scenario-lab.ts:304-313`) rather than the newer `metadata` field, and `InterpretationPanel` supports both. Cost of carrying: small now, but every persistence/adapter change must remember both shapes. Cost to fix: 3-6 hours after saved-run migration tests are in place. Severity: **moderate**.

9. **`MacroSnapshot.summary` union is handled correctly but should not spread.** The Overview guard preserves `string | NarrativeSegment[]`, and `EconomicStateHeader` can render it. This is fine for Overview, but widening prose fields elsewhere would make guards more complex. Cost of carrying: low. Cost to fix: none now; document as Overview-specific. Severity: **minor**.

10. **Bridge clients and guards are duplicated by model.** QPM and DFM clients are nearly identical timeout/fetch/validate wrappers; guards intentionally differ because the payloads differ. Duplication is acceptable at two bridges. At the third bridge it will start paying rent. Cost to fix: 4-6 hours for a small fetch/timeout helper, not a generic guard framework. Severity: **minor now, moderate later**.

11. **Test surface is broad but uneven.** There are 36 test files covering bridge guards/adapters, data sources, state, and selected components. Missing or thin areas: page-level Comparison selection including the stubbed add-saved scenario path, Knowledge Hub source-mode behavior, Model Explorer source integration, and Scenario Lab load-handler reset via full page flow. Cost to fix: 4-10 hours. Severity: **moderate**.

12. **Bundle size remains tracking-only.** Session histories put the JS bundle around 800-900 KB raw / 250-300 KB gzip. The current dependency stack is small: React, React Router, i18n, and Recharts. No new evidence suggests immediate action. Severity: **minor**.

## Section 3 — Inconsistencies Across Pages

The source-state pattern is similar but not uniform. Overview, Scenario Lab, and Model Explorer have loading/ready/error sources. Comparison intentionally falls back to mock on QPM transport or guard failure, returning a ready state with mode `mock`; Overview/Scenario Lab surface error states more directly. Knowledge Hub has a loading shell but cannot error because its source is mock-only. These differences are partly justified by current product goals, but they should be explicit: fallback-to-mock is a Comparison bridge strategy, not the universal page strategy.

Page component composition is inconsistent in ways that reflect slice history. Overview and Scenario Lab use source loaders and page-specific components. Comparison uses source + composer + components. Model Explorer skips source entirely and uses data mock directly. Knowledge Hub uses source but no guard/client. Model Explorer is the unjustified outlier because it has a source pipeline that the page no longer consumes.

Test placement is mostly consistent: `tests/data/bridge`, `tests/data/adapters`, `tests/data/<page>`, `tests/components/<page>`, and `tests/state`. The inconsistency is coverage depth: Overview and Scenario Lab have several component and state tests; Knowledge Hub has adapter coverage but little source/page behavior; Model Explorer has catalog mock tests but no source-to-page flow for the new catalog.

i18n is structurally consistent: all locales live in `src/locales/{en,ru,uz}/common.json`, and components generally use `useTranslation()`. The remaining risk is quality and duplication, not architecture. The prior duplicate `comparison.tradeoff` key shows locale JSON can silently overwrite. There is no automated duplicate-key guard because JSON parsing loses duplicates before TypeScript sees them.

CSS scoping follows a simple convention: page CSS in `src/pages/*.css`, component-specific class names inside page namespaces, shared primitives in `styles/base.css` and `styles/tokens.css`. This is acceptable. There is some page-level CSS growth, especially Scenario Lab and Overview, but not enough to justify CSS Modules or a design-system extraction yet.

## Section 4 — Sprint 3 Close Architecture

By Sprint 3 close, the cleanest architecture is not a full rewrite; it is consolidation around the boundaries already proven. The target should be: every page reads through a source module; bridge payloads stay model-native; page adapters/composers turn model-native data into page-native view models; page components never import mocks directly except in tests.

The Model Explorer parallel types should consolidate first. The new `ModelCatalogEntry` should become the page's canonical model-explorer shape. The older `ModelExplorerModelEntry`/`ModelExplorerModelDetail` should either be adapted into `ModelCatalogEntry` inside `data/adapters/model-explorer.ts` or retired after no consumers remain. The page should call `loadModelExplorerSourceState()` and render `workspace.catalog_entries_by_model_id`, not `modelCatalogEntries` directly.

Comparison's two-shape arrangement can remain through Sprint 3 if the composer remains the only gateway. Do not make bridges emit `ComparisonContent`. Let PE/IO/CGE/FPP, when they arrive, populate `ComparisonWorkspace` or model-native bridge outputs that are adapted into the workspace. Retire `ComparisonContent` only if the page's view model becomes identical to the workspace; until then, treat it as presentation composition.

Deferred bridges should land in the order dictated by what they unlock in the UI. DFM is nearly complete and should finish its nightly regeneration. IO likely unlocks richer demo visuals and sectoral explanation. PE unlocks WTO tariff analysis. CGE unlocks fiscal/labor/fiscal-effect rows in Comparison. FPP unlocks fiscal/external consistency. The architectural primitive missing before multiple new bridges is not a mega-framework; it is a small bridge fetch helper, a bridge registry/inventory, and one page-level bridge-consumption checklist.

By Sprint 3 close, primitives to add: typed env coverage for all `VITE_*` keys; centralized sentinel inventory; a bridge fetch helper; Model Explorer source integration; Knowledge Hub live-mode placeholder client/guard if real feeds exist. Primitives to remove or mark for deletion: direct page imports from mock data, legacy Scenario Lab metadata fields, and unused old Model Explorer detail shape after conversion.

## Section 5 — Recommended Technical Actions for Sprint 3

1. **Wire Model Explorer through its source pipeline.** Severity: do-this-first. Effort: 4-8 hours. Dependencies: none. Unblocks: future model bridge content and retiring parallel model types. Risk if deferred: Model Explorer becomes the one page whose architecture contradicts the rest of the app.

2. **Update env typing and normalize data-mode defaults.** Severity: do-this-first. Effort: 2-4 hours. Dependencies: none. Unblocks: safer preview/deployment configuration. Risk if deferred: deployment behavior remains implicit and page-specific.

3. **Create a sentinel inventory test.** Severity: important. Effort: 2-4 hours. Dependencies: none. Unblocks: Shot 2 content burn-down. Risk if deferred: SME placeholders get filled opportunistically with no complete view of remaining gaps.

4. **Finish DFM PR 4 and keep bridge freshness semantics explicit.** Severity: important. Effort: 1 slice. Dependencies: current DFM JSON contract. Unblocks: reliable nowcast refresh cadence. Risk if deferred: Overview appears live while DFM regeneration remains manual.

5. **Keep Comparison's composer boundary and add bridge-backed row-fill tests.** Severity: important. Effort: 3-6 hours. Dependencies: next bridge or enriched fixture. Unblocks: safe replacement of dashed scaffold rows. Risk if deferred: seven-row table remains structurally correct but substantively thin.

6. **Retire Scenario Lab legacy metadata/suggested-next shape after migration tests.** Severity: important. Effort: 3-6 hours. Dependencies: saved-scenario compatibility test. Unblocks: simpler persistence and interpretation rendering. Risk if deferred: two shapes continue to leak into every Scenario Lab change.

7. **Add a small bridge fetch/timeout helper before the third bridge.** Severity: nice-to-have now, important before IO/PE. Effort: 4-6 hours. Dependencies: none. Unblocks: faster bridge implementation without duplicating QPM/DFM boilerplate. Risk if deferred: bridge clients diverge in timeout/error semantics.

8. **Decide whether Knowledge Hub needs real source mode in Sprint 3.** Severity: important if Shot 2 content becomes data-backed; nice-to-have otherwise. Effort: 4-6 hours. Dependencies: content source shape. Unblocks: reform/research feed freshness and provenance. Risk if deferred: Knowledge Hub remains a polished static island while other pages become live-aware.

9. **Add one page-level integration test for Scenario Lab saved-run restore.** Severity: nice-to-have but high leverage. Effort: 4-6 hours. Dependencies: current test harness. Unblocks: coverage for the exact silent-corruption class fixed in TA-6a. Risk if deferred: future state changes can regress the manually verified load/reset path.

