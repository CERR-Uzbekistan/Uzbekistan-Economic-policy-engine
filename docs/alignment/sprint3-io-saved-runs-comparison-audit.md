# Sprint 3 I-O Saved Runs to Comparison Audit

Date: 2026-04-25

## Scope

This note covers the additive slice after the initial Comparison I-O evidence panel:

- save a Scenario Lab I-O sector shock run into the browser session store;
- show saved I-O runs in the Scenario Lab Saved Runs tab;
- allow saved I-O runs to be added from Comparison;
- render saved I-O runs in a separate Comparison sector analytics block.

## Boundary

The implementation keeps I-O results model-native. Saved I-O runs are not transformed into the seven macro Comparison rows, and they are not treated as QPM scenario deltas. The Comparison panel copy states that value-added is an I-O accounting contribution, not a causal macro scenario effect.

## Data Flow

1. `IoSectorShockPanel` computes the model-native sector shock result from the validated I-O analytics workspace.
2. `ScenarioLabPage` saves that result as `io_sector_shock` on `SavedScenarioRecord`.
3. `scenarioStore` validates the persisted I-O run shape before writing or reading from local storage.
4. `comparisonSavedScenarios` skips records with `io_sector_shock` when composing macro Comparison scenarios.
5. `ComparisonPage` separately filters selected saved I-O records and passes them to `SavedIoSectorRunsPanel`.

## Verification

- `npm test`
- `npm run lint`
- `npm run build`
- Browser smoke:
  - Scenario Lab I-O run saves successfully.
  - Saved Runs tab displays the saved I-O run.
  - Comparison can add the saved I-O run.
  - Comparison macro table remains at 7 rows.
  - Saved I-O sector analytics panel renders.
  - No console errors.
