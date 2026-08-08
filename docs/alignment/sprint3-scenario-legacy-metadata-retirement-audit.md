# Sprint 3 Scenario Lab Legacy Metadata Retirement Audit

**Date:** 2026-04-25
**Branch:** `codex/sprint3-scenario-legacy-metadata-retirement`
**Base:** `epic/replatform-execution`

## Scope

Retire the legacy Scenario Lab interpretation governance metadata path where current saved-run, restore, and comparison workflows prove it is no longer needed.

## Fields/Paths Retired

- Retired `InterpretationPanel` reads from legacy top-level `generation_mode`, `reviewer_name`, and `reviewed_at` fields on `ScenarioLabInterpretation`.
- Retired new Scenario Lab mock output writes to those top-level governance fields.
- Retired Scenario Lab raw adapter output writes to those top-level governance fields; raw camelCase governance fields now map into `interpretation.metadata`.
- Retired `scenarioStore` validation support for top-level-only `run_interpretation` governance metadata.
- `saveScenario` now normalizes persisted `run_interpretation` to the current metadata shape, stripping inert duplicate top-level governance fields on explicit save.

## Fields/Paths Intentionally Retained

- `run_interpretation.metadata.generation_mode`, `metadata.reviewer_name`, and `metadata.reviewed_at` are retained as the supported governance metadata path.
- `run_interpretation.suggested_next_scenarios` is retained as the fallback text list.
- `run_interpretation.suggested_next` is retained and validated for current clickable Scenario Lab suggested-next links.
- Saved scenarios without optional output snapshot fields remain valid.
- Comparison saved-scenario flows continue to read `run_results.headline_metrics` for governed output values and do not depend on interpretation metadata.

## Migration/Non-Destruction Behavior

- Existing v1 localStorage keys under `policy-ui:scenario:` remain ignored and byte-identical.
- Invalid v2 records, including top-level-only legacy interpretation governance records, are ignored without rewriting or deleting storage.
- Current pilot records that include supported `metadata` remain loadable even if they also carry now-inert duplicate top-level governance fields.
- No eager localStorage migration or deletion was added.

## Tests

- Added/updated store tests for metadata-only governance round-trip, non-destructive v1 ignore behavior, top-level-only governance rejection, and save-time stripping of duplicate legacy governance fields.
- Updated Scenario Lab restore integration to prove the restored current saved-run shape uses `run_interpretation.metadata` and stores no top-level governance fields.
- Updated adapter tests to prove raw governance fields map into typed metadata only.
- Updated InterpretationPanel tests to prove legacy top-level fields are ignored without typed metadata.

## Verification

- `npm test -- --test-name-pattern "scenarioStore|Scenario Lab saved-run restore integration|scenario store to comparison round trip|comparison saved-scenario helpers|InterpretationPanel|scenario lab adapter|scenario lab source live integration flow"` from `apps/policy-ui`: passed, 174 tests before the final duplicate-field load regression test was added.
- `npm run lint` from `apps/policy-ui`: passed.
- `npm test` from `apps/policy-ui`: passed, 175 tests.
- `npm run build` from `apps/policy-ui`: passed; existing Vite large chunk warning remains.

## Deferred Cleanup

- No state-machine refactor was attempted.
- Broader saved-run migrations remain deferred until there is a product-owned localStorage migration policy.
- The legacy `suggested_next_scenarios` fallback is retained because the current contract and renderer still use it for non-clickable interpretation lists.
