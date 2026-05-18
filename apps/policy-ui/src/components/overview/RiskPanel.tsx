import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { OverviewAnalysisAction, OverviewRisk } from '../../contracts/data-contract'

type RiskPanelProps = {
  risks: OverviewRisk[]
  actions: OverviewAnalysisAction[]
}

export function RiskPanel({ risks, actions }: RiskPanelProps) {
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
                <h3>{risk.title}</h3>
                <p>{risk.why_it_matters}</p>
                <p className="channel">
                  {t('overview.risks.hitsPrefix')}
                  {risk.impact_channel}
                </p>
              </div>
              <div className="risk-item__action">
                {risk.scenario_query ? (
                  <Link
                    aria-label={t('overview.risks.testActionAria', { title: risk.title })}
                    className="btn-secondary ui-secondary-action"
                    to={`/scenario-lab?${risk.scenario_query}`}
                  >
                    {t('overview.risks.testAction')}
                  </Link>
                ) : null}
                <span className="risk-item__label">{risk.suggested_scenario}</span>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="overview-risk-tests" aria-labelledby="overview-risk-tests-title">
        <div className="overview-risk-tests__head">
          <h3 id="overview-risk-tests-title">{t('overview.quickActions.title')}</h3>
          <p>{t('overview.quickActions.description')}</p>
        </div>
        <div className="overview-risk-tests__list">
          {actions.length === 0 ? (
            <p className="empty-state">{t('overview.quickActions.empty')}</p>
          ) : (
            actions.map((action) => (
              <Link
                key={action.action_id}
                className="overview-risk-test-link"
                to={`/scenario-lab?${action.scenario_query}`}
              >
                <span>{action.title}</span>
                <small>{action.summary}</small>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
