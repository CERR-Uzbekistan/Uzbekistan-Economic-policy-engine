# Sprint 3 Final Pre-Pilot Trust/Usability Audit

Date: 2026-04-26

Scope: final small pre-pilot trust and usability fixes after the pilot-feedback UX clarification slice. No model computations, PE/CGE/FPP/Synthesis implementations, or deployment workflows were changed.

## Implemented Fixes

- Added local-only saved-run disclosure on Scenario Lab save controls, Scenario Lab Saved Runs, and the Comparison saved-run modal: saved runs are stored only in the current browser.
- Kept macro scenario comparison as the primary delta table and separated saved I-O evidence into its own section with explicit copy: "Sector evidence from saved I-O runs" and "Not part of the macro scenario delta table."
- Demoted PE Trade Shock, CGE Reform Shock, FPP Fiscal Path, and Synthesis Preview from active Scenario Lab tabs into a planned model lanes panel. Macro/QPM, I-O Sector Shock, and Saved Runs remain the actionable tab row.
- Added conservative Overview KPI provenance pills where existing metadata supports the label: Nowcast for DFM/nowcast attribution, Scenario for QPM attribution, Reference for PE attribution, and Draft for SME-pending sentinel content.
- Cleaned touched vocabulary so source vintages, artifact exports, registry generation, and metric timestamps are labeled more explicitly.
- Softened overclaiming copy on Overview and Scenario Lab page descriptions.

## Boundaries Preserved

- Saved-run storage remains local browser storage; no server persistence was introduced.
- Existing macro comparison rows and saved-run behavior are unchanged except for presentation copy.
- I-O sector results remain accounting/sector-linkage evidence and are not merged into the macro scenario delta table.
- Planned PE/CGE/FPP/Synthesis lanes remain non-computational.

## Verification Targets

- `npm run lint`
- `npm test`
- `npm run build`
- Browser smoke:
  - Overview KPI provenance pills
  - Scenario Lab save disclosure and planned lanes panel
  - Comparison macro/I-O separation
  - no console errors
