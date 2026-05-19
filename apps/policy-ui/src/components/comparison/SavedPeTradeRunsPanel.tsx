import { useTranslation } from 'react-i18next'
import { formatNumber, formatPercent, formatUnavailable } from '../../lib/format/locale-format.js'
import { isPeTradeShockRecord, type SavedScenarioRecord } from '../../state/scenarioStore.js'

type SavedPeTradeRunsPanelProps = {
  records: SavedScenarioRecord[]
  availableCount?: number
  onAddSavedRun?: () => void
}

function formatUsdThousand(
  value: number | null | undefined,
  locale: string | undefined,
  unitLabel: string,
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return formatUnavailable(locale)
  }
  return `${formatNumber(value, locale, { maximumFractionDigits: 0 })} ${unitLabel}`
}

export function SavedPeTradeRunsPanel({
  records,
  availableCount = records.length,
  onAddSavedRun,
}: SavedPeTradeRunsPanelProps) {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const usdThousandUnit = t('scenarioLab.peShock.units.usdThousand')
  const peRecords = records.filter(isPeTradeShockRecord)

  if (peRecords.length === 0) {
    if (availableCount > 0) {
      return (
        <section className="cmp-saved-io cmp-saved-io--empty" aria-labelledby="cmp-saved-pe-title">
          <div className="cmp-saved-io__head">
            <h4 id="cmp-saved-pe-title">{t('comparison.savedPe.title')}</h4>
            <strong>{t('comparison.savedPe.separationNote')}</strong>
            <p>{t('comparison.savedPe.emptyWithAvailable', { count: availableCount })}</p>
          </div>
          {onAddSavedRun ? (
            <button type="button" className="ui-secondary-action" onClick={onAddSavedRun}>
              {t('comparison.savedPe.addAction')}
            </button>
          ) : null}
        </section>
      )
    }
    return null
  }

  return (
    <section className="cmp-saved-io" aria-labelledby="cmp-saved-pe-title">
      <div className="cmp-saved-io__head">
        <h4 id="cmp-saved-pe-title">{t('comparison.savedPe.title')}</h4>
        <strong>{t('comparison.savedPe.separationNote')}</strong>
        <p>{t('comparison.savedPe.description', { count: peRecords.length })}</p>
      </div>

      <div className="cmp-saved-io__grid">
        {peRecords.map((record) => {
          const run = record.pe_trade_shock
          return (
            <article className="cmp-saved-io__card" key={record.scenario_id}>
              <div className="cmp-saved-io__card-head">
                <div>
                  <span>{t('comparison.savedPe.type')}</span>
                  <h5>{run.title}</h5>
                </div>
                <span>{run.data_vintage}</span>
              </div>

              <dl className="cmp-saved-io__metrics">
                <div>
                  <span className="claim-label">{t('comparison.savedPe.claimLabels.direct')}</span>
                  <dt>{t('comparison.savedPe.metrics.tradeEffect')}</dt>
                  <dd>{formatUsdThousand(run.totals.trade_effect_usd, locale, usdThousandUnit)}</dd>
                </div>
                <div>
                  <span className="claim-label">{t('comparison.savedPe.claimLabels.welfare')}</span>
                  <dt>{t('comparison.savedPe.metrics.welfare')}</dt>
                  <dd>{formatUsdThousand(run.totals.welfare_usd, locale, usdThousandUnit)}</dd>
                </div>
                <div>
                  <span className="claim-label">{t('comparison.savedPe.claimLabels.revenue')}</span>
                  <dt>{t('comparison.savedPe.metrics.revenue')}</dt>
                  <dd>{formatUsdThousand(run.totals.revenue_change_usd, locale, usdThousandUnit)}</dd>
                </div>
                <div>
                  <span className="claim-label">{t('comparison.savedPe.claimLabels.direct')}</span>
                  <dt>{t('comparison.savedPe.metrics.importShare')}</dt>
                  <dd>{formatPercent(run.totals.partner_import_share * 100, locale, 1)}</dd>
                </div>
              </dl>

              <div className="cmp-saved-io__sectors">
                <h6>{t('comparison.savedPe.topSections')}</h6>
                <ul>
                  {run.top_sections.slice(0, 3).map((section) => (
                    <li key={section.section_id}>
                      <span>{section.section_id}</span>
                      <strong>{section.section_name}</strong>
                      <em>{formatUsdThousand(section.trade_effect_usd, locale, usdThousandUnit)}</em>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="cmp-saved-io__boundary">{t('comparison.savedPe.boundary')}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
