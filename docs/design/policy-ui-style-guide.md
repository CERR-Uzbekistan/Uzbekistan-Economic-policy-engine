# Policy UI Style Guide

This guide locks the dashboard direction for the Uzbekistan Economic Policy Engine. It is based on the project design context in `.impeccable.md` and the useful parts of Refero-style analytical references: disciplined tokens, light institutional surfaces, restrained color, and repeatable component patterns.

## Product Feel

- Authoritative, precise, institutional.
- Built for economists, analysts, and policy staff who scan dense information before meetings.
- Light-mode only.
- Data first, decoration never.
- Uzbek identity is subtle: warm paper, deep ink, restrained turquoise/terracotta accents. No ornamental patterns.

## Visual System

Use the shared CSS tokens in `apps/policy-ui/src/styles/tokens.css`.

Core surfaces:

- `--color-bg`: warm paper page background.
- `--color-surface`: primary panels, tables, cards.
- `--color-surface-muted`: secondary panels and quiet grouped controls.
- `--color-border` / `--color-border-strong`: all structural lines.

Core text:

- `--color-text`: primary analytical copy.
- `--color-text-muted`: source notes, helper text, caveats.
- `--color-brand`: selected states, headings, primary analytical emphasis.
- `--color-link`: external official-source links.

Semantic color:

- Success: `--color-success`, `--color-success-soft`, `--color-success-border`.
- Warning: `--color-warn`, `--color-warn-soft`, `--color-warn-border`.
- Downside / cost / risk: `--color-danger`, `--color-danger-soft`, `--color-danger-border`.
- Trade-off cost: `--color-cost`, `--color-cost-soft`, `--color-cost-border`.

Do not introduce page-local hex colors for status, risk, active states, or source states. Add a token first.

## Typography

- Body/UI: `--font-sans` / `--font-body`.
- Editorial page headings: `--font-display`.
- Technical labels only: `--font-mono`.

Use tabular figures for numbers through the body font. Do not use monospace as a shortcut for every number. Reserve monospace for variable IDs, compact source labels, model codes, and tabular metadata.

Letter spacing stays `0` by default. Small uppercase meta labels may use light positive tracking only when already established by the component pattern.

## Component Patterns

Keep the dashboard to a small set of repeated surfaces:

- Page header: title, one short description, compact metadata.
- Decision panel: the primary output or current result.
- Evidence panel: source data, decomposition, model facts.
- Metric tile: one number, one label, one caveat/source line.
- Source/caveat disclosure: collapsed or compact supporting detail.
- Segmented control: tabs, route-local views, scenario result views.

Avoid nested cards. A panel may contain rows, tables, chips, or charts; it should not contain another decorative card unless the child is a repeated item or modal.

## Page Guidance

Overview:

- First screen should answer: current macro picture, nowcast, what changed.
- Reforms shown here must come from Knowledge Hub, not hardcoded news.
- Charts should use clear source labels and avoid decorative mini-chart treatment.

Scenario Lab:

- Flow is configure, run, interpret, save/compare.
- Primary result first; caveats and source details stay compact.
- QPM charts show scenario versus baseline or deviation from baseline, not live forecasts.
- I-O and PE outputs must remain clearly labeled as accounting/direct-effect views.

Model Explorer:

- Explain what each model can and cannot claim.
- Validation notes and caveats are product content, not footnotes hidden from users.

Data Registry:

- It is a source/status surface. Keep it plain, table-forward, and honest about missing or planned datasets.

Knowledge Hub:

- Three public subpages: Reform Tracker, Research Updates, Literature Hub.
- Reform summaries should resemble compact reform digests: concrete new initiatives, deadlines, mechanisms, agencies, and rules.
- Avoid internal terms such as candidates, artifact, mock, review queue, and model-map in visible copy.

## Charts

- Use restrained palette and explicit axes.
- Prefer local domains for line charts unless the chart is a bar chart or an Overview actual/nowcast bridge where zero is analytically important.
- No decorative sparklines.
- Every chart needs a source or model basis.
- If a chart is a model scenario, label whether it is level path, baseline deviation, or accounting proxy.

## Controls

- Use segmented controls for modes and tabs.
- Use buttons for actions only.
- Use native selects for compact option sets unless search/filter is needed.
- All external source links open outside the SPA with `target="_blank"` and `rel="noopener noreferrer"`.

## Anti-Patterns

Do not use:

- Page-local palettes.
- Dark dashboard themes.
- Purple/blue gradients.
- Decorative cards inside cards.
- Wide colored side stripes as generic emphasis.
- Raw enum values in UI.
- Long explanatory prose where a compact label or disclosure is enough.

## Implementation Rule

When a page needs a new visual state, add or reuse a token in `tokens.css` first. Page CSS may compose tokens, but should not invent standalone palettes.
