# Sprint 3 Week 2 Content/Trust Handoff

**Date:** 2026-04-24
**Branch:** `codex/sprint3-week2-content-trust-redo`
**Base/PR target:** `epic/replatform-execution`

## Completed Items

| Item | Status | Notes |
|---|---|---|
| Shot 2 English/source content | Complete for requested surfaces | Overview KPI context notes, non-QPM Model Explorer validation summaries, and Comparison Shell A/C prose now render English/source copy without changing RU/UZ strings. Non-QPM equation formula renderers were kept within the existing page shape; fuller derivation prose remains outside current UI shape. |
| Testing philosophy doc | Complete | Added `docs/testing-philosophy.md` preserving contract-level strategy and documenting sentinel/duplicate-key content-trust guards. |
| TA-9 bounded AI surface treatment | Complete | Added audit artifact and changed Scenario Lab trust rendering only: template mode is unframed, assisted mode shows the unreviewed warning, reviewed mode shows reviewer/date when complete, and incomplete reviewed metadata falls back to assisted warning. |
| Accessibility sweep | Complete, lightweight | Checked Overview, Scenario Lab, Comparison, Model Explorer, and Knowledge Hub for headings/labels/live regions/status states/keyboard smoke behavior. Fixed a missing accessible name on Scenario Lab assumption number inputs. |
| Week 2 handoff | Complete | This document. |

## TA-9 Audit-to-PR Commitment Ledger

| Audit commitment | PR delivery | Status |
|---|---|---|
| Do not change `NarrativeGenerationMode` or saved-run shapes. | Render-only update in `InterpretationPanel`; contracts and store shapes unchanged. | Delivered |
| Template mode must not show an AI disclaimer. | Template interpretation renders no AI attribution aside. | Delivered |
| Assisted mode must show the adopted unreviewed warning. | Assisted interpretation uses adopted unreviewed EN wording. | Delivered |
| Reviewed mode must name reviewer and review date when both are present. | Reviewed interpretation interpolates reviewer and review date from existing metadata. | Delivered |
| Incomplete reviewed metadata must not overclaim review clearance. | Missing reviewer/date falls back to assisted warning. | Delivered |
| Do not build draft queue/reviewer/export/citation workflow. | No new workflow, store, route, export, or citation code added. | Delivered |

Audit artifact: `docs/alignment/sprint3-week2-ta9-ai-surface-audit.md`.

## Accessibility Sweep

Pages checked:

- Overview: heading present, main landmark present, loading/status region present, no alert state in preview, no remaining visible SME chip on requested KPI copy.
- Scenario Lab: heading present, main landmark present, status region present, template interpretation shows no AI disclaimer, assumption number inputs now have explicit accessible names.
- Comparison: heading present, main landmark present, no alert state, trade-off summary no longer falls back to SME pending on default multi-alternative selection.
- Model Explorer: heading present, main landmark present, no alert state, no visible SME pending validation chip on the default catalog path.
- Knowledge Hub: heading present, main landmark present, no alert state; curated/static mode left unchanged.

Keyboard smoke walkthrough:

- Ran six Tab steps on each page in the browser preview.
- Interactive controls remained present and reachable in the DOM snapshots.
- No structural keyboard blocker was found.

Deferred accessibility items:

- No cross-page navigation redesign or design-system refactor was needed.
- A deeper screen-reader pass remains outside the lightweight Week 2 sweep.

## Remaining Sentinels and Translation

Requested English/source sentinels are burned down in the sentinel inventory:

- Overview KPI context notes: `0`
- Model Explorer validation summaries: `0`
- Model Explorer equation detail sets: `0` for current formula-renderer shape
- Comparison Shell A/C: `0`

RU/UZ strings were not edited. RU/UZ translation can begin after owner review/approval of this English/source packet, preferably in small locale PRs guarded by the duplicate-key test.

## Verification

| Command/check | Result |
|---|---|
| `npm test -- --test-name-pattern "sentinel inventory|model catalog|composeComparisonContent|InterpretationPanel|TradeoffSummaryPanel|Scenario Lab saved-run restore integration"` from `apps/policy-ui` | Passed after TA-9 assertion updates: 165 tests, 45 suites, 0 failures. |
| `npm test -- --test-name-pattern "composeComparisonContent|sentinel inventory|InterpretationPanel|Scenario Lab saved-run restore integration"` from `apps/policy-ui` | Passed after final Comparison Shell C fix: 166 tests, 45 suites, 0 failures. |
| `npm test` from `apps/policy-ui` | Passed after final fix: 166 tests, 45 suites, 0 failures. |
| `npm run build` from `apps/policy-ui` | Passed. Vite production build completed; existing large chunk warning remains. |
| Runtime preview at `http://127.0.0.1:5184` | Passed for `/overview`, `/scenario-lab`, `/comparison`, `/model-explorer`, and `/knowledge-hub`: each page had the expected heading, main landmark, no alert state, and no requested SME sentinel chips. |
| Scenario Lab TA-9 preview | Passed: template mode displayed the interpretation without visible AI-assisted treatment. |

## Explicitly Not Implemented

- RU/UZ translation content.
- IO/PE/CGE/FPP bridge work.
- TB-P1 deployment migration during the Week 2 content/trust branch. TB-P1 is handled separately by `codex/sprint3-tb-p1-pilot-deployment`, which publishes the React rebuild as the `/policy-ui/` GitHub Pages pilot.
- Default-branch DFM cron activation.
- Comparison add-saved-scenario modal.
- Scenario Lab legacy metadata retirement.
- Scenario Lab saved-run restore integration expansion beyond TA-9 assertion alignment.
- Bridge fetch helper extraction.
- Model Explorer type consolidation.
- Knowledge Hub live/source-mode implementation.
- Full AI Advisor draft queue, reviewer workflow, export pipeline, or citation pipeline.

## STOP Conditions

No STOP condition was hit. Trust language, caveats, provenance, freshness wording, reviewer labels, and static Knowledge Hub scope remain visible and intact.
