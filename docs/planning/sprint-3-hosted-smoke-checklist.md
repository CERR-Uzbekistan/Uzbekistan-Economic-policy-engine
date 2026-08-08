# Sprint 3 Hosted Smoke Checklist

Date: 2026-04-26  
Branch: `epic/replatform-execution`  
Status: release-candidate hosted verification checklist

Use this checklist after the GitHub Pages workflow publishes the Sprint 3 release candidate. This is a hosted smoke pass, not a feature-expansion pass. Record failures as release-control findings; do not add new app scope while running this checklist.

## Setup

- Hosted base URL: `[fill in GitHub Pages origin]/policy-ui/`
- Browser: `[fill in browser and version]`
- Tester: `[name]`
- Date/time: `[fill in]`
- Commit SHA: `[fill in]`
- Console open before route checks: `[yes/no]`

## Route Reachability

| Check | Expected result | Result | Notes |
|---|---|---|---|
| `/policy-ui/#/overview` | Overview loads, app shell/nav visible, one main content area. | `[pass/fail]` | |
| `/policy-ui/#/scenario-lab` | Scenario Lab loads and can hydrate the default/preset state. | `[pass/fail]` | |
| `/policy-ui/#/comparison` | Comparison loads after any workspace loading state. | `[pass/fail]` | |
| `/policy-ui/#/model-explorer` | Model Explorer loads and model catalog/detail area is visible. | `[pass/fail]` | |
| `/policy-ui/#/data-registry` | Data Registry loads and model/data rows are visible. | `[pass/fail]` | |
| `/policy-ui/#/knowledge-hub` | Knowledge Hub loads and static content is visible. | `[pass/fail]` | |

## Hosted Data Artifacts

| Check | Expected result | Result | Notes |
|---|---|---|---|
| `/policy-ui/data/qpm.json` | JSON resolves with HTTP 200 and valid JSON content. | `[pass/fail]` | |
| `/policy-ui/data/dfm.json` | JSON resolves with HTTP 200 and valid JSON content. | `[pass/fail]` | |
| `/policy-ui/data/io.json` | JSON resolves with HTTP 200 and valid JSON content. | `[pass/fail]` | |

## Cross-Cutting Smoke

| Check | Expected result | Result | Notes |
|---|---|---|---|
| EN switching | EN labels/headings render on all six routes. | `[pass/fail]` | |
| RU switching | RU labels/headings render on all six routes. | `[pass/fail]` | Translation quality is not assessed in this smoke pass. |
| UZ switching | UZ labels/headings render on all six routes. | `[pass/fail]` | Translation quality is not assessed in this smoke pass. |
| No console errors | No browser console errors while loading and interacting with checked routes. | `[pass/fail]` | Warnings should be recorded separately. |
| Navigation persistence | Route navigation works under the hosted `/policy-ui/` base path. | `[pass/fail]` | |
| Refresh/back behavior | Browser refresh and back/forward do not break the SPA path. | `[pass/fail]` | |

## Required Release-Candidate Flows

| Flow | Steps | Expected result | Result | Notes |
|---|---|---|---|---|
| Data Registry visibility | Open `/policy-ui/#/data-registry`; scan implemented and planned rows. | QPM, DFM, and I-O implemented rows are visible; PE, CGE, and FPP planned rows are visible; known freshness/status warnings are explicit. | `[pass/fail]` | |
| Model Explorer I-O evidence | Open `/policy-ui/#/model-explorer`; select/open I-O evidence. | Bridge evidence is visible with source artifact, 2022 vintage, 136 sectors, Leontief framework, linkage classes, and caveats. | `[pass/fail]` | |
| Scenario Lab I-O save flow | Open `/policy-ui/#/scenario-lab`; run the I-O Sector Shock flow; save the I-O run. | I-O analytics render, `Save I-O run` succeeds, and the saved run appears with provenance and Comparison handoff. | `[pass/fail]` | |
| Comparison saved I-O add flow | Open `/policy-ui/#/comparison`; add the saved I-O run from the saved-run modal/panel. | Saved I-O run can be selected and added; I-O analytics render below the macro table without changing macro rows. | `[pass/fail]` | |

## Final Visual/Data-Viz Smoke

| Check | Expected result | Result | Notes |
|---|---|---|---|
| Scenario Lab QPM chart clarity | QPM impulse-response chart title, unit context, baseline/scenario meaning, and claim/provenance labels are clear without facilitator narration. | `[pass/fail]` | |
| I-O inline bars/readability | I-O sector results remain readable; inline contribution bars and rank cues make high-contribution sectors scannable without hiding sector labels, values, or caveats. | `[pass/fail]` | |
| Comparison macro/I-O separation | Macro comparison rows and saved I-O evidence are visually and textually separated; I-O evidence is not presented as part of the macro scenario delta table. | `[pass/fail]` | |
| Data Registry status matrix | Implemented/planned status, freshness warnings, source vintages, and artifact/export cues are scannable while preserving the validation caveat. | `[pass/fail]` | |
| Model Explorer bridge evidence visual consistency | I-O bridge evidence uses consistent status, source, vintage, framework, linkage, and caveat presentation with the rest of the release-candidate trust/provenance labels. | `[pass/fail]` | |

## Accepted Hosted Warnings

Record these if observed, but do not fail the hosted smoke pass solely because of them:

- Existing large bundle/chunk warning from the build workflow.
- QPM and DFM freshness warnings in Data Registry.
- Russian I-O sector labels from the current source artifact.
- Non-blocking translation-quality issues in RU/UZ labels, provided switching and layout remain usable.

## Failure Handling

| Failure type | Release action |
|---|---|
| Route does not load | Block pilot sharing until fixed or deployment rollback is selected. |
| Data artifact 404/invalid JSON | Block pilot sharing. |
| Console error on required route/flow | Block pilot sharing unless owner accepts as non-user-impacting with evidence. |
| Data Registry missing implemented/planned visibility | Block pilot sharing. |
| Model Explorer lacks I-O bridge evidence | Block pilot sharing. |
| Scenario Lab I-O save flow fails | Block pilot sharing. |
| Comparison saved I-O add flow fails | Block pilot sharing. |
| RU/UZ text quality concern only | Record for Sprint 4; do not block this smoke gate unless it breaks navigation, layout, or task completion. |

## Verdict

- Hosted smoke verdict: `[go / no-go]`
- Required fixes before pilot: `[fill in]`
- Accepted warnings: `[fill in]`
- Owner approval: `[name/date]`
