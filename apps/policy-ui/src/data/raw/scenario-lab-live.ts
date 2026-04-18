import type { RawScenarioLabRunPayload } from '../adapters/scenario-lab'

export const scenarioLabLiveRawMock: RawScenarioLabRunPayload = {
  workspace: {
    workspaceId: 'scenario-lab-live-2026q2',
    workspaceName: 'Scenario Lab (Live Mock)',
    generatedAt: '2026-04-18T09:30:00+05:00',
    assumptions: [
      {
        key: 'policy_rate_change',
        label: 'Policy rate change',
        description: 'Change in policy rate relative to baseline stance.',
        category: 'macro',
        unit: 'pp',
        technicalVariable: 'qpm.policy_rate_shock',
        min: -3,
        max: 4,
        step: 0.25,
        defaultValue: 0,
      },
      {
        key: 'exchange_rate_change',
        label: 'Exchange-rate depreciation',
        description: 'Additional depreciation relative to baseline path.',
        category: 'macro',
        unit: '%',
        technicalVariable: 'qpm.fx_depreciation_shock',
        min: -10,
        max: 20,
        step: 1,
        defaultValue: 0,
      },
    ],
    presets: [
      {
        presetId: 'balanced-baseline',
        title: 'Balanced baseline',
        summary: 'No additional shocks; use as anchor for alternatives.',
        assumptionOverrides: {},
      },
    ],
  },
  run: {
    generatedAt: '2026-04-18T09:32:00+05:00',
    headlineMetrics: [
      {
        metricId: 'gdp_growth',
        label: 'GDP growth',
        value: 5.6,
        unit: '%',
        period: '2026 Q4',
        baselineValue: 5.8,
        deltaAbs: -0.2,
        deltaPct: -3.4,
        direction: 'down',
        confidence: 'medium',
        lastUpdated: '2026-04-18T09:32:00+05:00',
      },
    ],
    chartsByTab: {
      headline_impact: {
        chartId: 'headline_impact_delta_live',
        title: 'Headline impact vs baseline',
        subtitle: 'Selected scenario impact at horizon',
        chartType: 'bar',
        viewMode: 'delta',
        takeaway: 'Growth softens while inflation pressure remains elevated.',
      },
    },
    interpretation: {
      whatChanged: ['GDP slows and inflation remains sticky under this run.'],
      whyItChanged: ['The shock transmits through demand and price channels.'],
      keyRisks: ['External demand weakness can amplify downside.'],
      policyImplications: ['Prioritize sequencing of monetary and fiscal responses.'],
      suggestedNextScenarios: ['Combine external slowdown with stronger policy-rate response.'],
    },
  },
}
