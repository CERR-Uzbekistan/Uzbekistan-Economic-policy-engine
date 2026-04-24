import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { comparisonContentMock } from '../../../src/data/mock/comparison-content.js'

describe('comparison content mock', () => {
  it('seeds exactly 3 scenarios (baseline + alternative + downside)', () => {
    assert.equal(comparisonContentMock.scenarios.length, 3)
    const roles = comparisonContentMock.scenarios.map((scenario) => scenario.role)
    assert.deepEqual(roles, ['baseline', 'alternative', 'downside'])
  })

  it('seeds exactly 7 metric rows in prototype order', () => {
    assert.equal(comparisonContentMock.metrics.length, 7)
    const ids = comparisonContentMock.metrics.map((metric) => metric.id)
    assert.deepEqual(ids, [
      'gdp_growth_3y_avg',
      'inflation_terminal',
      'current_account_pct_gdp',
      'fiscal_balance_pct_gdp',
      'reserves_end',
      'unemployment_avg',
      'real_wages_cumulative',
    ])
  })

  it('marks baseline highest on GDP growth · 3y avg and Fiscal consolidation lowest on Inflation terminal', () => {
    const gdpRow = comparisonContentMock.metrics.find((metric) => metric.id === 'gdp_growth_3y_avg')
    assert.equal(gdpRow?.highest_scenario, 'baseline')
    const inflationRow = comparisonContentMock.metrics.find(
      (metric) => metric.id === 'inflation_terminal',
    )
    assert.equal(inflationRow?.lowest_scenario, 'fiscal-consolidation')
  })

  it('ships Shell B trade-off prose referencing both Fiscal consolidation and Russia slowdown', () => {
    assert.equal(comparisonContentMock.tradeoff.mode, 'shell')
    assert.equal(comparisonContentMock.tradeoff.shell_id, 'fiscal-vs-growth-tradeoff')
    const text = comparisonContentMock.tradeoff.rendered_text ?? ''
    assert.ok(text.includes('Fiscal consolidation'))
    assert.ok(text.includes('Russia slowdown'))
  })
})
