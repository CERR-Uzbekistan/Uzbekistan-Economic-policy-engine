import { useTranslation } from 'react-i18next'
import type { HeadlineMetric } from '../../contracts/data-contract.js'
import {
  DIRECTION_GLYPH,
  formatOverviewDeltaComparison,
  formatOverviewDeltaWithUnit,
  formatOverviewMetricValueWithUnit,
} from './metric-format.js'

type SupportingMetricTableProps = {
  metrics: HeadlineMetric[]
}

export function SupportingMetricTable({ metrics }: SupportingMetricTableProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'

  if (metrics.length === 0) {
    return <p className="empty-state">{t('overview.kpi.empty')}</p>
  }

  return (
    <div className="overview-supporting-table-wrap">
      <table className="overview-supporting-table">
        <thead>
          <tr>
            <th scope="col">{t('overview.supportingTable.indicator')}</th>
            <th scope="col">{t('overview.supportingTable.latest')}</th>
            <th scope="col">{t('overview.supportingTable.change')}</th>
            <th scope="col">{t('overview.supportingTable.period')}</th>
            <th scope="col">{t('overview.supportingTable.source')}</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => {
            const delta = formatOverviewDeltaWithUnit(metric, locale, t)
            const deltaComparison = formatOverviewDeltaComparison(metric, t)
            const claimLabel = metric.claim_label_key ? t(metric.claim_label_key) : null
            const sourceLabel = metric.source_label ?? metric.citation_label ?? metric.context_note ?? ''
            return (
              <tr key={metric.metric_id} data-metric-id={metric.metric_id}>
                <th scope="row">
                  <span className="overview-supporting-table__label">{metric.label}</span>
                  <span className="overview-supporting-table__claim">{claimLabel}</span>
                </th>
                <td className="overview-supporting-table__value">
                  {formatOverviewMetricValueWithUnit(metric, locale, t)}
                </td>
                <td className="overview-supporting-table__change">
                  {delta ? (
                    <>
                      <span aria-hidden="true">{DIRECTION_GLYPH[metric.direction]}</span>{' '}
                      {delta}
                      {deltaComparison ? ` ${deltaComparison}` : ''}
                    </>
                  ) : (
                    t('overview.kpi.noPrior')
                  )}
                </td>
                <td className="overview-supporting-table__period">{metric.period}</td>
                <td className="overview-supporting-table__source" title={sourceLabel}>
                  {sourceLabel || t('overview.kpi.notAvailable')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
