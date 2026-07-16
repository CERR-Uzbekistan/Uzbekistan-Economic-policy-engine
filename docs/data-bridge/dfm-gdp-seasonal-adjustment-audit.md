# DFM GDP seasonal-adjustment audit

Generated: 2026-07-16T10:01:34Z

## Decision

Keep seasonally adjusted GDP for model estimation; keep raw source-workbook GDP audit-only until provenance and continuity are verified.

## Latest observed quarter

2025Q4: raw YoY 8.5455% versus adjusted model-input YoY 8.7027%. Gap: 0.1572 pp.

Raw QoQ is 8.0818% versus adjusted QoQ 1.9005%. This large raw QoQ seasonal swing is why unadjusted GDP is a poor state-equation input.

## Volatility

- Raw QoQ SD: 25.4865 pp
- Adjusted QoQ SD: 1.9876 pp
- Raw YoY SD: 5.5285 pp
- Adjusted YoY SD: 2.8217 pp

## Quarter-specific seasonality

quarter | mean_raw_to_adjusted_ratio | mean_raw_qoq_pct | mean_adjusted_qoq_pct | observations
--- | --- | --- | --- | ---
Q1 | 0.7767 | -34.8235 | 1.553 | 9
Q2 | 0.9986 | 30.6968 | 1.5931 | 9
Q3 | 1.0395 | 5.7135 | 1.44 | 9
Q4 | 1.1845 | 15.8831 | 1.588 | 9

## Recent raw versus adjusted GDP history

period | raw_yoy_pct | adjusted_yoy_pct | yoy_gap_pp | raw_qoq_pct | adjusted_qoq_pct | qoq_gap_pp
--- | --- | --- | --- | --- | --- | ---
2024Q1 | 7.2416 | 8.5113 | 1.2697 | -35.6439 | -0.6382 | 35.0058
2024Q2 | 14.2956 | 6.6449 | -7.6507 | 36.1746 | 1.9663 | -34.2083
2024Q3 | 13.7263 | 10.2295 | -3.4968 | 2.0734 | 1.7128 | -0.3606
2024Q4 | -4.9756 | 1.6241 | 6.5998 | 6.2274 | -1.3846 | -7.612
2025Q1 | 4.7701 | 5.3927 | 0.6226 | -29.0435 | 3.0466 | 32.0901
2025Q2 | 6.1521 | 5.3793 | -0.7728 | 37.9708 | 1.9533 | -36.0175
2025Q3 | 6.6832 | 5.1983 | -1.4848 | 2.5841 | 1.5382 | -1.0459
2025Q4 | 8.5455 | 8.7027 | 0.1572 | 8.0818 | 1.9005 | -6.1813

## Required guardrails

- Label both raw source-workbook GDP and adjusted model-input GDP as review-only until provenance and continuity checks pass.
- Do not publish the no-GDP-seasonal-adjustment sensitivity or raw workbook history as an official series.
- Ask the model owner to confirm the X-13 specification and whether GDP should be adjusted by source code or by an official SA series.

## Limitations

- This audit checks GDP seasonal adjustment only; it does not validate every non-GDP transformation.
- The source workflow uses automatic X-13 through seasonal::seas(); the exact official seasonal-adjustment convention still needs model-owner confirmation.
- The audit does not create a real-time vintage backtest.
