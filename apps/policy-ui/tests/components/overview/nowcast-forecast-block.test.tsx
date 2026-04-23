import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { NowcastForecastBlock } from '../../../src/components/overview/NowcastForecastBlock.js'
import type { ChartSpec } from '../../../src/contracts/data-contract.js'

const attribution = {
  model_id: 'DFM',
  model_name: 'Dynamic Factor Model',
  module: 'nowcast',
  version: '0.1.0',
  run_id: 'r1',
  data_version: 'v1',
  timestamp: '2026-04-22T00:00:00Z',
}

const singleSeriesWithBands: ChartSpec = {
  chart_id: 'nowcast_forecast',
  title: 'Nowcast and forecast',
  subtitle: 'Real GDP growth',
  chart_type: 'line',
  x: { label: 'Quarter', unit: '', values: ['2025Q4', '2026Q1'] },
  y: { label: 'GDP growth', unit: '%', values: [8.7, 7.0] },
  series: [
    {
      series_id: 'gdp_growth_yoy',
      label: 'GDP growth (YoY, %)',
      semantic_role: 'baseline',
      values: [8.7, 7.0],
    },
  ],
  view_mode: 'level',
  uncertainty: [
    {
      series_id: 'gdp_growth_yoy',
      lower: [Number.NaN, 6.7],
      upper: [Number.NaN, 7.3],
      confidence_level: 50,
      methodology_label: 'Out-of-sample RMSE fan chart, sigma = 0.45 pp * sqrt(h), h=1',
      is_illustrative: false,
    },
  ],
  takeaway: 'Current nowcast 7.0% YoY.',
  model_attribution: [attribution],
}

const twoSeriesMock: ChartSpec = {
  chart_id: 'nowcast_forecast',
  title: 'Nowcast update',
  subtitle: 'Latest vs prior',
  chart_type: 'line',
  x: { label: 'Period', unit: '', values: ['2025Q3', '2025Q4'] },
  y: { label: 'Value', unit: '%', values: [7.0, 8.7] },
  series: [
    { series_id: 'latest_estimate', label: 'Latest estimate', semantic_role: 'baseline', values: [7.0, 8.7] },
    { series_id: 'prior_estimate', label: 'Prior estimate', semantic_role: 'alternative', values: [6.9, 8.4] },
  ],
  view_mode: 'level',
  uncertainty: [],
  takeaway: 'mock',
  model_attribution: [attribution],
}

describe('NowcastForecastBlock (shape-agnostic)', () => {
  it('renders a single-series ChartSpec with uncertainty bands', () => {
    const html = renderToStaticMarkup(createElement(NowcastForecastBlock, { chart: singleSeriesWithBands }))
    assert.equal(html.includes('GDP growth (YoY, %)'), true)
    assert.equal(html.includes('7.0%'), true)
    assert.equal(html.includes('2026Q1'), true)
  })

  it('renders a two-series ChartSpec without uncertainty bands', () => {
    const html = renderToStaticMarkup(createElement(NowcastForecastBlock, { chart: twoSeriesMock }))
    assert.equal(html.includes('Latest estimate'), true)
    assert.equal(html.includes('Prior estimate'), true)
    assert.equal(html.includes('8.7%'), true)
  })

  it('renders the optional statusSlot when provided', () => {
    const status = createElement('p', { className: 'refreshing' }, 'Refreshing nowcast…')
    const html = renderToStaticMarkup(
      createElement(NowcastForecastBlock, { chart: singleSeriesWithBands, statusSlot: status }),
    )
    assert.equal(html.includes('Refreshing nowcast…'), true)
  })

  it('sr-only table iterates series generically', () => {
    const html = renderToStaticMarkup(createElement(NowcastForecastBlock, { chart: twoSeriesMock }))
    // Both series should appear as column headers in the sr-only table.
    assert.equal(html.match(/<th scope="col">/g)?.length, 3)
  })
})
