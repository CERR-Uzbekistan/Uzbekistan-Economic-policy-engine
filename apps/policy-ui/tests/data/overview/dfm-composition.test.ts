import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { toDfmAdapterOutput } from '../../../src/data/bridge/dfm-adapter.js'
import { composeDfmNowcastChart } from '../../../src/data/overview/dfm-composition.js'
import { buildValidDfmPayload } from '../../data/bridge/dfm-fixture.js'

describe('composeDfmNowcastChart', () => {
  it('returns a single-series ChartSpec covering history + current + forecast', () => {
    const adapter = toDfmAdapterOutput(buildValidDfmPayload())
    const chart = composeDfmNowcastChart(adapter)

    assert.equal(chart.chart_type, 'line')
    assert.equal(chart.series.length, 1)
    assert.equal(chart.series[0].series_id, 'gdp_growth_yoy')
    assert.equal(chart.series[0].semantic_role, 'baseline')

    const expectedLength =
      adapter.nowcast.history.length + 1 + adapter.nowcast.forecast.length
    assert.equal(chart.x.values.length, expectedLength)
    assert.equal(chart.series[0].values.length, expectedLength)
  })

  it('emits three uncertainty bands with confidence levels converted to integer percents', () => {
    const adapter = toDfmAdapterOutput(buildValidDfmPayload())
    const chart = composeDfmNowcastChart(adapter)

    assert.equal(chart.uncertainty.length, 3)
    const levels = chart.uncertainty.map((band) => band.confidence_level)
    assert.deepEqual(levels, [50, 70, 90])
    for (const band of chart.uncertainty) {
      assert.equal(band.is_illustrative, false)
      assert.equal(band.series_id, 'gdp_growth_yoy')
      assert.equal(band.lower.length, chart.x.values.length)
      assert.equal(band.upper.length, chart.x.values.length)
    }
  })

  it('preserves ASCII methodology_label verbatim on each band', () => {
    const adapter = toDfmAdapterOutput(buildValidDfmPayload())
    const chart = composeDfmNowcastChart(adapter)

    const label = chart.uncertainty[0].methodology_label
    assert.equal(label.includes('sigma'), true)
    assert.equal(label.includes('sqrt'), true)
    assert.equal(label.includes('σ'), false)
    assert.equal(label.includes('√'), false)
  })

  it('fills history band positions with NaN so the fan renders only from current onward', () => {
    const adapter = toDfmAdapterOutput(buildValidDfmPayload())
    const chart = composeDfmNowcastChart(adapter)

    const historyCount = adapter.nowcast.history.length
    const band = chart.uncertainty[0]
    for (let i = 0; i < historyCount; i += 1) {
      assert.equal(Number.isNaN(band.lower[i]), true)
      assert.equal(Number.isNaN(band.upper[i]), true)
    }
    assert.equal(Number.isFinite(band.lower[historyCount]), true)
    assert.equal(Number.isFinite(band.upper[historyCount]), true)
    assert.ok(band.upper[historyCount] >= band.lower[historyCount])
  })

  it('populates model_attribution from the adapter output', () => {
    const adapter = toDfmAdapterOutput(buildValidDfmPayload())
    const chart = composeDfmNowcastChart(adapter)

    assert.equal(chart.model_attribution.length, 1)
    assert.equal(chart.model_attribution[0].model_id, adapter.attribution.model_id)
  })
})
