# Scenario Lab Live Chart Contract Planning Note

Date: 2026-04-18
Status: Planning only (no implementation changes)

## Purpose
Scenario Lab live integration is already in place and structurally sound. The remaining open contract decision is whether live chart payloads should include full chart data (`x`/`y`/`series`) or whether backend should send only result metrics and let frontend continue deriving chart structures via local fallback logic.

## Current Situation (as-is)

### What is mocked today
- Mock result construction is generated locally in `apps/policy-ui/src/data/mock/scenario-lab.ts` via `buildScenarioLabResults(...)`.
- This local builder creates complete `charts_by_tab` objects for all tabs (`headline_impact`, `macro_path`, `external_balance`, `fiscal_effects`), including full axis and series arrays.
- In live mode, adapter fallback also reuses these locally generated chart structures when incoming chart fields are missing.

### What the runtime guard currently accepts/drops
- Guard file: `apps/policy-ui/src/data/adapters/scenario-lab-guard.ts`.
- `run.chartsByTab` is accepted as an object keyed by known tab ids.
- For each chart, guard currently preserves only:
  - `chartId`
  - `title`
  - `subtitle`
  - `chartType`
  - `viewMode`
  - `takeaway`
- Guard currently does not map/validate `x`, `y`, or `series`, so those are effectively dropped before adaptation.
- Invalid nested shapes are treated as warnings (not hard errors), and payload can still pass as `ok: true`.

### How adapter fallback currently works
- Adapter file: `apps/policy-ui/src/data/adapters/scenario-lab.ts`.
- `toScenarioLabData(...)` always creates local fallback results first:
  - `const fallbackResults = buildScenarioLabResults(getDefaultAssumptionState())`
- For each tab, `toChart(...)` overlays allowed incoming fields onto fallback chart objects.
- Because guard strips `x`/`y`/`series`, live data currently cannot override these arrays; fallback chart structure remains the source of truth.
- Net result today: live payload can override chart metadata (title/type/takeaway/view mode), but chart geometry/data points are still locally derived fallback data.

## Safe Contract Options

### Option A: Backend sends full chart payloads
Backend returns complete per-tab chart objects (metadata + `x` + `y` + `series`) as contract data.

### Option B: Backend sends only result metrics; frontend derives chart structures
Backend returns headline metrics (and optional interpretation), while frontend continues constructing chart shapes/series locally from its own logic/templates.

## Trade-off Comparison

| Dimension | Option A: Full chart payloads from backend | Option B: Metrics-only, frontend derives charts |
|---|---|---|
| Backend complexity | Higher: backend must produce chart-ready structures and keep presentation-shape stable | Lower: backend focuses on model/result metrics only |
| Frontend complexity | Lower after contract is stable: mostly render contract | Higher ongoing: frontend keeps chart derivation logic |
| Testability | Strong contract tests possible at API boundary; snapshot-like chart fixtures | Strong UI/unit tests locally, but less API-level chart verification |
| Risk of contract drift | Lower if chart schema is versioned and owned centrally | Higher: derived frontend logic may diverge from backend modeling intent over time |
| MVP suitability | Good if backend can commit quickly to schema and ownership now | Better for immediate MVP speed and low coordination cost |

## Recommendation (next step)
Use **Option B for MVP-next**.

Rationale:
- It matches current implementation behavior (live metadata + local chart derivation fallback).
- It avoids speculative backend chart-schema work right now.
- It keeps risk low while Scenario Lab live transport/guard/adapter path is already stable.
- It lets the team defer a stricter chart contract until post-MVP when chart semantics and ownership can be formalized cleanly.

## Plain-language Summary
For the next step, keep backend output simple and let frontend continue building chart structures locally. This is the safest and fastest path because it matches what the code is already doing and avoids premature chart-schema lock-in.

## Exact Backend Fields Needed Under Recommended Option (Option B)
Backend should send these fields for `run`:
- `generatedAt: string (ISO datetime)`
- `headlineMetrics: Array<...>` with each metric containing:
  - `metricId: string`
  - `label: string`
  - `value: number`
  - `unit: string`
  - `period: string`
  - `baselineValue: number | null` (recommended)
  - `deltaAbs: number | null` (optional; frontend can derive if baseline present)
  - `deltaPct: number | null` (optional; frontend can derive if baseline present)
  - `direction: "up" | "down" | "flat"` (optional; frontend can derive)
  - `confidence: "high" | "medium" | "low" | null` (optional)
  - `lastUpdated: string (ISO datetime)` (recommended)
- `interpretation` (optional but recommended):
  - `whatChanged: string[]`
  - `whyItChanged: string[]`
  - `keyRisks: string[]`
  - `policyImplications: string[]`
  - `suggestedNextScenarios: string[]`

Optional (metadata-only, no chart arrays):
- `chartsByTab[tab].chartId`
- `chartsByTab[tab].title`
- `chartsByTab[tab].subtitle`
- `chartsByTab[tab].chartType` (`line`/`bar`/`area`/`combo`)
- `chartsByTab[tab].viewMode` (`level`/`delta`/`risk`)
- `chartsByTab[tab].takeaway`

Not required under Option B now:
- `chartsByTab[tab].x`
- `chartsByTab[tab].y`
- `chartsByTab[tab].series`
