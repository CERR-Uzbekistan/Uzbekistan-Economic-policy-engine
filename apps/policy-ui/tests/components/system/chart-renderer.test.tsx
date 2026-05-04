import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ChartRenderer } from '../../../src/components/system/ChartRenderer.js'
import { toBandMeta } from '../../../src/components/system/chart-meta-utils.js'
import type { ChartSpec } from '../../../src/contracts/data-contract.js'

const modelAttribution = {
  model_id: 'dfm',
  model_name: 'Dynamic Factor Model',
  module: 'nowcast',
  version: '2.4.1',
  run_id: 'run-1',
  data_version: '2026Q1',
  timestamp: '2026-04-17T07:30:00+05:00',
}

const chartSpecWithIllustrativeBand: ChartSpec = {
  chart_id: 'test-chart',
  title: 'Test chart',
  subtitle: 'Test subtitle',
  chart_type: 'line',
  x: {
    label: 'Period',
    unit: '',
    values: ['2026 Q1', '2026 Q2'],
  },
  y: {
    label: 'Growth',
    unit: '%',
    values: [5.4, 5.8],
  },
  series: [
    {
      series_id: 'baseline-path',
      label: 'Baseline',
      semantic_role: 'baseline',
      values: [5.4, 5.8],
    },
  ],
  view_mode: 'level',
  uncertainty: [
    {
      series_id: 'baseline-path',
      lower: [5.1, 5.4],
      upper: [5.7, 6.1],
      confidence_level: 70,
      methodology_label: 'illustrative cone',
      is_illustrative: true,
    },
  ],
  takeaway: 'Growth edges higher through mid-year.',
  model_attribution: [modelAttribution],
}

describe('ChartRenderer', () => {
  it('renders chart frame and accessibility chrome', () => {
    const markup = renderToStaticMarkup(
      <ChartRenderer spec={chartSpecWithIllustrativeBand} ariaLabel="GDP nowcast chart" />,
    )

    assert.match(markup, /<article class="chart-renderer"/)
    assert.match(markup, /role="img"/)
    assert.match(markup, /aria-label="GDP nowcast chart"/)
    assert.match(markup, /Illustrative uncertainty band \(hatched\)\./)
    assert.match(markup, /<strong>Takeaway\.<\/strong>/)
    assert.match(markup, />DFM</)
  })

  it('emits distinct lower/upper data keys for each band when one series has multiple confidence levels', () => {
    // Regression: three-band DFM output shares a series_id but differs by
    // confidence_level. Keys must differentiate by confidence_level, otherwise
    // buildChartData overwrites earlier bands with the last band's values and
    // all three Areas render as a single envelope.
    const threeBand: ChartSpec = {
      ...chartSpecWithIllustrativeBand,
      chart_id: 'test-three-band',
      uncertainty: [50, 70, 90].map((level) => ({
        series_id: 'baseline-path',
        lower: [5.1, 5.4],
        upper: [5.7, 6.1],
        confidence_level: level,
        methodology_label: 'fan',
        is_illustrative: false,
      })),
    }

    const meta = toBandMeta(threeBand)
    const lowerKeys = new Set(meta.map((m) => m.lowerKey))
    const upperKeys = new Set(meta.map((m) => m.upperKey))
    assert.equal(lowerKeys.size, 3)
    assert.equal(upperKeys.size, 3)
    assert.equal(meta.length, 3)
  })

  it('renders empty state when series data is unavailable', () => {
    const emptySpec: ChartSpec = {
      ...chartSpecWithIllustrativeBand,
      chart_id: 'test-chart-empty',
      series: [
        {
          series_id: 'baseline-path',
          label: 'Baseline',
          semantic_role: 'baseline',
          values: [],
        },
      ],
      uncertainty: [],
    }

    const markup = renderToStaticMarkup(<ChartRenderer spec={emptySpec} />)
    assert.match(markup, /No data available for this chart\./)
  })
})
