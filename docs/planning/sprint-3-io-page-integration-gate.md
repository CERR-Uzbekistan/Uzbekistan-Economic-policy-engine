# Sprint 3 IO Page Integration Gate

**Date:** 2026-04-25
**Branch:** `codex/sprint3-io-page-integration-gate`
**Base/PR target:** `epic/replatform-execution`
**Scope:** Decision artifact only. No PE implementation.

## Recommendation

**Integrate IO into one visible page surface before starting PE implementation.**

The IO bridge is mature enough for a narrow, read-only page consumer. The first consumer should be **Model Explorer**, not Comparison, Overview, or Knowledge Hub.

The smallest valuable slice is a Model Explorer I-O detail enrichment that shows bridge-backed evidence for the existing I-O model card/detail:

- bridge provenance: 2022 data vintage, source artifact, solver version/export metadata;
- bridge scale: 136 sectors, Type I Leontief framework, thousand UZS units;
- bridge readiness/caveats: Type II arrays absent, sector labels currently Russian-only;
- optional numeric-only summary from `IoAdapterOutput`, such as linkage class counts, if the UI can present it without raw sector-name exposure.

Do **not** expose a ranked sector table yet unless the product owner accepts Russian-only sector labels or a reconciled English/Uzbek sector-label source is added. Do **not** map IO into Comparison scenarios yet.

## Evidence Read

- `docs/planning/sprint-3-execution-plan.md`
- `docs/planning/sprint-3-week2-handoff.md`
- `docs/planning/sprint-3-week1-handoff.md`
- `docs/planning/sprint-3-week2-plan.md`
- `docs/reviews/sprint-2-close-flavor-C-adjudication.md`
- `docs/reviews/sprint-2-close-flavor-C.md`
- `docs/alignment/sprint3-io-bridge-helper-audit.md`
- `docs/data-bridge/03_io_contract.md`
- `apps/policy-ui/src/data/bridge/io-types.ts`
- `apps/policy-ui/src/data/bridge/io-guard.ts`
- `apps/policy-ui/src/data/bridge/io-client.ts`
- `apps/policy-ui/src/data/bridge/io-adapter.ts`
- `apps/policy-ui/public/data/io.json`
- Current page/source adapters for Model Explorer, Comparison, Overview, and Knowledge Hub.

Verification performed for the explicit STOP condition:

- `npm test -- --test-name-pattern "io bridge"` from `apps/policy-ui` passed. The current test runner compiled and executed the suite set successfully: 175 tests, 47 suites, 0 failures.
- The existing `io bridge public artifact` tests accepted `apps/policy-ui/public/data/io.json`, validated 136 sectors and 136 x 136 matrices, adapted the payload to bridge-native sector summaries, and exercised IO client validation/transport errors.

## IO Contract Readiness

**Ready for narrow consumption.**

The contract has the necessary bridge-native pieces for a read-only consumer:

- deterministic public artifact at `/data/io.json`;
- explicit source chain from `io_model/io_data.json` through `scripts/export_io.mjs`;
- guard with path-scoped validation issues;
- client using the shared bridge fetch helper;
- bridge-native adapter output with sector summaries, linkage classifications, top multiplier lists, and metadata;
- public artifact test coverage against the actual committed JSON.

The current artifact carries:

- `attribution.model_id = "IO"`;
- `attribution.data_version = "2022"`;
- `metadata.base_year = 2022`;
- `metadata.n_sectors = 136`;
- `metadata.units = "thousand UZS"`;
- `metadata.source_artifact = "io_model/io_data.json"`;
- Type I multipliers and Leontief matrices.

**Not ready for broad product use.**

The contract intentionally does not yet carry:

- Type II induced-consumption arrays;
- English or Uzbek sector labels;
- IO scenario outputs that can become Comparison alternatives;
- a page-native Model Explorer or Comparison view model;
- workflow/deployment regeneration integration beyond the committed static artifact.

These are not blockers for a small Model Explorer evidence slice. They are blockers for richer sector-ranking UI, multilingual sector display, or scenario-comparison integration.

## Page-Surface Comparison

| Page | Fit for first IO consumer | Rationale | Recommendation |
|---|---|---|---|
| Model Explorer | High | It already presents six model trust cards, including I-O. Sprint 3 already wired its source pipeline. The IO bridge can strengthen the existing I-O detail without creating new workflow semantics. | First consumer. |
| Comparison | Low now, high later | Comparison is currently QPM/scenario-native and composes `ComparisonContent` from `ComparisonWorkspace`. IO currently provides sector/linkage diagnostics, not policy scenarios or row metrics. Forcing IO here risks violating the Comparison boundary. | Defer until an IO scenario/comparison adapter is designed. |
| Overview | Medium-low | Overview is macro snapshot plus DFM nowcast. IO could add structural context, but it does not produce current macro headline metrics. A visible IO block here would likely be editorial narrative rather than model output. | Defer. |
| Knowledge Hub | Low for Sprint 3 | Knowledge Hub source mode is locked curated/static for Sprint 3. IO can inform future briefs, but live/source-mode freshness is explicitly not the product choice now. | Defer unless pilot feedback reopens freshness/source mode. |

## Smallest Recommended Integration Slice

**Slice name:** Model Explorer IO bridge evidence enrichment.

**User-visible outcome:** when a user opens the existing I-O model in Model Explorer, the page shows that the I-O entry is backed by the validated bridge artifact and names the exact limits of that bridge.

**Implementation boundary for a later PR:**

- Add a small page-native composer, for example `model-explorer/io-composition`, that maps `IoAdapterOutput` plus `IoBridgePayload` metadata into Model Explorer-safe detail fields or an additive evidence object.
- Keep `io-adapter.ts` bridge-native. Do not make it emit `ModelCatalogEntry`, `ComparisonContent`, or any page contract.
- Load IO as optional enrichment for the existing `io-model` entry. If IO fetch/validation fails, Model Explorer should keep the current static I-O entry and show an honest unavailable/degraded evidence state if a visible evidence block was added.
- Keep the visible scope to provenance, sector count, units, Type I status, caveats, and perhaps linkage class counts.
- Avoid raw sector-name UI until the Russian-only label decision is made.
- Do not change routing, deployment workflows, translations, or the broader Model Explorer architecture.

This is valuable because it validates the post-DFM bridge-to-page path on a trust surface without pretending IO can already drive scenarios.

## Required Tests

For the later implementation PR:

- Keep the existing `io bridge public artifact` tests.
- Add a Model Explorer IO composition unit test that proves the public IO artifact maps into the intended page-safe evidence fields.
- Add a degraded/failed IO enrichment test: malformed IO payload or transport failure must not break the existing Model Explorer catalog.
- Add a Model Explorer source/page test that selecting `io-model` exposes the bridge-backed metadata or evidence block.
- If linkage class counts are visible, test that counts sum to `metadata.n_sectors`.
- If any sector names are displayed, add an explicit test and product note covering Russian-only labels; recommended path is to avoid this until label reconciliation.

Run for that implementation PR:

- `npm run lint`
- `npm test`
- `npm run build`

## Risks

- **Russian-only labels:** the bridge currently carries `name_ru` only. Showing ranked sectors in English/Uzbek UI without adjudication creates translation and credibility risk.
- **Boundary creep into Comparison:** IO linkages are not Comparison scenarios. Mapping them directly into deltas would blur model semantics.
- **False freshness:** the data vintage is 2022. The export timestamp must not be presented as fresh source data.
- **Model Explorer type churn:** the page still has parallel Model Explorer types by design. The IO slice should add a narrow composer/enrichment, not retire those types.
- **Over-reading Type I output:** Type II arrays are explicitly absent; no induced-consumption or household-feedback claims should appear.

## Deferred

- PE bridge implementation.
- IO-to-Comparison scenario mapping.
- IO sector ranking tables with names.
- Type II multiplier reconciliation.
- English/Uzbek sector-label reconciliation.
- Knowledge Hub live/source-mode changes.
- Overview structural IO narrative.
- Data-regeneration workflow changes for IO.
- Model Explorer architecture rewrite or parallel-type retirement.

## PE Go/No-Go

**No-go for PE implementation before IO has one visible consumer.**

The IO bridge contract is ready enough for a small Model Explorer consumer, and that consumer should land first. Starting PE before any IO page consumption would repeat bridge construction without proving the bridge-to-page boundary that Sprint 3 explicitly planned to validate.

Allowed before the IO UI consumer lands:

- PE read-only planning notes, if needed.
- PE source/data inventory, if explicitly requested as analysis only.

Not allowed before the IO UI consumer lands:

- PE bridge contract implementation.
- PE public artifact/export implementation.
- PE page integration.

The next implementation slice should therefore be **Model Explorer IO bridge evidence enrichment**, then PE can start if that slice lands without broad architecture rewrite or product blockers.
