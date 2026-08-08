# Sprint 3 Week 1 Audit - DFM PR 4 Workflow

**Date:** 2026-04-24  
**Slice:** Complete DFM PR 4 workflow  
**Tier:** Full path

## Files Inspected

- `.github/workflows/data-regen.yml`
- `scripts/export_dfm.R`
- `apps/policy-ui/public/data/dfm.json`
- `apps/policy-ui/src/data/bridge/dfm-client.ts`
- `apps/policy-ui/src/data/bridge/dfm-guard.ts`
- `apps/policy-ui/src/data/bridge/dfm-adapter.ts`
- `apps/policy-ui/tests/data/bridge/dfm-guard.test.ts`
- `apps/policy-ui/tests/data/overview/use-dfm-nowcast.test.tsx`
- `docs/data-bridge/02_dfm_contract.md`

## Current State

- `scripts/export_dfm.R` exists and writes `apps/policy-ui/public/data/dfm.json`.
- `apps/policy-ui/public/data/dfm.json` is already committed in the public data directory.
- DFM bridge guard, client, adapter, and Overview hook tests exist.
- `.github/workflows/data-regen.yml` is still named QPM nightly and only runs `scripts/export_qpm.R`.
- The workflow only checks and commits `apps/policy-ui/public/data/qpm.json`.
- The DFM contract still describes PR 4 as a downstream TODO.

## Implementation Commitments

1. Extend `.github/workflows/data-regen.yml` to run both QPM and DFM exports.
2. Check both `qpm.json` and `dfm.json` for changes before committing.
3. Commit both data artifacts when either changes.
4. Keep workflow completion honest: manual dispatch works on epic; scheduled/default-branch activation only becomes meaningful after the TB-P1/default-branch sequence.
5. Update DFM bridge documentation to remove stale PR 4 TODO language and document the manual-dispatch-until-default-branch-merge activation policy.

## STOP Conditions Checked

- No unavailable secrets are required.
- Default-branch cron permissions are not required for Week 1 completion.
- The DFM JSON contract does not need to change.
- Freshness wording must not imply user-facing automation before default-branch activation.

