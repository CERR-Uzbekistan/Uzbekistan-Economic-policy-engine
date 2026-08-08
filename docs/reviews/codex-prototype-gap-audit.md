# Codex Prototype Gap Audit

Branch checked: `codex/mvp-replatform-finish`.

Method note: live screenshots were not captured because the Vite server could not be kept alive through the shell wrapper long enough for browser capture, and `npx playwright` could not install under restricted network/cache mode. The comparison below uses `spec.html` rendered DOM structure and the React implementation source, including current mock data and CSS.

## Overview

### Prototype (what spec.html renders)
- Layout: Page header with eyebrow, title, description, and three meta items; state narrative card; 8-tile KPI strip; two-column nowcast chart plus risk rail; quick-action tile row; three-column recent updates feed.
- Typography: Source Sans 3 body, IBM Plex Mono for dates, freshness labels, captions, and numeric metadata; tabular numerics throughout; key narrative numbers are emphasized inline.
- Palette: Paper background `#f4f2ee`, white surfaces, ink navy `#17253b`, brand navy `#1f3658`, muted teal for alternative/attribution, muted red/green for downside/upside.
- Interaction model: Internal nav switches sections; risk buttons and quick actions call `go('lab', preset)` or `go('comparison')`; export action is an alert stub; nowcast uses Chart.js.
- Trust surfaces: Header freshness meta, state narrative provenance, AI-assisted reviewer line, DFM/QPM attribution badge, chart confidence band and revision caption, feed attribution badges.
- Content density: Dense; the page puts narrative, 8 indicators, chart, risks, actions, and update feed into a compact monitoring dashboard.

### Codex branch (what the live app renders)
- Layout: `PageHeader`; `EconomicStateHeader`; `KpiStrip` with section heading and 8 mock headline metrics; two-column nowcast/risks area; additional `CaveatPanel`; `QuickActions`; `OverviewFeeds`; `ReferencesFooter`.
- Typography: Same token family and tabular numeric intent; KPI trend deltas are rendered as neutral chips with `▲`, `▼`, or `-`; `EconomicStateHeader` is plain prose rather than inline-emphasized numeric copy.
- Palette: Same core paper/ink/navy palette; caveat severities add warning/info styling; chart rendering comes through shared `ChartRenderer`.
- Interaction model: React Router links replace internal `go()`; risk and quick-action links use query-string presets; nowcast can show bridge loading/degraded retry state; output action links to Scenario Lab.
- Trust surfaces: Header freshness derived from latest attribution timestamp; explicit model caveat panel; references footer; bridge error banner; model attribution retained in chart and metric data.
- Content density: Medium-to-dense, but more vertically separated because caveats and references are new full-width sections.

### Gaps
1. Prototype has the KPI strip immediately after the state narrative; Codex inserts a `Core indicators` section head before the grid. Severity: SMALL.
2. Prototype KPI tiles include human context lines such as confidence bands, core inflation target context, reserves coverage, and neutral-rate notes; Codex KPI cards show period metadata only. Severity: MEDIUM.
3. Prototype KPI deltas are inline text under the value with simple arrows; Codex wraps deltas in neutral chip pills with triangle glyphs. Severity: MEDIUM.
4. Prototype state narrative emphasizes key numbers inline and includes "AI-assisted - reviewed" provenance with a named reviewer; Codex renders a generic summary, model list, update time, and output link, with no inline numeric emphasis or reviewer line. Severity: MEDIUM.
5. Prototype nowcast card visibly labels `DFM · QPM`, shows an explicit takeaway block, and has a legend/caption row; Codex delegates the chart body to `ChartRenderer` and does not render the same chart-card header/takeaway/caption composition around it. Severity: MEDIUM.
6. Prototype risk rail has exactly three risk rows with a channel line and visible `Test ->` action; Codex is data-driven and one mock risk has no scenario link, leaving only a suggested-scenario label. Severity: MEDIUM.
7. Prototype Overview ends with the recent updates feed; Codex inserts a full caveats section before quick actions and a references footer after feeds. Severity: MEDIUM.
8. Prototype quick actions include an explicit output/export tile; Codex renders four analysis actions and exposes the output action in the state header instead of as a fourth export tile. Severity: MEDIUM.
9. Prototype feed entries use compact dated cards with domain/model badges; Codex feeds are still three columns but use different policy-action type tags and omit model badges from saved-scenario feed items. Severity: SMALL.
10. Prototype is happy-path only; Codex adds live-data degraded/loading/retry surfaces. Severity: SMALL.

## Scenario Lab

### Prototype (what spec.html renders)
- Layout: Header with active models, run lifecycle, and data vintage; three-column workbench. Left: assumptions panel with five preset chips, scenario name, run/save buttons, technical-name toggle, and Monetary/External/Fiscal slider groups. Center: results panel with four tabs, stale banner, four headline metric cards, impulse-response chart, legend, and attribution badge. Right: interpretation panel with five structured narrative sections and an AI-assisted disclaimer.
- Typography: Sans body; mono/tabular numeric values beside sliders and in result cards; compact uppercase group labels; chart captions and attribution badges are mono-like.
- Palette: Same paper/ink/navy tokens; active preset uses brand-soft background; stale banner uses dashed muted panel; AI attribution uses warm warning treatment.
- Interaction model: Preset chips rewrite slider values; range sliders update visible values live; run recomputes charts and narrative; changing sliders marks results stale; suggested-next links route to Lab presets or Comparison.
- Trust surfaces: Technical-variable toggle exposes symbols; chart attribution badge; stale-results banner; AI-assisted unreviewed disclaimer; run/save alerts describe provenance capture.
- Content density: Very dense, with all assumptions, results, and interpretation visible side-by-side on desktop.

### Codex branch (what the live app renders)
- Layout: Header with active model count, run lifecycle, and data vintage; three-column grid. Left `AssumptionsPanel`: preset chips from workspace mock, scenario name, scenario type select, description textarea, tag toggles, save/run buttons, saved-scenario list, technical toggle, Macro/External/Fiscal/Trade groups, and Advanced details. Center `ResultsPanel`: stale/loading/error states, four tabs, four headline cards, and chart/table/bar rendering. Right `InterpretationPanel`: five narrative sections and conditional AI attribution.
- Typography: Same tokens; assumption values are mono-like; controls are denser because numeric inputs replace range sliders.
- Palette: Same tokens; saved scenarios and assumption groups use muted cards; AI attribution uses warm warning style when generation mode is `assisted`.
- Interaction model: Preset is synchronized through `?preset=`; initial run happens after preset hydration; assumptions use number inputs; save is disabled until a successful non-stale run; saved scenarios can load/delete; stale state is derived from assumption equality.
- Trust surfaces: Technical-variable toggle exists and reveals `Technical: {{variable}}`; stale banner; save-disabled reason; persisted run attribution and data version; AI attribution appears only for `assisted` or `reviewed` generation modes. Current mock sets `generation_mode: 'template'`, so no disclaimer appears in the default render.
- Content density: Dense, but left panel is heavier than prototype because scenario metadata and saved runs live there.

### Gaps
1. Prototype uses range sliders for assumptions; Codex uses numeric inputs with unit suffixes. Severity: LARGE.
2. Prototype groups assumptions as Monetary, External, and Fiscal; Codex groups them as Macro, External, Fiscal, Trade, plus Advanced. Severity: MEDIUM.
3. Prototype exposes five presets: Baseline, Rate cut 100 bp, Russia slowdown, WTO accession, Energy reform; Codex mock exposes Baseline, Policy rate cut, Policy rate hike, UZS depreciation, and Remittance downside. Severity: MEDIUM.
4. Prototype has only scenario name plus run/save actions; Codex adds scenario type, description, tags, and an embedded saved-scenario manager. Severity: LARGE.
5. Prototype keeps saved scenarios outside the Lab page; Codex renders saved scenarios inside the assumptions panel with load/delete controls. Severity: LARGE.
6. Prototype's visible controls say "Run scenario" primary and "Save draft" secondary together under the name field; Codex places save/run in a broader session-controls area and disables save unless run attribution is valid and current. Severity: MEDIUM.
7. Prototype result chart is a Chart.js line chart for GDP gap, inflation, and policy rate over 12 quarters; Codex default headline tab renders a horizontal bar-style delta chart and other tabs can render table/line views based on `ChartSpec`. Severity: LARGE.
8. Prototype headline result cards are fixed to GDP growth, inflation, current account, and policy rate; Codex `ResultsPanel` prefers the same IDs but uses payload metrics and mock data also includes fiscal balance and exchange rate. Severity: SMALL.
9. Prototype chart area has an explicit `QPM · FPP` attribution badge and caption legend; Codex relies on shared `ChartRenderer`/data attribution and does not reproduce the same badge-and-caption card chrome. Severity: MEDIUM.
10. Prototype interpretation always shows "AI-assisted · Unreviewed draft"; Codex only shows the disclaimer for `generation_mode: assisted`, while current mock output is `template`, so the default render omits it. Severity: MEDIUM.
11. Prototype suggested-next items are clickable route links; Codex renders suggested-next scenarios as plain interpretation list items. Severity: MEDIUM.
12. Prototype slider changes update charts/narrative immediately while also marking stale; Codex changes mark stale and require the run path for persisted/current results, with an initial silent run after hydration. Severity: MEDIUM.

## Comparison

### Prototype (what spec.html renders)
- Layout: Header with comparing/horizon/mode meta; compact "In view" scenario chip row with color dots and remove marks; three side-by-side scenario cards; wide delta table with baseline and deltas; footnote for numeric stars; editorial trade-off summary.
- Typography: Tabular numeric table values; compact scenario card tags; italic scenario names in summary prose; small tooltip/footnote treatment for highest/lowest cells.
- Palette: Navy baseline, teal alternative, red downside dot/card semantics; white cards on paper background.
- Interaction model: Scenario chips imply remove; `+ Add saved scenario` ghost button; baseline is fixed in the table; no chart tabs or baseline picker.
- Trust surfaces: Header states mode is deltas vs baseline; scenario cards include author/date/source tags; table highlights numeric highest/lowest with tooltips; footnote says policy judgment is not encoded.
- Content density: Dense single-flow comparison: chips, cards, table, summary.

### Codex branch (what the live app renders)
- Layout: `PageHeader` without meta; `ScenarioSelectorPanel` with selected count, baseline select, QPM reference scenario rows, saved-run rows, checkboxes, type chips, and tag selectors; `HeadlineComparisonTable` with KPI summary grid and full table; `ComparisonChartPanel` small multiples; `TradeoffSummaryPanel` generated sentences.
- Typography: Same tokens; numeric cells use tabular figures; table cells show value plus delta line with direction glyph.
- Palette: Same base tokens; type/tag chips are neutral/accent; no per-scenario color dots.
- Interaction model: Select 2-4 scenarios, change baseline, change scenario tag, include saved runs, switch chart tabs. Live QPM bridge falls back to mock on transport/validation failure.
- Trust surfaces: Delta computation is baseline-select driven; best values receive a star; saved-run persistence preserves run results/attribution; no explicit policy-judgment footnote or author/date card.
- Content density: High, but the selector and chart panel add more vertical space than the prototype.

### Gaps
1. Prototype selector is a one-line chip rail; Codex selector is a full panel with scenario rows, checkboxes, baseline select, tag dropdowns, and QPM/saved partitions. Severity: LARGE.
2. Prototype renders three scenario summary cards before the table; Codex has no comparable card row, only selector rows and KPI summary cards. Severity: LARGE.
3. Prototype header has meta for comparing count, horizon, and mode; Codex Comparison passes no meta to `PageHeader`. Severity: SMALL.
4. Prototype table rows include GDP, inflation, current account, fiscal balance, reserves, unemployment, and real wages; Codex mock metric definitions include GDP, inflation, current account, fiscal balance, and exchange rate. Severity: MEDIUM.
5. Prototype table is explicitly delta-column based (`Fiscal cons.`, `Delta`, `Russia slow.`, `Delta`); Codex puts each scenario in a column and nests each delta under the scenario value. Severity: MEDIUM.
6. Prototype marks highest/lowest cells with tooltip semantics and an explanatory star footnote; Codex uses a star for best values but does not render the same highest/lowest tooltip language or footnote. Severity: MEDIUM.
7. Prototype has no comparison charts; Codex adds a full `Comparative charts` panel with tabbed small multiples. Severity: LARGE.
8. Prototype trade-off summary is hand-authored policy prose with conditional framing; Codex generates short template sentences from metric deltas. Severity: LARGE.
9. Prototype scenario identity is conveyed through color dots and role cards; Codex conveys identity through type chips and editable scenario tags. Severity: MEDIUM.
10. Prototype baseline is fixed; Codex lets the user choose any selected scenario as baseline. Severity: MEDIUM.
11. Prototype `+ Add saved scenario` is a lightweight affordance; Codex fully merges local saved runs into the selector. Severity: MEDIUM.

## Model Explorer

### Prototype (what spec.html renders)
- Layout: Header with models, calibration audit, and open methodology issues; six-card model catalog; active model detail panel. Detail head has sublabel, title, and known-fixes badge; tab row has Overview, Equations, Parameters, Data sources, Caveats; body shows purpose, equations, parameter table, caveat list, sources, and validation summary in a two-column layout.
- Typography: Sans body, mono/tabular parameter values, rendered math using italic variables plus subscript/superscript notation; compact status badges.
- Palette: Status badges use ok/warn/crit variants; parameter issue values and caveat severities are visually differentiated.
- Interaction model: Model card selection changes active detail; tabs imply switching detail views; no parameter editing.
- Trust surfaces: Per-model status labels such as "2 Fixes", "Fix", "Gap", and "CA exog."; severity-coded caveats with issue-style numbering; data-source vintages; validation summary and calibration caveat.
- Content density: Very high; the default QPM detail exposes overview, math, parameters, caveats, sources, and validation at once.

### Codex branch (what the live app renders)
- Layout: `PageHeader` without meta; two-panel `model-explorer-layout`. Left catalog lists six model buttons with name, neutral status chip, type/frequency, and summary. Right detail panel has selected model overview and four tabs: Assumptions, Equations, Caveats, Data sources. Each tab renders a flat list.
- Typography: Same tokens; equations render as `<pre><code>` plain text; assumptions render as cards with label/value/rationale.
- Palette: Core tokens; model status chips are neutral; caveat severity is text/chip based rather than colored list severity.
- Interaction model: Selecting a model resets active tab to Assumptions; tab switch shows one content category at a time.
- Trust surfaces: Assumption rationales; caveat severity labels and implication lines; provider/frequency/vintage in data-source rows.
- Content density: Medium; content is spread across tabs rather than shown in a dense two-column technical sheet.

### Gaps
1. Prototype catalog cards include a three-stat mini-row per model; Codex catalog cards omit these stats. Severity: MEDIUM.
2. Prototype uses model-specific status/severity badges (`2 Fixes`, `Fix`, `Gap`, `CA exog.`); Codex uses generic neutral statuses (`Active`, `Staging`, `Paused`). Severity: LARGE.
3. Prototype header includes models live, last calibration audit, and open methodology issues; Codex header has title/description only. Severity: SMALL.
4. Prototype tab set is Overview, Equations, Parameters, Data sources, Caveats; Codex tab set is Assumptions, Equations, Caveats, Data sources. Severity: MEDIUM.
5. Prototype has a dedicated parameter table with Symbol, Name, Value, Range, and issue styling; Codex renders assumptions as flat cards and does not expose parameter ranges. Severity: LARGE.
6. Prototype equations are rendered as publication-style math with italics/subscripts/superscripts; Codex equations are plain monospace code blocks. Severity: LARGE.
7. Prototype default detail body is two-column and exposes multiple trust surfaces simultaneously; Codex shows one list at a time behind tabs. Severity: LARGE.
8. Prototype caveats are numbered, severity-colored, and include issue/target-version detail; Codex caveats show severity, message, and implication but no issue number, target, or strong severity color treatment. Severity: MEDIUM.
9. Prototype includes validation-summary prose and calibration caveat under sources; Codex mock detail contract has no validation-summary field. Severity: MEDIUM.
10. Prototype QPM detail uses "Known Fixes" as a prominent badge in the detail header; Codex detail header has no equivalent status badge. Severity: MEDIUM.

## Knowledge Hub

### Prototype (what spec.html renders)
- Layout: Header with reforms/briefs/literature counts; two-column `hub-grid`. Left: Reform tracker section with vertical timeline, date stamps, planned/in-progress states, reform body copy, domain chip, and model attribution badges. Right: Research briefs section with stacked brief cards, author/date/read-time byline, summaries, domain/model chips, and AI-drafted flag where applicable.
- Typography: Compact date/byline text, uppercase timeline dates, sans body, small chip/badge labels.
- Palette: Same paper/ink/navy tokens; accent chips for domains; attribution badges for models; warning chip for AI-drafted brief.
- Interaction model: Static context page; no filters, tabs, or search.
- Trust surfaces: Reform state classes (`in-progress`, `planned`); dated reforms; author/reviewer bylines; AI-drafted and reviewed flag; model attribution badges.
- Content density: Medium; reforms and briefs are visible simultaneously.

### Codex branch (what the live app renders)
- Layout: `PageHeader` without meta; pulse panel with four metric tiles; index panel with section head, model filter, tag filter, three tabs (`Reform tracker`, `Research briefs`, `Reference index`), and a generic card list for the active tab.
- Typography: Same tokens; cards use meta/title/summary plus chip rows.
- Palette: Same tokens; model chips use accent styling and tags use neutral styling.
- Interaction model: Tab switch between reforms, briefs, and literature/reference arrays; model select filters by model; tag select filters tags derived from active tab and resets on tab change.
- Trust surfaces: Model/tag chips on each card; no structured reviewer, read-time, AI-drafted, or reform-state markers.
- Content density: Low-to-medium; pulse metrics and filters add chrome, but only one content category is visible at a time.

### Gaps
1. Prototype shows Reform tracker and Research briefs side-by-side; Codex shows one tabbed list at a time. Severity: LARGE.
2. Prototype reforms are a vertical timeline with date rail and `in-progress`/`planned` state classes; Codex reforms are generic cards with no timeline rail or state styling. Severity: LARGE.
3. Prototype has no interactive filters; Codex adds model and tag dropdown filters. Severity: MEDIUM.
4. Prototype puts counts in the page-header meta; Codex moves counts into a separate pulse panel and does not pass header meta. Severity: MEDIUM.
5. Prototype has two visible content families; Codex adds a third `Reference index` tab. Severity: MEDIUM.
6. Prototype brief cards show author, date, read time, and AI-drafted/reviewed status; Codex brief cards have a single meta string and no AI-drafted/reviewer/read-time surface. Severity: MEDIUM.
7. Prototype reform items include exact dates like `14 APR 2026` and `Q3 2026 · Planned`; Codex reform card meta is generic (`Reform tracker · ...`) and omits exact date/status. Severity: MEDIUM.
8. Prototype separates domain chips from model attribution badges; Codex renders model chips and tag chips but not the same domain-vs-attribution visual distinction. Severity: SMALL.
9. Prototype text is more mechanism-specific for reforms and briefs; Codex content is shorter seed-copy from i18n. Severity: SMALL.
10. Prototype's simultaneous two-column layout is more scan-dense; Codex consumes more vertical space with pulse, controls, tabs, and one-list-at-a-time content. Severity: MEDIUM.
