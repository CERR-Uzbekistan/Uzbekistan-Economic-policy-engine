# Sprint 4 Main-Merge Readiness Review

Date: 2026-04-27  
Branch reviewed: `epic/replatform-execution`  
Commit reviewed locally: `541db7c`  
Target branch: `main`  
Review type: docs/workflow readiness review; no app features implemented

Update: 2026-05-04 release-control addendum recorded for candidate `9c6f563` with QPM artifact reconciliation in the working tree.

## Verdict

**Merge readiness verdict: conditional.**

`epic/replatform-execution` appears directionally ready for a controlled main-merge path, but it should not be merged today as an automatic or casual integration. The remaining work is release-control evidence, not new product scope: complete the slice review ledger, record final hosted `/policy-ui/` smoke on the selected merge candidate, confirm final CI, and keep unrelated local artifacts out of the repository.

Main merge can proceed after those conditions are recorded and accepted by the owner. Pilot readiness remains separate and is still blocked by named evaluator and human RU/UZ terminology gates.

**2026-05-04 update verdict: SPLIT.** The slice ledger now has named owner/reviewer evidence, and the QPM nightly data-refresh drift from `origin/main` has been reconciled at the artifact level without merging or rebasing `main`. Do not make an immediate GO call for main until final CI and hosted `/policy-ui/` smoke are recorded on the selected SHA. Keep pilot readiness and gated model/backend workstreams separate from the controlled main-merge decision.

## Review Inputs

- `docs/planning/sprint-4-main-merge-readiness.md`
- `docs/planning/sprint-3-main-merge-plan.md`
- `docs/frontend-replatform/14_sprint3_release_candidate_readiness.md`
- `docs/planning/sprint-3-stabilization-closeout.md`
- `docs/planning/sprint-4-planning-brief.md`
- `README.md`
- `apps/policy-ui/README.md`
- `.github/workflows/pages.yml`
- `.github/workflows/validate.yml`

## Findings

| Area | Readiness assessment |
|---|---|
| Branch role vs main role | Clear enough after wording correction: `epic/replatform-execution` is the replatform/internal-preview branch; `main` remains the stable root/Pages integration target. Merge should promote the sidecar without implying pilot or production readiness. |
| Pages deployment behavior | Workflow builds `apps/policy-ui` with `POLICY_UI_BASE=/Uzbekistan-Economic-policy-engine/policy-ui/`, copies the legacy repository root into `_site`, then overlays the React build at `_site/policy-ui/`. This preserves root behavior and serves the React app as a sidecar. |
| Legacy root preservation | Preserved by workflow design: `_site/index.html` is validated, root files are copied before the sidecar is added, and the React app is not replacing root `index.html`. |
| React sidecar path | Correctly scoped to `/policy-ui/` with hash routes such as `/policy-ui/#/overview`; static data artifacts should resolve under `/policy-ui/data/*.json`. |
| CI warnings | Existing Vite large chunk warning is accepted but unresolved. `validate.yml` can emit warning-only findings for console logs or low root i18n count; final merge should treat new warnings as review items, not silently ignore them. |
| Untracked local files | Local `git status` shows untracked files/directories: `Git-GitHub-Guide-CERR-Team-v2.html`, `Git-GitHub-Guide-CERR-Team-v3-animated.html`, `_pptx_extract/`, and `huashu-design-showcase/`. They are not part of this review and must not be included in a main-merge PR. |
| Release claims | Release-control docs correctly avoid production-ready and pilot-ready claims. README wording was tightened from pilot deployment to internal-preview deployment to match the current status. |
| Overclaim risk | Remaining risk is mostly terminology drift: owner-facing docs may still use "pilot" historically, but the active readiness docs explicitly say not pilot-ready and not public/production validated. |

## 2026-05-04 Addendum

Local branch state after `git fetch origin`: `epic/replatform-execution` at `9c6f563`, tracking `origin/epic/replatform-execution`.

Main divergence was audited before the artifact sync: `origin/main...HEAD` remains a graph divergence because the branch has not merged or rebased `main`, but the behind side consists only of QPM nightly regeneration commits dated 2026-04-22 through 2026-05-03. The latest inspected main-only commit, `a419402 data(qpm): nightly regeneration 2026-05-03`, changes only `apps/policy-ui/public/data/qpm.json`; that public artifact has been restored into the epic working tree. This does not change the release-claim boundary and does not authorize new model work.

Policy UI verification after the artifact sync passed locally: `npm test` passed with 312 tests, `npm run lint` passed, `npm run build` passed with the accepted large-chunk warning, `POLICY_UI_BASE=/policy-ui/ npm run build` passed for active-preview shape, and `npm run smoke:active-preview` passed against a temporary local `vite preview` server at `http://127.0.0.1:4173/policy-ui/`.

Current local dirty state remains excluded from the merge evidence apart from this QPM artifact and release-control documentation update: tracked modification `shared/literature-data.js`; untracked `Git-GitHub-Guide-CERR-Team-v2.html`, `Git-GitHub-Guide-CERR-Team-v3-animated.html`, `_pptx_extract/`, `apps/policy-ui/skills-lock.json`, `docs/planning/knowledge-hub-mock-cleanup-slice.md`, and `huashu-design-showcase/`.

Owner/release-claim evidence now points to the completed slice ledger in `docs/planning/sprint-3-main-merge-plan.md` and the claim boundary in `docs/frontend-replatform/14_sprint3_release_candidate_readiness.md`. The active release language remains internal-preview only; pilot-ready, production-ready, public launch, and full replacement claims remain disallowed.

## Blockers

These block main merge until completed or explicitly waived by the owner:

1. Record final CI on the selected merge candidate, including Pages build/deploy behavior and `validate.yml`.
2. Record hosted `/policy-ui/` smoke results for the final merge candidate, including routes, JSON artifacts, language switching, console errors, refresh/back behavior, Data Registry, Model Explorer I-O evidence, Scenario Lab I-O save, and Comparison saved I-O add.
3. Ensure the reconciled QPM artifact is included in the final candidate and not mixed with unrelated dirty files.
4. Resolve, defer by owner decision, or explicitly exclude any P0/P1 hosted-smoke, pilot, or release-control findings.
5. Confirm the unrelated local dirty artifacts listed above are not staged, committed, or included in the merge.

## Non-Blocking Warnings

- Vite large chunk warning remains accepted but should be planned as a later hardening task before broader public use.
- QPM and DFM freshness warnings remain expected current data-state warnings, not merge blockers.
- I-O sector labels remain Russian in the source artifact; EN/UZ sector-name reconciliation remains a later content/data task.
- RU/UZ terminology quality is not complete for broader pilot use; this should block pilot-facing claims, not necessarily the controlled main merge if the owner separates pilot readiness from merge readiness.
- Local Windows `spawn EPERM` history means Ubuntu Pages workflow evidence should be treated as the deployment source of truth.
- The root README still describes the broader legacy platform capabilities; do not read those claims as React sidecar readiness claims.

## Required Pre-Merge Checklist

1. Confirm branch and status:
   - Current branch is `epic/replatform-execution`.
   - Working tree contains only intended tracked docs changes.
   - The known untracked local files remain excluded from the PR.
2. Complete the Sprint 3 slice review ledger with owner/reviewer evidence.
3. Run or confirm final CI for `validate.yml` and the Pages workflow on the exact candidate SHA.
4. Complete hosted smoke using `docs/planning/sprint-3-hosted-smoke-checklist.md`.
5. Re-read `docs/frontend-replatform/14_sprint3_release_candidate_readiness.md` after final CI/smoke and update any stale gate status.
6. Confirm no document or PR description claims pilot-ready, production-ready, public launch, or broad public validation.
7. Confirm the PR description says the final integration was reviewed by slices, not treated as an unreviewed mega-PR.
8. Owner records whether named evaluator readiness is separated from main merge or remains a merge gate.

## Post-Merge Validation Checklist

1. Confirm GitHub Pages deploys from `main`.
2. Open the root Pages URL and confirm the legacy static root still loads.
3. Open `/policy-ui/#/overview`, `/policy-ui/#/scenario-lab`, `/policy-ui/#/comparison`, `/policy-ui/#/model-explorer`, `/policy-ui/#/data-registry`, and `/policy-ui/#/knowledge-hub`.
4. Confirm `/policy-ui/data/qpm.json`, `/policy-ui/data/dfm.json`, and `/policy-ui/data/io.json` return valid JSON.
5. Smoke EN/RU/UZ switching on the hosted sidecar.
6. Recheck required flows: Scenario Lab I-O save, Comparison saved I-O add, Data Registry implemented/planned visibility, and Model Explorer I-O bridge evidence.
7. Confirm browser refresh and back/forward behavior remain valid under `/policy-ui/`.
8. Record accepted warnings and any follow-up issues with severity and owner.

## Rollback Plan

If main deployment breaks after merge:

1. Stop further feature work on `main`.
2. Identify whether the failure is root legacy breakage, `/policy-ui/` sidecar routing, static data artifact resolution, CI, or runtime UI behavior.
3. If the root legacy site is affected, revert the merge commit or redeploy the last known-good `main` immediately.
4. If only `/policy-ui/` is affected, either revert the merge commit or temporarily disable/remove the sidecar deployment from Pages while preserving the root site.
5. Keep `epic/replatform-execution` intact for diagnosis; do not rewrite branch history as the first response.
6. Re-run the hosted smoke checklist on the rollback state and on the repaired candidate before reattempting merge.

## Recommendation On Timing

Do not merge immediately based only on the branch functioning on GitHub Pages. Proceed with main merge after the final review artifacts are recorded on the selected SHA: slice ledger, hosted smoke, final CI, release-claim check, and owner acceptance of remaining warnings.

The recommended timing is: finish documentation evidence first, then merge promptly if the checks are clean. Waiting for named evaluator sessions is not required for main merge if the owner explicitly keeps pilot readiness separate from main promotion.

## Explicit No-Go Items For Main Merge

- Any unresolved route, asset, or JSON 404 under `/policy-ui/`.
- Any breakage of the legacy root Pages experience.
- Any required hosted flow failing without owner-documented deferral.
- Any P0/P1 release-control finding left unresolved or unowned.
- Any PR language claiming production-ready, pilot-ready, public launch, full validation, or complete RU/UZ terminology review.
- Any merge that includes the local untracked guide/showcase/extract artifacts.
- Any merge that starts PE, CGE, FPP, Synthesis, high-frequency indicators, backend registry, scheduler, live source management, or new model calculations as part of readiness cleanup.
- Any merge before final CI and hosted smoke are recorded for the candidate SHA.
