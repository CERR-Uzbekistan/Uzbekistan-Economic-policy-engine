import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  toScenarioLabData,
  type RawScenarioLabRunPayload,
} from '../../../src/data/adapters/scenario-lab.js'
import { validateRawScenarioLabPayload } from '../../../src/data/adapters/scenario-lab-guard.js'

describe('scenario lab adapter', () => {
  it('maps happy-path run payload into workspace and result contracts', () => {
    const raw: RawScenarioLabRunPayload = {
      workspace: {
        workspaceId: 'scenario-lab-live-1',
        workspaceName: 'Scenario Lab Live',
        generatedAt: '2026-04-18T09:30:00+05:00',
        assumptions: [
          {
            key: 'policy_rate_change',
            label: 'Policy rate change',
            description: 'desc',
            category: 'macro',
            unit: 'pp',
            technicalVariable: 'qpm.policy_rate_shock',
            min: -3,
            max: 4,
            step: 0.25,
            defaultValue: 0,
          },
        ],
        presets: [
          {
            presetId: 'baseline',
            title: 'Baseline',
            summary: 'baseline',
            assumptionOverrides: {},
          },
        ],
      },
      run: {
        generatedAt: '2026-04-18T09:35:00+05:00',
        headlineMetrics: [
          {
            metricId: 'gdp_growth',
            label: 'GDP growth',
            value: 5.5,
            unit: '%',
            period: '2026 Q4',
            baselineValue: 5.8,
            deltaAbs: -0.3,
            deltaPct: -5.17,
            direction: 'down',
            confidence: 'medium',
            lastUpdated: '2026-04-18T09:35:00+05:00',
          },
        ],
        chartsByTab: {
          headline_impact: {
            chartId: 'headline_impact_delta_live',
            title: 'Headline impact',
            subtitle: 'Live run',
            chartType: 'bar',
            viewMode: 'delta',
            takeaway: 'Live takeaway',
          },
        },
        interpretation: {
          whatChanged: ['Growth slowed.'],
          whyItChanged: ['Demand shock.'],
          keyRisks: ['External downside.'],
          policyImplications: ['Tighten cautiously.'],
          suggestedNextScenarios: ['FX + remittance stress.'],
        },
      },
    }

    const adapted = toScenarioLabData(raw)

    assert.equal(adapted.workspace.workspace_id, 'scenario-lab-live-1')
    assert.equal(adapted.workspace.assumptions[0].key, 'policy_rate_change')
    assert.equal(adapted.results.headline_metrics[0].metric_id, 'gdp_growth')
    assert.equal(adapted.results.headline_metrics[0].direction, 'down')
    assert.equal(adapted.results.charts_by_tab.headline_impact.chart_type, 'bar')
    assert.equal(adapted.results.interpretation.what_changed[0], 'Growth slowed.')
    assert.equal(adapted.results.interpretation.metadata?.generation_mode, 'template')
  })

  it('maps raw governance fields into typed interpretation metadata only', () => {
    const adapted = toScenarioLabData({
      run: {
        interpretation: {
          whatChanged: ['Reviewed interpretation.'],
          whyItChanged: ['Reviewed driver.'],
          keyRisks: ['Reviewed risk.'],
          policyImplications: ['Reviewed implication.'],
          suggestedNextScenarios: ['Reviewed next.'],
          generationMode: 'reviewed',
          reviewerName: 'M. Usmanov',
          reviewedAt: '2026-04-20T09:15:00+05:00',
        },
      },
    })
    const interpretation = adapted.results.interpretation as typeof adapted.results.interpretation &
      Record<string, unknown>

    assert.equal(adapted.results.interpretation.metadata?.generation_mode, 'reviewed')
    assert.equal(adapted.results.interpretation.metadata?.reviewer_name, 'M. Usmanov')
    assert.equal(adapted.results.interpretation.metadata?.reviewed_at, '2026-04-20T09:15:00+05:00')
    assert.equal('generation_mode' in interpretation, false)
    assert.equal('reviewer_name' in interpretation, false)
    assert.equal('reviewed_at' in interpretation, false)
  })

  it('falls back safely when payload is degraded or partial', () => {
    const adapted = toScenarioLabData({
      run: {
        headlineMetrics: [
          {
            metricId: 'inflation',
            value: 8.7,
            baselineValue: 8.4,
            direction: 'up',
            confidence: 'high',
          },
        ],
        chartsByTab: {
          macro_path: {
            chartType: 'not-valid',
            title: 'Macro path override',
          },
        },
      },
    })

    assert.equal(adapted.workspace.workspace_id.length > 0, true)
    assert.equal(adapted.results.headline_metrics[0].metric_id, 'inflation')
    assert.equal(adapted.results.headline_metrics[0].direction, 'up')
    assert.equal(adapted.results.charts_by_tab.macro_path.title, 'Macro path override')
    assert.equal(adapted.results.charts_by_tab.macro_path.chart_type, 'line')
    assert.equal(adapted.results.charts_by_tab.external_balance.chart_id.length > 0, true)
  })

  it('uses live chart primitives when valid primitive payload is present', () => {
    const raw: RawScenarioLabRunPayload = {
      run: {
        chartsByTab: {
          macro_path: {
            chartId: 'macro_path_live',
            chartType: 'line',
            x: {
              label: 'Quarter',
              unit: '',
              values: ['2026 Q1', '2026 Q2', '2026 Q3', '2026 Q4'],
            },
            y: {
              label: 'GDP growth',
              unit: '%',
              values: [5.7, 5.6, 5.5, 5.4],
            },
            series: [
              {
                seriesId: 'baseline_path',
                label: 'Baseline',
                semanticRole: 'baseline',
                values: [5.8, 5.8, 5.8, 5.8],
              },
              {
                seriesId: 'scenario_path',
                label: 'Scenario',
                semanticRole: 'alternative',
                values: [5.7, 5.6, 5.5, 5.4],
              },
            ],
            takeaway: 'Live macro path from backend primitives.',
          },
        },
      },
    }

    const adapted = toScenarioLabData(raw)
    const chart = adapted.results.charts_by_tab.macro_path
    assert.equal(chart.chart_id, 'macro_path_live')
    assert.deepEqual(chart.x.values, ['2026 Q1', '2026 Q2', '2026 Q3', '2026 Q4'])
    assert.deepEqual(chart.series[1]?.values, [5.7, 5.6, 5.5, 5.4])
    assert.equal(chart.takeaway, 'Live macro path from backend primitives.')
  })

  it('applies safe fallback when primitive payload is partial', () => {
    const adapted = toScenarioLabData({
      run: {
        chartsByTab: {
          macro_path: {
            chartId: 'macro_path_partial',
            x: {
              label: 'Period',
              values: ['2026 Q1', '2026 Q2', '2026 Q3', '2026 Q4'],
            },
            series: [
              {
                seriesId: 'scenario_path',
              },
            ],
          },
        },
      },
    })

    const chart = adapted.results.charts_by_tab.macro_path
    assert.equal(chart.chart_id, 'macro_path_partial')
    assert.deepEqual(chart.x.values, ['2026 Q1', '2026 Q2', '2026 Q3', '2026 Q4'])
    assert.equal(chart.series[0]?.series_id, 'scenario_path')
    assert.equal(chart.series[0]?.values.length > 0, true)
    assert.equal(chart.y.values.length > 0, true)
  })
})

describe('scenario lab runtime guard', () => {
  it('fails validation for non-object payload', () => {
    const result = validateRawScenarioLabPayload('invalid')

    assert.equal(result.ok, false)
    assert.equal(result.issues.some((issue) => issue.severity === 'error'), true)
  })

  it('keeps payload object and reports warnings for invalid nested shapes', () => {
    const result = validateRawScenarioLabPayload({
      workspace: 'bad',
      run: {
        headlineMetrics: 'bad',
        interpretation: {
          whatChanged: [1, 'ok'],
        },
      },
    })

    assert.equal(result.ok, true)
    assert.ok(result.issues.length > 0)
    assert.equal(Array.isArray(result.value.run?.interpretation?.whatChanged), true)
    assert.equal(result.value.run?.interpretation?.whatChanged?.[0], 'ok')
  })

  it('warns and strips invalid chart primitives while preserving valid portions', () => {
    const validation = validateRawScenarioLabPayload({
      run: {
        chartsByTab: {
          headline_impact: {
            x: 'bad',
            y: {
              label: 'Delta',
              values: [1, 'bad', 2],
            },
            series: [
              {
                seriesId: 'delta',
                values: [0.2, Number.NaN, 0.1],
              },
              'bad-entry',
            ],
          },
        },
      },
    })

    assert.equal(validation.ok, true)
    assert.equal(
      validation.issues.some((issue) => issue.path === 'run.chartsByTab.headline_impact.x'),
      true,
    )
    assert.equal(
      validation.issues.some((issue) => issue.path === 'run.chartsByTab.headline_impact.series[1]'),
      true,
    )

    const adapted = toScenarioLabData(validation.value)
    const chart = adapted.results.charts_by_tab.headline_impact
    assert.equal(chart.x.values.length > 0, true)
    assert.deepEqual(chart.y.values, [1, 2])
    assert.deepEqual(chart.series[0]?.values, [0.2, 0.1])
  })
})
