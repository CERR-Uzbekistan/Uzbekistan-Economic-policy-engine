# Sprint 3 Prototype Visual Alignment Audit

Date: 2026-04-26

## Scope

Compared the current React policy UI against `docs/alignment/spec_prototype.html`, with emphasis on Scenario Lab, Comparison, Data Registry, Model Explorer, shared chart/table components, and the shell/tokens.

## Summary

The React UI is close to the prototype token language but has drifted toward heavier application chrome. The prototype reads as a compact institutional workspace: quiet navigation, flat panels, small radii, restrained borders, tabular numerals, light context strips, and tables that carry most analytical weight. The current app keeps the same palette but often adds stronger badges, colored top/side borders, nested panel framing, and report-like result blocks. The highest-value alignment work is to reduce label weight, tighten analytical tables, and make model boundaries easier to scan without adding product features.

## Visual Drift Findings

### Spacing and Density

- Prototype density is compact but readable: most panels use `var(--space-lg)` or `var(--space-xl)` with tight internal grouping.
- Scenario Lab currently spreads model tabs and result cards more like a dashboard. The three-column composition is correct, but the center results column reads more nested than the prototype.
- Data Registry tables are usable, but the surface reads like a debug inventory because all registry dimensions are exposed with equal visual weight.

### Typography Scale

- Tokens match the prototype, but page/content hierarchy is slightly inconsistent. Some compact panels use headings that compete with page-level structure.
- Numeric tables frequently use monospace for whole cells. This helps alignment but can feel more developer-tool than publication. Use tabular figure behavior and selective monospace for codes, vintages, and IDs.

### Card/Panel Borders and Radius

- Prototype panels are mostly one-pixel bordered, flat, and low-radius.
- Current Comparison and Model Explorer still use colored top/left accent stripes in several places. These are visually heavier than the prototype and can imply semantic strength not present in the data.
- Nested cards appear in Scenario Lab impulse response and I-O KPI areas. They should remain restrained and data-forward.

### Table Styling

- Prototype tables use muted headers, compact padding, clear row dividers, and right-aligned numeric columns.
- Scenario Lab macro/QPM tables need clearer baseline-vs-scenario scanning; the table is correct but reads like raw output.
- I-O sector shock table needs rank and contribution affordances so users can identify top sectors without reading every number.
- Data Registry tables need stronger status/source/export scanning while preserving the warning that guard validation is not economic/model validation.

### Tab Styling

- Prototype segmented controls are quiet and compact.
- Current Scenario Lab model tabs are large cards. This is acceptable for multi-model lanes, but they need less visual mass and tighter metadata so active/planned status does not dominate the workspace.

### Sidebar/Nav Feel

- Shell largely matches the prototype. Topbar freshness and language switcher are restrained.
- Sidebar density and active state are aligned; no route or navigation change is needed.

### Chart Styling

- Shared chart renderer uses the right charting library and token colors.
- QPM impulse response has the right claim language, but the chart card is nested too heavily and axis/unit context should be more explicit around the chart.
- Legend and takeaway copy already reduce live-forecast risk; styling should make that visible without becoming a warning block.

### Trust Label / Context Strip Weight

- Trust and provenance labels are present, which is required.
- Visual weight is higher than the prototype in repeated `claim-label`, `attribution-badge`, and analytical context strips. These should become quieter metadata, not disappear.

### Institutional Tone

- The product tone is appropriately analytical, but colored border accents and badge-heavy sections occasionally push toward SaaS dashboard conventions.
- Best alignment direction: central-bank/reporting surface, not marketing dashboard. Keep color semantic, rare, and tied to model/result boundaries.

## Implementation Priorities

1. Quiet trust/context chrome while preserving all warnings and provenance labels.
2. Flatten Scenario Lab result presentation and make the impulse response claim/type/unit context prominent but calm.
3. Add low-risk visual summaries to I-O sector shock via inline contribution bars and rank.
4. Distinguish Comparison macro deltas from I-O sector evidence by surface grammar, not by merging data.
5. Make Data Registry status, source vintage, artifact export, and guard-validation state scannable while preserving the validation caveat.

## Guardrails

- No new model computations.
- No data contract, route, or source-state changes.
- No new charting library.
- No removal or hiding of trust/provenance warnings.
- No PE/CGE/FPP implementation.
