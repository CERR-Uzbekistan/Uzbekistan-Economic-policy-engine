import type { ReactNode } from 'react'
import type { ChartSpec } from '../../contracts/data-contract.js'
import { ChartRenderer } from '../system/ChartRenderer.js'

type NowcastForecastBlockProps = {
  chart: ChartSpec
  headerSlot?: ReactNode
  statusSlot?: ReactNode
}

function isFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function getHeadline(chart: ChartSpec) {
  const primarySeries = chart.series[0]
  if (!primarySeries) {
    return null
  }
  const values = primarySeries.values
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
    seriesLabel: primarySeries.label,
    periodLabel,
  }
}

export function NowcastForecastBlock({ chart, headerSlot, statusSlot }: NowcastForecastBlockProps) {
  const headline = getHeadline(chart)

  return (
    <section className="overview-panel overview-panel--primary" aria-label="Nowcast and forecast">
      {headerSlot ? <div className="overview-nowcast-header-slot">{headerSlot}</div> : null}

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

      <ChartRenderer
        spec={chart}
        ariaLabel={`${chart.title}. ${chart.takeaway}`}
      />

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
