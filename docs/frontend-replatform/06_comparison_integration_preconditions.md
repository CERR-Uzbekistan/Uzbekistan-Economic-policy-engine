# Comparison Integration Preconditions (Pre-Contract Note)

Date: 2026-04-18
Status: Pre-Comparison architectural decision note (no Comparison implementation)

## Purpose
Scenario Lab chart integration is structurally sound and ready to move toward Comparison. Before starting Comparison overlays, two chart-contract decisions should be fixed so overlay behavior is predictable and safe.

## Open Decision 1: Partial-series fallback when a live series label exists but values are empty

### Plain-language issue
Sometimes backend can send a series object with a valid label/id, but no numeric values. If we treat that as a real live series, overlays can render mismatched or blank lines and create false confidence that data is complete.

### Recommended MVP rule
Use a **data-complete gate** for live series:
- A live series is usable only if it has non-empty numeric `values` and aligns to the chart x-axis length.
- If a series is present but `values` is empty (or invalid), treat that series as missing and use fallback values.
- If no live series passes the gate for a chart, use fallback chart data for numeric geometry (x/y/series values) while still allowing metadata overrides (title/subtitle/view mode/takeaway).

### Effect on future Comparison overlays
Comparison overlays depend on consistent array lengths and trustworthy numeric series. This rule prevents overlay drift and avoids mixed "half-live, half-empty" states that break legend/line alignment. It also gives a clean foundation for later strict validation (for example, hard-fail or warning badges when live data is incomplete).

## Open Decision 2: Is `chart.y.values` a contract field or vestigial/derived?

### Plain-language issue
`chart.y.values` duplicates information already contained in `series[].values`. Keeping both as first-class contract fields risks contradictions (same chart, two different y arrays).

### Recommended MVP rule
Treat **`series[].values` as the source of truth** and treat `chart.y.values` as vestigial/derived:
- For rendering and overlay math, rely on `series[].values`.
- If `chart.y.values` is provided, treat it as optional compatibility input only.
- If `chart.y.values` conflicts with series values, prefer series and ignore conflicting y-values.

### Effect on future Comparison overlays
Overlays become simpler and safer because all comparison math references one canonical numeric structure. This reduces ambiguity when plotting baseline vs scenario vs alternate runs and avoids having to reconcile dual y-value sources in every overlay path.

## Safest MVP-next choice
Adopt both conservative rules now:
1. **Incomplete live series falls back to safe local numeric data.**
2. **`series[].values` is canonical; `chart.y.values` is derived/non-authoritative.**

This is the lowest-risk path because it matches current architecture direction, avoids contract ambiguity, and minimizes chances of broken overlays when Comparison is introduced.

## Plain-language final recommendation
For MVP-next, only trust live chart series when real numeric values are present and aligned; otherwise fall back to known-good chart values. Also, treat series values as the only true numeric contract and treat `y.values` as optional legacy/derived data.

## Readiness statement
With these two decisions locked, the codebase is ready for Comparison integration planning and implementation.
