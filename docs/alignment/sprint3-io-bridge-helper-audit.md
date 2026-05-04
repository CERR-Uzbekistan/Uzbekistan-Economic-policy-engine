# Sprint 3 IO Bridge Helper Audit

**Date:** 2026-04-24
**Branch:** `codex/sprint3-io-bridge-helper`
**Base target:** `epic/replatform-execution`
**Tier:** Full path

## Read-Before-Write Scope

- Planning/adjudication: `docs/planning/sprint-3-execution-plan.md`, `docs/planning/sprint-3-week2-plan.md`, `docs/planning/sprint-3-week1-handoff.md`, `docs/reviews/sprint-2-close-flavor-B-adjudication.md`.
- Existing bridge precedent: `docs/data-bridge/00_qpm_contract.md`, `docs/data-bridge/02_dfm_contract.md`, QPM/DFM `types`, `guard`, `client`, `adapter`, fixtures, and guard/adapter tests under `apps/policy-ui`.
- IO artifacts: `io_model/io_data.json`, `io_model/io_data.js`, `io_model/index.html`, `mcp_server/data/io_data.json`, `mcp_server/models/io_model.py`, `mcp_server/tests/test_io.py`.
- Boundaries: `apps/policy-ui/src/contracts/data-contract.ts`, `apps/policy-ui/src/data/adapters/comparison.ts`, `apps/policy-ui/src/data/overview/dfm-composition.ts`.

## Findings

1. `io_model/io_data.json` is the best first frontend source artifact because it carries metadata, 136 sectors, `A`, `L`, and aggregate arrays. `mcp_server/data/io_data.json` is useful for Python tests but lacks metadata.
2. The expected public React target should follow QPM/DFM precedent: `apps/policy-ui/public/data/io.json`.
3. QPM and DFM clients duplicate static JSON fetch, timeout, HTTP, abort, and network handling. That narrow block can be extracted without moving page adapter logic.
4. IO bridge code must stay bridge-native. It must not emit `ComparisonContent`.
5. `io_model/io_data.js` contains Type II and multilingual arrays absent from `io_model/io_data.json`; reconciling those artifacts is out of scope for this first slice.

## Commitment Ledger

| Audit commitment | PR delivery plan | Status |
|---|---|---|
| Use `io_model/io_data.json` as source and publish `/data/io.json`. | Add deterministic Node export and generated public JSON. | Planned |
| Define IO bridge-native contract. | Add `io-types.ts` and `docs/data-bridge/03_io_contract.md`. | Planned |
| Add guard coverage for IO bridge-native payload. | Add `io-guard.ts` and tests, including real public artifact validation. | Planned |
| Add bounded bridge-native adapter. | Add `io-adapter.ts` for linkage/sector summaries only. | Planned |
| Extract shared fetch/timeout helper where it reduces duplication. | Add `bridge-fetch.ts`; route QPM, DFM, and IO clients through it while preserving model-specific errors. | Planned |
| Avoid live UI scope expansion. | Stop at export/contract/client/guard/adapter layer; no Comparison UI changes. | Planned |

## Stop-Condition Assessment

- IO source missing or ambiguous: not hit; source choice is documented above.
- IO export requires unavailable dependencies/data: not hit; Node can transform the committed JSON artifact.
- Shared helper creates broad QPM/DFM churn: not hit if limited to duplicated client fetch/timeout code.
- IO bridge shape requires product/model adjudication: not hit for Type I bridge-native contract; Type II/multilingual reconciliation deferred.
- Work expands into full multi-model reconciliation: not hit; no PE/CGE/FPP, no TB-P1, no Knowledge Hub source-mode change.

## Next PR Boundary

The next IO PR should choose the first page-native consumer and map `IoAdapterOutput` through that page's adapter/composer. This slice intentionally stops before live UI consumption.
