import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { HeadlineMetric } from '../../../src/contracts/data-contract.js'
import {
  applyPresetToState,
  buildScenarioLabResults,
  scenarioLabWorkspaceMock,
} from '../../../src/data/mock/scenario-lab.js'

function metric(metrics: HeadlineMetric[], metricId: string): HeadlineMetric {
  const found = metrics.find((entry) => entry.metric_id === metricId)
  assert.ok(found, `Expected metric ${metricId}`)
  return found
}

function seriesValue(seriesId: string, values: Record<string, number>) {
  const chart = buildScenarioLabResults(values).impulse_response_chart
  assert.ok(chart, 'Expected impulse-response chart')
  const series = chart.series.find((entry) => entry.series_id === seriesId)
  assert.ok(series, `Expected series ${seriesId}`)
  return series.values[0]
}

describe('scenario lab mock result semantics', () => {
  it('keeps preset overrides aligned with their plain-language labels', () => {
    const remittanceDownside = applyPresetToState('remittance-downside')

    assert.equal(remittanceDownside.remittance_change, -8)
    assert.equal(remittanceDownside.export_demand_change, 0)
  })

  it('maps remittance and tariff controls to sensible headline effects', () => {
    const baseline = buildScenarioLabResults({}).headline_metrics
    const remittanceUpside = buildScenarioLabResults({ remittance_change: 10 }).headline_metrics
    const tariffIncrease = buildScenarioLabResults({ tariff_change: 5 }).headline_metrics

    assert.ok(
      metric(remittanceUpside, 'current_account').value > metric(baseline, 'current_account').value,
      'higher remittances should improve the current account path',
    )
    assert.ok(
      metric(tariffIncrease, 'current_account').value > metric(baseline, 'current_account').value,
      'higher tariffs should improve the current account path in this partial model',
    )
    assert.ok(
      metric(tariffIncrease, 'inflation').value > metric(baseline, 'inflation').value,
      'higher import tariffs should raise the inflation path in this partial model',
    )
  })

  it('feeds all major shock channels into the impulse-response view', () => {
    assert.ok(seriesValue('gdp_gap', { gov_spending_change: 2 }) > 0)
    assert.ok(seriesValue('gdp_gap', { remittance_change: -8 }) < 0)
    assert.ok(seriesValue('inflation', { commodity_price_change: 10 }) > 0)
    assert.ok(seriesValue('inflation', { tariff_change: 5 }) > 0)
    assert.ok(seriesValue('policy_rate', { risk_premium_shock: 2 }) > 0)
  })

  it('keeps suggested next scenario links pointed at real Scenario Lab presets', () => {
    const presetIds = new Set(scenarioLabWorkspaceMock.presets.map((preset) => preset.preset_id))
    const suggested = buildScenarioLabResults({}).interpretation.suggested_next ?? []

    assert.ok(suggested.length > 0)
    for (const item of suggested) {
      if (item.target_route === '/scenario-lab' && item.target_preset) {
        assert.equal(presetIds.has(item.target_preset), true, item.target_preset)
      }
    }
  })
})
