import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChartSpec } from '../../contracts/data-contract.js'
import { ChartRenderer } from '../system/ChartRenderer.js'

type NowcastForecastBlockProps = {
  chart: ChartSpec
  headerSlot?: ReactNode
  statusSlot?: ReactNode
}

type NowcastMarker = {
  kind: 'last-actual' | 'current'
  periodLabel: string
  value: number
  unit: string
}

type NowcastFanInset = {
  actualPeriod: string
  actualValue: number
  currentPeriod: string
  currentValue: number
  lower: number
  upper: number
  unit: string
}

const OVERVIEW_NOWCAST_RECENT_HISTORY_QUARTERS = 12

function isFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function getHeadline(chart: ChartSpec) {
  // Prefer the dedicated current-nowcast series so the headline does not
  // accidentally pick up the latest historical actual or the forecast
  // endpoint. Fall back to the first series for legacy chart shapes that
  // do not segment history/nowcast/forecast.
  const nowcastSeries =
    chart.series.find((series) => series.series_id === 'gdp_nowcast_yoy') ?? chart.series[0]
  if (!nowcastSeries) {
    return null
  }
  const values = nowcastSeries.values
  let latestValue: number | null = null
  let latestIndex = -1
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (isFinite(values[index])) {
      latestValue = values[index]
      latestIndex = index
      break
    }
  }
  if (latestValue === null) {
    return null
  }
  const periodLabel = chart.x.values[latestIndex]?.toString() ?? ''
  return {
    value: latestValue,
    unit: chart.y.unit,
    seriesLabel: nowcastSeries.label,
    periodLabel,
  }
}

function hasSegmentedNowcastShape(chart: ChartSpec): boolean {
  return chart.series.some(
    (series) =>
      series.series_id === 'gdp_history_yoy' || series.series_id === 'gdp_nowcast_yoy',
  )
}

function hasForecastSeries(chart: ChartSpec): boolean {
  return chart.series.some((series) => series.series_id === 'gdp_forecast_yoy')
}

function findLastFiniteIndex(values: number[], beforeIndex = values.length): number {
  const endIndex = Math.min(beforeIndex, values.length)
  for (let index = endIndex - 1; index >= 0; index -= 1) {
    if (isFinite(values[index])) {
      return index
    }
  }
  return -1
}

function getCurrentNowcastIndex(chart: ChartSpec): number {
  const nowcastSeries = chart.series.find((series) => series.series_id === 'gdp_nowcast_yoy')
  return nowcastSeries ? findLastFiniteIndex(nowcastSeries.values) : -1
}

function getLastActualIndex(chart: ChartSpec, currentIndex: number): number {
  const historySeries = chart.series.find((series) => series.series_id === 'gdp_history_yoy')
  return historySeries ? findLastFiniteIndex(historySeries.values, currentIndex) : -1
}

function toOverviewNowcastDisplayChart(chart: ChartSpec): ChartSpec {
  const currentIndex = getCurrentNowcastIndex(chart)
  const lastActualIndex = getLastActualIndex(chart, currentIndex)
  if (currentIndex < 0 || lastActualIndex < 0) {
    return chart
  }

  const startIndex = Math.max(
    0,
    lastActualIndex - (OVERVIEW_NOWCAST_RECENT_HISTORY_QUARTERS - 1),
  )
  if (startIndex === 0) {
    return chart
  }

  return {
    ...chart,
    chart_id: `${chart.chart_id}_recent_view`,
    x: {
      ...chart.x,
      values: chart.x.values.slice(startIndex),
    },
    y: {
      ...chart.y,
      values: chart.y.values.slice(startIndex),
    },
    series: chart.series.map((series) => ({
      ...series,
      values: series.values.slice(startIndex),
    })),
    uncertainty: chart.uncertainty.map((band) => ({
      ...band,
      lower: band.lower.slice(startIndex),
      upper: band.upper.slice(startIndex),
    })),
  }
}

function getNowcastDisplayMarkers(chart: ChartSpec): NowcastMarker[] {
  const currentIndex = getCurrentNowcastIndex(chart)
  const lastActualIndex = getLastActualIndex(chart, currentIndex)
  const historySeries = chart.series.find((series) => series.series_id === 'gdp_history_yoy')
  const nowcastSeries = chart.series.find((series) => series.series_id === 'gdp_nowcast_yoy')
  const markers: NowcastMarker[] = []

  if (historySeries && lastActualIndex >= 0) {
    const value = historySeries.values[lastActualIndex]
    if (isFinite(value)) {
      markers.push({
        kind: 'last-actual',
        periodLabel: chart.x.values[lastActualIndex]?.toString() ?? '',
        value,
        unit: chart.y.unit,
      })
    }
  }

  if (nowcastSeries && currentIndex >= 0) {
    const value = nowcastSeries.values[currentIndex]
    if (isFinite(value)) {
      markers.push({
        kind: 'current',
        periodLabel: chart.x.values[currentIndex]?.toString() ?? '',
        value,
        unit: chart.y.unit,
      })
    }
  }

  return markers
}

function getVintageLine(chart: ChartSpec): string | null {
  const attribution = chart.model_attribution[0]
  if (!attribution) {
    return null
  }
  const parts = [attribution.model_name, attribution.data_version].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

export function NowcastForecastBlock({ chart, headerSlot, statusSlot }: NowcastForecastBlockProps) {
  const { t } = useTranslation()
  const headline = getHeadline(chart)
  const vintageLine = getVintageLine(chart)
  const displayChart = toOverviewNowcastDisplayChart(chart)
  const displayWindow = displayChart === chart ? 'full' : 'recent'
  const markers = getNowcastDisplayMarkers(chart)
  const currentMarker = markers.find((marker) => marker.kind === 'current')
  const fanInset = getNowcastFanInset(chart)
  const displayHasCurrentSegment = displayChart.series.some((series) =>
    series.series_id === 'gdp_nowcast_yoy' && series.values.some(isFinite),
  )
  const displayHasFan = displayChart.uncertainty.some(
    (band) => band.lower.some(isFinite) && band.upper.some(isFinite),
  )
  const chartAriaLabel = [
    `${chart.title}. ${chart.takeaway}`,
    currentMarker
      ? `${t('overview.nowcast.markers.current')}: ${currentMarker.periodLabel}, ${currentMarker.value.toFixed(1)}${currentMarker.unit}.`
      : null,
  ].filter(Boolean).join(' ')

  return (
    <section className="overview-panel overview-panel--primary" aria-labelledby="overview-nowcast-title">
      <div className="overview-nowcast-head">
        <div>
          <p className="overview-section-kicker">{t('overview.nowcast.kicker')}</p>
          <h2 id="overview-nowcast-title">{chart.title}</h2>
          <p>{chart.subtitle}</p>
          {vintageLine ? <span>{vintageLine}</span> : null}
        </div>
        {headerSlot ? <div className="overview-nowcast-header-slot">{headerSlot}</div> : null}
      </div>

      {headline ? (
        <div className="overview-nowcast-summary overview-nowcast-summary--single">
          <div>
            <p className="overview-panel-kicker">{headline.periodLabel || headline.seriesLabel}</p>
            <p className="overview-panel-value">
              {headline.value.toFixed(1)}
              {headline.unit}
            </p>
          </div>
          {statusSlot ? <div className="overview-nowcast-status">{statusSlot}</div> : null}
        </div>
      ) : statusSlot ? (
        <div className="overview-nowcast-status">{statusSlot}</div>
      ) : null}

      <div className="overview-nowcast-legend" aria-label={t('overview.nowcast.legendAria')}>
        <span className="overview-nowcast-legend__token overview-nowcast-legend__token--actual">
          {t('overview.nowcast.legend.actual')}
        </span>
        <span className="overview-nowcast-legend__token overview-nowcast-legend__token--nowcast">
          {t('overview.nowcast.legend.nowcast')}
        </span>
        {!hasSegmentedNowcastShape(chart) || hasForecastSeries(chart) ? (
          <span className="overview-nowcast-legend__token overview-nowcast-legend__token--forecast">
            {t('overview.nowcast.legend.forecast')}
          </span>
        ) : null}
        <span className="overview-nowcast-legend__token overview-nowcast-legend__token--band">
          {t('overview.nowcast.legend.band')}
        </span>
      </div>

      <div
        className="overview-nowcast-chart-shell"
        data-nowcast-display-end={displayChart.x.values.at(-1)?.toString() ?? ''}
        data-nowcast-display-points={displayChart.x.values.length}
        data-nowcast-display-start={displayChart.x.values[0]?.toString() ?? ''}
        data-nowcast-display-window={displayWindow}
        data-nowcast-has-current-segment={displayHasCurrentSegment ? 'true' : 'false'}
        data-nowcast-has-fan={displayHasFan ? 'true' : 'false'}
      >
        {markers.length > 0 ? (
          <dl className="overview-nowcast-markers" aria-label={t('overview.nowcast.markers.aria')}>
            {markers.map((marker) => (
              <div
                className={`overview-nowcast-marker overview-nowcast-marker--${marker.kind}`}
                data-nowcast-marker={marker.kind}
                key={marker.kind}
              >
                <dt>{t(`overview.nowcast.markers.${marker.kind === 'last-actual' ? 'lastActual' : 'current'}`)}</dt>
                <dd>
                  <span>{marker.periodLabel}</span>
                  <strong>{marker.value.toFixed(1)}{marker.unit}</strong>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {fanInset ? <NowcastFanInsetGraphic inset={fanInset} /> : null}

        <ChartRenderer
          spec={displayChart}
          ariaLabel={chartAriaLabel}
          height={320}
        />
      </div>

      <p className="overview-panel-takeaway overview-nowcast-note">
        {t('overview.nowcast.modelNotOfficial')}
      </p>

      <div className="sr-only">
        <table className="overview-nowcast-series">
          <caption>{chart.title} — {chart.y.label} ({chart.y.unit})</caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              {chart.series.map((series) => (
                <th key={series.series_id} scope="col">{series.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.x.values.map((period, index) => (
              <tr key={period.toString()}>
                <th scope="row">{period}</th>
                {chart.series.map((series) => {
                  const value = series.values[index]
                  return (
                    <td key={series.series_id}>
                      {isFinite(value) ? `${value.toFixed(1)}${chart.y.unit}` : 'n/a'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function getNowcastFanInset(chart: ChartSpec): NowcastFanInset | null {
  const currentIndex = getCurrentNowcastIndex(chart)
  const lastActualIndex = getLastActualIndex(chart, currentIndex)
  if (currentIndex < 0 || lastActualIndex < 0) {
    return null
  }

  const nowcastSeries = chart.series.find((series) => series.series_id === 'gdp_nowcast_yoy')
  const historySeries = chart.series.find((series) => series.series_id === 'gdp_history_yoy')
  const band =
    chart.uncertainty.find((item) => item.confidence_level === 70) ?? chart.uncertainty[0]
  if (!nowcastSeries || !historySeries || !band) {
    return null
  }

  const actualValue = historySeries.values[lastActualIndex]
  const currentValue = nowcastSeries.values[currentIndex]
  const lower = band.lower[currentIndex]
  const upper = band.upper[currentIndex]
  if (![actualValue, currentValue, lower, upper].every(isFinite)) {
    return null
  }

  return {
    actualPeriod: chart.x.values[lastActualIndex]?.toString() ?? '',
    actualValue,
    currentPeriod: chart.x.values[currentIndex]?.toString() ?? '',
    currentValue,
    lower,
    upper,
    unit: chart.y.unit,
  }
}

function NowcastFanInsetGraphic({ inset }: { inset: NowcastFanInset }) {
  const values = [inset.actualValue, inset.currentValue, inset.lower, inset.upper]
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = Math.max(maxValue - minValue, 0.5)
  const yFor = (value: number) => 66 - ((value - minValue) / range) * 48
  const actualY = yFor(inset.actualValue)
  const currentY = yFor(inset.currentValue)
  const lowerY = yFor(inset.lower)
  const upperY = yFor(inset.upper)

  return (
    <figure
      aria-label={`${inset.currentPeriod} nowcast fan: ${inset.lower.toFixed(1)}${inset.unit} to ${inset.upper.toFixed(1)}${inset.unit}, current ${inset.currentValue.toFixed(1)}${inset.unit}.`}
      className="overview-nowcast-fan-inset"
      data-nowcast-fan-inset="true"
    >
      <svg role="img" viewBox="0 0 260 92">
        <polygon
          className="overview-nowcast-fan-inset__band"
          points={`28,${actualY} 228,${upperY} 228,${lowerY}`}
        />
        <line
          className="overview-nowcast-fan-inset__line overview-nowcast-fan-inset__line--history"
          x1="28"
          x2="128"
          y1={actualY}
          y2={actualY}
        />
        <line
          className="overview-nowcast-fan-inset__line overview-nowcast-fan-inset__line--nowcast"
          x1="128"
          x2="228"
          y1={actualY}
          y2={currentY}
        />
        <circle className="overview-nowcast-fan-inset__point" cx="228" cy={currentY} r="4" />
        <text x="28" y="84">{inset.actualPeriod}</text>
        <text textAnchor="end" x="228" y="84">{inset.currentPeriod}</text>
        <text textAnchor="end" x="252" y={upperY + 3}>{inset.upper.toFixed(1)}{inset.unit}</text>
        <text textAnchor="end" x="252" y={lowerY + 3}>{inset.lower.toFixed(1)}{inset.unit}</text>
      </svg>
    </figure>
  )
}
