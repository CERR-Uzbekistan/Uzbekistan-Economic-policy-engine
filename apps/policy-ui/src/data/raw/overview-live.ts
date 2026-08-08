import type { RawOverviewPayload } from '../adapters'

export const overviewLiveRawMock: RawOverviewPayload = {
  id: 'overview-live-2026q2',
  name: 'Overview Live Payload (Mocked)',
  generatedAt: '2026-04-18T08:55:00+05:00',
  summary:
    'Live-style payload sample for integration foundation. Growth stays resilient while inflation disinflation remains incomplete.',
  models: ['qpm_uzbekistan', 'dfm_nowcast', 'fpp_model'],
  headline: [
    {
      id: 'gdp_growth',
      name: 'GDP growth',
      current: 5.9,
      previous: 5.7,
      unit: '%',
      period: '2026 Q2',
      confidence: 'medium',
      lastUpdated: '2026-04-18T08:40:00+05:00',
      attribution: [
        {
          id: 'dfm_nowcast',
          name: 'DFM Nowcast',
          module: 'nowcast',
          version: '0.3.7',
          runId: 'run-2026-04-18-0840',
          dataVersion: '2026Q2-v1',
          timestamp: '2026-04-18T08:40:00+05:00',
        },
      ],
    },
    {
      id: 'inflation',
      name: 'Inflation',
      current: 8.5,
      previous: 8.8,
      unit: '%',
      period: 'April 2026',
      confidence: 'high',
      lastUpdated: '2026-04-18T08:30:00+05:00',
      attribution: [
        {
          id: 'qpm_uzbekistan',
          name: 'QPM Uzbekistan',
          module: 'monetary',
          version: '0.4.2',
          runId: 'run-2026-04-18-0830',
          dataVersion: '2026M04-v1',
          timestamp: '2026-04-18T08:30:00+05:00',
        },
      ],
    },
    {
      id: 'exchange_rate',
      name: 'Exchange rate',
      current: 12640,
      previous: 12590,
      unit: 'UZS/USD',
      period: 'April 2026',
      confidence: 'medium',
      lastUpdated: '2026-04-18T08:45:00+05:00',
      attribution: [
        {
          id: 'pe_model',
          name: 'Policy Engine FX Block',
          module: 'external',
          version: '0.2.1',
          runId: 'run-2026-04-18-0845',
          dataVersion: '2026M04-v1',
          timestamp: '2026-04-18T08:45:00+05:00',
        },
      ],
    },
  ],
  nowcast: {
    id: 'gdp_nowcast_revision',
    title: 'Nowcast revision (real GDP growth)',
    subtitle: 'Latest estimate vs prior estimate',
    yLabel: 'Growth',
    yUnit: '%',
    points: [
      { period: '2025 Q4', latest: 5.2, prior: 5.1 },
      { period: '2026 Q1', latest: 5.7, prior: 5.5 },
      { period: '2026 Q2', latest: 5.9, prior: 5.8 },
    ],
    takeaway: 'Latest quarter revision remains positive with stronger services and stable external demand.',
    attribution: [
      {
        id: 'dfm_nowcast',
        name: 'DFM Nowcast',
        module: 'nowcast',
        version: '0.3.7',
        runId: 'run-2026-04-18-0840',
        dataVersion: '2026Q2-v1',
        timestamp: '2026-04-18T08:40:00+05:00',
      },
    ],
  },
  risks: [
    {
      id: 'risk-external-demand',
      title: 'External demand softening',
      why: 'Slower partner growth could reduce export volumes in the next quarter.',
      channel: 'Exports and FX inflows',
      suggestedScenario: 'External slowdown stress',
    },
    {
      id: 'risk-price-pass-through',
      title: 'FX pass-through persistence',
      why: 'A prolonged depreciation wave may slow disinflation progress.',
      channel: 'Imported inflation and policy-rate path',
      suggestedScenario: 'Inflation persistence stress',
    },
  ],
  actions: [
    {
      id: 'action-fx-shock',
      title: 'Run FX shock',
      summary: 'Stress-test inflation and external balance under additional depreciation.',
      scenarioQuery: 'preset=exchange-rate-shock',
    },
    {
      id: 'action-fiscal-mix',
      title: 'Compare fiscal mixes',
      summary: 'Compare neutral and expansionary fiscal paths.',
      scenarioQuery: 'preset=fiscal-comparison',
    },
  ],
  output: {
    id: 'action-output-brief',
    title: 'Prepare snapshot brief',
    summary: 'Generate a concise summary note for the latest headline indicators.',
    targetHref: '/scenario-lab?preset=snapshot-brief',
  },
  caveats: [
    {
      id: 'cav-remittance-lag',
      severity: 'warning',
      message: 'Remittance data are partially lagged and may revise the near-term external balance.',
      affectedMetrics: ['current_account', 'exchange_rate'],
      affectedModels: ['pe_model'],
    },
  ],
  references: ['Internal macro monitoring feed (staging sample)'],
  activityFeed: {
    policyActions: [
      {
        id: 'cbu-rate-2026-04-15',
        title: 'CBU holds policy rate at 14.0%',
        institution: 'Central Bank of Uzbekistan',
        actionType: 'rate_decision',
        occurredAt: '2026-04-15T10:00:00+05:00',
      },
      {
        id: 'mef-fiscal-plan-2026-04-10',
        title: 'Ministry of Economy publishes fiscal plan update',
        institution: 'Ministry of Economy and Finance',
        actionType: 'announcement',
        occurredAt: '2026-04-10T14:00:00+05:00',
      },
    ],
    dataRefreshes: [
      {
        id: 'dfm-2026-04-18',
        dataSource: 'DFM nowcast',
        modelId: 'dfm_nowcast',
        refreshedAt: '2026-04-18T03:00:00Z',
        summary: 'Q2 2026 nowcast updated with latest industrial production print.',
      },
      {
        id: 'qpm-2026-04-17',
        dataSource: 'QPM quarterly run',
        modelId: 'qpm_uzbekistan',
        refreshedAt: '2026-04-17T21:00:00Z',
        summary: 'April 2026 calibration refresh.',
      },
    ],
    savedScenarios: [
      {
        id: 'scen-2026-04-16-rate-hold',
        scenarioName: 'Rate hold through Q2 (review)',
        scenarioId: 'scenario-uuid-live-1',
        author: 'CERR Macro Desk',
        savedAt: '2026-04-16T11:30:00+05:00',
      },
    ],
  },
}

