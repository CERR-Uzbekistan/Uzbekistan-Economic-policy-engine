import { useTranslation } from 'react-i18next'
import type { ComparisonScenario } from '../../contracts/data-contract'

type TradeoffSummaryPanelProps = {
  selectedScenarios: ComparisonScenario[]
  baselineId: string
}

const DELTA_THRESHOLD = 0.05

function formatSignedDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '−'
  return `${sign}${Math.abs(delta).toFixed(1)}pp`
}

export function TradeoffSummaryPanel({ selectedScenarios, baselineId }: TradeoffSummaryPanelProps) {
  const { t } = useTranslation()
  const baseline = selectedScenarios.find((scenario) => scenario.scenario_id === baselineId)
  const alternatives = selectedScenarios.filter((scenario) => scenario.scenario_id !== baselineId)

  if (!baseline || alternatives.length === 0) {
    return (
      <section className="comparison-panel comparison-panel--summary" aria-labelledby="comparison-summary-title">
        <div className="comparison-panel__head page-section-head">
          <h2 id="comparison-summary-title">{t('comparison.tradeoff.title')}</h2>
          <p>{t('comparison.tradeoff.description')}</p>
        </div>
        <p className="empty-state">{t('comparison.tradeoff.empty')}</p>
      </section>
    )
  }

  return (
    <section className="comparison-panel comparison-panel--summary" aria-labelledby="comparison-summary-title">
      <div className="comparison-panel__head page-section-head">
        <h2 id="comparison-summary-title">{t('comparison.tradeoff.title')}</h2>
        <p>{t('comparison.tradeoff.description')}</p>
      </div>

      <div className="comparison-tradeoff-list">
        {alternatives.map((scenario) => {
          const metricDeltas = {
            gdp_growth: (scenario.values.gdp_growth ?? baseline.values.gdp_growth ?? 0) - (baseline.values.gdp_growth ?? 0),
            inflation: (scenario.values.inflation ?? baseline.values.inflation ?? 0) - (baseline.values.inflation ?? 0),
            policy_rate: (scenario.values.policy_rate ?? baseline.values.policy_rate ?? 0) - (baseline.values.policy_rate ?? 0),
          }

          const included = ([
            ['gdp_growth', metricDeltas.gdp_growth],
            ['inflation', metricDeltas.inflation],
            ['policy_rate', metricDeltas.policy_rate],
          ] as const).filter(([, delta]) => Math.abs(delta) >= DELTA_THRESHOLD)

          if (included.length === 0) {
            return (
              <p key={scenario.scenario_id} className="comparison-tradeoff-sentence">
                {t('comparison.tradeoff.negligible', { scenario_name: scenario.scenario_name })}
              </p>
            )
          }

          const chunks = {
            gdp_growth: '',
            inflation: '',
            policy_rate: '',
          }

          included.forEach(([metricId, delta], index) => {
            const metricLabel = t(`comparison.tradeoff.metric.${metricId}`)
            const phrase = `${metricLabel} ${t('comparison.tradeoff.by')} ${formatSignedDelta(delta)}`
            chunks[metricId] = `${index === 0 ? `${t('comparison.tradeoff.shifts')} ` : ', '}${phrase}`
          })

          return (
            <p key={scenario.scenario_id} className="comparison-tradeoff-sentence">
              {t('comparison.tradeoff.template', {
                scenario_name: scenario.scenario_name,
                delta_gdp: chunks.gdp_growth,
                delta_inf: chunks.inflation,
                delta_rate: chunks.policy_rate,
              })}
            </p>
          )
        })}
      </div>
    </section>
  )
}
