import { useTranslation } from 'react-i18next'
import type { ChartSpec } from '../../contracts/data-contract'
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
      <div className="scenario-output-context">
        <span className="claim-label" id="scenario-impulse-card-title">
          {t('scenarioLab.results.claimLabels.headlineImpact')}
        </span>
        <p>{t('scenarioLab.results.explanations.headlineImpact')}</p>
      </div>
      <ChartRenderer spec={chart} />
      <p className="scenario-impulse-card__caption">
        {t('scenarioLab.results.impulseResponseCaption')}
      </p>
    </div>
  )
}
