# Sprint 4 Main-Merge Readiness Note

Date: 2026-04-26  
Branch under review: `epic/replatform-execution`  
Status: foundation bundle readiness note; not a merge approval

## What Was Standardized

- Added a shared frontend trust/state label vocabulary for mock fixtures, live bridge JSON, fallback mock state, static curated content, local browser drafts, planned lanes, artifact guard checks, source vintage, artifact export, registry generation, and last validation check.
- Applied the vocabulary to Overview, Scenario Lab, Comparison, Model Explorer, Data Registry, and Knowledge Hub where practical without changing analytical calculations or adding persistence.
- Clarified Comparison source state so an explicit mock fixture is distinguishable from fallback mock after QPM bridge failure.
- Tightened Data Registry wording so guard checks are described as frontend artifact-shape validation, not economic or model validation.
- Added Knowledge Hub static-content warning and visible lightweight source/review metadata using existing static mock fields.

## Remaining Blockers Before Merging to Main

- Complete the Sprint 3 slice review ledger in `docs/planning/sprint-3-main-merge-plan.md`.
- Complete hosted `/policy-ui/` smoke verification on the final branch state.
- Confirm CI on the final merge candidate after review.
- Keep RU/UZ terminology under human-review gate before broader pilot-facing use.
- Resolve or explicitly defer any P0/P1 hosted smoke or pilot findings before merge.
- Confirm unrelated untracked local files are excluded from the merge.

## Explicit Out of Scope

This Sprint 4 foundation bundle did not start high-frequency indicators implementation.

This Sprint 4 foundation bundle did not start PE, CGE, or FPP implementation and did not add any new model calculations.

This Sprint 4 foundation bundle did not add a backend, database, scheduler, live source-management mode, deployment workflow change, or new artifact contract.
