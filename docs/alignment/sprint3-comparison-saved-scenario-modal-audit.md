# Sprint 3 Comparison Saved Scenario Modal Audit

## Scope completed

- Added a compact Comparison-page "Add saved scenario" modal.
- The modal lists Scenario Lab saved runs from the existing localStorage-backed `scenarioStore`.
- The modal renders a clear empty state when no saved runs exist.
- Operators can select one or more saved runs, up to the active three-scenario Comparison slot limit, and add them to the active Comparison selector/table flow.
- Saved runs remain pilot-local only; no backend persistence, sharing, bridge contract, or deployment workflow changes were made.

## Adapter path used

- Saved Scenario Lab records are mapped through `toComparisonScenario` in `apps/policy-ui/src/state/scenarioComparisonAdapter.ts`.
- `mergeSavedScenariosIntoWorkspace` only merges mapped scenarios into the page-local `ComparisonWorkspace`; it does not introduce a second mapping path.
- `composeComparisonContent` remains the only boundary from `ComparisonWorkspace` into the page-facing `ComparisonContent` view model.

## Tests run

- `npm run lint` from `apps/policy-ui` — passed.
- `npm test` from `apps/policy-ui` — passed, 170 tests.
- `npm run build` from `apps/policy-ui` — passed; Vite large chunk warning remains.
- Browser smoke at `http://127.0.0.1:5186/comparison` — passed. Confirmed modal opens, empty state renders with no saved runs, a Scenario Lab saved draft appears in the modal after saving, the selected saved run enters the active Comparison selector/table flow, and console errors remained at 0.

## Limitations and deferred work

- The active Comparison view still has the existing three-scenario slot limit. Adding saved runs preserves the active baseline and uses the remaining two slots.
- Saved runs are session-local localStorage records only.
- No multi-user sharing, backend persistence, bridge contract changes, or deployment workflow changes were included.
