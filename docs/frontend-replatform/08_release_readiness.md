# Frontend Replatform Release Readiness

Date: 2026-04-18
Branch context: replatform
Verdict baseline: ready for stakeholder demo; ready for PR with caveats.

## Decision Summary

The branch is release-ready for stakeholder demo and PR submission under current MVP scope.
No additional feature work is required at this stage.

## What Is Complete: Frontend Replatform

- MVP page set is delivered: Overview, Scenario Lab, Comparison, Model Explorer (basic).
- Shared app shell and unified navigation are in place.
- Shared design-system foundation and common output structures (cards/charts/tables) are in use.
- Explicit caveat/model-attribution posture is implemented in the MVP UX.
- Scope discipline has been maintained: no non-MVP feature expansion in final pass.

## What Is Complete: Selective Integration

- Overview: complete for selective-integration MVP.
- Model Explorer: complete with caveats (edge-case degraded/sparse rendering and timestamp consistency still need hardening).
- Scenario Lab: complete with caveats (baseline-results adapter normalization and run-lifecycle resilience still need hardening).
- Comparison: complete for selective-integration MVP, including honest handling of missing metrics (no silent mock substitution).

## Safe To Demo Now

- End-to-end journey across all four MVP pages.
- Core policy workflow: orient -> explore -> run scenario -> compare outcomes.
- Truthful behavior under partial data conditions (especially in Comparison), suitable for internal stakeholder trust.

## PR Caveats To Include

- This PR is MVP-complete for demo and merge readiness, not a full hardening pass.
- Remaining caveats are quality/resilience normalization items, not missing MVP features.
- Known caveat areas:
  - Unit/scale normalization (`%` vs `pp`, currency/index consistency).
  - Timestamp and caveat-severity label normalization across pages.
  - Degraded/sparse data-state clarity (especially Model Explorer and Comparison edge states).
  - Scenario Lab run lifecycle resilience (latency, timeout, partial-run handling).
  - Scenario Lab adapter contract cleanup around `baseline_results` shape consistency.

## Not Blockers for MVP

- Minor cross-page visual polish inconsistencies that do not affect task completion.
- Deeper Knowledge Hub-style content polish outside MVP scope.
- Additional convenience UX patterns that do not materially improve MVP jobs-to-be-done.

## First Post-MVP Hardening Priorities

1. Normalize units/scales, timestamp formatting, and caveat-severity vocabulary through shared adapters.
2. Harden degraded/sparse data rendering so missing or partial values are always explicit and unambiguous.
3. Strengthen Scenario Lab execution resilience and finalize adapter contract consistency (`baseline_results` and related run-shape handling).
