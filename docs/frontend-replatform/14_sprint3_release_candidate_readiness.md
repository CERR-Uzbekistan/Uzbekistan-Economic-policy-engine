# 14 - Sprint 3 Release Candidate Readiness

Date: 2026-04-26  
Branch: `epic/replatform-execution`  
Status: Internal preview release candidate; 2026-05-04 controlled merge decision is SPLIT
Source closeout: `docs/planning/sprint-3-stabilization-closeout.md`

## Current Status

Sprint 3 is release-candidate ready for internal preview and workflow/trust review.

The app-level stabilization gate is clean according to the Sprint 3 closeout: lint passed, tests passed, production build passed, local browser QA passed across the supported routes, and the I-O pilot workflows were verified. The final prototype/data-viz alignment pass is complete for the release-candidate surface, including Scenario Lab chart clarity, I-O result readability, Comparison macro/I-O separation, Data Registry status scanning, and Model Explorer bridge evidence consistency. Knowledge Hub remains route-visible for the operational internal preview, but seeded reform/brief/literature mock content is hidden behind a pending state until the source/citation workflow and reviewer model are accepted. The remaining release-control work is hosted verification, deferred named evaluator readiness, human RU/UZ terminology review, and slice-based review before any merge to `main`.

This branch is not pilot-ready because named evaluator sessions are deferred. Broader pilot readiness still requires named evaluators and a human review of RU/UZ terminology and sector/model wording.

2026-05-04 release-control update: the slice review ledger in `docs/planning/sprint-3-main-merge-plan.md` now records owner/reviewer evidence for deployment/base-path, bridge foundation, I-O analytics, saved-run workflow, trust/content/i18n, and Data Registry. Current `origin/main` divergence was audited as QPM nightly data-refresh drift: the main-only side consists only of QPM nightly regeneration commits through 2026-05-03, each limited to `apps/policy-ui/public/data/qpm.json`. The latest accepted QPM public artifact from `origin/main` has been restored into the epic working tree without merging or rebasing `main`.

## In Scope

- Internal preview of the React policy UI on `epic/replatform-execution`.
- Hosted smoke verification for the `/policy-ui/` GitHub Pages path.
- Six internal-preview surfaces: Overview, Scenario Lab, Comparison, Model Explorer, Data Registry, and Knowledge Hub pending state.
- Static data artifact reachability for QPM, DFM, and I-O JSON files.
- EN/RU/UZ language-switch smoke coverage.
- I-O evidence visibility in Model Explorer.
- I-O run/save flow in Scenario Lab.
- Saved I-O add flow in Comparison.
- Data Registry visibility for implemented and planned model/data rows.
- Final prototype/data-viz alignment pass across Scenario Lab, Comparison, Data Registry, and Model Explorer evidence surfaces.
- Deferred pilot review preparation with named evaluator requirement.
- Slice-based merge planning for eventual integration to `main`.

## Out of Scope

- New app features or UX expansion.
- New model bridge work beyond the current release candidate.
- Replacing the legacy root experience.
- Changing roadmap priorities.
- Full public launch or public-policy endorsement.
- Full accessibility audit, performance optimization pass, or translation-quality review.
- Refreshing DFM artifacts or reconciling I-O sector labels; QPM was refreshed only as a release-control artifact reconciliation from `origin/main`.
- Treating the release candidate branch as automatically ready for a casual mega-PR into `main`.

## Allowed Claims

- "Sprint 3 is an internal preview release candidate."
- "Sprint 3 is an internal preview for workflow/trust review."
- "The current branch passed docs-recorded lint, test, build, and local browser QA gates."
- "The internal-preview surface includes Overview, Scenario Lab, Comparison, Model Explorer, Data Registry, and a pending Knowledge Hub route."
- "I-O evidence is visible in Model Explorer."
- "Scenario Lab supports the current I-O run/save workflow."
- "Comparison can add saved I-O runs without replacing the macro comparison rows."
- "Data Registry makes implemented and planned model/data status visible."
- "Pilot review is deferred until hosted smoke verification, named evaluator confirmation, and human RU/UZ terminology review are complete."
- "The final prototype/data-viz alignment pass is complete for the internal preview release candidate."

## Disallowed Claims

- "Production release is complete."
- "validated production policy platform"
- "The pilot is complete."
- "completed pilot"
- "The branch is ready to merge into `main` without slice review."
- "The hosted deployment has passed until the hosted smoke checklist is completed."
- "Pilot readiness is achieved before evaluators are named."
- "Broader pilot readiness is achieved before human RU/UZ terminology review."
- "QPM and DFM freshness warnings are resolved."
- "I-O localization is complete across EN/RU/UZ sector names."
- "The bundle-size warning is fixed."
- "The app is validated for broad public use."
- "The current surface is a full replacement for every legacy workflow."

## CI, Browser, and Deploy Status

| Gate | Status | Evidence / note |
|---|---|---|
| Lint | Pass | `npm run lint` passed in Sprint 3 closeout. |
| Tests | Pass | `npm test` passed with 208 tests in Sprint 3 closeout. |
| Production build | Pass with accepted warning | `npm run build` passed; existing large chunk warning remains. |
| Local browser QA | Pass | Route, navigation, EN/RU/UZ, Data Registry, Model Explorer I-O evidence, Scenario Lab I-O save, and Comparison saved I-O add flows passed. |
| Prototype/data-viz alignment | Pass for internal preview | Final alignment pass completed for Scenario Lab QPM chart clarity, I-O readability, Comparison macro/I-O separation, Data Registry status scanning, and Model Explorer bridge evidence visual consistency. |
| Operational preview route gate | Pending verification | Every route must render either real output or the shared `PendingSurface`; Knowledge Hub mock content is hidden and pending-only. |
| EN/RU/UZ key completeness | Pending verification | Locale keys must remain complete across EN/RU/UZ. Functional RU/UZ translations do not replace human terminology review. |
| Browser smoke console errors | Pending verification | `/overview`, `/scenario-lab`, `/comparison`, `/model-explorer`, `/data-registry`, `/knowledge-hub`, and EN/RU/UZ toggles must pass with 0 console errors. |
| Hosted deployment | Conditional | GitHub Pages workflow must pass on Ubuntu and the hosted `/policy-ui/` path must be smoke checked. |
| Origin/main divergence | Artifact reconciled locally | Main-only commits were QPM nightly regeneration updates through 2026-05-03, each limited to `apps/policy-ui/public/data/qpm.json`; the latest accepted artifact has been restored into the epic working tree. Final CI and hosted smoke are still required on the selected candidate. |
| Unrelated local dirty files | Excluded | `shared/literature-data.js` and untracked guide/showcase/extract/skills-lock/Knowledge-Hub-planning files are outside this release-control decision and must not be staged into the merge PR without separate acceptance. |
| Named evaluator pilot | Deferred | Named evaluator sessions are skipped for now; this branch is not pilot-ready. |
| Public launch | Not claimed | This package supports internal preview workflow/trust review, not public launch. |

2026-05-04 local verification rerun after QPM artifact reconciliation: `npm test` passed with 312 tests, `npm run lint` passed, `npm run build` passed with the accepted large-chunk warning, `POLICY_UI_BASE=/policy-ui/ npm run build` passed for the active-preview base path, and `npm run smoke:active-preview` passed against a temporary local `vite preview` server at `http://127.0.0.1:4173/policy-ui/`. This is local evidence only; it does not replace final CI or hosted smoke on the selected merge candidate.

## Accepted Warnings

- Existing Vite large chunk warning remains and should be planned for Sprint 4 or later hardening before wider public use.
- QPM and DFM Data Registry rows show warning freshness states; this is current data-state visibility, not a UI blocker.
- I-O sector labels remain Russian in the source artifact; EN and UZ sector-name reconciliation is a later data/content task.
- Local Windows Pages-base build probing hit `spawn EPERM`; the Ubuntu GitHub Pages workflow remains the required hosted deployment gate.
- Browser QA was a smoke/stabilization pass, not a complete accessibility, screen-reader, performance, or translation-quality audit.

## Operational Preview Gate

For the fast-track operational preview branch, the gate is:

1. Every route renders real output or the shared `PendingSurface`.
2. `npm run lint`, `npm test`, and `npm run build` are green.
3. EN/RU/UZ locale keys are complete.
4. Browser smoke across `/overview`, `/scenario-lab`, `/comparison`, `/model-explorer`, `/data-registry`, `/knowledge-hub`, and EN/RU/UZ toggles passes with 0 console errors.

## Deferred Gates Before Pilot

Named evaluator sessions are skipped for now. These gates apply when pilot work resumes.

1. Complete the hosted smoke checklist in `docs/planning/sprint-3-hosted-smoke-checklist.md`.
2. Confirm the GitHub Pages workflow publishes the app under `/policy-ui/`.
3. Confirm QPM, DFM, and I-O JSON artifacts resolve from the hosted `/policy-ui/data/` path.
4. Confirm EN/RU/UZ switching on hosted routes without console errors.
5. Confirm Data Registry, Model Explorer I-O evidence, Scenario Lab I-O save flow, and Comparison saved I-O add flow on the hosted surface.
6. Confirm final visual/data-viz smoke items remain clear on the hosted surface.
7. Name the minimum evaluator roster required by `docs/planning/sprint-3-pilot-review-kit.md`.
8. Complete human RU/UZ terminology review for pilot-facing model, provenance, and sector wording.
9. Prepare observation capture in `docs/frontend-replatform/13_pilot_observations.md`.

## Remaining Gates Before Merging to Main

1. Confirm CI passes on the final merge candidate.
2. Confirm hosted smoke remains clean after the final branch state is selected.
3. Include the reconciled QPM artifact in the final candidate without staging unrelated dirty files.
4. Resolve or explicitly accept all P0/P1 pilot findings before merge.
5. Record owner approval for any remaining P2/P3 deferrals.
6. Keep unrelated dirty files out of the merge PR unless separately reviewed and accepted.
7. Avoid merging `epic/replatform-execution` as an unreviewed mega-PR.

## Go / No-Go Recommendation

GO for internal preview release candidate workflow/trust review.

NO-GO for controlled pilot review while named evaluator sessions remain deferred. Pilot review may resume only after hosted smoke verification passes, named evaluators are confirmed, and human RU/UZ terminology review is complete.

SPLIT for main-merge release control as of 2026-05-04. The slice review ledger, release-claim evidence, QPM artifact reconciliation, and local policy-ui verification are now documented, but the final main-merge candidate still needs current-SHA CI and hosted smoke. This is not a HOLD on internal-preview review, and it is not permission to start gated workstreams.

NO-GO for casual merge to `main` until final CI is clean, hosted smoke is clean, the reconciled QPM artifact is included without unrelated dirty files, and any P0/P1 pilot findings are resolved or explicitly blocked from the merge.
