# Sprint 3 TB-P1 Pilot Deployment Audit

**Date:** 2026-04-25  
**Branch:** `codex/sprint3-tb-p1-pilot-deployment`  
**Base:** `epic/replatform-execution`  
**Scope:** Deployment migration only. No model bridge contract, UI/content, auth, backend, collaboration, or Knowledge Hub source-mode changes.

## Read-Before-Write Findings

| Area | Finding | TB-P1 implication |
|---|---|---|
| GitHub Pages workflow | `.github/workflows/pages.yml` already installs, lints, tests, and builds `apps/policy-ui`, sets `POLICY_UI_BASE=/Uzbekistan-Economic-policy-engine/policy-ui/`, copies `dist/` into `_site/policy-ui`, and uploads `_site` to Pages. | The React app can be deployed as a sidecar pilot without replacing the legacy root. |
| Legacy static surface | Top-level `index.html` and model folders remain the legacy public surface. The Pages workflow assembles `_site` from the repo root while excluding app/source/tooling folders. | Keep the legacy root frozen and preserved; do not delete or redirect it in TB-P1. |
| React routing/build | `apps/policy-ui/vite.config.ts` reads `POLICY_UI_BASE`; production routing uses `createHashRouter`, so the pilot URL can be `/policy-ui/#/overview` and deep links survive static hosting. | No app UI or router change is needed for GitHub Pages sidecar deployment. |
| Branch policy | Sprint 3 execution docs require PRs to target `epic/replatform-execution`; current Pages/Validate workflows still referenced the older `epic/frontend-replatform` branch. | Deployment and quality gates must follow `epic/replatform-execution`, then `main` when promoted. |
| DFM freshness | Sprint 3 docs and `docs/data-bridge/02_dfm_contract.md` state DFM regeneration is manual-dispatch on epic until TB-P1 lands on `main`; scheduled/default-branch activation is not complete before then. | TB-P1 must not claim scheduled freshness is active merely because the epic branch can build/deploy. |
| Vercel recommendation | `docs/frontend-replatform/09_deployment_migration.md` previously recommended Vercel password-protected preview while keeping GitHub Pages public legacy in parallel. | For this branch, the minimal implementable path is GitHub Pages sidecar pilot; Vercel remains a future/reversible preview option requiring owner/vendor setup. |

## Chosen Pilot Architecture

The Sprint 3 pilot deployment is a **GitHub Pages sidecar React pilot**:

- Legacy root remains at the existing repository Pages root and continues to serve `index.html` plus the model folders.
- React rebuild is built from `apps/policy-ui` and published under `/policy-ui/`.
- Pilot users enter at `/policy-ui/#/overview`, with other pages reachable through the React shell navigation and hash routes.
- Pages deployment runs from `epic/replatform-execution` and `main`; the target PR still bases on `epic/replatform-execution`.
- No secrets are required by the workflow itself. The existing repository setting assumption remains that GitHub Pages is configured for Actions deployment.

## STOP Condition Review

| STOP condition | Result |
|---|---|
| Deployment target ambiguous between legacy and React | Not hit. Legacy remains root; React pilot is `/policy-ui/`. |
| Workflow requires secrets or repo settings unavailable in this branch | Not hit for secrets. Repo-level Pages Actions configuration cannot be proven locally, but the existing workflow already depends on it and this branch does not add a new secret or vendor. |
| Publishing React would break existing legacy deployment without owner approval | Not hit. `_site/index.html` is preserved and React is copied under `_site/policy-ui`. |
| GitHub Pages/default-branch assumptions conflict with current branch policy | Not hit. Workflow targets `epic/replatform-execution` for pilot and `main` for promotion; DFM scheduled activation remains default-branch-gated. |
| DFM cron activation would be misrepresented | Not hit. Docs keep manual dispatch until the deployment path lands on `main`. |

## Audit-to-PR Commitment Ledger

| Audit commitment | PR implementation |
|---|---|
| Keep legacy surface frozen unless explicitly replaced. | Pages assembly still preserves root legacy files; no legacy HTML/model folders were edited or removed. |
| Make React rebuild the Sprint 3 pilot deployment. | Pages workflow now targets `epic/replatform-execution` and validates `_site/policy-ui` artifact layout. |
| Keep DFM cron/default-branch activation sequence honest. | Documentation states manual dispatch remains until this deployment path is promoted to `main`; no scheduled freshness claim was added. |
| Document pilot access path. | Pilot docs/README state `/policy-ui/#/overview` as the entry URL pattern. |
| Avoid model bridge, backend, auth, collaboration, and Knowledge Hub source-mode scope. | Only workflow and documentation files were changed. |
