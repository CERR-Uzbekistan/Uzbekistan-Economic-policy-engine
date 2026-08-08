import type { ChartSeries, ChartSpec, UncertaintyBand } from '../../contracts/data-contract.js'
import type { DfmAdapterOutput, DfmNowcastQuarterView, DfmQuarterView } from '../bridge/dfm-adapter.js'

/**
 * Reshapes DFM bridge adapter output into Overview's nowcast_forecast
 * ChartSpec. Pure transform — caller handles bridge failure.
 *
 * The DFM payload carries one current nowcast quarter, an optional
 * forecast horizon, and per-quarter point uncertainty bands. To make
 * the chart read as a proper fan-chart surface (history → nowcast →
 * forecast with a visible uncertainty cone), the composition emits
 * three segmented series with shared x-axis indexing:
 *
 *   - gdp_history_yoy   actual history only (NaN for current/forecast)
 *   - gdp_nowcast_yoy   last observed actual anchor + current point
 *   - gdp_forecast_yoy  current anchor + forecast horizon (only when
 *                       forecast_horizon is non-empty)
 *
 * Uncertainty bands are anchored at the last observed actual point with
 * lower = upper = last observed actual GDP YoY so the fan has at least
 * two finite x-positions to draw from when the bridge ships only one
 * nowcast quarter. Earlier history positions remain NaN; ChartRenderer
 * filters non-finite band values when drawing.
 */

export const HISTORY_SERIES_ID = 'gdp_history_yoy'
export const NOWCAST_SERIES_ID = 'gdp_nowcast_yoy'
export const FORECAST_SERIES_ID = 'gdp_forecast_yoy'

type TimelineEntry = {
  view: DfmQuarterView
  uncertainty: DfmNowcastQuarterView['uncertainty'] | null
  kind: 'history' | 'current' | 'forecast'
}

function toFiniteOrNaN(value: number | null): number {
  if (value === null || !Number.isFinite(value)) {
    return Number.NaN
  }
  return value
}

function toTimeline(input: DfmAdapterOutput): TimelineEntry[] {
  const history: TimelineEntry[] = input.nowcast.history.map((view) => ({
    view,
    uncertainty: null,
    kind: 'history',
  }))
  const current: TimelineEntry = {
    view: input.nowcast.current,
    uncertainty: input.nowcast.current.uncertainty,
    kind: 'current',
  }
  const forecast: TimelineEntry[] = input.nowcast.forecast.map((view) => ({
    view,
    uncertainty: view.uncertainty,
    kind: 'forecast',
  }))
  return [...history, current, ...forecast]
}

function findLastObservedActualIndex(timeline: TimelineEntry[]): number {
  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    const entry = timeline[index]
    if (entry.kind !== 'history') {
      continue
    }
    const value = entry.view.gdp_growth_yoy_pct
    if (value !== null && Number.isFinite(value)) {
      return index
    }
  }
  return -1
}

function buildHistoryValues(timeline: TimelineEntry[]): number[] {
  return timeline.map((entry) =>
    entry.kind === 'history' ? toFiniteOrNaN(entry.view.gdp_growth_yoy_pct) : Number.NaN,
  )
}

function buildNowcastValues(
  timeline: TimelineEntry[],
  lastActualIndex: number,
  currentIndex: number,
  currentValue: number,
): number[] {
  const values = new Array<number>(timeline.length).fill(Number.NaN)
  if (lastActualIndex >= 0) {
    const anchor = timeline[lastActualIndex].view.gdp_growth_yoy_pct
    values[lastActualIndex] = toFiniteOrNaN(anchor)
  }
  values[currentIndex] = currentValue
  return values
}

function buildForecastValues(
  timeline: TimelineEntry[],
  currentIndex: number,
  currentValue: number,
): number[] {
  const values = new Array<number>(timeline.length).fill(Number.NaN)
  values[currentIndex] = currentValue
  for (let index = currentIndex + 1; index < timeline.length; index += 1) {
    const entry = timeline[index]
    if (entry.kind === 'forecast') {
      values[index] = toFiniteOrNaN(entry.view.gdp_growth_yoy_pct)
    }
  }
  return values
}

function toUncertaintyBands(
  timeline: TimelineEntry[],
  lastActualIndex: number,
  currentIndex: number,
): UncertaintyBand[] {
  const reference = timeline.find((entry) => entry.uncertainty !== null)?.uncertainty
  if (!reference) {
    return []
  }

  // Anchor each band at the last observed actual position with
  // lower = upper = last observed actual GDP YoY. Without this anchor
  // the fan has only one finite x-position (the current nowcast) and
  // Recharts cannot draw an Area between a single point.
  const anchorValue =
    lastActualIndex >= 0
      ? toFiniteOrNaN(timeline[lastActualIndex].view.gdp_growth_yoy_pct)
      : Number.NaN

  return reference.bands.map((referenceBand) => {
    const lower = new Array<number>(timeline.length).fill(Number.NaN)
    const upper = new Array<number>(timeline.length).fill(Number.NaN)

    if (lastActualIndex >= 0 && Number.isFinite(anchorValue)) {
      lower[lastActualIndex] = anchorValue
      upper[lastActualIndex] = anchorValue
    }

    for (let index = currentIndex; index < timeline.length; index += 1) {
      const bandSet = timeline[index].uncertainty
      if (!bandSet) {
        continue
      }
      const match = bandSet.bands.find(
        (band) => band.confidence_level === referenceBand.confidence_level,
      )
      if (match) {
        lower[index] = match.lower_pct
        upper[index] = match.upper_pct
      }
    }

    return {
      series_id: NOWCAST_SERIES_ID,
      lower,
      upper,
      // ChartSpec.UncertaintyBand.confidence_level is a percentage (0-100);
      // DFM bridge payloads carry the probability (0-1). Convert here.
      confidence_level: Math.round(referenceBand.confidence_level * 100),
      methodology_label: reference.methodology_label,
      is_illustrative: reference.is_illustrative,
    }
  })
}

export function composeDfmNowcastChart(input: DfmAdapterOutput): ChartSpec {
  const timeline = toTimeline(input)
  const xValues = timeline.map((entry) => entry.view.period)
  const currentIndex = input.nowcast.history.length
  const lastActualIndex = findLastObservedActualIndex(timeline)
  const currentValue = toFiniteOrNaN(input.nowcast.current.gdp_growth_yoy_pct)

  const historyValues = buildHistoryValues(timeline)
  const nowcastValues = buildNowcastValues(timeline, lastActualIndex, currentIndex, currentValue)
  const hasForecast = input.nowcast.forecast.length > 0
  const forecastValues = hasForecast
    ? buildForecastValues(timeline, currentIndex, currentValue)
    : null

  const series: ChartSeries[] = [
    {
      series_id: HISTORY_SERIES_ID,
      label: 'GDP growth — history (YoY, %)',
      semantic_role: 'baseline',
      values: historyValues,
    },
    {
      series_id: NOWCAST_SERIES_ID,
      label: 'GDP growth — current nowcast (YoY, %)',
      semantic_role: 'alternative',
      values: nowcastValues,
    },
  ]
  if (forecastValues) {
    series.push({
      series_id: FORECAST_SERIES_ID,
      label: 'GDP growth — forecast path (YoY, %)',
      semantic_role: 'other',
      values: forecastValues,
    })
  }

  // Y-axis values cover the full timeline so the axis domain spans
  // history through forecast. Use the history+nowcast+forecast composite
  // (history positions filled from history, current/forecast filled from
  // their respective series).
  const compositeValues = timeline.map((entry, index) => {
    if (entry.kind === 'history') {
      return historyValues[index]
    }
    if (entry.kind === 'current') {
      return currentValue
    }
    return forecastValues ? forecastValues[index] : Number.NaN
  })

  return {
    chart_id: 'nowcast_forecast',
    title: 'Nowcast and forecast',
    subtitle: 'Real GDP growth (YoY, %) — history, current quarter, forecast horizon',
    chart_type: 'line',
    x: {
      label: 'Quarter',
      unit: '',
      values: xValues,
    },
    y: {
      label: 'GDP growth (YoY)',
      unit: '%',
      values: compositeValues,
    },
    series,
    view_mode: 'level',
    uncertainty: toUncertaintyBands(timeline, lastActualIndex, currentIndex),
    takeaway: `Current-quarter nowcast: ${formatPct(input.nowcast.current.gdp_growth_yoy_pct)} YoY (${input.nowcast.current.period}).`,
    model_attribution: [{ ...input.attribution }],
  }
}

function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return 'n/a'
  }
  return `${value.toFixed(1)}%`
}
