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
})
