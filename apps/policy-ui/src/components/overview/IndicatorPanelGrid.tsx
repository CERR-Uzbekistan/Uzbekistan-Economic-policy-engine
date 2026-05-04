import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import type { HeadlineMetric, OverviewIndicatorGroup } from '../../contracts/data-contract'
import {
  DIRECTION_GLYPH,
  formatOverviewDeltaComparison,
  formatOverviewDeltaWithUnit,
  formatOverviewMetricValueWithUnit,
} from './metric-format.js'

type IndicatorPanelGridProps = {
  groups?: OverviewIndicatorGroup[]
}

const GROUP_METRIC_ORDER: Readonly<Record<string, ReadonlyMap<string, number>>> = {
  inflation: new Map([
    ['cpi_yoy', 0],
    ['food_cpi_yoy', 1],
    ['cpi_mom', 2],
  ]),
  trade: new Map([
    ['trade_balance', 0],
    ['exports_yoy', 1],
    ['imports_yoy', 2],
  ]),
  monetary_fx: new Map([
    ['policy_rate', 0],
    ['usd_uzs_level', 1],
    ['usd_uzs_mom_change', 2],
    ['usd_uzs_yoy_change', 3],
    ['reer_level', 4],
  ]),
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
  const metricOrder = GROUP_METRIC_ORDER[group.group_id]
  if (!metricOrder) {
    return group.metrics
  }
  return [...group.metrics].sort((left, right) => {
    const leftOrder = metricOrder.get(left.metric_id) ?? Number.MAX_SAFE_INTEGER
    const rightOrder = metricOrder.get(right.metric_id) ?? Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder
  })
}

function getPanelSourceLine(metrics: HeadlineMetric[]): { label: string; title: string } | null {
  const sourceLabels = metrics
    .map((metric) => metric.source_label ?? metric.citation_label)
    .filter((label): label is string => Boolean(label))
  if (sourceLabels.length === 0) {
    return null
  }
  const uniqueSourceLabels = [...new Set(sourceLabels)]
  return {
    label: uniqueSourceLabels[0],
    title: uniqueSourceLabels.join(' · '),
  }
}

function getRowSourcePeriod(metric: HeadlineMetric): string | null {
  return metric.source_period ?? metric.period ?? null
}

function getRowSourceLabel(metric: HeadlineMetric): string | null {
  return metric.source_label ?? metric.citation_label ?? metric.context_note ?? null
}

function getRowProvenanceLabel(metric: HeadlineMetric, middleDot: string): string | null {
  const sourcePeriod = getRowSourcePeriod(metric)
  const sourceLabel = getRowSourceLabel(metric)
  if (sourcePeriod && sourceLabel) {
    return `${sourcePeriod} ${middleDot} ${sourceLabel}`
  }
  return sourcePeriod ?? sourceLabel
}

function shouldShowSubhead(groupId: string, metricId: string): string | null {
  if (groupId === 'inflation' && metricId === 'cpi_yoy') {
    return 'overview.indicators.inflationPair'
  }
  if (groupId === 'trade' && metricId === 'exports_yoy') {
    return 'overview.indicators.tradeFlowPair'
  }
  if (groupId === 'monetary_fx' && metricId === 'usd_uzs_level') {
    return 'overview.indicators.usdUzsPair'
  }
  return null
}

function isPairedMetric(groupId: string, metricId: string): boolean {
  if (groupId === 'inflation') {
    return metricId === 'cpi_yoy' || metricId === 'food_cpi_yoy'
  }
  if (groupId === 'trade') {
    return metricId === 'exports_yoy' || metricId === 'imports_yoy'
  }
  if (groupId === 'monetary_fx') {
    return metricId === 'usd_uzs_level' || metricId === 'usd_uzs_mom_change' || metricId === 'usd_uzs_yoy_change'
  }
  return false
}

function getRowKind(metricId: string): 'forecast' | undefined {
  return metricId === 'gold_price_forecast' ? 'forecast' : undefined
}

export function IndicatorPanelGrid({ groups = [] }: IndicatorPanelGridProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'
  const visibleGroups = groups.filter((group) => group.metrics.length > 0)
  const middleDot = t('overview.common.middleDot')

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
        {visibleGroups.map((group) => {
          const metrics = orderedGroupMetrics(group)
          const panelSourceLine = getPanelSourceLine(metrics)
          const isWidePanel = group.group_id === 'monetary_fx'
          return (
            <section
              key={group.group_id}
              className={`overview-indicator-panel overview-indicator-panel--${group.group_id}${
                isWidePanel ? ' overview-indicator-panel--wide' : ''
              }`}
              data-panel-wide={isWidePanel ? 'true' : undefined}
            >
              <div className="overview-indicator-panel__head">
                <h3>{t(`overview.indicators.groups.${group.group_id}`, { defaultValue: group.title })}</h3>
                {panelSourceLine ? (
                  <p className="overview-indicator-panel__source" title={panelSourceLine.title}>
                    {t('overview.indicators.primarySource', { source: panelSourceLine.label })}
                  </p>
                ) : null}
              </div>
              <div className="overview-indicator-panel__rows">
                {metrics.map((metric) => {
                const delta = formatOverviewDeltaWithUnit(metric, locale, t)
                const deltaComparison = formatOverviewDeltaComparison(metric, t)
                const claimLabel = metric.claim_label_key ? t(metric.claim_label_key) : null
                const subheadKey = shouldShowSubhead(group.group_id, metric.metric_id)
                const rowKind = getRowKind(metric.metric_id)
                const sourcePeriod = getRowSourcePeriod(metric)
                const provenanceLabel = getRowProvenanceLabel(metric, middleDot)
                return (
                  <Fragment key={metric.metric_id}>
                    {subheadKey ? (
                      <div className="overview-indicator-subhead" role="presentation">
                        {t(subheadKey)}
                      </div>
                    ) : null}
                    <div
                      className={`overview-indicator-row${
                        isPairedMetric(group.group_id, metric.metric_id) ? ' overview-indicator-row--paired' : ''
                      }${rowKind === 'forecast' ? ' overview-indicator-row--forecast' : ''}`}
                      data-metric-id={metric.metric_id}
                      data-row-kind={rowKind}
                    >
                      <div className="overview-indicator-row__label">
                        <p>{metric.label}</p>
                        {sourcePeriod ? (
                          <span
                            className="overview-indicator-row__source-period"
                            aria-label={provenanceLabel ?? sourcePeriod}
                            title={provenanceLabel ?? sourcePeriod}
                          >
                            {sourcePeriod}
                          </span>
                        ) : null}
                        {rowKind === 'forecast' ? (
                          <span className="overview-indicator-row__kind">
                            {t('overview.indicators.forecastExternal')}
                          </span>
                        ) : null}
                      </div>
                      <div className="overview-indicator-row__measure">
                        <p>{formatOverviewMetricValueWithUnit(metric, locale, t)}</p>
                        <div className="overview-indicator-row__meta">
                          <span className="overview-indicator-row__delta" aria-hidden={delta ? undefined : true}>
                            {delta
                              ? `${DIRECTION_GLYPH[metric.direction]} ${delta}${
                                  deltaComparison ? ` ${deltaComparison}` : ''
                                }`
                              : '\u00a0'}
                          </span>
                          {claimLabel ? (
                            <span className="overview-indicator-row__claim-label">{claimLabel}</span>
                          ) : null}
                          <StatusChip metric={metric} />
                        </div>
                      </div>
                    </div>
                  </Fragment>
                )
              })}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}
