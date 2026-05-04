# Sprint 3 Week 1 Foundation Handoff

**Date:** 2026-04-24  
**Branch:** `codex/sprint3-week1-foundation`  
**Base/PR target:** `epic/replatform-execution`

## Completed Items

| Item | Status | Notes |
|---|---|---|
| Model Explorer source pipeline | Complete | Page now loads through `getInitialModelExplorerSourceState()` and `loadModelExplorerSourceState()`. Mock source preserves the six-card Shot 1 catalog; live legacy payloads adapt into minimal catalog entries. |
| DFM PR 4 workflow | Complete with local R validation blocked | Workflow now runs QPM and DFM exports and commits either changed JSON artifact. DFM docs state manual dispatch on epic until TB-P1/default-branch migration activates scheduled user-facing cron. |
| Env typing and data-mode defaults | Complete | `vite-env.d.ts` covers all current `VITE_*` keys. README documents page defaults, Comparison live fallback, QPM/DFM static bridge URLs, and Knowledge Hub curated/static mode. |
| Sentinel inventory test | Complete | `collectSentinelInventory()` reports Overview KPI notes, Model Explorer validation summaries, non-QPM equation detail sets, and Comparison Shell A/C work as the Shot 2 burn-down ledger. |
| Duplicate-key locale JSON guard | Complete | Raw JSON duplicate-key parser/test covers EN/RU/UZ locale files before `JSON.parse` can overwrite duplicates. |
| Week 1 handoff note | Complete | This document. |

## Audit Artifacts

- `docs/alignment/sprint3-week1-model-explorer-source-audit.md`
- `docs/alignment/sprint3-week1-dfm-workflow-audit.md`

## Commits

- `a198523 feat(model-explorer): route page through source pipeline`
- `d2dab56 ci(dfm): include DFM in data regeneration`
- `6206d3d docs(ui): type and document data-mode env`
- `962c92c test(ui): add Week 1 content guards`

## Verification

| Command/check | Result |
|---|---|
| `npm test` from `apps/policy-ui` | Passed. 157 tests, 42 suites, 0 failures. |
| `npm run build` from `apps/policy-ui` | Passed. Vite produced production build; existing large chunk warning remains. |
| `Rscript scripts/export_dfm.R` from repo root | Blocked locally: `Rscript` is not installed/available in this environment. |
| `npm run dev -- --host 127.0.0.1 --port 5183` from `apps/policy-ui` | Sandboxed run failed with Vite/Rolldown `spawn EPERM`; approved non-sandbox run served `/model-explorer` with HTTP 200. |
| Browser runtime preview at `http://127.0.0.1:5183/model-explorer` | Passed. In-app browser snapshot showed all six catalog cards: QPM, DFM, PE, I-O, CGE, FPP. No loading or unavailable error state remained. Screenshot captured during preview. |

## Shot 2 Content Gate

Shot 2 English/source editorial content can begin for the inventoried surfaces:

- Overview KPI context notes: 8 items.
- Model Explorer validation summaries: 5 items.
- Model Explorer non-QPM equation detail sets: 5 model sets.
- Comparison trade-off Shell A/C: 2 shell templates.

RU/UZ translation should not begin yet. Translation ownership and final policy-register review remain open owner decisions.

## Blocked or Deferred

- Local DFM export execution is blocked until R/Rscript is available on the machine. CI should still run the workflow on Ubuntu with R installed by `r-lib/actions/setup-r`.
- Default-branch scheduled DFM cron activation is deferred until TB-P1 deployment migration lands on `main`.
- TB-P1 implementation is not part of this Week 1 branch.
- TB-P4 named pilot users remain an owner decision before pilot readiness is claimed.
- Translation ownership remains an owner decision before RU/UZ content work starts.

## STOP Conditions

No STOP condition was hit that required scope expansion or supervisor adjudication.

Checked conditions:

- No branch or PR action targeted `main`.
- Model Explorer wiring did not require broad contract redesign or Model Explorer type consolidation.
- DFM workflow did not require secrets or default-branch permissions for Week 1 completion.
- Env typing/default documentation did not change visible demo behavior.
- Sentinel inventory did not require content writing or UI refactor.
- Locale duplicate-key guard did not reveal duplicate keys.
- No IO/PE/CGE/FPP, TA-9, deployment, pilot, Comparison modal, Scenario Lab metadata, or translation work was implemented.

