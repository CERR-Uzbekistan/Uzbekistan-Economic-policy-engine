# Sprint 3 IO Second-Consumer Gate

**Date:** 2026-04-25
**Scope:** Decision artifact only. No implementation, no PE/CGE/FPP work, no deployment workflow changes.

## Recommendation

Choose **Comparison sector evidence panel** as the second I-O consumer.

The recommended slice is a **narrow, read-only side panel/add-on** on the Comparison page. It should present I-O as structural sector/transmission evidence next to scenario comparison, not as scenario-row metrics, deltas, forecasts, or macro outcomes.

This should be a **lightweight path**, not a full path:

- load the existing validated `/data/io.json` bridge artifact optionally;
- map it through a page-native Comparison evidence composer;
- show provenance, framework, sector count, units, data vintage, caveats, and linkage-class counts;
- optionally show aggregate multiplier context only if labels and wording make clear these are I-O structural diagnostics, not scenario effects;
- do not add I-O values to `ComparisonMetricRow`;
- do not alter QPM scenario selection, delta calculations, tradeoff prose, saved scenarios, or macro scenario semantics.

The current I-O bridge payload is sufficient for this lightweight second consumer. It is not sufficient for named sector ranking in English/Uzbek, macro scenario rows, sector shock simulation, or reform impact claims.

## Evidence Read

- `docs/planning/sprint-3-io-page-integration-gate.md`
- `docs/alignment/sprint3-model-explorer-io-enrichment-audit.md`
- `docs/data-bridge/03_io_contract.md`
- `apps/policy-ui/src/data/bridge/io-types.ts`
- `apps/policy-ui/src/data/adapters/model-explorer-io-enrichment.ts`
- `apps/policy-ui/src/pages/ComparisonPage.tsx`
- `apps/policy-ui/src/data/adapters/comparison.ts`
- `apps/policy-ui/src/contracts/data-contract.ts`

Additional page-shape checks:

- `apps/policy-ui/src/data/adapters/knowledge-hub.ts`
- `apps/policy-ui/src/pages/KnowledgeHubPage.tsx`
- `apps/policy-ui/src/data/adapters/scenario-lab.ts`
- `apps/policy-ui/src/pages/scenario-lab-preset.ts`

## Candidate Assessment

| Candidate | User value | Mapping honesty | Implementation scope | Overclaiming risk | Test surface | Path |
|---|---|---|---|---|---|---|
| Comparison sector evidence panel | High. Users comparing macro scenarios can see which structural transmission evidence is available and what it can/cannot say. | Good if additive only. I-O remains sector/transmission evidence beside QPM scenario rows, not converted into macro deltas. | Small to medium. Optional I-O load, page-native evidence composer, one panel/component, fallback behavior. | Medium, manageable with explicit copy and no row integration. | Composer unit tests, optional-load fallback test, panel render test, no-change assertions for metric rows/deltas. | Lightweight |
| Knowledge Hub reform-sector linkage | Medium. Could connect reforms to sector mechanisms in a policy-readable way. | Weak now. Current Knowledge Hub items carry curated `model_refs`, not bridge-backed reform-to-sector mappings. Any linkage would be editorial unless a reform-sector taxonomy is added. | Medium. Requires content model changes, mapping rules, likely new curated data, and UI changes in reform/brief components. | High. Easy to imply I-O estimates reform effects when the bridge only provides structural sector diagnostics. | Adapter/content contract tests, taxonomy tests, UI render tests, source-mode/fallback tests. | Full path later |
| Scenario Lab sector shock preset | Potentially high later, but low now. A sector shock preset sounds actionable, but users would expect simulated macro consequences. | Poor now. Scenario Lab presets are macro assumption overrides; current I-O bridge has no scenario shock adapter, no macro pass-through, and no calibrated mapping into Scenario Lab result bundles. | Large. Needs new shock semantics, preset contract changes, assumptions mapping, result interpretation, and probably model-methodology decisions. | Very high. It would invite macro claims not backed by current bridge outputs. | Broad: preset hydration, assumption overrides, result generation, interpretation, saved-run behavior, and no-false-claims tests. | Full path later, not Sprint 3 gate |

## Why Comparison Wins

Comparison is the strongest second consumer because it is already where users reason about tradeoffs, but it does not require I-O to become a macro scenario model. A side panel can answer a narrow user question: "What structural sector evidence is available while I compare these macro scenarios?"

That is user-meaningful without changing the meaning of the Comparison table. The existing `ComparisonContent` composer is QPM/scenario-native: it derives `ComparisonMetricRow` values and deltas from `ComparisonWorkspace`. I-O should not enter that composer as another metric source. It should sit outside the row/delta path as optional evidence.

The bridge payload supports this because it carries:

- validated provenance and source artifact;
- 2022 data vintage and export metadata;
- Type I Leontief framework and thousand UZS units;
- 136-sector structure;
- sector-level output and value-added multipliers;
- linkage classifications available through `IoAdapterOutput`;
- caveats, including known bridge limits.

The payload does not support stronger claims because it lacks:

- English or Uzbek sector labels;
- Type II induced-consumption arrays;
- calibrated macro scenario impacts;
- reform-to-sector linkage rules;
- Scenario Lab shock presets or assumption mappings.

## Candidate Notes

### 1. Comparison sector evidence panel

**User value:** High. It adds structural context at the moment users compare scenarios, especially for users asking whether macro paths have sector-transmission evidence behind or beside them.

**Honesty of mapping:** Acceptable only as a side panel. The panel must say I-O evidence is structural and vintage-specific. It must not imply that I-O generated the GDP, inflation, reserves, fiscal, unemployment, or wage rows.

**Implementation scope:** The narrow implementation can be additive:

- create a Comparison-safe I-O evidence type/composer;
- optionally fetch the existing I-O bridge artifact;
- render an evidence panel after or beside the existing tradeoff/table flow;
- preserve current behavior when I-O is unavailable.

**Risk of overclaiming model meaning:** Medium. The main risk is visual proximity to scenario deltas. Mitigation: label the panel as sector/transmission evidence, keep it out of `ComparisonMetricRow`, and include caveats/provenance in the panel.

**Test surface needed:**

- valid I-O payload maps into Comparison evidence fields;
- invalid/unavailable I-O payload leaves Comparison unchanged;
- metric rows and deltas are unchanged by I-O enrichment;
- rendered panel includes data vintage, framework, sector count, units, caveats, and linkage counts;
- linkage counts sum to `metadata.n_sectors` if displayed.

**Path:** Lightweight. Do not build full I-O Comparison integration.

### 2. Knowledge Hub reform-sector linkage

**User value:** Medium. Reform-to-sector linkage could help users read reforms through model mechanisms.

**Honesty of mapping:** Not strong enough yet. Knowledge Hub content is curated reform and brief content with `model_refs`. The I-O bridge does not contain reform IDs, policy mechanism mappings, or a curated sector taxonomy. Linking reforms directly to I-O sectors would require editorial inference outside the current bridge.

**Implementation scope:** Larger than it looks. A credible version needs a reform-sector mapping source, new adapter logic, visible provenance, and careful handling of label language.

**Risk of overclaiming model meaning:** High. Without a curated taxonomy, the UI could imply that the I-O model estimates reform effects or validates reform mechanisms.

**Test surface needed:**

- reform-sector mapping source validation;
- adapter tests for missing/ambiguous mappings;
- UI tests for provenance and caveats;
- tests proving `model_refs` remain references, not causal estimates.

**Path:** Full path later. Not the Sprint 3 second consumer.

### 3. Scenario Lab sector shock preset

**User value:** Potentially high later, because sector shocks are interactive and policy-relevant.

**Honesty of mapping:** Poor with the current payload. Scenario Lab presets are assumption overrides for macro-style runs. The I-O bridge has structural sector multipliers, not a Scenario Lab shock-to-result pipeline.

**Implementation scope:** Broad. A real preset needs shock definitions, sector selection, assumption mappings, result interpretation changes, saved-run behavior, and methodology decisions on how I-O shocks pass into macro outputs.

**Risk of overclaiming model meaning:** Very high. A preset would strongly suggest simulated macro consequences from I-O sector shocks, which the current bridge does not provide.

**Test surface needed:**

- preset hydration and URL behavior;
- assumption override correctness;
- generated result bundle behavior;
- interpretation and caveat tests;
- cross-page saved scenario tests;
- explicit tests preventing unsupported macro claims.

**Path:** Full path later, after an I-O scenario/shock contract exists. Not Sprint 3.

## Decision Boundaries

Allowed for the later Comparison implementation slice:

- optional I-O bridge load on Comparison;
- page-native evidence composer;
- side panel/add-on with provenance, bridge scale, Type I framework, units, caveats, and linkage counts;
- graceful fallback when I-O is unavailable.

Not allowed in this gate:

- I-O values in macro scenario rows;
- I-O deltas against Comparison baselines;
- I-O-generated tradeoff prose;
- sector shock presets;
- reform-sector causal claims;
- broad I-O wiring across all pages;
- PE/CGE/FPP work;
- deployment or regeneration workflow changes.

## Final Decision

Proceed next with **Comparison sector evidence panel as the single second I-O consumer**.

Treat it as a lightweight, additive evidence surface. The implementation should prove that the I-O bridge can serve a second page without changing page semantics: Comparison remains macro scenario comparison, while I-O supplies clearly labeled structural sector/transmission evidence.
