# Sprint 3 Week 1 Audit - Model Explorer Source Pipeline

**Date:** 2026-04-24  
**Slice:** Wire Model Explorer through source pipeline  
**Tier:** Full path

## Files Inspected

- `apps/policy-ui/src/pages/ModelExplorerPage.tsx`
- `apps/policy-ui/src/data/model-explorer/source.ts`
- `apps/policy-ui/src/data/model-explorer/live-client.ts`
- `apps/policy-ui/src/data/adapters/model-explorer.ts`
- `apps/policy-ui/src/data/adapters/model-explorer-guard.ts`
- `apps/policy-ui/src/data/mock/model-explorer.ts`
- `apps/policy-ui/src/data/mock/model-catalog.ts`
- `apps/policy-ui/src/data/raw/model-explorer-live.ts`
- `apps/policy-ui/src/contracts/data-contract.ts`
- `apps/policy-ui/tests/data/model-explorer/source.test.ts`
- `apps/policy-ui/tests/data/adapters/model-explorer.test.ts`
- `apps/policy-ui/tests/data/mock/model-catalog.test.ts`

## Current State

- `ModelExplorerPage.tsx` imports `modelCatalogEntries` and `modelCatalogMeta` directly from `data/mock/model-catalog`.
- `data/model-explorer/source.ts` already exposes `getInitialModelExplorerSourceState()` and `loadModelExplorerSourceState()`.
- Mock source mode currently returns `modelExplorerWorkspaceMock`, but that mock only carries the older `models` and `details_by_model_id` shape.
- The Shot 1 page UI consumes `ModelCatalogEntry`, which is represented on `ModelExplorerWorkspace.catalog_entries_by_model_id?` and `ModelExplorerWorkspace.meta?`.
- The richer six-model Shot 1 catalog exists in `data/mock/model-catalog.ts`, but it is bypassing the source module.
- Live raw model explorer payload currently uses the older `catalog` plus `metadataByModelId` shape. It can be adapted into the legacy workspace fields, but it does not yet provide full Shot 1 catalog entries.

## Implementation Commitments

1. Move the page to `getInitialModelExplorerSourceState()` and `loadModelExplorerSourceState()`.
2. Populate `modelExplorerWorkspaceMock.catalog_entries_by_model_id` and `meta` from `model-catalog.ts` so mock mode preserves the current six-card Shot 1 UI.
3. Keep `ModelCatalogEntry` as the canonical page-rendering shape for Sprint 3.
4. Add a narrow adapter fallback that derives minimal catalog entries from legacy live `models` data when a live payload has no `catalog_entries_by_model_id`.
5. Preserve existing visible Shot 1 behavior in mock mode.
6. Do not retire or consolidate legacy Model Explorer types in this slice.

## STOP Conditions Checked

- Broad contract redesign is not required.
- Model Explorer parallel-type consolidation is not required.
- No visible Shot 1 content change is required for mock mode.
- No real live backend contract is required beyond the existing live source path.

