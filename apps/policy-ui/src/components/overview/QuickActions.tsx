import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { OverviewAnalysisAction } from '../../contracts/data-contract'

type QuickActionsProps = {
  actions: OverviewAnalysisAction[]
}

export function QuickActions({ actions }: QuickActionsProps) {
  const { t } = useTranslation()

  return (
    <section className="quick-actions overview-actions-section" aria-labelledby="overview-actions-title">
      <div className="overview-section-head page-section-head">
        <h2 id="overview-actions-title">{t('overview.quickActions.title')}</h2>
        <p>{t('overview.quickActions.description')}</p>
      </div>

      <div className="overview-actions-grid">
        {actions.length === 0 ? (
          <p className="empty-state">{t('overview.quickActions.empty')}</p>
        ) : (
          actions.map((action) => (
            <Link
              key={action.action_id}
              className="qa-tile overview-action-card"
              to={`/scenario-lab?${action.scenario_query}`}
            >
              <span className="qa-kind">{t('overview.quickActions.kindAnalysis')}</span>
              <h5 className="overview-action-card__title">{action.title}</h5>
              <p className="overview-action-card__summary">{action.summary}</p>
            </Link>
          ))
        )}
      </div>
    </section>
  )
}
