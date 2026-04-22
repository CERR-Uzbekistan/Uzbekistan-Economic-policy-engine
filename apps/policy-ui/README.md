# Policy UI (Replatform Shell)

This app is the new frontend shell for the Uzbekistan Economic Policy Engine replatform.

## Current scope

- React 19 + TypeScript + Vite foundation
- App shell with unified navigation across Overview, Scenario Lab, Comparison, Model Explorer, Knowledge Hub
- i18n (EN/RU/UZ) via react-i18next
- ChartRenderer (Recharts) with semantic role colors and uncertainty-band rendering
- Typed data contract (`src/contracts/data-contract.ts`) covering HeadlineMetric, ChartSpec, NarrativeBlock (with TB-P3 generation_mode), ModelAttribution, Caveat, ApiError
- Per-page raw → guard → adapter → source → client data pipeline with `VITE_*_DATA_MODE=mock|live` switching
- QPM live-data bridge consuming `public/data/qpm.json` (refreshed nightly via GitHub Actions)
- localStorage-backed scenario store (`policy-ui:scenario.v2:*`) with full run-snapshot persistence including TB-P3 governance metadata
- Accessibility defaults: skip-link, aria-live on loading/error states, aria-labelledby on sections, `:focus-visible` rings
- Test harness: Node test runner, 59 tests covering adapters, guards, store round-trip, governance metadata round-trip, migration safety

## Structure

- `src/app/` routing and shell layout
- `src/components/layout/` shared page layout primitives
- `src/components/system/` global utility components
- `src/pages/` route-level page scaffolds
- `src/state/` global UI state placeholders
- `src/styles/` tokens and base styles
- `src/data/mock/` typed mock data placeholders

## Run

```bash
npm install
npm run dev
```

## Notes

- The old frontend is intentionally untouched.
- QPM is the first model live via the bridge. DFM/PE/IO/CGE/FPP follow the same pattern (R solver → nightly JSON → consumer contract → frontend alignment); targets in `docs/frontend-replatform/12_model_bridge.md`.
- Knowledge Hub route is a placeholder pending content port from the legacy site (TA-8).
