import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { toMacroSnapshot, type RawOverviewPayload } from '../../../src/data/adapters/overview.js'
import { validateRawOverviewPayload } from '../../../src/data/adapters/overview-guard.js'

function isIsoDateString(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime())
}

describe('overview adapter', () => {
  it('maps happy-path raw payload to MacroSnapshot', () => {
    const raw: RawOverviewPayload = {
      id: 'overview-1',
      name: 'Overview A',
      generatedAt: '2026-04-18T10:00:00+05:00',
      summary: 'Summary text',
      models: ['qpm', 'dfm'],
      headline: [
        {
          id: 'gdp_growth',
          name: 'GDP growth',
          current: 5.8,
          previous: 5.5,
          unit: '%',
          period: '2026 Q1',
          confidence: 'high',
          lastUpdated: '2026-04-18T09:55:00+05:00',
        },
      ],
      nowcast: {
        id: 'nowcast-1',
        title: 'Nowcast',
        subtitle: 'Latest vs prior',
        yLabel: 'Growth',
        yUnit: '%',
        points: [{ period: '2026 Q1', latest: 5.8, prior: 5.5 }],
        takeaway: 'Takeaway',
      },
      risks: [
        {
          id: 'risk-1',
          title: 'Risk',
          why: 'Why',
          channel: 'Channel',
          suggestedScenario: 'Scenario',
          scenarioQuery: 'preset=external-slowdown',
        },
      ],
      actions: [{ id: 'action-1', title: 'Action', summary: 'Action summary', scenarioQuery: 'preset=test' }],
      output: { id: 'out-1', title: 'Output', summary: 'Output summary', targetHref: '/scenario-lab?preset=test' },
      caveats: [{ id: 'c-1', severity: 'warning', message: 'Caveat', affectedMetrics: ['gdp_growth'], affectedModels: ['qpm'] }],
      references: ['Ref A'],
    }

    const snapshot = toMacroSnapshot(raw)

    assert.equal(snapshot.snapshot_id, 'overview-1')
    assert.equal(snapshot.snapshot_name, 'Overview A')
    assert.equal(snapshot.headline_metrics.length, 1)
    assert.ok(Math.abs((snapshot.headline_metrics[0].delta_abs ?? 0) - 0.3) < 1e-6)
    assert.equal(snapshot.headline_metrics[0].direction, 'up')
    assert.equal(snapshot.top_risks[0].scenario_query, 'preset=external-slowdown')
    assert.equal(snapshot.nowcast_forecast.series[0].series_id, 'latest_estimate')
    assert.equal(snapshot.nowcast_forecast.series[1].series_id, 'prior_estimate')
  })

  it('applies fallback defaults when required fields are missing', () => {
    const snapshot = toMacroSnapshot({})

    assert.equal(snapshot.snapshot_id, 'overview-snapshot')
    assert.ok(snapshot.summary.includes('No summary'))
    assert.deepEqual(snapshot.headline_metrics, [])
    assert.equal(snapshot.nowcast_forecast.chart_id, 'nowcast_forecast')
    assert.equal(snapshot.output_action.target_href, '/scenario-lab')
  })

  it('normalizes invalid enum/value cases safely', () => {
    const snapshot = toMacroSnapshot({
      generatedAt: 'not-a-date',
      headline: [
        {
          id: 'metric-1',
          name: 'Metric 1',
          current: 3,
          previous: 0,
          confidence: 'very-high',
          lastUpdated: 'invalid-date',
        },
      ],
      caveats: [{ id: 'c-1', severity: 'unknown', message: 'Message' }],
    })

    assert.equal(isIsoDateString(snapshot.generated_at), true)
    assert.equal(snapshot.headline_metrics[0].confidence, null)
    assert.equal(snapshot.headline_metrics[0].delta_pct, null)
    assert.equal(snapshot.caveats[0].severity, 'warning')
    assert.equal(isIsoDateString(snapshot.headline_metrics[0].last_updated), true)
  })

  it('copies activity_feed through from the raw payload with all three streams', () => {
    const snapshot = toMacroSnapshot({
      activityFeed: {
        policyActions: [
          {
            id: 'pa-1',
            title: 'Test action',
            institution: 'CBU',
            actionType: 'rate_decision',
            occurredAt: '2026-04-15T10:00:00+05:00',
          },
        ],
        dataRefreshes: [
          {
            id: 'dr-1',
            dataSource: 'DFM',
            modelId: 'dfm_nowcast',
            refreshedAt: '2026-04-18T03:00:00Z',
          },
        ],
        savedScenarios: [
          {
            id: 'ss-1',
            scenarioName: 'Test scenario',
            scenarioId: 'sc-uuid',
            author: 'Test',
            savedAt: '2026-04-16T11:30:00+05:00',
          },
        ],
      },
    })

    assert.equal(snapshot.activity_feed.policy_actions.length, 1)
    assert.equal(snapshot.activity_feed.policy_actions[0].action_id, 'pa-1')
    assert.equal(snapshot.activity_feed.policy_actions[0].action_type, 'rate_decision')
    assert.equal(snapshot.activity_feed.data_refreshes.length, 1)
    assert.equal(snapshot.activity_feed.data_refreshes[0].model_id, 'dfm_nowcast')
    assert.equal(snapshot.activity_feed.saved_scenarios.length, 1)
    assert.equal(snapshot.activity_feed.saved_scenarios[0].author, 'Test')
    assert.equal(snapshot.activity_feed.saved_scenarios[0].scenario_name, 'Test scenario')
  })

  it('handles partial payloads with fallback defaults', () => {
    const snapshot = toMacroSnapshot({
      nowcast: {
        points: [{ latest: 4.2 }],
      },
      actions: [{ title: 'Test action' }],
      risks: [{ title: 'Test risk' }],
    })

    assert.equal(snapshot.nowcast_forecast.x.values[0], 'Period 1')
    assert.equal(snapshot.nowcast_forecast.series[1].values[0], 0)
    assert.equal(snapshot.analysis_actions[0].action_id, 'action-1')
    assert.equal(snapshot.analysis_actions[0].scenario_query, '')
    assert.equal(snapshot.top_risks[0].risk_id, 'risk-1')
    assert.equal(snapshot.top_risks[0].suggested_scenario, 'Not specified')
  })
})

describe('overview runtime guard', () => {
  it('fails validation for non-object payload', () => {
    const result = validateRawOverviewPayload('invalid')
    assert.equal(result.ok, false)
    assert.equal(
      result.issues.some((issue) => issue.severity === 'error'),
      true,
    )
  })

  it('keeps valid object payload and reports warnings for invalid nested types', () => {
    const raw: unknown = {
      id: 'overview-1',
      headline: 'bad-type',
      nowcast: {
        points: [1, 2, { period: '2026 Q1', latest: 5.1 }],
      },
      activityFeed: {
        policyActions: [],
        dataRefreshes: [],
        savedScenarios: [],
      },
    }

    const result = validateRawOverviewPayload(raw)
    assert.equal(result.ok, true)
    assert.equal(result.value.id, 'overview-1')
    assert.ok(result.issues.length > 0)
    assert.equal(Array.isArray(result.value.nowcast?.points), true)
  })

  it('flags missing activityFeed as error severity', () => {
    const result = validateRawOverviewPayload({
      id: 'overview-missing-activity',
    })

    const activityFeedErrors = result.issues.filter(
      (issue) => issue.path === 'activityFeed' && issue.severity === 'error',
    )
    assert.ok(
      activityFeedErrors.length >= 1,
      `expected error-severity issue on 'activityFeed'; got ${JSON.stringify(
        result.issues.filter((i) => i.path === 'activityFeed'),
      )}`,
    )
    assert.equal(result.ok, false)
  })

  it('accepts populated activityFeed without activity-feed errors', () => {
    const result = validateRawOverviewPayload({
      id: 'overview-activity-ok',
      activityFeed: {
        policyActions: [],
        dataRefreshes: [],
        savedScenarios: [],
      },
    })

    const activityFeedErrors = result.issues.filter(
      (issue) => issue.path === 'activityFeed' && issue.severity === 'error',
    )
    assert.equal(
      activityFeedErrors.length,
      0,
      `unexpected activity-feed errors: ${JSON.stringify(activityFeedErrors)}`,
    )
  })
})

