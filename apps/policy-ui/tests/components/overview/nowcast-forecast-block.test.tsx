import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { NowcastForecastBlock } from '../../../src/components/overview/NowcastForecastBlock.js'
import type { ChartSpec } from '../../../src/contracts/data-contract.js'
import type { i18n as I18nInstance } from 'i18next'

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

async function createTestI18n() {
  const instance = i18next.createInstance()
  await instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
    resources: {
      en: {
        common: {
          overview: {
            nowcast: {
              kicker: 'Nowcast',
              legendAria: 'Nowcast chart legend',
              modelNotOfficial: 'Model nowcast · not an official forecast',
              markers: {
                aria: 'Nowcast chart markers',
                lastActual: 'Last actual',
                current: 'Current nowcast',
              },
              legend: {
                actual: 'Actual history',
                nowcast: 'Current nowcast',
                forecast: 'Forecast path',
                band: 'Uncertainty band',
              },
            },
          },
        },
      },
    },
  })
  return instance
}

function renderBlock(chart: ChartSpec, props: Record<string, unknown> = {}, i18n?: I18nInstance) {
  const block = createElement(NowcastForecastBlock, { chart, ...props })
  return renderToStaticMarkup(
    i18n ? createElement(I18nextProvider, { i18n }, block) : block,
  )
}

function buildLongSegmentedChart(withForecast = true): ChartSpec {
  const periods = [
    '2017Q1', '2017Q2', '2017Q3', '2017Q4',
    '2018Q1', '2018Q2', '2018Q3', '2018Q4',
    '2019Q1', '2019Q2', '2019Q3', '2019Q4',
    '2020Q1', '2020Q2', '2020Q3', '2020Q4',
    '2021Q1', '2021Q2', '2021Q3', '2021Q4',
    '2022Q1', '2022Q2', '2022Q3', '2022Q4',
    '2023Q1', '2023Q2', '2023Q3', '2023Q4',
    '2024Q1', '2024Q2', '2024Q3', '2024Q4',
    '2025Q1', '2025Q2', '2025Q3', '2025Q4',
    '2026Q1',
    ...(withForecast ? ['2026Q2', '2026Q3'] : []),
  ]
  const currentIndex = periods.indexOf('2026Q1')
  const forecastStart = currentIndex + 1
  const historyValues = periods.map((_, index) => (index < currentIndex ? 4 + index * 0.1 : Number.NaN))
  const lastActual = historyValues[currentIndex - 1]
  const nowcastValues = periods.map((_, index) => {
    if (index === currentIndex - 1) {
      return lastActual
    }
    if (index === currentIndex) {
      return 7.0
    }
    return Number.NaN
  })
  const forecastValues = periods.map((_, index) => {
    if (index === currentIndex) {
      return 7.0
    }
    if (withForecast && index >= forecastStart) {
      return 6.8 - (index - forecastStart) * 0.2
    }
    return Number.NaN
  })
  const lower = periods.map((_, index) => {
    if (index === currentIndex - 1) {
      return lastActual
    }
    if (index >= currentIndex) {
      return 6.3 - Math.max(0, index - currentIndex) * 0.2
    }
    return Number.NaN
  })
  const upper = periods.map((_, index) => {
    if (index === currentIndex - 1) {
      return lastActual
    }
    if (index >= currentIndex) {
      return 7.7 + Math.max(0, index - currentIndex) * 0.2
    }
    return Number.NaN
  })

  return {
    chart_id: 'nowcast_forecast',
    title: 'Nowcast and forecast',
    subtitle: 'Real GDP growth',
    chart_type: 'line',
    x: { label: 'Quarter', unit: '', values: periods },
    y: { label: 'GDP growth', unit: '%', values: periods.map((_, index) => historyValues[index] ?? Number.NaN) },
    series: [
      {
        series_id: 'gdp_history_yoy',
        label: 'GDP growth — history (YoY, %)',
        semantic_role: 'baseline',
        values: historyValues,
      },
      {
        series_id: 'gdp_nowcast_yoy',
        label: 'GDP growth — current nowcast (YoY, %)',
        semantic_role: 'alternative',
        values: nowcastValues,
      },
      ...(withForecast
        ? [{
            series_id: 'gdp_forecast_yoy',
            label: 'GDP growth — forecast path (YoY, %)',
            semantic_role: 'other' as const,
            values: forecastValues,
          }]
        : []),
    ],
    view_mode: 'level',
    uncertainty: [
      {
        series_id: 'gdp_nowcast_yoy',
        lower,
        upper,
        confidence_level: 70,
        methodology_label: 'fan',
        is_illustrative: false,
      },
    ],
    takeaway: 'Current-quarter nowcast: 7.0% YoY (2026Q1).',
    model_attribution: [attribution],
  }
}

function buildShortSegmentedChart(): ChartSpec {
  return {
    chart_id: 'nowcast_forecast',
    title: 'Nowcast and forecast',
    subtitle: 'Real GDP growth',
    chart_type: 'line',
    x: { label: 'Quarter', unit: '', values: ['2025Q4', '2026Q1'] },
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
    takeaway: 'Current-quarter nowcast: 7.0% YoY (2026Q1).',
    model_attribution: [attribution],
  }
}

describe('NowcastForecastBlock (shape-agnostic)', () => {
  it('renders a single-series ChartSpec with uncertainty bands', async () => {
    const i18n = await createTestI18n()
    const html = renderBlock(singleSeriesWithBands, {}, i18n)
    assert.equal(html.includes('GDP growth (YoY, %)'), true)
    assert.equal(html.includes('7.0%'), true)
    assert.equal(html.includes('2026Q1'), true)
  })

  it('renders a two-series ChartSpec without uncertainty bands', async () => {
    const i18n = await createTestI18n()
    const html = renderBlock(twoSeriesMock, {}, i18n)
    assert.equal(html.includes('Latest estimate'), true)
    assert.equal(html.includes('Prior estimate'), true)
    assert.equal(html.includes('8.7%'), true)
  })

  it('renders the optional statusSlot when provided', async () => {
    const i18n = await createTestI18n()
    const status = createElement('p', { className: 'refreshing' }, 'Refreshing nowcast…')
    const html = renderBlock(singleSeriesWithBands, { statusSlot: status }, i18n)
    assert.equal(html.includes('Refreshing nowcast…'), true)
  })

  it('sr-only table iterates series generically', async () => {
    const i18n = await createTestI18n()
    const html = renderBlock(twoSeriesMock, {}, i18n)
    // Both series should appear as column headers in the sr-only table.
    assert.equal(html.match(/<th scope="col">/g)?.length, 3)
  })

  it('includes explicit model-nowcast non-official wording and compact legend', async () => {
    const i18n = await createTestI18n()
    const html = renderBlock(singleSeriesWithBands, {}, i18n)

    assert.match(html, /Model nowcast · not an official forecast/)
    assert.match(html, /Actual history/)
    assert.match(html, /Current nowcast/)
    assert.match(html, /Forecast path/)
    assert.match(html, /Uncertainty band/)
    assert.match(html, /Dynamic Factor Model · v1/)
  })

  it('headline selects the current nowcast point when a segmented nowcast series is present', async () => {
    const i18n = await createTestI18n()
    const segmented: ChartSpec = {
      chart_id: 'nowcast_forecast',
      title: 'Nowcast and forecast',
      subtitle: 'Real GDP growth',
      chart_type: 'line',
      x: { label: 'Quarter', unit: '', values: ['2025Q3', '2025Q4', '2026Q1'] },
      y: { label: 'GDP growth', unit: '%', values: [9.1, 8.7, 7.0] },
      series: [
        {
          series_id: 'gdp_history_yoy',
          label: 'GDP growth — history (YoY, %)',
          semantic_role: 'baseline',
          values: [9.1, 8.7, Number.NaN],
        },
        {
          series_id: 'gdp_nowcast_yoy',
          label: 'GDP growth — current nowcast (YoY, %)',
          semantic_role: 'alternative',
          values: [Number.NaN, 8.7, 7.0],
        },
      ],
      view_mode: 'level',
      uncertainty: [],
      takeaway: 'mock',
      model_attribution: [attribution],
    }

    const html = renderBlock(segmented, {}, i18n)
    // Headline must be the current nowcast (7.0% at 2026Q1), not the
    // latest historical actual (8.7% at 2025Q4) and not the anchor.
    assert.match(html, /overview-panel-value">7\.0%/)
    assert.match(html, /2026Q1/)
    // The headline value cell itself must not display 8.7% (history).
    assert.equal(html.includes('overview-panel-value">8.7%'), false)
  })

  it('headline picks the current nowcast even when a forecast endpoint is later in the timeline', async () => {
    const i18n = await createTestI18n()
    const segmentedWithForecast: ChartSpec = {
      chart_id: 'nowcast_forecast',
      title: 'Nowcast and forecast',
      subtitle: 'Real GDP growth',
      chart_type: 'line',
      x: {
        label: 'Quarter',
        unit: '',
        values: ['2025Q3', '2025Q4', '2026Q1', '2026Q2'],
      },
      y: { label: 'GDP growth', unit: '%', values: [9.1, 8.7, 7.0, 6.5] },
      series: [
        {
          series_id: 'gdp_history_yoy',
          label: 'history',
          semantic_role: 'baseline',
          values: [9.1, 8.7, Number.NaN, Number.NaN],
        },
        {
          series_id: 'gdp_nowcast_yoy',
          label: 'nowcast',
          semantic_role: 'alternative',
          values: [Number.NaN, 8.7, 7.0, Number.NaN],
        },
        {
          series_id: 'gdp_forecast_yoy',
          label: 'forecast',
          semantic_role: 'other',
          values: [Number.NaN, Number.NaN, 7.0, 6.5],
        },
      ],
      view_mode: 'level',
      uncertainty: [],
      takeaway: 'mock',
      model_attribution: [attribution],
    }

    const html = renderBlock(segmentedWithForecast, {}, i18n)
    // The headline value cell should show 7.0%, not the forecast endpoint 6.5%.
    assert.match(html, /overview-panel-value">7\.0%/)
    assert.equal(html.includes('overview-panel-value">6.5%'), false)
  })

  it('omits the forecast legend item when segmented shape ships without a forecast series', async () => {
    const i18n = await createTestI18n()
    const segmentedNoForecast: ChartSpec = {
      chart_id: 'nowcast_forecast',
      title: 'Nowcast and forecast',
      subtitle: 'Real GDP growth',
      chart_type: 'line',
      x: { label: 'Quarter', unit: '', values: ['2025Q4', '2026Q1'] },
      y: { label: 'GDP growth', unit: '%', values: [8.7, 7.0] },
      series: [
        {
          series_id: 'gdp_history_yoy',
          label: 'history',
          semantic_role: 'baseline',
          values: [8.7, Number.NaN],
        },
        {
          series_id: 'gdp_nowcast_yoy',
          label: 'nowcast',
          semantic_role: 'alternative',
          values: [8.7, 7.0],
        },
      ],
      view_mode: 'level',
      uncertainty: [],
      takeaway: 'mock',
      model_attribution: [attribution],
    }

    const html = renderBlock(segmentedNoForecast, {}, i18n)
    // The legend must not visually imply a forecast path exists.
    assert.equal(html.includes('Forecast path'), false)
    assert.match(html, /Actual history/)
    assert.match(html, /Current nowcast/)
    assert.equal(html.includes('Uncertainty band'), false)
  })

  it('renders an artifact-aligned actual-to-nowcast chart without implying a fan band', async () => {
    const i18n = await createTestI18n()
    const artifactAligned: ChartSpec = {
      chart_id: 'artifact_nowcast_forecast',
      title: 'Nowcast and forecast',
      subtitle: 'Real GDP growth (YoY, %) — accepted actual and current Overview nowcast',
      chart_type: 'line',
      x: { label: 'Quarter', unit: '', values: ['2026 Q1', '2026 Q2 nowcast'] },
      y: { label: 'GDP growth', unit: '%', values: [8.7, 6.0] },
      series: [
        {
          series_id: 'gdp_history_yoy',
          label: 'GDP growth — actual (YoY, %)',
          semantic_role: 'baseline',
          values: [8.7, Number.NaN],
        },
        {
          series_id: 'gdp_nowcast_yoy',
          label: 'GDP growth — current nowcast (YoY, %)',
          semantic_role: 'alternative',
          values: [8.7, 6.0],
        },
      ],
      view_mode: 'level',
      uncertainty: [],
      takeaway: 'Overview artifact nowcast: 6.0% YoY (2026 Q2 nowcast), after actual 8.7% YoY (2026 Q1).',
      model_attribution: [attribution],
    }

    const html = renderBlock(artifactAligned, {}, i18n)

    assert.match(html, /overview-panel-value">6\.0%/)
    assert.match(html, /data-nowcast-marker="last-actual"/)
    assert.match(html, /2026 Q1/)
    assert.match(html, /data-nowcast-marker="current"/)
    assert.match(html, /2026 Q2 nowcast/)
    assert.match(html, /data-nowcast-has-current-segment="true"/)
    assert.match(html, /data-nowcast-has-fan="false"/)
    assert.equal(html.includes('Uncertainty band'), false)
  })

  it('projects the default Overview nowcast chart to a recent display window', async () => {
    const i18n = await createTestI18n()
    const chart = buildLongSegmentedChart()
    const html = renderBlock(chart, {}, i18n)

    assert.match(html, /data-nowcast-display-window="recent"/)
    assert.match(html, /data-nowcast-display-start="2023Q1"/)
    assert.match(html, /data-nowcast-display-end="2026Q3"/)
    assert.match(html, /data-nowcast-display-points="15"/)
    assert.match(html, /<th scope="row">Q1 2017<\/th>/)
  })

  it('keeps short nowcast charts in full-window mode', async () => {
    const i18n = await createTestI18n()
    const html = renderBlock(buildShortSegmentedChart(), {}, i18n)

    assert.match(html, /data-nowcast-display-window="full"/)
    assert.match(html, /data-nowcast-display-start="2025Q4"/)
    assert.match(html, /data-nowcast-display-end="2026Q1"/)
    assert.match(html, /data-nowcast-display-points="2"/)
    assert.match(html, /data-nowcast-has-current-segment="true"/)
  })

  it('keeps the current segment and fan after recent-window projection', async () => {
    const i18n = await createTestI18n()
    const html = renderBlock(buildLongSegmentedChart(), {}, i18n)

    assert.match(html, /data-nowcast-has-current-segment="true"/)
    assert.match(html, /data-nowcast-has-fan="true"/)
    assert.match(html, /data-nowcast-fan-inset="true"/)
  })

  it('renders current nowcast and last actual markers while the sr-only table keeps full history', async () => {
    const i18n = await createTestI18n()
    const chart = buildLongSegmentedChart()
    const html = renderBlock(chart, {}, i18n)

    assert.match(html, /data-nowcast-display-window="recent"/)
    assert.match(html, /data-nowcast-marker="last-actual"/)
    assert.match(html, /data-nowcast-marker="current"/)
    assert.match(html, /Current nowcast/)
    assert.match(html, /2026Q1/)
    assert.match(html, /aria-label="Nowcast and forecast\. Current-quarter nowcast: 7\.0% YoY \(2026Q1\)\. Current nowcast: Q1 2026, 7\.0%\./)
    assert.match(html, /<th scope="row">Q1 2017<\/th>/)
  })
})
