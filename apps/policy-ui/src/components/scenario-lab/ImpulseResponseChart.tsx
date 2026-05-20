import { useTranslation } from 'react-i18next'
import type { ChartSpec } from '../../contracts/data-contract'
import { AttributionBadge } from '../system/AttributionBadge.js'
import { ChartRenderer } from '../system/ChartRenderer.js'

type ImpulseResponseChartProps = {
  chart: ChartSpec
}

// QPM reference-response card: 3 series over 12 quarters with explicit
// reference-calculation attribution.
export function ImpulseResponseChart({ chart }: ImpulseResponseChartProps) {
  const { t } = useTranslation()

  return (
    <div className="scenario-impulse-card card" aria-labelledby="scenario-impulse-card-title">
      <div className="card__head scenario-impulse-card__head">
        <div>
          <p className="page-header__eyebrow scenario-impulse-card__eyebrow">
            {t('scenarioLab.results.impulseResponseEyebrow')}
          </p>
          <h4 id="scenario-impulse-card-title">{chart.title}</h4>
          <p>{chart.subtitle}</p>
        </div>
        <AttributionBadge modelId={t('scenarioLab.results.qpmReferenceBadge')} active />
      </div>
      <div className="scenario-output-context">
        <span className="claim-label">{t('scenarioLab.results.claimLabels.headlineImpact')}</span>
        <p>{t('scenarioLab.results.explanations.headlineImpact')}</p>
      </div>
      <ChartRenderer spec={chart} ariaLabel={chart.title} />
      <p className="scenario-impulse-card__caption">
        {t('scenarioLab.results.impulseResponseCaption')}
      </p>
    </div>
  )
}
