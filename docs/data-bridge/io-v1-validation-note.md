# I-O Sector Shock v1 Validation Note

**Date:** 2026-05-22  
**Scope:** Scenario Lab I-O Sector Shock model-readiness boundary.

## Current Use

The I-O Sector Shock page is a static Leontief sector-transmission tool. It is
appropriate for asking:

- which sectors carry the largest direct and indirect output response to a
  final-demand shock;
- how much value added is mechanically associated with that output response;
- which sectors have stronger backward/forward linkage positions;
- how employment exposure would scale if sector employment intensity stayed
  fixed.

It is not a macro forecast, fiscal model, price model, or welfare model.

## Equations

The public Scenario Lab calculation uses the committed 2022 I-O artifact:

```text
dY = allocated final-demand shock vector
dX = L * dY
dVA_i = (GVA_i / X_i) * dX_i
dEMP_i = (employment_i / X_i) * dX_i
```

Where `L` is the Leontief inverse from `io.json`. The displayed aggregate output
multiplier is:

```text
sum(dX) / sum(dY)
```

The value-added total is shown as an accounting contribution, not GDP growth.

## Source And Scale Checks

- The sector table, final-demand vectors, technical coefficients, Leontief
  inverse, output multipliers, and value-added multipliers come from
  `io_model/io_data.json`.
- Employment arrays come from the tracked `io_model/io_data.js` source used by
  the MCP data converter.
- `scripts/export_io.mjs` checks that the employment source aligns with the
  public sector source by normalized sector code and exact source label.
- Public bridge monetary field names keep the legacy `_thousand_uzs` suffix for
  compatibility, but Scenario Lab converts displayed results to billion UZS and
  carries an explicit scale caveat.

## Implemented Guardrails

- Default shocks are allocated by the selected final-demand bucket.
- Output and value-added totals are reported in billion UZS.
- Employment is labelled as a fixed-intensity estimate.
- Sector labels remain in the source language until a reconciled EN/RU/UZ sector
  label source is accepted.
- Comparison keeps I-O saved runs separate from macro scenario rows.

## Remaining Limitations

- Static 2022 production structure.
- Linear coefficients with no substitution or capacity constraints.
- Type I multipliers only; no induced household-consumption Type II loop.
- No prices, margins, taxes, imports substitution, or domestic/import split
  response.
- No time path or dynamic adjustment.
- No fiscal, inflation, current-account, welfare, or distributional feedback.
- Employment is exposure-style scaling, not a labor-market forecast.

## Readiness Decision

Current status: **ready for internal preview as a sector-transmission and
accounting-exposure tool**.

Not yet production-grade for macro policy conclusions until a model owner signs
off on source scale, sector aggregation, Type I/Type II choice, import treatment,
and any planned CGE/QPM handoff.
