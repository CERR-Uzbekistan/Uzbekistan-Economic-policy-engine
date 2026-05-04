import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { toDfmAdapterOutput } from '../../../src/data/bridge/dfm-adapter.js'
import { composeDfmNowcastChart } from '../../../src/data/overview/dfm-composition.js'
import type { DfmBridgePayload, DfmNowcastQuarter } from '../../../src/data/bridge/dfm-types.js'
import { buildValidDfmPayload } from '../../data/bridge/dfm-fixture.js'

function payloadWithForecast(): DfmBridgePayload {
  const base = buildValidDfmPayload()
  const forecastQuarter: DfmNowcastQuarter = {
    period: '2026Q2',
    quarter_start_date: '2026-04-01',
    gdp_growth_yoy_pct: 6.5,
    gdp_growth_qoq_pct: 1.2,
    gdp_level_idx: 290000,
    horizon_quarters: 2,
    uncertainty: {
      methodology_label: base.nowcast.current_quarter.uncertainty.methodology_label,
      is_illustrative: false,
      bands: [
        { confidence_level: 0.5, lower_pct: 6.0, upper_pct: 7.0 },
        { confidence_level: 0.7, lower_pct: 5.7, upper_pct: 7.3 },
        { confidence_level: 0.9, lower_pct: 5.2, upper_pct: 7.8 },
      ],
    },
  }
  return {
    ...base,
    nowcast: {
      ...base.nowcast,
      forecast_horizon: [forecastQuarter],
    },
  }
}

describe('composeDfmNowcastChart', () => {
  it('emits segmented series ids in the expected order, omitting forecast when absent', () => {
    const adapter = toDfmAdapterOutput(buildValidDfmPayload())
    const chart = composeDfmNowcastChart(adapter)

    assert.equal(chart.chart_type, 'line')
    const ids = chart.series.map((series) => series.series_id)
    assert.deepEqual(ids, ['gdp_history_yoy', 'gdp_nowcast_yoy'])

    for (const series of chart.series) {
      assert.equal(series.values.length, chart.x.values.length)
    }
  })

  it('omits the forecast series when forecast_horizon is empty', () => {
    const adapter = toDfmAdapterOutput(buildValidDfmPayload())
    const chart = composeDfmNowcastChart(adapter)

    const forecast = chart.series.find((series) => series.series_id === 'gdp_forecast_yoy')
    assert.equal(forecast, undefined)
  })

  it('nowcast series carries the last observed actual anchor + the current nowcast point', () => {
    const adapter = toDfmAdapterOutput(buildValidDfmPayload())
    const chart = composeDfmNowcastChart(adapter)

    const nowcast = chart.series.find((series) => series.series_id === 'gdp_nowcast_yoy')
    assert.ok(nowcast, 'expected gdp_nowcast_yoy series')

    const historyCount = adapter.nowcast.history.length
    const currentIndex = historyCount

    const finiteIndices: number[] = []
    nowcast.values.forEach((value, index) => {
      if (Number.isFinite(value)) {
        finiteIndices.push(index)
      }
    })
    // Exactly two finite positions: the last observed actual anchor and
    // the current nowcast quarter.
    assert.equal(finiteIndices.length, 2)

    const lastActualIndex = finiteIndices[0]
    assert.equal(finiteIndices[1], currentIndex)
    assert.ok(lastActualIndex < currentIndex)

    // Anchor matches the actual GDP YoY of the last observed history quarter.
    assert.equal(
      nowcast.values[lastActualIndex],
      adapter.nowcast.history[lastActualIndex].gdp_growth_yoy_pct,
    )
    // Current point matches the current quarter nowcast.
    assert.equal(
      nowcast.values[currentIndex],
      adapter.nowcast.current.gdp_growth_yoy_pct,
    )
  })

  it('history series carries only history values; current/forecast positions are NaN', () => {
    const adapter = toDfmAdapterOutput(buildValidDfmPayload())
    const chart = composeDfmNowcastChart(adapter)

    const history = chart.series.find((series) => series.series_id === 'gdp_history_yoy')
    assert.ok(history, 'expected gdp_history_yoy series')

    const historyCount = adapter.nowcast.history.length
    for (let index = historyCount; index < history.values.length; index += 1) {
      assert.equal(Number.isNaN(history.values[index]), true)
    }
  })

  it('emits three uncertainty bands with confidence levels converted to integer percents', () => {
    const adapter = toDfmAdapterOutput(buildValidDfmPayload())
    const chart = composeDfmNowcastChart(adapter)

    assert.equal(chart.uncertainty.length, 3)
    const levels = chart.uncertainty.map((band) => band.confidence_level)
    assert.deepEqual(levels, [50, 70, 90])
    for (const band of chart.uncertainty) {
      assert.equal(band.is_illustrative, false)
      assert.equal(band.series_id, 'gdp_nowcast_yoy')
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

  it('anchors uncertainty bands at the last observed actual position; earlier history is NaN', () => {
    const adapter = toDfmAdapterOutput(buildValidDfmPayload())
    const chart = composeDfmNowcastChart(adapter)

    // Locate the last observed actual position in history.
    let lastActualIndex = -1
    for (let index = adapter.nowcast.history.length - 1; index >= 0; index -= 1) {
      const value = adapter.nowcast.history[index].gdp_growth_yoy_pct
      if (value !== null && Number.isFinite(value)) {
        lastActualIndex = index
        break
      }
    }
    assert.ok(lastActualIndex >= 0, 'fixture must contain at least one finite history value')
    const anchorValue = adapter.nowcast.history[lastActualIndex].gdp_growth_yoy_pct

    const currentIndex = adapter.nowcast.history.length
    for (const band of chart.uncertainty) {
      // Earlier history positions remain NaN.
      for (let index = 0; index < lastActualIndex; index += 1) {
        assert.equal(Number.isNaN(band.lower[index]), true)
        assert.equal(Number.isNaN(band.upper[index]), true)
      }
      // Anchor: lower = upper = last observed actual GDP YoY.
      assert.equal(band.lower[lastActualIndex], anchorValue)
      assert.equal(band.upper[lastActualIndex], anchorValue)
      // Current quarter: finite band, upper >= lower.
      assert.equal(Number.isFinite(band.lower[currentIndex]), true)
      assert.equal(Number.isFinite(band.upper[currentIndex]), true)
      assert.ok(band.upper[currentIndex] >= band.lower[currentIndex])
    }
  })

  it('emits gdp_forecast_yoy and extends bands through forecast periods when forecast_horizon is non-empty', () => {
    const adapter = toDfmAdapterOutput(payloadWithForecast())
    const chart = composeDfmNowcastChart(adapter)

    const ids = chart.series.map((series) => series.series_id)
    assert.deepEqual(ids, ['gdp_history_yoy', 'gdp_nowcast_yoy', 'gdp_forecast_yoy'])

    const forecast = chart.series.find((series) => series.series_id === 'gdp_forecast_yoy')
    assert.ok(forecast, 'expected gdp_forecast_yoy series')

    const historyCount = adapter.nowcast.history.length
    const currentIndex = historyCount
    const forecastIndex = currentIndex + 1

    // Forecast series anchors at current nowcast and extends through the forecast horizon.
    assert.equal(forecast.values[currentIndex], adapter.nowcast.current.gdp_growth_yoy_pct)
    assert.equal(forecast.values[forecastIndex], adapter.nowcast.forecast[0].gdp_growth_yoy_pct)

    // Bands extend through the forecast horizon with finite values.
    for (const band of chart.uncertainty) {
      assert.equal(Number.isFinite(band.lower[forecastIndex]), true)
      assert.equal(Number.isFinite(band.upper[forecastIndex]), true)
    }
  })

  it('populates model_attribution from the adapter output', () => {
    const adapter = toDfmAdapterOutput(buildValidDfmPayload())
    const chart = composeDfmNowcastChart(adapter)

    assert.equal(chart.model_attribution.length, 1)
    assert.equal(chart.model_attribution[0].model_id, adapter.attribution.model_id)
  })
})
