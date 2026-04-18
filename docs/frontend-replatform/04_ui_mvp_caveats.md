# UI MVP Caveats (Follow-up Backlog)

Date: 2026-04-18
Status: UI MVP complete, with non-blocking caveats logged for follow-up.

This note captures caveats from the final UI review so we can avoid scope creep while moving into integration work.

## Can Ignore For Now

- Minor visual polish inconsistencies across pages (spacing/tone details that do not affect task completion).
- Deeper content polish for Knowledge Hub-style explanatory depth (already out of MVP scope).
- Additional convenience UX patterns that do not improve core MVP jobs-to-be-done.

## Should Fix Before Wider Internal Rollout

- Normalize caveat severity labels and wording across pages so risk interpretation is consistent.
- Ensure all displayed timestamps (`generated_at`, `last_updated`) are consistently formatted and timezone-safe.
- Tighten empty/degraded data states so missing sections (especially in Model Explorer) render clearly without ambiguity.

## Should Fix During Integration Work

- Standardize unit/scale handling (`%` vs `pp`, currency scale, index ranges) before live payloads are broadly used.
- Centralize metric delta derivation (`delta_abs`, `delta_pct`, `direction`) in adapters to prevent page-by-page drift.
- Handle sparse comparison metrics explicitly (no implicit zero fallbacks for missing values).
- Resolve Scenario Lab contract mismatch around `baseline_results` via adapter normalization while keeping components unchanged.
- Harden Scenario Lab run lifecycle handling (latency, timeout, partial-run states) as live model wiring begins.

## Summary

The remaining caveats are mostly contract-normalization and data-quality guardrail items, not feature gaps. The UI MVP remains complete and fit for current scope.

Recommended priorities for the next follow-up pass:

1. Unit/scale normalization across adapters.
2. Timestamp + caveat severity normalization for trust/readability consistency.
3. Scenario Lab run lifecycle resilience during live integration.
