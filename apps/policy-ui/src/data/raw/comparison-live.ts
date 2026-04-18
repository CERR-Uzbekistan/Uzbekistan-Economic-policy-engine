import type { RawComparisonPayload } from '../adapters/comparison'

export const comparisonLiveRawMock: RawComparisonPayload = {
  workspaceId: 'comparison-live-2026q2',
  generatedAt: '2026-04-18T10:00:00+05:00',
  metricDefinitions: [
    { metricId: 'gdp_growth', label: 'GDP growth', unit: '%' },
    { metricId: 'inflation', label: 'Inflation', unit: '%' },
    { metricId: 'fiscal_balance', label: 'Fiscal balance', unit: '% GDP' },
  ],
  scenarios: [
    {
      scenarioId: 'baseline-2026q2',
      scenarioName: 'Baseline 2026 Q2',
      scenarioType: 'baseline',
      summary: 'Reference path under current policy.',
      initialTag: 'balanced',
      riskIndex: 41,
      normalizedOutput: {
        headlineMetrics: [
          { metricId: 'gdp_growth', label: 'GDP growth', unit: '%', value: 5.8 },
          { metricId: 'inflation', label: 'Inflation', unit: '%', value: 8.5 },
          { metricId: 'fiscal_balance', label: 'Fiscal balance', unit: '% GDP', value: -3.1 },
        ],
      },
    },
    {
      scenarioId: 'targeted-reforms',
      scenarioName: 'Targeted reforms',
      scenarioType: 'alternative',
      summary: 'Reform package with moderate growth upside.',
      initialTag: 'preferred',
      riskIndex: 35,
      normalizedOutput: {
        headlineMetrics: [
          { metricId: 'gdp_growth', label: 'GDP growth', unit: '%', value: 6.2 },
          { metricId: 'inflation', label: 'Inflation', unit: '%', value: 8.0 },
          { metricId: 'fiscal_balance', label: 'Fiscal balance', unit: '% GDP', value: -2.8 },
        ],
      },
    },
    {
      scenarioId: 'downside-stress',
      scenarioName: 'Downside stress',
      scenarioType: 'stress',
      summary: 'External demand and financing stress.',
      initialTag: 'downside_stress',
      riskIndex: 82,
      normalizedOutput: {
        headlineMetrics: [
          { metricId: 'gdp_growth', label: 'GDP growth', unit: '%', value: 4.3 },
          { metricId: 'inflation', label: 'Inflation', unit: '%', value: 10.7 },
          { metricId: 'fiscal_balance', label: 'Fiscal balance', unit: '% GDP', value: -4.6 },
        ],
      },
    },
  ],
  defaultBaselineId: 'baseline-2026q2',
  defaultSelectedIds: ['baseline-2026q2', 'targeted-reforms', 'downside-stress'],
}
