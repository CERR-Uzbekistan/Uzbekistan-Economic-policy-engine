import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { toComparisonWorkspace, type RawComparisonPayload } from '../../../src/data/adapters/comparison.js'
import { validateRawComparisonPayload } from '../../../src/data/adapters/comparison-guard.js'

describe('comparison adapter', () => {
  it('maps happy-path payload into Comparison workspace contract', () => {
    const raw: RawComparisonPayload = {
      workspaceId: 'cmp-live-1',
      generatedAt: '2026-04-18T10:30:00+05:00',
      metricDefinitions: [
        { metricId: 'gdp_growth', label: 'GDP growth', unit: '%' },
        { metricId: 'inflation', label: 'Inflation', unit: '%' },
      ],
      scenarios: [
        {
          scenarioId: 'baseline',
          scenarioName: 'Baseline',
          scenarioType: 'baseline',
          summary: 'Baseline summary',
          initialTag: 'balanced',
          riskIndex: 40,
          normalizedOutput: {
            headlineMetrics: [
              { metricId: 'gdp_growth', value: 5.8 },
              { metricId: 'inflation', value: 8.4 },
            ],
          },
        },
        {
          scenarioId: 'reform',
          scenarioName: 'Reform',
          scenarioType: 'alternative',
          summary: 'Reform summary',
          initialTag: 'preferred',
          riskIndex: 34,
          normalizedOutput: {
            headlineMetrics: [
              { metricId: 'gdp_growth', value: 6.2 },
              { metricId: 'inflation', value: 7.9 },
            ],
          },
        },
      ],
      defaultBaselineId: 'baseline',
      defaultSelectedIds: ['baseline', 'reform'],
    }

    const workspace = toComparisonWorkspace(raw)

    assert.ok(workspace, 'Expected workspace to be returned')
    assert.equal(workspace.workspace_id, 'cmp-live-1')
    assert.equal(workspace.metric_definitions.length, 2)
    assert.equal(workspace.scenarios.length, 2)
    assert.equal(workspace.default_baseline_id, 'baseline')
    assert.equal(workspace.scenarios[1]?.values.gdp_growth, 6.2)
  })

  it('returns null when payload is degraded and cannot form a valid comparison set (no silent mock swap)', () => {
    const workspace = toComparisonWorkspace({
      workspaceId: 'cmp-partial',
      scenarios: [
        {
          scenarioId: 'only-one',
          scenarioName: 'Only one',
          scenarioType: 'alternative',
          values: { gdp_growth: 5.1 },
        },
      ],
    })

    assert.equal(workspace, null)
  })

  it('drops live labeled series without usable numeric values instead of backfilling under that live label', () => {
    const workspace = toComparisonWorkspace({
      workspaceId: 'cmp-series-rule',
      scenarios: [
        {
          scenarioId: 'baseline',
          scenarioName: 'Baseline',
          scenarioType: 'baseline',
          normalizedOutput: {
            headlineMetrics: [{ metricId: 'gdp_growth', value: 5.8 }],
          },
        },
        {
          scenarioId: 'valid-alt',
          scenarioName: 'Valid alternative',
          scenarioType: 'alternative',
          normalizedOutput: {
            headlineMetrics: [{ metricId: 'gdp_growth', value: 6.1 }],
          },
        },
        {
          scenarioId: 'empty-live-series',
          scenarioName: 'Live Empty Series',
          scenarioType: 'alternative',
          normalizedOutput: {
            chartsByTab: {
              headline_impact: {
                x: { values: ['2026 Q1', '2026 Q2'] },
                y: { values: [1000, 2000] },
                series: [
                  {
                    metricId: 'gdp_growth',
                    label: 'GDP growth live',
                    values: [],
                  },
                ],
              },
            },
          },
        },
      ],
      defaultBaselineId: 'baseline',
      defaultSelectedIds: ['baseline', 'valid-alt'],
    })

    assert.ok(workspace, 'Expected workspace to be returned')
    assert.equal(workspace.workspace_id, 'cmp-series-rule')
    assert.equal(workspace.scenarios.some((scenario) => scenario.scenario_id === 'empty-live-series'), false)
    assert.equal(workspace.scenarios.length, 2)
    assert.equal(workspace.scenarios[1]?.values.gdp_growth, 6.1)
  })
})

describe('comparison runtime guard', () => {
  it('fails validation for non-object payload', () => {
    const result = validateRawComparisonPayload('invalid')

    assert.equal(result.ok, false)
    assert.equal(result.issues.some((issue) => issue.severity === 'error'), true)
  })

  it('keeps payload object and reports warnings for invalid nested shapes', () => {
    const result = validateRawComparisonPayload({
      scenarios: 'bad',
      defaultSelectedIds: [1, 'ok'],
    })

    assert.equal(result.ok, true)
    assert.ok(result.issues.length > 0)
    assert.equal(Array.isArray(result.value.defaultSelectedIds), true)
    assert.equal(result.value.defaultSelectedIds?.[0], 'ok')
  })
})
