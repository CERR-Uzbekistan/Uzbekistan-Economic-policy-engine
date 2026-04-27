# FPP Implementation Gate-Clearing Package

Date: 2026-04-27  
Status: planning and gate-clearing only; no app code, backend code, artifact generation, or data artifact files authorized  
Scope: docs-only owner-acceptance package for the first FPP implementation slice after gates clear

Review resolution note: updated after Claude Code NO-GO review to mark draft-only gates as `open`, tighten backend negative authority, clarify Gate 8, add owner-action and re-review triggers, and cross-reference the full-platform roadmap.

Related planning reference: `docs/planning/full-platform-completion-roadmap.md`

## 1. Backend Contract Acceptance Status

### Backend operations contract

Source: `docs/planning/backend-operations-contract.md`

The backend operations contract defines the operational prerequisites for any future backend work. It recommends a small FastAPI service with typed request/response schemas and Postgres, deployed separately from GitHub Pages, while preserving the current static artifact app as the fallback. It covers environment separation, secrets handling, CI/deploy split, backup/restore assumptions, retention defaults, internal-token ingestion posture, and the need for a named operations owner.

Its STOP conditions block backend code until the owner accepts the operations contract, the registry fallback adapter contract, deploy target, Postgres host option, ops owner, secrets path, CI/deploy split, backup/restore posture, retention assumptions, ingestion-auth posture, and static-app fallback requirements. It explicitly excludes FPP backend work from the first backend scope.

Current acceptance status: owner acceptance is still needed.

Acceptance implication: accepting this contract would clear an operations prerequisite only. It does not authorize backend implementation, FPP backend work, database migrations, frontend API wiring, artifact generation, or model implementation.

### Registry API fallback adapter contract

Source: `docs/planning/registry-api-fallback-adapter.md`

The registry fallback adapter contract defines how a future Data Registry API may coexist with the current static frontend composer. It preserves static `/data/qpm.json`, `/data/dfm.json`, and `/data/io.json` consumption, requires API mode to be opt-in, and defines API-prefer/static-fallback precedence rules for metadata only. Static payloads remain the active model payloads unless a separate payload migration is accepted.

The contract defines exact source-state labels: `Static artifact`, `API metadata`, `API unavailable / static fallback`, and `API/static divergence`. It requires frontend bridge guards to remain active and blocks planned lanes such as HFI, PE, CGE, FPP, and Synthesis from being treated as missing or failed simply because API records do not exist.

Current acceptance status: owner acceptance is still needed.

Acceptance implication: accepting this contract would clear the future Data Registry adapter boundary only. It does not authorize frontend API wiring, backend implementation, FPP implementation, artifact generation, or model-specific backend writes.

## 2. FPP STOP Gate Checklist

All blocking gates remain STOP conditions until the responsible owner accepts the evidence in writing. Existing planning documents count as draft evidence, not owner acceptance. Status convention: gates remain `open` when a draft shape exists in a contract but owner acceptance is still pending.

| Gate | Current status | Evidence/doc path | Owner | Next action | Blocks implementation? |
|---|---|---|---|---|---|
| 1. `unified-v1` workbook frozen snapshot exists, owner-confirmed, with sheet/range map | open | `docs/data-bridge/07_fpp_contract.md` | FPP workbook owner | Confirm canonical workbook file/location, freeze snapshot id/date/hash, and provide sheet/range map. | yes |
| 2. Workbook owner, license/access class, redistribution rule confirmed in writing | open | `docs/data-bridge/07_fpp_contract.md` | FPP workbook owner / source owner | Record workbook owner, access class, license constraints, and whether derived JSON may be redistributed. | yes |
| 3. Caveat copy approved EN/RU/UZ, defined per sector with per-series overrides where needed | open | `docs/data-bridge/07_fpp_contract.md` | Language/caveat reviewer | Draft and approve EN/RU/UZ caveats for sector defaults, no-forecast language, internal-preview language, and series overrides. | yes |
| 4. QPM / DFM / FPP authority table accepted across the full series list | open | `docs/data-bridge/07_fpp_contract.md` | Model governance owner / QPM owner / DFM owner / FPP owner | Accept or revise the authority table after the full output series catalogue is mapped and owner acceptance can cover the full series list. | yes |
| 5. Identity-closure test cases written for all six identities | open | `docs/data-bridge/07_fpp_contract.md` | FPP model owner | Document six formulas, baseline values, changed-assumption cases, expected outputs, tolerances, and source ranges. | yes |
| 6. Three-way parity tolerances declared per sector | open | `docs/data-bridge/07_fpp_contract.md` | FPP model owner / QA owner | Declare workbook/simulator/CAEM variant-drift tolerances by sector, rounding rule, unit handling, and exclusions. | yes |
| 7. Data Registry entry shape accepted | open | `docs/data-bridge/07_fpp_contract.md`; `docs/planning/registry-api-fallback-adapter.md` | Data Registry owner | Accept planned/unavailable shape, future `/data/fpp_baseline.json` metadata fields, source-state handling, and guard semantics. | yes |
| 8. Existing in-app FPP simulator confirmed to accept `FppBaselineProjectionArtifact` / `baseline_projection` schema | open | `docs/data-bridge/07_fpp_contract.md` | FPP simulator owner | Confirm whether `fpp_model/index.html` can consume the baseline projection shape without model reinterpretation. A recorded simulator/schema gap keeps this gate open; it is not a pass. | yes |
| 9. Backend operations + fallback contracts accepted | open | `docs/planning/backend-operations-contract.md`; `docs/planning/registry-api-fallback-adapter.md`; `docs/planning/backend-database-architecture-plan.md` | Ops owner / Data Registry owner | Record owner acceptance of both drafted contracts. Acceptance must state no backend code is authorized by FPP gates. | yes |
| 10. Methodology tags E / C / I / A populated for every simulator output series | open | `docs/data-bridge/07_fpp_contract.md` | FPP model owner | Populate one primary methodology tag for every accepted output catalogue entry. | yes |
| 11. Output series catalogue accepted: every simulator output mapped to artifact field, sector, methodology tag, caveat template | open | `docs/data-bridge/07_fpp_contract.md` | FPP model owner / Data Registry owner | Convert the required simulator output groups into a complete accepted catalogue with artifact fields and source ranges. | yes |

## 3. FPP Gate-Clearing Tasks

These tasks are docs-only or source-confirmation tasks. They must not create app code, backend code, artifact JSON, generated artifacts, or data files.

| Task | Output required | Owner | Acceptance evidence |
|---|---|---|---|
| Unified-v1 workbook freeze + sheet/range map | Canonical workbook file/location, snapshot id/date/hash, owner, and sheet/range map for each simulator output, input, identity, and diagnostic. | FPP workbook owner | Written owner acceptance attached to the FPP gate package or referenced from it. |
| Workbook owner/license/redistribution confirmation | Workbook owner, source owner if different, access class, license terms, redistribution rule for derived `/data/fpp_baseline.json`, and public/internal display limits. | FPP workbook owner / source owner | Written confirmation that derived baseline artifact publication is allowed or blocked. |
| EN/RU/UZ caveat copy | Approved caveat copy in English, Russian, and Uzbek for sector defaults, no-forecast copy, internal-preview copy, and required series overrides. | Language/caveat reviewer | Trilingual approval record; partial-language approval is not enough. |
| QPM/DFM/FPP authority table | Accepted authority table for all shared variable families and every output catalogue series. | Model governance owner / model owners | Approval that FPP values are consistency-path values and do not override QPM or DFM authority. |
| Six identity formulas/test cases | Formula, baseline case, changed-assumption case, expected values, tolerance, and workbook sheet/range for real GDP, nominal GDP, BOP, savings-investment, fiscal, and monetary identities. | FPP model owner / QA owner | Test-case document accepted before code. |
| Parity tolerances | Declared tolerance by Real, External, Fiscal, Monetary, cross-sector closure, and diagnostics, including absolute/relative thresholds, rounding, percent handling, and exclusions. | FPP model owner / QA owner | Written parity tolerance acceptance before artifact export or UI work. |
| Data Registry entry shape | Planned/unavailable row shape now, future available row shape for `/data/fpp_baseline.json`, metadata fields, source-state label, validation scope, and guard wording. | Data Registry owner | Acceptance that FPP remains planned until artifact, provenance, caveats, catalogue, and parity pass. |
| Simulator accepts `FppBaselineProjectionArtifact` | Source confirmation that `fpp_model/index.html` can accept or be aligned with `baseline_projection` without a simulator rewrite or hidden frontend recomputation. | FPP simulator owner | Written confirmation is required to pass. A docs-only simulator/schema gap note keeps Gate 8 open. |
| Methodology tag coverage | Complete E/C/I/A tag assignment for every simulator output series and diagnostic. | FPP model owner | Coverage record showing 100% populated methodology tags across the accepted catalogue. |
| Output series catalogue | Complete catalogue mapping every simulator output to artifact field, sector, methodology tag, unit, frequency, caveat template, authority owner, parity tolerance, and source workbook sheet/range. | FPP model owner / Data Registry owner | Accepted catalogue before implementation starts. |

## 4. Minimal FPP Implementation Scope Once Gates Clear

After all blocking gates are accepted, the first implementation scope should remain minimal:

- create only `/data/fpp_baseline.json`;
- implement only `baseline_projection`;
- do not persist `scenario_simulation`;
- add guard tests for artifact shape, catalogue coverage, caveats, methodology tags, parity metadata, and unavailable states;
- promote FPP in the Data Registry only after guard tests pass;
- add only a Scenario Lab FPP tab shell/MVP that consumes the accepted baseline artifact and preserves simulator-aligned semantics;
- add Model Explorer evidence for FPP provenance, caveats, authority, and parity status;
- do not add an FPP entry to the Comparison macro-row table;
- do not add backend reads or writes.

The first implementation must preserve the current boundary between `baseline_projection` as a static accepted artifact and `scenario_simulation` as runtime-only simulator behavior.

## 5. STOP / NO-GO

No FPP implementation may start until all blocking FPP STOP gates are accepted.

No PE implementation may start until PE gates are accepted.

No HFI implementation may start until source-owner confirmations are accepted.

No backend implementation is authorized by this document. Backend operations and registry fallback acceptance only clear prerequisites for future backend planning; they do not authorize FastAPI code, database migrations, API wiring, FPP backend work, saved-run persistence, artifact ingestion, or backend reads or writes.

No backend reads or writes are authorized by this package.

This package does not authorize app code, backend code, artifact generation, artifact files, Scenario Lab activation, Data Registry promotion, Comparison integration, or push.

## 6. Recommended Immediate Owner Actions

Fastest next decisions:

1. Confirm the canonical `unified-v1` workbook file and location.
2. Confirm workbook license, access class, and redistribution status for a derived static baseline artifact.
3. Confirm whether existing `fpp_model/index.html` accepts the `baseline_projection` shape or needs a docs-only gap recorded.
4. Identify the EN/RU/UZ caveat reviewer.
5. Approve the owner for the QPM/DFM/FPP authority table.
6. Confirm ops owner and Data Registry owner identities so Gates 7 and 9 have named acceptors.

## 7. Re-Review Triggers

Re-review this gate-clearing package if any of the following change:

- FPP contract changes;
- simulator changes;
- backend operations contract changes;
- registry fallback adapter changes.
