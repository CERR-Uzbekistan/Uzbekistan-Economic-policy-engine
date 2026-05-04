# Sprint 3 Pilot Feedback UX Clarification Audit

Date: 2026-04-26

Scope: targeted internal-preview UX clarification pass. This slice adds context, lane, and claim labels around existing Scenario Lab and Comparison outputs. It does not add model features, start PE/CGE/FPP implementation, change model computations, or change deployment workflows.

## Pilot Feedback Coverage

1. Macro/QPM raw result tabs were confusing.
   - Added one-sentence explanations before each result tab output.
   - Added claim labels for headline impulse response, macro path, external balance, and fiscal effects.
   - Preserved existing chart/table values and tab layout.

2. Headline chart was confusing.
   - Retitled headline chart as a scenario impulse response versus baseline over 12 quarters.
   - Clarified units as percentage-point deviations.
   - Added explicit mock Scenario Lab engine / not-live-forecast language.

3. I-O sector shock output/table was confusing.
   - Added a "What this means" summary before the sector table.
   - Kept sector code plus source label visible.
   - Made bln UZS and employment-estimate language explicit.
   - Added a source-label note stating labels come from the source artifact and are not translated here.

4. Persistent analytical context was missing.
   - Added a compact context strip to Scenario Lab.
   - Added a compact context strip to Comparison.
   - Context includes lane, model, current scenario/run, data vintage, and saved/view state.

5. Model lanes were not visible enough.
   - Added subtitles to Scenario Lab model tabs:
     Macro/QPM, I-O, PE, CGE, FPP, saved runs, and synthesis preview.
   - Planned lanes remain planned/disabled; no PE/CGE/FPP computation was introduced.

6. Claim-type labels needed strengthening.
   - Added visible claim labels near QPM result outputs, I-O KPI outputs, and saved I-O comparison outputs.
   - Labels separate scenario simulation, accounting contribution, structural linkage, and employment-intensity estimate claims.

## Non-Changes

- No model formulas, adapters, bridge calculations, or computation paths were changed.
- No deployment workflow files were changed.
- Existing I-O result table remains present.
- Existing macro comparison rows remain produced by the existing comparison adapter.

## Verification Targets

- `npm run lint`
- `npm test`
- `npm run build`
- Browser smoke:
  - Scenario Lab Macro/QPM
  - Macro path tab
  - External balance tab
  - I-O Sector Shock tab
  - Comparison saved I-O panel
  - no console errors
