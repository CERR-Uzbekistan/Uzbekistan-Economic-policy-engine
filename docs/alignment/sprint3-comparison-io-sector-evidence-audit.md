# Sprint 3 Comparison IO Sector Evidence Audit

**Date:** 2026-04-25
**Branch:** `epic/replatform-execution`
**Scope:** Narrow second I-O bridge consumer on Comparison only.

## Product Direction Update

After reviewing the legacy HTML prototype and the MCP server, this Comparison
panel should be treated as a transitional bridge-consumer proof, not the final
I-O analytics destination.

The broader app direction is:

- Scenario Lab is where model-specific simulations should run;
- I-O sector shock analytics should live in Scenario Lab as its own tab;
- Comparison should compare saved outputs, keeping macro rows and sector results
  in separate blocks;
- Model Explorer should continue to explain methodology, data readiness, and
  bridge health;
- a future Synthesis surface should reconcile PE -> I-O -> CGE -> FPP flows.

This means the current panel remains useful as narrow evidence, but future
analytical I-O work should move into the Scenario Lab I-O Sector Shock path.

## What Was Surfaced

Comparison now optionally loads the existing validated `/data/io.json` bridge
artifact and maps it into page-native sector evidence before rendering. The
panel is additive beside the macro delta table and surfaces:

- source artifact;
- data vintage and export date;
- framework, units, and sector count;
- linkage-class counts;
- bridge caveat messages from the public artifact.

The mapping lives in
`apps/policy-ui/src/data/adapters/comparison-io-sector-evidence.ts`. Bridge
types, guard, client, and bridge-native adapter remain bridge-native.

## Boundary Kept

I-O evidence is not added to `ComparisonMetricRow`, scenario deltas, tradeoff
prose, saved scenario selection, or QPM scenario semantics. The existing seven
macro rows remain the only rows in the Comparison delta table.

The panel copy states that the evidence is structural sector transmission
evidence, not a macro forecast, scenario delta, or causal effect of the
scenarios being compared.

## Fallback Behavior

Comparison keeps its existing QPM/mock behavior when I-O is unavailable:

- if `/data/io.json` fetches and validates, `ioSectorEvidence` is rendered;
- if I-O fetch, transport, or validation fails, `ioSectorEvidence` is `null`;
- Comparison still returns its existing ready state from live QPM or mock
  fallback;
- optional I-O failures do not create page errors or source-state failures.

## Tests Added

Focused coverage was added for:

- valid I-O payload maps into page-native Comparison sector evidence;
- I-O fetch/validation failure preserves existing Comparison source behavior;
- existing macro comparison rows remain unchanged by I-O evidence composition;
- the evidence panel renders non-overclaiming copy and provenance/caveats.

## Deferred Surfaces

- Full Comparison metric-row integration.
- I-O macro deltas or causal scenario effects.
- Scenario Lab I-O shock presets.
- Knowledge Hub reform-sector linkage.
- PE/CGE/FPP bridge work.
- Deployment or regeneration workflow changes.
