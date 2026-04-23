import type { ChartSpec, UncertaintyBand } from '../../contracts/data-contract.js'
import type { DfmAdapterOutput, DfmNowcastQuarterView, DfmQuarterView } from '../bridge/dfm-adapter.js'

/**
 * Reshapes DFM bridge adapter output into Overview's nowcast_forecast
 * ChartSpec. Pure transform — caller handles bridge failure.
 *
 * - Folds nowcast.history + current + forecast into a single GDP
 *   growth (YoY %) series aligned to the x-axis.
 * - Expands DFM's per-quarter three-band point uncertainty into three
 *   series-oriented UncertaintyBand entries with lower[]/upper[] arrays
 *   aligned to the x-axis. History positions carry NaN; ChartRenderer
 *   filters non-finite values when drawing the band.
 * - Preserves raw ASCII methodology_label on each band. Pretty-printing
 *   is a render-time concern (ChartRenderer.toBandMeta invokes
 *   prettyPrintMethodologyLabel).
 */

const SERIES_ID = 'gdp_growth_yoy'

type TimelineEntry = {
  view: DfmQuarterView
  uncertainty: DfmNowcastQuarterView['uncertainty'] | null
}

function toTimeline(input: DfmAdapterOutput): TimelineEntry[] {
  const history: TimelineEntry[] = input.nowcast.history.map((view) => ({
    view,
    uncertainty: null,
  }))
  const current: TimelineEntry = {
    view: input.nowcast.current,
    uncertainty: input.nowcast.current.uncertainty,
  }
  const forecast: TimelineEntry[] = input.nowcast.forecast.map((view) => ({
    view,
    uncertainty: view.uncertainty,
  }))
  return [...history, current, ...forecast]
}

function toUncertaintyBands(timeline: TimelineEntry[]): UncertaintyBand[] {
  const reference = timeline.find((entry) => entry.uncertainty !== null)?.uncertainty
  if (!reference) {
    return []
  }

  return reference.bands.map((referenceBand) => {
    const lower: number[] = []
    const upper: number[] = []
    for (const entry of timeline) {
      const match = entry.uncertainty?.bands.find(
        (band) => band.confidence_level === referenceBand.confidence_level,
      )
      if (match) {
        lower.push(match.lower_pct)
        upper.push(match.upper_pct)
      } else {
        lower.push(Number.NaN)
        upper.push(Number.NaN)
      }
    }
    return {
      series_id: SERIES_ID,
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
  const seriesValues = timeline.map((entry) =>
    entry.view.gdp_growth_yoy_pct === null ? Number.NaN : entry.view.gdp_growth_yoy_pct,
  )

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
      values: seriesValues,
    },
    series: [
      {
        series_id: SERIES_ID,
        label: 'GDP growth (YoY, %)',
        semantic_role: 'baseline',
        values: seriesValues,
      },
    ],
    view_mode: 'level',
    uncertainty: toUncertaintyBands(timeline),
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
