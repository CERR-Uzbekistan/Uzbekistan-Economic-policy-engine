import { useTranslation } from 'react-i18next'
import { isIoSectorShockRecord, type SavedScenarioRecord } from '../../state/scenarioStore.js'

type SavedIoSectorRunsPanelProps = {
  records: SavedScenarioRecord[]
  availableCount?: number
  onAddSavedRun?: () => void
}

function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

function formatOptionalNumber(value: number | null): string {
  if (value === null) {
    return 'n/a'
  }
  return formatNumber(value, 0)
}

export function SavedIoSectorRunsPanel({
  records,
  availableCount = records.length,
  onAddSavedRun,
}: SavedIoSectorRunsPanelProps) {
  const { t } = useTranslation()
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
                  <dd>{formatNumber(run.totals.output_effect_bln_uzs)} bln UZS</dd>
                </div>
                <div>
                  <span className="claim-label">{t('comparison.savedIo.claimLabels.output')}</span>
                  <dt>{t('comparison.savedIo.metrics.valueAdded')}</dt>
                  <dd>{formatNumber(run.totals.value_added_effect_bln_uzs)} bln UZS</dd>
                </div>
                <div>
                  <span className="claim-label">{t('comparison.savedIo.claimLabels.gdpAccounting')}</span>
                  <dt>{t('comparison.savedIo.metrics.gdpAccounting')}</dt>
                  <dd>{formatNumber(run.totals.gdp_accounting_contribution_bln_uzs)} bln UZS</dd>
                </div>
                <div>
                  <span className="claim-label">{t('comparison.savedIo.claimLabels.employment')}</span>
                  <dt>{t('comparison.savedIo.metrics.employment')}</dt>
                  <dd>
                    {formatOptionalNumber(run.totals.employment_effect_persons)}{' '}
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
                      <em>{formatNumber(sector.output_effect_bln_uzs)} bln UZS</em>
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
