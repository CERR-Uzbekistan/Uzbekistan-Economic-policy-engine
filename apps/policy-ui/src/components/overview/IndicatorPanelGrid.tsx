import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import type { HeadlineMetric, OverviewIndicatorGroup } from '../../contracts/data-contract'
import {
  DIRECTION_GLYPH,
  formatOverviewDeltaWithUnit,
  formatOverviewMetricValue,
} from './metric-format.js'
import { getComparisonBasisKey } from './metric-comparison-basis.js'

type IndicatorPanelGridProps = {
  groups?: OverviewIndicatorGroup[]
}

function StatusChip({ metric }: { metric: HeadlineMetric }) {
  const { t } = useTranslation()
  if (metric.validation_status !== 'warning' && metric.validation_status !== 'failed') {
    return null
  }
  return (
    <span className={`overview-indicator-row__status ui-chip ui-chip--warn`}>
      {t(`overview.indicators.status.${metric.validation_status}`)}
    </span>
  )
}

function orderedGroupMetrics(group: OverviewIndicatorGroup): HeadlineMetric[] {
  if (group.group_id !== 'inflation') {
    return group.metrics
  }
  const inflationOrder = new Map([
    ['cpi_yoy', 0],
    ['food_cpi_yoy', 1],
    ['cpi_mom', 2],
  ])
  return [...group.metrics].sort((left, right) => {
    const leftOrder = inflationOrder.get(left.metric_id) ?? Number.MAX_SAFE_INTEGER
    const rightOrder = inflationOrder.get(right.metric_id) ?? Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder
  })
}

export function IndicatorPanelGrid({ groups = [] }: IndicatorPanelGridProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'
  const visibleGroups = groups.filter((group) => group.metrics.length > 0)

  if (visibleGroups.length === 0) {
    return null
  }

  return (
    <section className="overview-indicator-groups" aria-labelledby="overview-indicator-groups-title">
      <div className="overview-section-head">
        <h2 id="overview-indicator-groups-title">{t('overview.indicators.title')}</h2>
        <p>{t('overview.indicators.description')}</p>
      </div>

      <div className="overview-indicator-grid">
        {visibleGroups.map((group) => (
          <section
            key={group.group_id}
            className={`overview-indicator-panel overview-indicator-panel--${group.group_id}`}
          >
            <h3>{t(`overview.indicators.groups.${group.group_id}`, { defaultValue: group.title })}</h3>
            <div className="overview-indicator-panel__rows">
              {orderedGroupMetrics(group).map((metric, index) => {
                const delta = formatOverviewDeltaWithUnit(metric, locale)
                const comparisonBasisKey = getComparisonBasisKey(metric.metric_id)
                const comparisonBasis = comparisonBasisKey ? t(comparisonBasisKey) : null
                const showInflationPairHeader = group.group_id === 'inflation' && metric.metric_id === 'cpi_yoy'
                return (
                  <Fragment key={metric.metric_id}>
                    {showInflationPairHeader ? (
                      <div className="overview-indicator-subhead" role="presentation">
                        {t('overview.indicators.inflationPair')}
                      </div>
                    ) : null}
                    <div
                      className={`overview-indicator-row${
                        group.group_id === 'inflation' && index < 2 ? ' overview-indicator-row--paired' : ''
                      }`}
                      data-metric-id={metric.metric_id}
                    >
                      <div className="overview-indicator-row__label">
                        <p>{metric.label}</p>
                        <span>
                          {metric.source_period ?? metric.period} {t('overview.common.middleDot')}{' '}
                          {metric.source_label ?? metric.citation_label ?? metric.context_note}
                        </span>
                      </div>
                      <div className="overview-indicator-row__measure">
                        <p>
                          {formatOverviewMetricValue(metric, locale)}
                          <span>{metric.unit}</span>
                        </p>
                        <div className="overview-indicator-row__meta">
                          <span className="overview-indicator-row__delta" aria-hidden={delta ? undefined : true}>
                            {delta ? `${DIRECTION_GLYPH[metric.direction]} ${delta}` : '\u00a0'}
                          </span>
                          <StatusChip metric={metric} />
                        </div>
                        {comparisonBasis ? (
                          <p className="overview-comparison-basis overview-indicator-row__basis">
                            {comparisonBasis}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </Fragment>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
