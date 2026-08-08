# QPM v1 Validation Note

QPM v1 is a calibrated semi-structural monetary-policy scenario model for internal preview. Scope is deliberately narrow: policy-rate, exchange-rate/risk-premium, external-demand, output-gap, inflation, and policy-reaction channels.

## Canonical Equations

- IS curve: output gap depends on lagged output gap, the monetary-conditions index, external demand `gap*_t`, and demand shocks.
- Phillips curve: inflation depends on lagged/expected inflation, real marginal cost, direct import-price pass-through, and cost shocks.
- Policy rule: the policy-rate gap follows a smoothed Taylor-style reaction to expected inflation, four-quarter inflation, and the output gap.
- UIP block: exchange-rate dynamics combine backward/forward terms, the policy-rate gap, one-period risk-premium shocks, and exchange-rate shocks.
- External demand: `gap*_t` follows AR(1) decay with `rho_external = 0.75`.

## Parameters

Public parameters are exported in `apps/policy-ui/public/data/qpm.json`: `b1-b4`, `a1-a4`, `g1-g3`, `e1`, `pi_target`, `rs_neutral`, `potential_growth`, and `rho_external`. They are calibrated priors and steady-state assumptions, not Uzbekistan-specific econometric estimates.

## Baseline Construction

The checked-in public QPM artifact and Scenario Lab solver use the latest valid Overview artifact where possible. Mapped inputs are CPI inflation, CBU policy rate, GDP nowcast or latest quarterly GDP state, and USD/UZS level and movement. Exports growth is retained in baseline metadata as external-demand context, but warning-status trade metrics are not allowed to mechanically drive the baseline external-demand gap. If the Overview artifact is missing or invalid, QPM falls back deterministically to the old Q1 2026 initial conditions.

Solver 0.3.0 separates the displayed baseline path from the raw QPM steady-state transition. The visible level path is anchored to the accepted Overview/nowcast baseline and then QPM shock deviations are added around that path. This keeps Scenario Lab results comparable with the current forecasting view while preserving QPM transmission signs and impulse responses.

The first displayed QPM period is the first projection quarter after the Overview baseline quarter. For example, if the current Overview nowcast is 2026 Q2, the QPM path starts at 2026 Q3.

## Source Data

Baseline source metadata is stored in QPM metadata and shown in Scenario Lab / Model Explorer. The Overview artifact is itself source-labeled; QPM does not add new source claims beyond that artifact.

## Shock Sign Checks

Current automated checks require:

- a policy-rate hike lowers the GDP path and inflation;
- depreciation/risk-premium stress raises inflation and the policy-rate path;
- external-demand slowdown lowers the GDP path;
- fiscal/current-account panels are described only as accounting/proxy views;
- baseline source metadata is present.

## Known Omissions

QPM v1 does not include fiscal reaction, CGE structure, full external-sector balance, banking-sector balance sheets, or formally estimated parameter uncertainty. Fiscal and current-account panels in Scenario Lab are proxy/accounting views around QPM paths, not endogenous QPM blocks.

Historical fit/backtest data are not yet sufficient for Uzbekistan-specific forecast-accuracy claims. Production use requires owner review of steady states, pass-through priors, risk-premium treatment, the anchored baseline rule, and proxy mappings.
