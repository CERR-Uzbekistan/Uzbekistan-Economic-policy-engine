import type { ChartSpec } from '../../contracts/data-contract'

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
    <section className="overview-panel overview-panel--primary" aria-labelledby="overview-nowcast-title">
      <div className="overview-section-head">
        <h2 id="overview-nowcast-title">{chart.title}</h2>
        <p>{chart.subtitle}</p>
      </div>

      {summary ? (
        <div className="overview-nowcast-summary">
          <article>
            <p className="overview-panel-kicker">{summary.latestLabel}</p>
            <p className="overview-panel-value">{summary.latestValue.toFixed(1)}%</p>
          </article>
          <article>
            <p className="overview-panel-kicker">Prior estimate</p>
            <p className="overview-panel-value">{summary.priorValue.toFixed(1)}%</p>
          </article>
          <article>
            <p className="overview-panel-kicker">Revision</p>
            <p className="overview-panel-value">{valueWithSign(summary.revision)} pp</p>
          </article>
        </div>
      ) : null}

      <ul className="overview-nowcast-series" aria-label="Estimate path">
        <li className="overview-nowcast-series__header" aria-hidden="true">
          <span>Period</span>
          <span>Latest</span>
          <span>Prior</span>
        </li>
        {chart.x.values.map((period, index) => {
          const latest = chart.series[0]?.values[index]
          const prior = chart.series[1]?.values[index]
          return (
            <li key={period.toString()}>
              <span>{period}</span>
              <span>{latest?.toFixed(1)}%</span>
              <span>{prior?.toFixed(1)}%</span>
            </li>
          )
        })}
      </ul>

      <p className="overview-panel-takeaway">{chart.takeaway}</p>
    </section>
  )
}
