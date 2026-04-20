import { useMemo, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import type { HeadlineMetric } from '../../contracts/data-contract.js'
import { listScenarios, subscribeScenarioStore } from '../../state/scenarioStore.js'
import { AttributionBadge } from '../system/AttributionBadge.js'
import {
  buildSavedScenarioFeedRows,
  collectDataRefreshes,
  getSessionId,
  toDateEyebrow,
  toRefreshTitle,
} from './overview-feed-utils.js'

type OverviewFeedsProps = {
  headlineMetrics: HeadlineMetric[]
}

export function OverviewFeeds({ headlineMetrics }: OverviewFeedsProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'
  const savedScenarios = useSyncExternalStore(subscribeScenarioStore, listScenarios, () => [])
  const refreshRows = useMemo(() => collectDataRefreshes(headlineMetrics).slice(0, 5), [headlineMetrics])
  const sessionId = getSessionId()
  const savedScenarioRows = buildSavedScenarioFeedRows(
    savedScenarios,
    locale,
    sessionId,
    t('overview.feeds.savedScenarios.youShort'),
  )

  return (
    <section className="feed" aria-label={t('overview.feeds.sectionAria')}>
      <article className="feed-col">
        <h4>{t('overview.feeds.reforms.title')}</h4>
        <p className="empty-state">{t('overview.feeds.reforms.empty')}</p>
      </article>

      <article className="feed-col">
        <h4>{t('overview.feeds.dataRefreshes.title')}</h4>
        {refreshRows.length === 0 ? (
          <p className="empty-state">{t('overview.feeds.dataRefreshes.empty')}</p>
        ) : (
          <div className="feed-list">
            {refreshRows.map((entry) => (
              <article key={`${entry.model_id}-${entry.data_version}`} className="feed-item">
                <p className="feed-item__date">
                  {toDateEyebrow(entry.timestamp, locale)} {t('overview.common.middleDot')}{' '}
                  {entry.model_id.toUpperCase()}
                </p>
                <p className="feed-item__title">
                  {toRefreshTitle(entry, t('overview.feeds.dataRefreshes.refreshSuffix'))}
                </p>
                <div className="feed-item__tags">
                  <AttributionBadge modelId={entry.model_id} />
                  <span className="feed-tag">{entry.data_version}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>

      <article className="feed-col">
        <h4>{t('overview.feeds.savedScenarios.title')}</h4>
        {savedScenarioRows.length === 0 ? (
          <p className="empty-state">{t('overview.feeds.savedScenarios.empty')}</p>
        ) : (
          <div className="feed-list">
            {savedScenarioRows.map((scenario) => (
              <article key={scenario.scenario_id} className="feed-item">
                <p className="feed-item__date">{scenario.dateLabel}</p>
                <p className="feed-item__title">{scenario.scenario_name}</p>
                <div className="feed-item__tags">
                  {scenario.model_ids.map((modelId) => (
                    <AttributionBadge key={`${scenario.scenario_id}-${modelId}`} modelId={modelId} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}
