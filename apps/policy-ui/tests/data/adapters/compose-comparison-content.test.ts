import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { composeComparisonContent } from '../../../src/data/adapters/comparison.js'
import { comparisonWorkspaceMock } from '../../../src/data/mock/comparison.js'
import type { ComparisonWorkspace } from '../../../src/contracts/data-contract.js'

describe('composeComparisonContent', () => {
  it('returns 7 metric rows from the workspace metric definitions', () => {
    const content = composeComparisonContent(
      comparisonWorkspaceMock,
      ['baseline-2026', 'fiscal-consolidation', 'russia-slowdown'],
      'baseline-2026',
    )
    assert.equal(content.metrics.length, 7)
    const ids = content.metrics.map((metric) => metric.id)
    assert.deepEqual(ids, [
      'gdp_growth',
      'inflation',
      'current_account',
      'fiscal_balance',
      'reserves_end',
      'unemployment_avg',
      'real_wages_cumulative',
    ])
  })

  it('keeps the Shot-1 7-row table when live QPM supplies only core metrics', () => {
    const qpmWorkspace: ComparisonWorkspace = {
      workspace_id: 'comparison-qpm-test',
      generated_at: '2026-04-17T12:20:00+05:00',
      metric_definitions: [
        { metric_id: 'gdp_growth', label: 'GDP growth', unit: '%' },
        { metric_id: 'inflation', label: 'Inflation', unit: '%' },
        { metric_id: 'policy_rate', label: 'Policy rate', unit: '%' },
        { metric_id: 'exchange_rate', label: 'Exchange rate', unit: 'UZS/USD' },
      ],
      scenarios: [
        {
          scenario_id: 'baseline',
          scenario_name: 'Baseline',
          scenario_type: 'baseline',
          summary: 'Baseline QPM path.',
          initial_tag: 'balanced',
          values: {
            gdp_growth: 4.1,
            inflation: 5.1,
            policy_rate: 7.7,
            exchange_rate: 13033,
          },
          risk_index: 42,
        },
        {
          scenario_id: 'rate-cut-100bp',
          scenario_name: 'Policy rate cut (-100 bp)',
          scenario_type: 'alternative',
          summary: 'Lower policy-rate path.',
          initial_tag: 'balanced',
          values: {
            gdp_growth: 4.3,
            inflation: 5.4,
            policy_rate: 7.7,
            exchange_rate: 13088,
          },
          risk_index: 47,
        },
      ],
      default_baseline_id: 'baseline',
      default_selected_ids: ['baseline', 'rate-cut-100bp'],
    }

    const content = composeComparisonContent(
      qpmWorkspace,
      ['baseline', 'rate-cut-100bp'],
      'baseline',
    )

    assert.equal(content.metrics.length, 7)
    assert.deepEqual(content.metrics.map((metric) => metric.id), [
      'gdp_growth',
      'inflation',
      'current_account',
      'fiscal_balance',
      'reserves_end',
      'unemployment_avg',
      'real_wages_cumulative',
    ])
    assert.equal(content.metrics.find((metric) => metric.id === 'gdp_growth')?.values.baseline, '+4.1%')
    assert.equal(content.metrics.find((metric) => metric.id === 'gdp_growth')?.deltas['rate-cut-100bp'], '+0.2 pp')
    assert.equal(content.metrics.find((metric) => metric.id === 'current_account')?.values.baseline, '—')
    assert.equal(content.metrics.find((metric) => metric.id === 'current_account')?.deltas['rate-cut-100bp'], '—')
  })

  it('computes highest_scenario and lowest_scenario from numeric values in the selection', () => {
    const content = composeComparisonContent(
      comparisonWorkspaceMock,
      ['baseline-2026', 'fiscal-consolidation', 'russia-slowdown'],
      'baseline-2026',
    )

    // GDP growth: baseline 5.8, fiscal 5.3, stress 4.8 → highest = baseline, lowest = stress.
    const gdp = content.metrics.find((metric) => metric.id === 'gdp_growth')!
    assert.equal(gdp.highest_scenario, 'baseline-2026')
    assert.equal(gdp.lowest_scenario, 'russia-slowdown')

    // Inflation terminal: baseline 5.4, fiscal 4.6, stress 5.7 → highest = stress, lowest = fiscal.
    const infl = content.metrics.find((metric) => metric.id === 'inflation')!
    assert.equal(infl.highest_scenario, 'russia-slowdown')
    assert.equal(infl.lowest_scenario, 'fiscal-consolidation')

    // Reserves end: fiscal highest, stress lowest.
    const reserves = content.metrics.find((metric) => metric.id === 'reserves_end')!
    assert.equal(reserves.highest_scenario, 'fiscal-consolidation')
    assert.equal(reserves.lowest_scenario, 'russia-slowdown')
  })

  it('suppresses the star when every selected scenario carries the same value', () => {
    const flatWorkspace: ComparisonWorkspace = {
      ...comparisonWorkspaceMock,
      scenarios: comparisonWorkspaceMock.scenarios.map((scenario) => ({
        ...scenario,
        values: { ...scenario.values, gdp_growth: 5.0 },
      })),
    }

    const content = composeComparisonContent(
      flatWorkspace,
      ['baseline-2026', 'fiscal-consolidation', 'russia-slowdown'],
      'baseline-2026',
    )
    const gdp = content.metrics.find((metric) => metric.id === 'gdp_growth')!
    assert.equal(gdp.highest_scenario, undefined)
    assert.equal(gdp.lowest_scenario, undefined)
  })

  it('maps scenario_type to the ScenarioRole union (stress → downside)', () => {
    const content = composeComparisonContent(
      comparisonWorkspaceMock,
      ['baseline-2026', 'fiscal-consolidation', 'russia-slowdown'],
      'baseline-2026',
    )
    const roles = Object.fromEntries(content.scenarios.map((scenario) => [scenario.id, scenario.role]))
    assert.equal(roles['baseline-2026'], 'baseline')
    assert.equal(roles['fiscal-consolidation'], 'alternative')
    assert.equal(roles['russia-slowdown'], 'downside')
  })

  it('formats values with unit-aware rules and deltas vs baseline', () => {
    const content = composeComparisonContent(
      comparisonWorkspaceMock,
      ['baseline-2026', 'fiscal-consolidation', 'russia-slowdown'],
      'baseline-2026',
    )
    const reserves = content.metrics.find((metric) => metric.id === 'reserves_end')!
    assert.equal(reserves.values['fiscal-consolidation'], '+46.2 USD bn')
    assert.equal(reserves.deltas['fiscal-consolidation'], '+2.4 USD bn')
    assert.equal(reserves.deltas['baseline-2026'], '—')
  })

  it('Shell B fires on fiscal-consolidation alternative + stress scenario', () => {
    const content = composeComparisonContent(
      comparisonWorkspaceMock,
      ['baseline-2026', 'fiscal-consolidation', 'russia-slowdown'],
      'baseline-2026',
    )
    assert.equal(content.tradeoff.mode, 'shell')
    assert.equal(content.tradeoff.shell_id, 'fiscal-vs-growth-tradeoff')
    assert.ok(content.tradeoff.rendered_text?.includes('Fiscal consolidation'))
    assert.ok(content.tradeoff.rendered_text?.includes('Russia slowdown'))
  })

  it('returns tradeoff mode="empty" when no Shell-B configuration matches', () => {
    const content = composeComparisonContent(
      comparisonWorkspaceMock,
      ['baseline-2026', 'aggressive-expansion'],
      'baseline-2026',
    )
    assert.equal(content.tradeoff.mode, 'empty')
    assert.equal(content.tradeoff.rendered_text, undefined)
    assert.equal(content.tradeoff.shell_id, undefined)
  })

  it('falls back to workspace default_baseline_id when the requested baseline is unknown', () => {
    const content = composeComparisonContent(
      comparisonWorkspaceMock,
      ['baseline-2026', 'fiscal-consolidation'],
      'does-not-exist',
    )
    assert.equal(content.baseline_scenario_id, comparisonWorkspaceMock.default_baseline_id)
  })
})
