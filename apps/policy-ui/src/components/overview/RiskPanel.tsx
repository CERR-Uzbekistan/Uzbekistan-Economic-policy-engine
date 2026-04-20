import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { OverviewRisk } from '../../contracts/data-contract'

type RiskPanelProps = {
  risks: OverviewRisk[]
}

export function RiskPanel({ risks }: RiskPanelProps) {
  const { t } = useTranslation()

  return (
    <section className="overview-panel overview-panel--companion" aria-labelledby="overview-risks-title">
      <div className="overview-section-head page-section-head">
        <h2 id="overview-risks-title">{t('overview.risks.title')}</h2>
        <p>{t('overview.risks.description')}</p>
      </div>

      <div className="overview-risk-list">
        {risks.length === 0 ? (
          <p className="empty-state">{t('overview.risks.empty')}</p>
        ) : (
          risks.map((risk) => (
            <article key={risk.risk_id} className="risk-item overview-risk-card">
              <div className="risk-item__body">
                <h4>{risk.title}</h4>
                <p>{risk.why_it_matters}</p>
                <p className="channel">
                  {t('overview.risks.hitsPrefix')}
                  {risk.impact_channel}
                </p>
              </div>
              <div className="risk-item__action">
                {risk.scenario_query ? (
                  <Link className="btn-secondary ui-secondary-action" to={`/scenario-lab?${risk.scenario_query}`}>
                    {t('overview.risks.testAction')}
                  </Link>
                ) : null}
                <span className="risk-item__label">{risk.suggested_scenario}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
