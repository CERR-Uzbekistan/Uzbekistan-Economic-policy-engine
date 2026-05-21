import { useTranslation } from 'react-i18next'
import type { ChartSpec } from '../../contracts/data-contract'
import { ChartRenderer } from '../system/ChartRenderer.js'

type ImpulseResponseChartProps = {
  chart: ChartSpec
}

function buildPanelChart(
  chart: ChartSpec,
  series: ChartSpec['series'][number],
  t: ReturnType<typeof useTranslation>['t'],
): ChartSpec {
  const title = t(`scenarioLab.results.impulsePanels.${series.series_id}.title`, {
    defaultValue: series.label,
  })

  return {
    ...chart,
    chart_id: `${chart.chart_id}_${series.series_id}`,
    title,
    subtitle: t('scenarioLab.results.impulsePanels.subtitle', {
      defaultValue: chart.subtitle,
    }),
    x: {
      ...chart.x,
      label: t('scenarioLab.results.impulsePanels.xLabel', { defaultValue: chart.x.label }),
    },
    y: {
      ...chart.y,
      label: t('scenarioLab.results.impulsePanels.yLabel', { defaultValue: chart.y.label }),
      values: series.values,
    },
    series: [
      {
        ...series,
        label: title,
      },
    ],
    takeaway: t(`scenarioLab.results.impulsePanels.${series.series_id}.takeaway`, {
      defaultValue: '',
    }),
  }
}

// QPM reference response: small multiples are used because GDP gap,
// inflation, and policy-rate responses have distinct economic meanings even
// when all are measured as percentage-point deviations.
export function ImpulseResponseChart({ chart }: ImpulseResponseChartProps) {
  const { t } = useTranslation()
  const panelCharts = chart.series.map((series) => buildPanelChart(chart, series, t))

  return (
    <div className="scenario-impulse-card card" aria-labelledby="scenario-impulse-card-title">
      <div className="scenario-output-context">
        <span className="claim-label" id="scenario-impulse-card-title">
          {t('scenarioLab.results.claimLabels.headlineImpact')}
        </span>
        <p>{t('scenarioLab.results.explanations.headlineImpact')}</p>
      </div>
      <div className="scenario-impulse-grid">
        {panelCharts.map((panelChart) => (
          <ChartRenderer
            key={panelChart.chart_id}
            ariaLabel={panelChart.title}
            height={190}
            showZeroLine
            spec={panelChart}
          />
        ))}
      </div>
      <p className="scenario-impulse-card__caption">
        {t('scenarioLab.results.impulseResponseCaption')}
      </p>
    </div>
  )
}
