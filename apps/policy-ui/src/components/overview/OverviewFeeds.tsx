import { useTranslation } from 'react-i18next'
import type { OverviewActivityFeed } from '../../contracts/data-contract.js'
import { AttributionBadge } from '../system/AttributionBadge.js'
import { toDateEyebrow } from './overview-feed-utils.js'

type OverviewFeedsProps = {
  activityFeed: OverviewActivityFeed
}

const ACTIVE_OVERVIEW_REFRESH_MODELS = new Set(['dfm_nowcast', 'qpm_uzbekistan', 'io_model'])

function toEpoch(isoTimestamp: string): number {
  const parsed = Date.parse(isoTimestamp)
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

export function OverviewFeeds({ activityFeed }: OverviewFeedsProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'

  const policyActions = [...activityFeed.policy_actions]
    .sort((a, b) => toEpoch(b.occurred_at) - toEpoch(a.occurred_at))
    .slice(0, 3)
  const dataRefreshes = [...activityFeed.data_refreshes]
    .filter((refresh) => ACTIVE_OVERVIEW_REFRESH_MODELS.has(refresh.model_id))
    .sort((a, b) => toEpoch(b.refreshed_at) - toEpoch(a.refreshed_at))
    .slice(0, 3)

  return (
    <section className="feed" aria-labelledby="overview-feeds-title">
      <div className="overview-section-head feed__head">
        <h2 id="overview-feeds-title">{t('overview.feeds.title')}</h2>
        <p>{t('overview.feeds.description')}</p>
      </div>
      <article className="feed-col">
        <h3>{t('overview.feeds.reforms.title')}</h3>
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
        <h3>{t('overview.feeds.dataRefreshes.title')}</h3>
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

      <aside className="feed-col feed-col--note">
        <h3>{t('overview.feeds.note.title')}</h3>
        <p>{t('overview.feeds.note.description')}</p>
      </aside>
    </section>
  )
}
