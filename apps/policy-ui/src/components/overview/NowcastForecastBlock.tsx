import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
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
        <span>{t('overview.nowcast.legend.actual')}</span>
        <span>{t('overview.nowcast.legend.nowcast')}</span>
        <span>{t('overview.nowcast.legend.forecast')}</span>
        <span>{t('overview.nowcast.legend.band')}</span>
      </div>

      <ChartRenderer
        spec={chart}
        ariaLabel={`${chart.title}. ${chart.takeaway}`}
      />

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
