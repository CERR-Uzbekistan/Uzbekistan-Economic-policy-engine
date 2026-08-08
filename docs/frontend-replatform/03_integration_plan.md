# Frontend Replatform Integration Plan (Selective)

## Objective

Move from mock data to safe live data/model integration without expanding UI scope or redesigning pages.

## Non-Goals

- No new page/features beyond current MVP pages.
- No direct model wiring inside React components.
- No breaking UI contract changes during first integration wave.

## Integration Principles

- Keep current UI contracts as the stable frontend boundary.
- Add a thin adapter layer between raw backend/model payloads and UI components.
- Integrate read-only flows before interactive/run-triggering flows.
- Gate each phase with contract validation and page-level smoke checks.

## Risk-Ranked Integration Order

1. **Overview (Low risk, first)**
- Why first: Mostly read-only snapshot consumption, smallest behavioral surface, high visibility.
- Integration scope: `MacroSnapshot` subset first, then full Overview shape.
- Primary risk: inconsistent metric units/timestamps and missing prior values for deltas.

2. **Model Explorer (Medium risk, second)**
- Why second: Read-only, but metadata often comes from heterogeneous sources with uneven structure.
- Integration scope: `ModelExplorerWorkspace` catalog + details tabs.
- Primary risk: incomplete model detail sections and inconsistent caveat/severity vocabularies.

3. **Scenario Lab (High risk, third)**
- Why third: Most stateful workflow (assumptions, presets, simulation runs, result refresh), and it defines normalized scenario-result objects that downstream pages should reuse.
- Integration scope: assumptions/presets first, then run-result binding, then save/retrieve scenario.
- Primary risk: latency, run lifecycle handling, and assumption-range/schema drift across models.

4. **Comparison (Medium-High risk, last)**
- Why last: Should consume the same normalized scenario outputs produced by Scenario Lab rather than introducing a separate comparison-specific integration path.
- Integration scope: `ComparisonWorkspace` composed from normalized scenario-result objects + selection/baseline metadata.
- Primary risk: accidental duplication of normalization logic if Comparison bypasses Scenario Lab adapters.

## Recommended First Live Integration Target (Overview)

Start with **Overview headline monitoring block** only:

- `generated_at`
- `headline_metrics` (initially 3-5 core metrics)
- optional `summary`

Keep `nowcast_forecast`, `top_risks`, and `analysis_actions` on mock data for the first cut.

Why this is safest:
- read-only and no cross-page dependency,
- easiest to verify against known monitoring outputs,
- immediate value without introducing run orchestration risk.

## Thin Frontend Adapter Layer

## Purpose

Translate raw backend/model payloads into the existing UI contracts (`MacroSnapshot`, `ComparisonWorkspace`, `ModelExplorerWorkspace`, `ScenarioLab*`) so components remain unchanged.

## Proposed Shape

```text
src/data/
  adapters/
    index.ts
    overview-adapter.ts
    comparison-adapter.ts
    model-explorer-adapter.ts
    scenario-lab-adapter.ts
    shared/
      normalize.ts
      enums.ts
      numbers.ts
      dates.ts
      guards.ts
```

## Adapter Responsibilities (Thin, Not Business Logic)

- Field mapping: raw keys -> UI contract keys.
- Enum normalization: map backend labels to strict UI enums.
- Numeric normalization: coerce numbers, apply rounding policy, handle null/NaN.
- Date normalization: output ISO timestamps consistently.
- Derived fallback fields: compute `delta_abs`, `delta_pct`, `direction` when backend omits them.
- Contract guards: return typed `Result<T>` with warnings for dropped/filled fields.
- Shared scenario normalization: produce one canonical normalized scenario-result object reused by Scenario Lab and Comparison.

## Keep React Components Stable

Pages should consume only UI contracts, for example:

`fetch raw -> adapter.toMacroSnapshot(raw) -> OverviewPage contract props`

No component should parse raw API/model payloads directly.

## Mock Contract Stability Assessment

## Stable Enough to Preserve As-Is

- Core IDs and naming: `*_id`, `label`, `summary`, `title` fields.
- Shared enums already used broadly in UI:
  - `scenario_type`
  - `direction`
  - `confidence`
  - `caveat.severity`
  - `chart_type` / `view_mode`
- `HeadlineMetric` core shape used across Overview and Scenario Lab.
- `ComparisonWorkspace` top-level structure (`metric_definitions`, `scenarios`, baseline/selected ids).
- `ModelExplorerWorkspace` high-level split (catalog + detail-by-model).

## Needs Adapter-Side Normalization

- **Dates/timezones**: ensure all `generated_at`, `last_updated`, and attribution timestamps are valid ISO.
- **Metric deltas**: backend may provide values only; adapter should compute `delta_abs`, `delta_pct`, `direction` consistently.
- **Units and scale**: align `%` vs `pp`, currency scale, and risk-index range before rendering.
- **Nowcast chart conventions**: normalize series ids/order (`latest_estimate`, `prior_estimate`) and aligned x/y lengths.
- **Sparse comparison values**: missing metric entries should not silently become misleading zeros.
- **Model Explorer detail completeness**: missing assumptions/equations/caveats/data sources should be normalized to empty arrays.
- **Scenario Lab contract drift**: current docs mention `baseline_results` in workspace, while UI currently computes results client-side; adapter should isolate this mismatch until contract is finalized.

## Phase Plan and Gates

## Phase 0: Adapter Foundation

- Define adapter function signatures per page contract.
- Add contract guard tests with mock payload fixtures (happy + degraded cases).
- Add warning telemetry for normalization fallbacks.

Exit gate:
- adapters produce valid current UI contract types without component changes.

## Phase 1: Overview Live (First Target)

- Wire live source for `generated_at` + `headline_metrics` (+ optional `summary`).
- Keep rest of Overview on mocks behind adapter composition.

Exit gate:
- Overview loads with mixed live/mock seamlessly, no UI regressions.

## Phase 2: Model Explorer Live

- Integrate model catalog + details payloads through adapter.
- Normalize severity labels and absent sections.

Exit gate:
- all tabs render safely for every model (including partial metadata).

## Phase 3: Scenario Lab Live

- Integrate assumptions/presets endpoint first.
- Integrate run-result endpoint second.
- Integrate save/retrieve scenario third.

Exit gate:
- deterministic run lifecycle and resilient error states with real outputs, plus stable canonical normalized scenario-result shape.

## Phase 4: Comparison Live

- Build `ComparisonWorkspace` from Scenario Lab normalized scenario outputs.
- Reuse shared metric normalization/delta logic; avoid page-specific re-derivations.
- Validate baseline existence, selected id validity, metric coverage.

Exit gate:
- baseline switching and delta/risk views remain stable with real data and no duplicate adapter path.

## Main Integration Risks to Watch

- **Schema drift** between model teams and frontend contracts.
- **Inconsistent semantic units** causing false comparisons (%, pp, index, currency).
- **Partial payloads** that can silently degrade decision quality if normalized incorrectly.
- **Latency/timeouts** in Scenario Lab run loop affecting user trust.
- **Cross-page contract coupling** (e.g., scenario ids/metric ids diverging across Overview, Comparison, and Scenario Lab).
- **Duplicate data paths** where Comparison reimplements normalization instead of reusing Scenario Lab normalized outputs.

## Summary

- Proposed sequence: **Overview -> Model Explorer -> Scenario Lab -> Comparison** (risk-aware and dependency-aware).
- Adapter in simple terms: a small translation layer that cleans and reshapes backend/model data into the exact structures the current UI already expects.
- Highest risks: schema drift, unit inconsistency, partial/missing fields, and Scenario Lab runtime lifecycle complexity.
