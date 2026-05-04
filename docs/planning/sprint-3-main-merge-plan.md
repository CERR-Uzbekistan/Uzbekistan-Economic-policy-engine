# Sprint 3 Main Merge Plan

Date: 2026-04-26  
Branch under review: `epic/replatform-execution`  
Target branch: `main`  
Status: merge-control plan; current decision recorded 2026-05-04

This plan controls how Sprint 3 replatform work should be reviewed before it reaches `main`. It does not authorize new app features and does not replace the hosted smoke or pilot review gates.

## Why Not One Casual Mega-PR

`epic/replatform-execution` combines deployment/base-path work, bridge foundations, I-O analytics, saved-run workflow, trust/content/i18n work, and Data Registry visibility. Merging that as one casual mega-PR would make it difficult to isolate regressions, assign review ownership, or decide which risks are acceptable.

The branch should be reviewed through explicit slices even if the final technical merge is one PR. Each slice needs an acceptance record so reviewers can tell whether a failure belongs to deployment, model bridge behavior, analytics rendering, state persistence, trust copy, localization, or registry visibility.

## Slice-Based Review Ledger

| Slice | Purpose | Reviewer / owner | Status | Evidence link |
|---|---|---|---|---|
| Deployment/base-path | Confirm the app works under the hosted `/policy-ui/` path and data artifacts resolve. | Nozimjon Ortiqov, project/product owner; release reviewer to verify hosted Pages before merge | Accepted for controlled merge path; final hosted smoke still required on selected SHA | `docs/alignment/sprint3-tb-p1-pilot-deployment-audit.md`; `docs/planning/sprint-3-hosted-smoke-checklist.md`; `docs/planning/sprint-4-main-merge-readiness-review.md` |
| Bridge foundation | Confirm app bridge contracts remain explicit and do not silently mock unsupported model behavior. | Nozimjon Ortiqov, project/product owner; engineering review via bridge audit evidence | Accepted for current QPM/DFM/I-O static bridge scope; API/backend ownership switch remains gated | `docs/data-bridge/00_qpm_contract.md`; `docs/data-bridge/02_dfm_contract.md`; `docs/data-bridge/03_io_contract.md`; `docs/alignment/sprint3-io-bridge-helper-audit.md`; `docs/planning/contract-index-and-readiness-map.md` |
| I-O analytics | Confirm I-O evidence and analytics are visible, caveated, and scoped to current artifact limits. | Nozimjon Ortiqov, project/product owner; analytics review via I-O evidence audits | Accepted for internal-preview evidence and saved-run analytics; macro forecast, causal, and general-equilibrium claims remain out of scope | `docs/alignment/sprint3-model-explorer-io-enrichment-audit.md`; `docs/alignment/sprint3-scenario-lab-io-sector-shock-audit.md`; `docs/data-bridge/04_io_analytics_contract.md`; `docs/planning/sprint-3-stabilization-closeout.md` |
| Saved-run workflow | Confirm Scenario Lab save and Comparison add flows work without corrupting macro comparison behavior. | Nozimjon Ortiqov, project/product owner; workflow review via saved-run audit and closeout evidence | Accepted for local/internal-preview workflow; server-side persistence and evaluator ownership remain gated | `docs/alignment/sprint3-scenario-lab-workflow-polish-audit.md`; `docs/alignment/sprint3-io-saved-runs-comparison-audit.md`; `docs/planning/sprint-3-stabilization-closeout.md` |
| Trust/content/i18n | Confirm caveats, provenance, warnings, and EN/RU/UZ smoke behavior are honest and usable. | Nozimjon Ortiqov, project/product owner and interim analytical owner; human terminology review remains separate | Accepted for internal-preview claims; not accepted for pilot-ready or public/production claims | `docs/ai-governance.md`; `docs/alignment/sprint3-week2-ta9-ai-surface-audit.md`; `docs/alignment/sprint3-final-prepilot-trust-usability-audit.md`; `docs/frontend-replatform/14_sprint3_release_candidate_readiness.md` |
| Data Registry | Confirm implemented/planned assets and warning states are visible and accurate for pilot scope. | Nozimjon Ortiqov, project/product owner; registry review via MVP and v2 audit evidence | Accepted for static/read-only internal-preview registry; backend authority, scheduler status, and source CRUD remain gated | `docs/alignment/sprint3-data-registry-mvp-audit.md`; `docs/alignment/sprint4-data-registry-v2-audit.md`; `docs/planning/contract-index-and-readiness-map.md`; `docs/planning/sprint-3-stabilization-closeout.md` |

## Current Release-Control Record - 2026-05-04

Current candidate reviewed locally: `9c6f563` on `epic/replatform-execution` after `git fetch origin`, with the QPM public artifact restored from `origin/main` into the working tree.

`origin/main` divergence was audited before reconciliation. `git log origin/main..HEAD` confirmed the epic-only side remains the replatform change set. `git log HEAD..origin/main` showed 12 main-only commits, all `data(qpm): nightly regeneration` commits from 2026-04-22 through 2026-05-03. `git log --reverse --name-status HEAD..origin/main` confirmed each main-only commit changes only `apps/policy-ui/public/data/qpm.json`. The latest accepted artifact from `a419402 data(qpm): nightly regeneration 2026-05-03` was then restored into `apps/policy-ui/public/data/qpm.json` without merging or rebasing `main`.

Local verification after the artifact sync: `npm test` passed with 312 tests; `npm run lint` passed; `npm run build` passed with the accepted large-chunk warning; `POLICY_UI_BASE=/policy-ui/ npm run build` passed for active-preview shape; and `npm run smoke:active-preview` passed against a temporary local `vite preview` server at `http://127.0.0.1:4173/policy-ui/`. A default-base preview smoke correctly failed before the Pages base rebuild because assets were emitted under `/assets/`; the Pages-base build resolved that release-control check.

Local dirty files are excluded from this release decision. At this review point, `git status -sb` showed one tracked unrelated modification, `shared/literature-data.js`, and untracked local artifacts: `Git-GitHub-Guide-CERR-Team-v2.html`, `Git-GitHub-Guide-CERR-Team-v3-animated.html`, `_pptx_extract/`, `apps/policy-ui/skills-lock.json`, `docs/planning/knowledge-hub-mock-cleanup-slice.md`, and `huashu-design-showcase/`. None are part of the controlled main-merge evidence and none should be staged for the merge PR unless separately reviewed and explicitly accepted.

Release-claim evidence remains bounded by `docs/frontend-replatform/14_sprint3_release_candidate_readiness.md`: internal preview release candidate only; not pilot-ready, not production-ready, not public-launch validated, and not a replacement for every legacy workflow. Named evaluator sessions and human RU/UZ terminology review are separated from main-merge readiness unless the owner changes that gate in writing.

Final decision for this record: **SPLIT**. The QPM artifact divergence is reconciled in the working tree, so the next release-control checkpoint can proceed to final-candidate evidence only after current-SHA CI and hosted `/policy-ui/` smoke are recorded. Keep pilot readiness, gated workstreams, and unrelated dirty files out of the merge decision.

## Acceptance Criteria by Slice

### Deployment/base-path

- GitHub Pages workflow passes on Ubuntu.
- App is served under `/policy-ui/`.
- Direct hosted routes work for:
  - `/policy-ui/#/overview`
  - `/policy-ui/#/scenario-lab`
  - `/policy-ui/#/comparison`
  - `/policy-ui/#/model-explorer`
  - `/policy-ui/#/data-registry`
  - `/policy-ui/#/knowledge-hub`
- Hosted data artifacts resolve:
  - `/policy-ui/data/qpm.json`
  - `/policy-ui/data/dfm.json`
  - `/policy-ui/data/io.json`
- Browser refresh/back behavior does not break the hosted SPA path.
- No required hosted smoke flow produces browser console errors.

### Bridge Foundation

- Bridge contracts are explicit about available, degraded, planned, and unsupported model states.
- Unsupported or missing model behavior does not fall back to silent fake results.
- Provenance and caveat surfaces remain visible where bridge outputs are consumed.
- Existing tests that cover bridge fallback and metadata behavior remain passing.
- Any accepted bridge limitation is documented as a warning or follow-up, not hidden.

### I-O Analytics

- Model Explorer shows I-O bridge evidence with source artifact, 2022 vintage, 136-sector scope, Leontief framework, linkage classes, and caveats.
- Scenario Lab renders current I-O sector-shock analytics.
- I-O analytics do not claim localization-complete sector labels.
- I-O analytics do not imply QPM/DFM freshness warnings are resolved.
- Any I-O interpretation shown to users remains scoped to current artifact limitations.

### Saved-Run Workflow

- Scenario Lab can save an I-O run.
- Saved run includes enough provenance for a reviewer to understand what was saved.
- Saved run can be opened or added from Comparison.
- Adding an I-O run in Comparison does not overwrite or distort macro comparison rows.
- Empty, duplicate, or unavailable saved-run states are explicit enough for pilot use.

### Trust/Content/i18n

- Allowed claims and caveats match `docs/frontend-replatform/14_sprint3_release_candidate_readiness.md`.
- QPM/DFM warning freshness states remain visible where relevant.
- I-O sector-label caveat remains visible or discoverable.
- EN/RU/UZ switching works on the six hosted routes without route breakage or console errors.
- Translation quality issues are triaged as Sprint 4 content/i18n work unless they block navigation, layout, or task completion.
- No UI text implies production launch, full public validation, or main-merge readiness before those gates are complete.

### Data Registry

- Data Registry is reachable from the hosted app.
- QPM, DFM, and I-O implemented rows are visible.
- PE, CGE, and FPP planned rows are visible.
- Freshness/status warnings are visible and understandable.
- Registry state agrees with the current release-candidate scope and does not overstate model availability.
- Registry visibility is verified alongside Model Explorer evidence and data artifact reachability.

## Final Conditions for Merging `epic/replatform-execution` into `main`

All of the following must be true before merging:

1. Slice review ledger is complete, with reviewer/owner and evidence for every slice.
2. Final CI is clean on the merge candidate.
3. Hosted smoke checklist has a `go` verdict for the final branch state.
4. Release-candidate readiness document remains accurate.
5. Named evaluator requirement is either satisfied for pilot readiness or explicitly separated from the main merge decision by the owner.
6. No open P0 pilot or smoke finding remains.
7. P1 findings are fixed, deferred by explicit owner decision, or scoped out of the merge with evidence.
8. Accepted warnings are documented and still acceptable.
9. Unrelated untracked files are not included in the merge.
10. The final PR description explains that the branch was reviewed by slices rather than treated as an unreviewed mega-PR.

## Merge Recommendation

Do not merge `epic/replatform-execution` casually as one unreviewed change set.

Proceed toward main only after slice acceptance, hosted smoke, CI, and release-candidate claim review are complete. The final technical PR may still be a single integration PR if the review ledger clearly shows each slice was checked and accepted.
