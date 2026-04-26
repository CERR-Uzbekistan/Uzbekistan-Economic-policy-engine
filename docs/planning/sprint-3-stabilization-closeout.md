# Sprint 3 Stabilization Closeout

Date: 2026-04-25  
Branch: `epic/replatform-execution`

## Verification Commands

Run from `apps/policy-ui`.

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Pass | ESLint completed with no findings. |
| `npm test` | Pass | 208 tests passed, 0 failed. |
| `npm run build` | Pass | Production build completed. Vite reported the existing large chunk warning: `dist/assets/index-BUM078iQ.js` is about 1,050.94 kB minified / 307.89 kB gzip. |

No application code changes were made during this closeout pass.

## Browser QA Result

Browser QA was run against `http://127.0.0.1:5180` after the successful production build. The npm dev-server background launch hit a local Windows/Vite `spawn EPERM` issue, so the browser pass used the reachable local server serving the built artifact.

| Area | Result | Notes |
| --- | --- | --- |
| `/overview` | Pass | Route loaded, `Overview` heading present, nav present, no console errors. |
| `/scenario-lab` | Pass | Route loaded, `Scenario Lab` heading present, nav present, no console errors. |
| `/comparison` | Pass | Route loaded after workspace loading state, no console errors. |
| `/model-explorer` | Pass | Route loaded, no console errors. |
| `/data-registry` | Pass | Route loaded, no console errors. |
| `/knowledge-hub` | Pass | Route loaded, no console errors. |
| Navigation | Pass | All six nav links clicked through successfully. `/scenario-lab` correctly hydrated to `/scenario-lab?preset=baseline`. |
| Language switch | Pass | EN/RU/UZ smoke matrix passed on all six routes. Each route retained one `main` landmark and rendered translated headings without console errors. |
| Scenario Lab I-O run/save | Pass | I-O Sector Shock tab rendered analytics, `Save I-O run` worked, saved run appeared under Saved Runs with provenance and `Open in Comparison`. |
| Comparison saved I-O add flow | Pass | Saved I-O panel detected available runs, modal opened, selected run added, and the selected I-O analytics block rendered below the macro table without changing macro rows. |
| Data Registry MVP | Pass | Registry shows QPM, DFM, I-O implemented rows and PE, CGE, FPP planned rows. QPM/DFM show warning freshness states; I-O shows valid 2022 base-year vintage. |
| Model Explorer I-O bridge evidence | Pass | I-O detail shows `Bridge evidence`, source artifact `io_model/io_data.json + mcp_server/data/io_data.json`, 2022 vintage, 136 sectors, Leontief framework, linkage classes, and bridge caveats. |

## Deployment Readiness Notes

- `apps/policy-ui/vite.config.ts` still uses `base: process.env.POLICY_UI_BASE ?? '/'`.
- `.github/workflows/pages.yml` builds with `POLICY_UI_BASE: /Uzbekistan-Economic-policy-engine/policy-ui/`.
- The Pages workflow copies `apps/policy-ui/dist/.` into `_site/policy-ui/` and creates `404.html` from `index.html`, preserving SPA fallback behavior under the `/policy-ui/` subpath.
- Public artifacts exist in both `public/data/` and the built `dist/data/`: `qpm.json`, `dfm.json`, and `io.json`.
- Under the Pages artifact layout, those files resolve as `/Uzbekistan-Economic-policy-engine/policy-ui/data/qpm.json`, `/Uzbekistan-Economic-policy-engine/policy-ui/data/dfm.json`, and `/Uzbekistan-Economic-policy-engine/policy-ui/data/io.json`.
- A local Windows probe using `POLICY_UI_BASE=/Uzbekistan-Economic-policy-engine/policy-ui/` failed during Vite config loading with `spawn EPERM`, while the required normal `npm run build` passed before and after. Treat this as a local environment/tooling limitation unless the Ubuntu Pages workflow reproduces it.

## Known Issues

- Existing Vite large chunk warning remains. It is not a Sprint 3 blocker, but code-splitting should be planned before wider public use.
- QPM and DFM rows in Data Registry report warning freshness states; I-O is valid. This is expected current data-state visibility, not a UI failure.
- I-O sector labels are still Russian in the source artifact. The UI caveat correctly says English and Uzbek labels require a later reconciled sector-name source.
- Local Windows background `npm run dev` launch was unreliable due `spawn EPERM`; browser QA was completed against the built artifact instead.
- Pages-base build should be verified by the GitHub Pages workflow on Ubuntu because the local Windows probe could not complete.

## Recommended Next Sprint Priorities

1. Add production-oriented chunk splitting for the React bundle.
2. Reconcile I-O sector names for EN/RU/UZ so sector analytics are localization-complete.
3. Add a CI-visible Pages smoke check for `/policy-ui/overview`, `/policy-ui/data/qpm.json`, `/policy-ui/data/dfm.json`, and `/policy-ui/data/io.json`.
4. Refresh or automate QPM/DFM artifact freshness so Data Registry warnings are intentional rather than stale by default.
5. Convert the current browser QA script into repeatable smoke coverage for Scenario Lab save/restore, Comparison saved-run import, Data Registry, and Model Explorer evidence.

## Go / No-Go Recommendation

GO for pilot review, conditional on the GitHub Pages workflow passing on Ubuntu before sharing the public link.

The app-level stabilization gate is clean: lint, tests, build, route smoke, navigation, language switching, I-O save flow, Comparison saved I-O flow, Data Registry, and Model Explorer bridge evidence all passed. The remaining concerns are deployment verification and polish items, not pilot-review blockers.
