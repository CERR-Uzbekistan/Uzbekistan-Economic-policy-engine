import { useTranslation } from 'react-i18next'
import type { OverviewActivityFeed } from '../../contracts/data-contract.js'
import { AttributionBadge } from '../system/AttributionBadge.js'
import { toDateEyebrow } from './overview-feed-utils.js'

type OverviewFeedsProps = {
  activityFeed: OverviewActivityFeed
}

function toEpoch(isoTimestamp: string): number {
  const parsed = Date.parse(isoTimestamp)
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

export function OverviewFeeds({ activityFeed }: OverviewFeedsProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'

  const policyActions = [...activityFeed.policy_actions]
    .sort((a, b) => toEpoch(b.occurred_at) - toEpoch(a.occurred_at))
    .slice(0, 5)
  const dataRefreshes = [...activityFeed.data_refreshes]
    .sort((a, b) => toEpoch(b.refreshed_at) - toEpoch(a.refreshed_at))
    .slice(0, 5)
  const savedScenarios = [...activityFeed.saved_scenarios]
    .sort((a, b) => toEpoch(b.saved_at) - toEpoch(a.saved_at))
    .slice(0, 5)

  return (
    <section className="feed" aria-label={t('overview.feeds.sectionAria')}>
      <article className="feed-col">
        <h4>{t('overview.feeds.reforms.title')}</h4>
        {policyActions.length === 0 ? (
          <p className="empty-state">{t('overview.feeds.reforms.empty')}</p>
        ) : (
          <div className="feed-list">
            {policyActions.map((action) => (
              <article key={action.action_id} className="feed-item">
                <p className="feed-item__date">
                  {toDateEyebrow(action.occurred_at, locale)} {t('overview.common.middleDot')}{' '}
                  {action.institution}
                </p>
                <p className="feed-item__title">{action.title}</p>
                <div className="feed-item__tags">
                  <span className="feed-tag">
                    {t(`overview.feeds.reforms.actionType.${action.action_type}`)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>

      <article className="feed-col">
        <h4>{t('overview.feeds.dataRefreshes.title')}</h4>
        {dataRefreshes.length === 0 ? (
          <p className="empty-state">{t('overview.feeds.dataRefreshes.empty')}</p>
        ) : (
          <div className="feed-list">
            {dataRefreshes.map((refresh) => (
              <article key={refresh.refresh_id} className="feed-item">
                <p className="feed-item__date">
                  {toDateEyebrow(refresh.refreshed_at, locale)} {t('overview.common.middleDot')}{' '}
                  {refresh.model_id.toUpperCase()}
                </p>
                <p className="feed-item__title">{refresh.data_source}</p>
                {refresh.summary ? (
                  <p className="feed-item__summary">{refresh.summary}</p>
                ) : null}
                <div className="feed-item__tags">
                  <AttributionBadge modelId={refresh.model_id} />
                </div>
              </article>
            ))}
          </div>
        )}
      </article>

      <article className="feed-col">
        <h4>{t('overview.feeds.savedScenarios.title')}</h4>
        {savedScenarios.length === 0 ? (
          <p className="empty-state">{t('overview.feeds.savedScenarios.empty')}</p>
        ) : (
          <div className="feed-list">
            {savedScenarios.map((scenario) => (
              <article key={scenario.activity_id} className="feed-item">
                <p className="feed-item__date">{toDateEyebrow(scenario.saved_at, locale)}</p>
                <p className="feed-item__title">{scenario.scenario_name}</p>
                <p className="feed-item__meta">{scenario.author}</p>
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}
