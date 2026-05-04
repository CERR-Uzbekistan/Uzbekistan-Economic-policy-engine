import type { ChartSpec, HeadlineMetric, ModelAttribution } from '../../contracts/data-contract.js'
import {
  formatQuarterLabel,
  formatValueWithUnit,
  parseQuarterRef,
} from '../../lib/format/locale-format.js'
import { HISTORY_SERIES_ID, NOWCAST_SERIES_ID } from './dfm-composition.js'

const ACTUAL_GDP_METRIC_ID = 'real_gdp_growth_quarter_yoy'
const CURRENT_NOWCAST_METRIC_ID = 'gdp_nowcast_current_quarter'

type QuarterRef = {
  year: number
  quarter: number
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function findMetric(metrics: HeadlineMetric[], metricId: string): HeadlineMetric | null {
  return metrics.find((metric) => metric.metric_id === metricId) ?? null
}

export function parseOverviewQuarterLabel(value: string | number | null | undefined): QuarterRef | null {
  return parseQuarterRef(value)
}

export function formatOverviewQuarterDisplay(
  value: string | number | null | undefined,
  locale: string | undefined,
): string {
  return formatQuarterLabel(value, locale)
}

function compareQuarter(left: QuarterRef, right: QuarterRef): number {
  return (left.year - right.year) * 4 + (left.quarter - right.quarter)
}

function latestFiniteSeriesQuarter(chart: ChartSpec, preferredSeriesId: string): QuarterRef | null {
  const series = chart.series.find((item) => item.series_id === preferredSeriesId) ?? chart.series[0]
  if (!series) {
    return null
  }

  for (let index = series.values.length - 1; index >= 0; index -= 1) {
    if (isFiniteNumber(series.values[index])) {
      return parseOverviewQuarterLabel(chart.x.values[index])
    }
  }

  return null
}

export function shouldUseDfmNowcastChart(chart: ChartSpec, metrics: HeadlineMetric[]): boolean {
  const dfmCurrentQuarter = latestFiniteSeriesQuarter(chart, NOWCAST_SERIES_ID)
  if (!dfmCurrentQuarter) {
    return false
  }

  const actualQuarter = parseOverviewQuarterLabel(findMetric(metrics, ACTUAL_GDP_METRIC_ID)?.period)
  if (actualQuarter && compareQuarter(dfmCurrentQuarter, actualQuarter) <= 0) {
    return false
  }

  const artifactNowcastQuarter = parseOverviewQuarterLabel(
    findMetric(metrics, CURRENT_NOWCAST_METRIC_ID)?.period,
  )
  if (artifactNowcastQuarter && compareQuarter(dfmCurrentQuarter, artifactNowcastQuarter) < 0) {
    return false
  }

  return true
}

function mergedAttribution(nowcast: HeadlineMetric, actual: HeadlineMetric): ModelAttribution[] {
  const seen = new Set<string>()
  const items: ModelAttribution[] = []
  for (const attribution of [...nowcast.model_attribution, ...actual.model_attribution]) {
    const key = `${attribution.model_id}|${attribution.data_version}|${attribution.timestamp}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    items.push(attribution)
  }
  return items
}

export function buildArtifactAlignedNowcastChart(metrics: HeadlineMetric[]): ChartSpec | null {
  const actual = findMetric(metrics, ACTUAL_GDP_METRIC_ID)
  const nowcast = findMetric(metrics, CURRENT_NOWCAST_METRIC_ID)
  if (!actual || !nowcast || !isFiniteNumber(actual.value) || !isFiniteNumber(nowcast.value)) {
    return null
  }

  const actualPeriod = actual.period || actual.source_period || ''
  const nowcastPeriod = nowcast.period || nowcast.source_period || ''
  if (!parseOverviewQuarterLabel(actualPeriod) || !parseOverviewQuarterLabel(nowcastPeriod)) {
    return null
  }

  const unit = nowcast.unit || actual.unit || '%'

  return {
    chart_id: 'artifact_nowcast_forecast',
    title: 'Nowcast and forecast',
    subtitle: 'Real GDP growth (YoY, %) - accepted actual and current Overview nowcast',
    chart_type: 'line',
    x: {
      label: 'Quarter',
      unit: '',
      values: [actualPeriod, nowcastPeriod],
    },
    y: {
      label: 'GDP growth (YoY)',
      unit,
      values: [actual.value, nowcast.value],
    },
    series: [
      {
        series_id: HISTORY_SERIES_ID,
        label: 'GDP growth - actual (YoY, %)',
        semantic_role: 'baseline',
        values: [actual.value, Number.NaN],
      },
      {
        series_id: NOWCAST_SERIES_ID,
        label: 'GDP growth - current nowcast (YoY, %)',
        semantic_role: 'alternative',
        values: [actual.value, nowcast.value],
      },
    ],
    view_mode: 'level',
    uncertainty: [],
    takeaway: `Overview artifact nowcast: ${formatValueWithUnit(nowcast.value, unit, 'en', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} YoY (${nowcastPeriod}), after actual ${formatValueWithUnit(actual.value, unit, 'en', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} YoY (${actualPeriod}).`,
    model_attribution: mergedAttribution(nowcast, actual),
  }
}
