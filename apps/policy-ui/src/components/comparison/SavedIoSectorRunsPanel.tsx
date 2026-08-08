import { useTranslation } from 'react-i18next'
import {
  formatCurrencyAmount,
  formatNumber,
  formatUnavailable,
} from '../../lib/format/locale-format.js'
import { isIoSectorShockRecord, type SavedScenarioRecord } from '../../state/scenarioStore.js'

type SavedIoSectorRunsPanelProps = {
  records: SavedScenarioRecord[]
  availableCount?: number
  onAddSavedRun?: () => void
}

function formatOptionalNumber(value: number | null, locale: string | undefined): string {
  if (value === null) {
    return formatUnavailable(locale)
  }
  return formatNumber(value, locale, { maximumFractionDigits: 0 })
}

export function SavedIoSectorRunsPanel({
  records,
  availableCount = records.length,
  onAddSavedRun,
}: SavedIoSectorRunsPanelProps) {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const ioRecords = records.filter(isIoSectorShockRecord)

  if (ioRecords.length === 0) {
    if (availableCount > 0) {
      return (
        <section className="cmp-saved-io cmp-saved-io--empty" aria-labelledby="cmp-saved-io-title">
          <div className="cmp-saved-io__head">
            <h4 id="cmp-saved-io-title">{t('comparison.savedIo.title')}</h4>
            <strong>{t('comparison.savedIo.separationNote')}</strong>
            <p>{t('comparison.savedIo.emptyWithAvailable', { count: availableCount })}</p>
          </div>
          {onAddSavedRun ? (
            <button type="button" className="ui-secondary-action" onClick={onAddSavedRun}>
              {t('comparison.savedIo.addAction')}
            </button>
          ) : null}
        </section>
      )
    }
    return null
  }

  return (
    <section className="cmp-saved-io" aria-labelledby="cmp-saved-io-title">
      <div className="cmp-saved-io__head">
        <h4 id="cmp-saved-io-title">{t('comparison.savedIo.title')}</h4>
        <strong>{t('comparison.savedIo.separationNote')}</strong>
        <p>{t('comparison.savedIo.description', { count: ioRecords.length })}</p>
      </div>

      <div className="cmp-saved-io__grid">
        {ioRecords.map((record) => {
          const run = record.io_sector_shock
          return (
            <article className="cmp-saved-io__card" key={record.scenario_id}>
              <div className="cmp-saved-io__card-head">
                <div>
                  <span>{t('comparison.savedIo.type')}</span>
                  <h5>{run.title}</h5>
                </div>
                <span>{run.data_vintage}</span>
              </div>

              <dl className="cmp-saved-io__metrics">
                <div>
                  <span className="claim-label">{t('comparison.savedIo.claimLabels.output')}</span>
                  <dt>{t('comparison.savedIo.metrics.output')}</dt>
                  <dd>
                    {formatCurrencyAmount(run.totals.output_effect_bln_uzs, 'bln_uzs', locale, {
                      maximumFractionDigits: 1,
                      minimumFractionDigits: 1,
                    })}
                  </dd>
                </div>
                <div>
                  <span className="claim-label">{t('comparison.savedIo.claimLabels.output')}</span>
                  <dt>{t('comparison.savedIo.metrics.valueAdded')}</dt>
                  <dd>
                    {formatCurrencyAmount(run.totals.value_added_effect_bln_uzs, 'bln_uzs', locale, {
                      maximumFractionDigits: 1,
                      minimumFractionDigits: 1,
                    })}
                  </dd>
                </div>
                <div>
                  <span className="claim-label">{t('comparison.savedIo.claimLabels.gdpAccounting')}</span>
                  <dt>{t('comparison.savedIo.metrics.gdpAccounting')}</dt>
                  <dd>
                    {formatCurrencyAmount(run.totals.gdp_accounting_contribution_bln_uzs, 'bln_uzs', locale, {
                      maximumFractionDigits: 1,
                      minimumFractionDigits: 1,
                    })}
                  </dd>
                </div>
                <div>
                  <span className="claim-label">{t('comparison.savedIo.claimLabels.employment')}</span>
                  <dt>{t('comparison.savedIo.metrics.employment')}</dt>
                  <dd>
                    {formatOptionalNumber(run.totals.employment_effect_persons, locale)}{' '}
                    {t('comparison.savedIo.employmentUnit')}
                  </dd>
                </div>
              </dl>

              <div className="cmp-saved-io__sectors">
                <h6>{t('comparison.savedIo.topSectors')}</h6>
                <ul>
                  {run.top_sectors.slice(0, 3).map((sector) => (
                    <li key={sector.sector_code}>
                      <span>{sector.sector_code}</span>
                      <strong>{sector.sector_name}</strong>
                      <em>
                        {formatCurrencyAmount(sector.output_effect_bln_uzs, 'bln_uzs', locale, {
                          maximumFractionDigits: 1,
                          minimumFractionDigits: 1,
                        })}
                      </em>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="cmp-saved-io__boundary">{t('comparison.savedIo.boundary')}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
