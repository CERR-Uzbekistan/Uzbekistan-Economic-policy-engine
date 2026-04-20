import type { ChartSpec } from '../../contracts/data-contract'
import { ChartRenderer } from '../system/ChartRenderer'

type NowcastForecastBlockProps = {
  chart: ChartSpec
}

function getLatestSummary(chart: ChartSpec) {
  const latestSeries = chart.series.find((series) => series.series_id === 'latest_estimate')
  const priorSeries = chart.series.find((series) => series.series_id === 'prior_estimate')

  if (!latestSeries || !priorSeries) {
    return null
  }

  const latestValue = latestSeries.values.at(-1)
  const priorValue = priorSeries.values.at(-1)
  if (latestValue === undefined || priorValue === undefined) {
    return null
  }

  return {
    latestValue,
    priorValue,
    revision: latestValue - priorValue,
    latestLabel: chart.x.values.at(-1)?.toString() ?? 'Latest period',
  }
}

function valueWithSign(value: number) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}`
}

export function NowcastForecastBlock({ chart }: NowcastForecastBlockProps) {
  const summary = getLatestSummary(chart)

  return (
    <section className="overview-panel overview-panel--primary" aria-label="Nowcast and forecast">
      {summary ? (
        <div className="overview-nowcast-summary">
          <div>
            <p className="overview-panel-kicker">{summary.latestLabel}</p>
            <p className="overview-panel-value">{summary.latestValue.toFixed(1)}%</p>
          </div>
          <div>
            <p className="overview-panel-kicker">Prior estimate</p>
            <p className="overview-panel-value">{summary.priorValue.toFixed(1)}%</p>
          </div>
          <div>
            <p className="overview-panel-kicker">Revision</p>
            <p className="overview-panel-value">{valueWithSign(summary.revision)} pp</p>
          </div>
        </div>
      ) : null}

      <ChartRenderer
        spec={chart}
        ariaLabel={`${chart.title}. ${chart.takeaway}`}
      />

      <div className="sr-only">
        <table className="overview-nowcast-series">
          <caption>Estimate path (real GDP growth, %)</caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">Latest</th>
              <th scope="col">Prior</th>
            </tr>
          </thead>
          <tbody>
            {chart.x.values.map((period, index) => {
              const latest = chart.series[0]?.values[index]
              const prior = chart.series[1]?.values[index]
              return (
                <tr key={period.toString()}>
                  <th scope="row">{period}</th>
                  <td>{latest?.toFixed(1)}%</td>
                  <td>{prior?.toFixed(1)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
