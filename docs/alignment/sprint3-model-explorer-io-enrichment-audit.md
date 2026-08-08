# Sprint 3 Model Explorer IO Enrichment Audit

**Date:** 2026-04-25
**Branch:** `codex/sprint3-model-explorer-io-enrichment`
**Base:** `epic/replatform-execution`
**Scope:** Narrow visible IO bridge consumer in Model Explorer only.

## What Was Surfaced

The existing I-O Model Explorer detail now receives an optional `bridge_evidence`
object when `/data/io.json` validates through the IO bridge guard and client.
The visible section surfaces:

- bridge validation status: `Validated`;
- source artifact: `metadata.source_artifact`;
- data vintage: `attribution.data_version`;
- export date: `metadata.exported_at`;
- solver version: `metadata.solver_version`;
- sector count: `metadata.n_sectors`;
- framework and units: `metadata.framework`, `metadata.units`;
- linkage class counts from `IoAdapterOutput.type_counts`;
- IO bridge caveat messages from the public artifact.

The page-native mapping lives in
`apps/policy-ui/src/data/adapters/model-explorer-io-enrichment.ts`. The IO bridge
types, guard, client, and bridge-native adapter remain bridge-native and do not
emit Model Explorer or Comparison page contracts.

## Fallback Behavior

Model Explorer first loads its existing mock/live workspace exactly as before.
IO bridge enrichment is optional:

- if `/data/io.json` fetches and validates, only the existing `io-model` catalog
  entry receives `bridge_evidence`;
- if IO fetch, transport, or validation fails, the workspace is returned
  unchanged and the page shows the safe existing I-O content;
- source-state errors are not raised for optional IO enrichment failures;
- the six-model catalog behavior remains intact.

## Tests Run

From `apps/policy-ui`:

- `npm run lint` — passed.
- `npm test` — passed, 180 tests.
- `npm run build` — passed. Vite reported the existing large-chunk warning.

Added focused coverage for:

- IO public artifact validation remains covered by the existing IO bridge tests.
- valid IO public artifact maps into Model Explorer bridge evidence;
- only the I-O entry receives bridge evidence;
- invalid IO artifact falls back to the existing I-O entry without breaking the
  catalog;
- the Model Detail panel renders the bridge evidence section;
- existing six-model catalog tests still pass.

Browser smoke:

- `/model-explorer` loaded on `http://127.0.0.1:5180/model-explorer`;
- selecting I-O showed bridge evidence with `io_model/io_data.json`, sector
  count, and bridge caveat text;
- selecting DFM still worked and did not show IO evidence;
- no browser console errors were reported.

## Deferred Surfaces

- Comparison integration.
- Overview integration.
- Knowledge Hub integration.
- PE bridge work.
- IO sector ranking tables with Russian source labels.
- Type II multiplier reconciliation.
- English/Uzbek sector-label reconciliation.
- Deployment or regeneration workflow changes.
- Broad Model Explorer architecture rewrite.

## PE Confirmation

PE bridge implementation was not started. No PE source, bridge, artifact,
adapter, UI, or workflow files were added or modified.
