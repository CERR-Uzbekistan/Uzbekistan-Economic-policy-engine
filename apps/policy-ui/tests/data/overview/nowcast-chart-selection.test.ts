import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ChartSpec, HeadlineMetric, ModelAttribution } from '../../../src/contracts/data-contract.js'
import {
  buildArtifactAlignedNowcastChart,
  formatOverviewQuarterDisplay,
  parseOverviewQuarterLabel,
  shouldUseDfmNowcastChart,
} from '../../../src/data/overview/nowcast-chart-selection.js'

const attribution: ModelAttribution = {
  model_id: 'overview-artifact',
  model_name: 'Overview artifact',
  module: 'overview_artifact',
  version: '1',
  run_id: 'overview-artifact',
  data_version: '2026 Q2 nowcast',
  timestamp: '2026-04-29T11:18:20Z',
}

function metric(overrides: Partial<HeadlineMetric>): HeadlineMetric {
  return {
    metric_id: 'metric',
    label: 'Metric',
    value: 0,
    unit: '%',
    period: '2026 Q1',
    baseline_value: null,
    delta_abs: null,
    delta_pct: null,
    direction: 'flat',
    confidence: 'high',
    last_updated: '2026-04-29T11:18:20Z',
    model_attribution: [attribution],
    ...overrides,
  }
}

function artifactMetrics(): HeadlineMetric[] {
  return [
    metric({
      metric_id: 'real_gdp_growth_quarter_yoy',
      label: 'Real GDP growth, latest quarter',
      value: 8.7,
      period: '2026 Q1',
      source_period: '2026 Q1',
    }),
    metric({
      metric_id: 'gdp_nowcast_current_quarter',
      label: 'GDP nowcast, current quarter',
      value: 6,
      period: '2026 Q2 nowcast',
      source_period: '2026 Q2 nowcast',
    }),
  ]
}

function dfmChart(currentPeriod: string): ChartSpec {
  return {
    chart_id: 'nowcast_forecast',
    title: 'Nowcast and forecast',
    subtitle: 'Real GDP growth',
    chart_type: 'line',
    x: { label: 'Quarter', unit: '', values: ['2025Q4', currentPeriod] },
    y: { label: 'GDP growth', unit: '%', values: [8.7, 7.0] },
    series: [
      {
        series_id: 'gdp_history_yoy',
        label: 'GDP growth - history (YoY, %)',
        semantic_role: 'baseline',
        values: [8.7, Number.NaN],
      },
      {
        series_id: 'gdp_nowcast_yoy',
        label: 'GDP growth - current nowcast (YoY, %)',
        semantic_role: 'alternative',
        values: [8.7, 7.0],
      },
    ],
    view_mode: 'level',
    uncertainty: [],
    takeaway: 'Current-quarter nowcast.',
    model_attribution: [attribution],
  }
}

describe('nowcast chart selection', () => {
  it('parses compact, spaced, and suffix-bearing quarter labels', () => {
    assert.deepEqual(parseOverviewQuarterLabel('2026Q1'), { year: 2026, quarter: 1 })
    assert.deepEqual(parseOverviewQuarterLabel('2026 Q1'), { year: 2026, quarter: 1 })
    assert.deepEqual(parseOverviewQuarterLabel('2026 Q2 nowcast'), { year: 2026, quarter: 2 })
    assert.deepEqual(parseOverviewQuarterLabel('Q1 2026'), { year: 2026, quarter: 1 })
    assert.deepEqual(parseOverviewQuarterLabel('Q3 2026'), { year: 2026, quarter: 3 })
    assert.equal(parseOverviewQuarterLabel('March 2026'), null)
  })

  it('keeps localized quarter labels display-only while EN artifact labels remain parseable', () => {
    assert.deepEqual(parseOverviewQuarterLabel('Q1 2026'), { year: 2026, quarter: 1 })
    assert.equal(formatOverviewQuarterDisplay('Q1 2026', 'ru'), '1 кв. 2026')
    assert.equal(formatOverviewQuarterDisplay('Q1 2026', 'uz'), '2026 1-chorak')
    assert.deepEqual(parseOverviewQuarterLabel('Q1 2026'), { year: 2026, quarter: 1 })
  })

  it('builds an artifact-aligned chart from accepted actual GDP and current nowcast metrics', () => {
    const chart = buildArtifactAlignedNowcastChart(artifactMetrics())
    assert.ok(chart, 'expected artifact nowcast chart')

    assert.deepEqual(chart.x.values, ['2026 Q1', '2026 Q2 nowcast'])
    assert.deepEqual(chart.y.values, [8.7, 6])
    assert.equal(chart.uncertainty.length, 0)

    const history = chart.series.find((series) => series.series_id === 'gdp_history_yoy')
    const nowcast = chart.series.find((series) => series.series_id === 'gdp_nowcast_yoy')
    assert.ok(history, 'expected actual-history series')
    assert.ok(nowcast, 'expected nowcast series')
    assert.equal(history.values[0], 8.7)
    assert.equal(Number.isNaN(history.values[1]), true)
    assert.equal(nowcast.values[0], 8.7)
    assert.equal(nowcast.values[1], 6)
    assert.match(chart.takeaway, /2026 Q2 nowcast/)
    assert.match(chart.takeaway, /2026 Q1/)
  })

  it('rejects a live DFM chart whose current quarter is not ahead of the accepted actual', () => {
    assert.equal(shouldUseDfmNowcastChart(dfmChart('2026Q1'), artifactMetrics()), false)
  })

  it('rejects a live DFM chart whose current quarter is older than the artifact nowcast quarter', () => {
    const metrics = artifactMetrics().map((item) =>
      item.metric_id === 'real_gdp_growth_quarter_yoy'
        ? { ...item, period: '2025 Q4', source_period: '2025 Q4' }
        : item,
    )
    assert.equal(shouldUseDfmNowcastChart(dfmChart('2026Q1'), metrics), false)
  })

  it('allows a live DFM chart once it reaches the artifact nowcast quarter', () => {
    assert.equal(shouldUseDfmNowcastChart(dfmChart('2026Q2'), artifactMetrics()), true)
  })
})
