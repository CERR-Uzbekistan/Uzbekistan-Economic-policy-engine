# Sprint 3 Browser QA with Prototype Comparison

**Date:** 2026-04-25  
**Branch:** `codex/sprint3-browser-qa`  
**Base:** `origin/epic/replatform-execution`  
**App under test:** `http://127.0.0.1:5185`  
**Prototype reference:** `docs/alignment/spec_prototype.html`

## 1. Setup and commands run

Read-before-QA inputs:

- `docs/planning/sprint-3-week2-handoff.md`
- `docs/planning/sprint-3-execution-plan.md`
- `docs/alignment/01_shot1_prompt.md` section 0 and page success criteria
- `docs/alignment/spec_prototype.html`

Commands and results:

| Command | Result |
|---|---|
| `git fetch origin` | Passed. |
| `git switch -c codex/sprint3-browser-qa origin/epic/replatform-execution` | Passed after escalation; initial sandbox attempt could not create `.git/index.lock`. |
| `(Get-Content -Path docs\alignment\spec_prototype.html).Count` | `2831` lines. |
| `(Get-Item docs\alignment\spec_prototype.html).Length` | `118666` bytes. Not truncated; differs from old prompt byte count, likely line-ending/content drift. |
| `Test-NetConnection 127.0.0.1 -Port 5185` before server start | Failed; port was closed. |
| `cmd /c start "" /B cmd /c "npm run dev -- --host 127.0.0.1 --port 5185 > qa-devserver.out.log 2> qa-devserver.err.log"` from `apps/policy-ui` | Passed. Vite reported `http://127.0.0.1:5185/`. |
| Browser automation via Browser Use / in-app browser | Passed for app and local prototype file. |
| `npm test` from `apps/policy-ui` | Passed: 166 tests, 45 suites, 0 failures. Expected test-run console messages appeared for mocked bridge fallback and reviewed-metadata fallback. |
| `npm run build` from `apps/policy-ui` | Passed. Existing Vite large chunk warning remains for `dist/assets/index-DavguzQ0.js` at 950.32 kB. |

## 2. Pages/routes tested

| Page | App route | Prototype section |
|---|---|---|
| Overview | `/overview` | `#page-overview` |
| Scenario Lab | `/scenario-lab` and `/scenario-lab?preset=...` | `#page-lab` |
| Comparison | `/comparison` | `#page-comparison` |
| Model Explorer | `/model-explorer` | `#page-explorer` |
| Knowledge Hub | `/knowledge-hub` | `#page-hub` |

Cross-page navigation was tested through the sidebar links. Each route landed on the expected URL, showed one main landmark, and marked the clicked nav item active.

## 3. Prototype comparison table by page

| Page | Classification | Prototype comparison |
|---|---|---|
| Overview | MATCH with FOLLOW-UP | Structure matches the intended state narrative, KPI strip, nowcast/risk area, caveats, quick actions, feed, and references. Trust surfaces are visible: provenance line, model caveats, sources, and freshness status. Follow-up: app metadata uses current source values (`3 live`, Apr 17 refresh) rather than prototype sample values (`6 live`, Apr 14 refresh). |
| Scenario Lab | ACCEPTED DIVERGENCE | Three-panel workflow, presets, sliders plus numeric inputs, scenario details disclosure, saved-scenario modal, result tabs, impulse response, and suggested-next links are present. Accepted divergence: TA-9 supersedes the prototype's always-visible template AI disclaimer; template mode showed no AI-assisted disclaimer. App also keeps 8 assumptions rather than the prototype's 5, as allowed by Shot 1. |
| Comparison | ACCEPTED DIVERGENCE | Layout intent matches: selected scenario chips, baseline selector, scenario summary cards, delta table, and trade-off summary. Accepted divergence: app compares the current QPM policy-rate scenarios rather than the prototype's fiscal-consolidation/Russia-slowdown sample set. |
| Model Explorer | MATCH | Six-card model catalog, severity/status labels, model detail area, five tabs, equations, parameters, data sources, caveats, and validation summary surfaces match the prototype intent. |
| Knowledge Hub | MATCH | Curated/static two-column structure matches: reform timeline, research brief list, counts in page meta, model/domain chips, and AI-drafted/reviewer trust surface. Static mode remains intentionally preserved. |

## 4. Interaction checks by page

| Page | Checks | Result |
|---|---|---|
| Overview | Quick-action link to exchange-rate shock. | Passed. Link navigated to `/scenario-lab?preset=exchange-rate-shock` and the preset value was visible. |
| Scenario Lab | Preset button, technical-name toggle, scenario details disclosure, saved-scenario modal, run button, suggested-next links. | Passed. Preset applied visibly; technical names appeared; details exposed type/description/tags; modal opened with empty state; run kept results and interpretation visible. |
| Comparison | Baseline selector present, remove chips have accessible names, add-saved button enabled. | Passed. Selector and chip controls are present. Remove buttons expose scenario-specific accessible names. |
| Model Explorer | Catalog card selection and all detail tabs. | Passed. Selecting DFM updated detail context. Overview, Equations, Parameters, Data sources, and Caveats tabs set `aria-selected="true"` when clicked. |
| Knowledge Hub | Static content scan. | Passed. No live-mode controls or unexpected interactive affordances were present. |
| Cross-page nav | Sidebar links for all five pages. | Passed. URLs and headings matched target pages, and active nav class updated. |
| Language switching | EN, RU, UZ through global select. | Passed. Headings and shell/page labels changed without console errors. RU/UZ translation quality was not assessed per scope. |

## 5. Console errors/warnings

Browser runtime console:

- App routes: no browser console errors or warnings observed on Overview, Scenario Lab, Comparison, Model Explorer, or Knowledge Hub.
- Prototype file: no browser console errors or warnings observed while switching prototype pages.

Command-line warnings:

- `npm test` printed expected test-path warnings/logs for mocked bridge fallback and incomplete reviewed metadata fallback.
- `npm run build` printed the existing Vite large chunk warning. Build still passed.

## 6. Keyboard/accessibility smoke notes

- Ran 8 Tab steps on each app page through browser automation.
- No route crashed, no console errors appeared, and the active page remained usable after the keyboard pass.
- Main landmark and page heading were present on every tested route.
- Language switcher has an accessible select label.
- Scenario assumption sliders and number inputs expose labels in the DOM snapshot.
- Scenario preset group exposes pressed state for the active preset.
- Comparison remove buttons have scenario-specific accessible names.

This was a keyboard smoke pass, not a full screen-reader audit.

## 7. Bugs fixed

None. No small local bug fitting the fix policy was found during this QA pass.

## 8. Deferred follow-ups

- Overview metadata values differ from the prototype sample because the app uses current source-state values. Product/data owner can decide whether the Overview header should say `6 live` consistently with Model Explorer.
- Comparison content differs from prototype sample scenarios; current QPM policy-rate scenarios are acceptable for runtime behavior, but demo/story owners may want a curated comparison set later.
- Scenario Lab header shows `Active models · 1` while the result chart shows `QPM · FPP`; this appears tied to current source/model attribution rather than a UI-only bug.
- RU/UZ content quality remains out of scope for this QA pass.
- Existing production bundle-size warning remains.

## 9. Final verdict

**Approve with follow-ups.**

The five-page browser QA pass, prototype comparison, cross-page navigation, language switching, console scan, keyboard smoke pass, `npm test`, and `npm run build` all completed without blocking issues. Deferred items do not require fixes in this branch under the stated fix policy.
