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
- Employment arrays come from `io_model/io_employment.json`, generated from
  the `Employment.xlsx` source workbook.
- `scripts/export_io_from_workbooks.py` regenerates `io_model/io_data.json`
  from the `ТЗВ всего` transaction table and keeps the app convention that
  technical coefficients are `Z / total_resources`. The workbook coefficient
  sheets are retained as source context, not copied blindly into the public
  bridge.
- Local source workbook provenance is recorded in the public artifact:
  `ТЗВ 2022 136х136.xlsx` (`ТЗВ всего`, `К-ты прямых затрат А`,
  `к-ты полных затрат (Е-А)-1`) and `Employment.xlsx` (`Employment`).
- `scripts/export_io.mjs` checks that the label source aligns with the public
  sector source by normalized sector code and exact source label, and checks
  that the employment source aligns by normalized sector code.
- The local workbook audit on 2026-05-22 found 136/136 sector-code matches in
  both the I-O workbook and employment workbook, and 136/136 source-name matches
  for the I-O workbook.
- Public bridge monetary field names keep the legacy `_thousand_uzs` suffix for
  compatibility, but Scenario Lab converts displayed results to billion UZS and
  carries an explicit scale caveat.

## Implemented Guardrails

- Default shocks are allocated by the selected final-demand bucket.
- Policy-use presets map to concrete final-demand buckets: investment,
  export, consumption, government, or one selected sector. Output-share
  allocation is kept as a robustness comparison, not as the default policy
  targeting story.
- Output and value-added totals are reported in billion UZS.
- Total-resource effects are split into domestic-resource and import-content
  accounting parts using each sector's fixed imports-to-total-resources share.
- Employment is labelled as a fixed-intensity estimate.
- Sector labels remain in the source language until a reconciled EN/RU/UZ sector
  label source is accepted.
- Comparison keeps I-O saved runs separate from macro scenario rows.
- The public artifact now runs data-quality checks for matrix usability,
  sector-array alignment, impossible negative values, coefficient bounds,
  final-demand bucket coverage, multiplier bounds, employment-intensity
  coverage, Leontief identity, and baseline reconstruction. Scenario Lab shows
  the check count and exposes the detail list behind a collapsed section.

## Remaining Limitations

- Static 2022 production structure.
- Linear coefficients with no substitution or capacity constraints.
- Type I multipliers only; no induced household-consumption Type II loop.
- No prices, margins, taxes, or behavioral import substitution. The domestic/import
  split is now shown, but it is an accounting split using fixed source import
  shares, not a response model.
- No time path or dynamic adjustment.
- No fiscal, inflation, current-account, welfare, or distributional feedback.
- Employment is exposure-style scaling, not a labor-market forecast.

## Readiness Decision

Current status: **ready for internal preview as a sector-transmission and
accounting-exposure tool**.

Not yet production-grade for macro policy conclusions until a model owner signs
off on source scale, sector aggregation, Type I/Type II choice, import treatment,
and any planned CGE/QPM handoff.
