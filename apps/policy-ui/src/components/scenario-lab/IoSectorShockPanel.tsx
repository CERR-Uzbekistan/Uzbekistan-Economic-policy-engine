import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ScenarioLabIoDemandBucket,
  ScenarioLabIoDistributionMode,
  ScenarioLabIoAnalyticsWorkspace,
  ScenarioLabIoShockResult,
  ScenarioLabIoShockCurrency,
  ScenarioLabIoShockRequest,
} from '../../contracts/data-contract.js'
import type { ScenarioLabIoAnalyticsState } from '../../data/scenario-lab/io-analytics-source.js'
import { runScenarioLabIoDemandShock } from '../../data/scenario-lab/io-analytics-source.js'
import {
  formatCurrencyAmount,
  formatNumber,
  formatSectorCount,
  formatUnavailable,
} from '../../lib/format/locale-format.js'

type IoSectorShockPanelProps = {
  state: ScenarioLabIoAnalyticsState
  onRetry: () => void
  onSaveRun?: (result: ScenarioLabIoShockResult, workspace: ScenarioLabIoAnalyticsWorkspace) => void
  saveStatus?: string | null
}

const DEMAND_BUCKETS: ScenarioLabIoDemandBucket[] = [
  'consumption',
  'government',
  'investment',
  'export',
]

const DISTRIBUTION_MODES: ScenarioLabIoDistributionMode[] = [
  'final_demand',
  'output',
  'gva',
  'equal',
  'sector',
]
const CURRENCY_OPTIONS: ScenarioLabIoShockCurrency[] = ['bln_uzs', 'mln_usd']
const DEFAULT_EXCHANGE_RATE_UZS_PER_USD = 12_652.7
const DISPLAYED_SECTOR_COUNT = 5

function formatOptionalNumber(value: number | null, locale: string | undefined): string {
  if (value === null) {
    return formatUnavailable(locale)
  }
  return formatNumber(value, locale, { maximumFractionDigits: 0 })
}

function contributionStyle(value: number | null, maxValue: number): CSSProperties {
  const magnitude = value === null ? 0 : Math.abs(value)
  const width = maxValue > 0 ? Math.max(4, Math.min(100, (magnitude / maxValue) * 100)) : 0
  return { '--io-bar-width': `${width}%` } as CSSProperties
}

function shareStyle(value: number): CSSProperties {
  return { '--io-share-width': `${Math.min(100, Math.max(0, value))}%` } as CSSProperties
}

export function IoSectorShockPanel({ state, onRetry, onSaveRun, saveStatus }: IoSectorShockPanelProps) {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const [demandBucket, setDemandBucket] = useState<ScenarioLabIoDemandBucket>('export')
  const [amount, setAmount] = useState(1000)
  const [currency, setCurrency] = useState<ScenarioLabIoShockCurrency>('bln_uzs')
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE_UZS_PER_USD)
  const [distribution, setDistribution] = useState<ScenarioLabIoDistributionMode>('final_demand')
  const [sectorCode, setSectorCode] = useState('')

  const selectedSectorCode = state.workspace?.sectors.some((sector) => sector.code === sectorCode)
    ? sectorCode
    : state.workspace?.sectors[0]?.code
  const selectedSector = state.workspace?.sectors.find((sector) => sector.code === selectedSectorCode)

  const request: ScenarioLabIoShockRequest = useMemo(
    () => ({
      demand_bucket: demandBucket,
      amount: Number.isFinite(amount) ? amount : 0,
      currency,
      exchange_rate_uzs_per_usd:
        currency === 'mln_usd' && Number.isFinite(exchangeRate) ? exchangeRate : undefined,
      distribution,
      sector_code: distribution === 'sector' ? selectedSectorCode : undefined,
    }),
    [amount, currency, demandBucket, distribution, exchangeRate, selectedSectorCode],
  )

  const result = useMemo(() => {
    if (state.status !== 'ready') {
      return null
    }
    return runScenarioLabIoDemandShock(state.payload, request)
  }, [request, state])
  const sectorContributionMaxima = useMemo(() => {
    if (!result) {
      return {
        output: 0,
        valueAdded: 0,
        employment: 0,
      }
    }
    return {
      output: Math.max(...result.top_sectors.map((sector) => Math.abs(sector.output_effect_bln_uzs)), 0),
      valueAdded: Math.max(
        ...result.top_sectors.map((sector) => Math.abs(sector.value_added_effect_bln_uzs)),
        0,
      ),
      employment: Math.max(
        ...result.top_sectors.map((sector) => Math.abs(sector.employment_effect_persons ?? 0)),
        0,
      ),
    }
  }, [result])
  const concentrationRows = useMemo(
    () => result?.top_sectors.slice(0, DISPLAYED_SECTOR_COUNT) ?? [],
    [result],
  )
  const totalAbsOutputEffect = Math.max(1, Math.abs(result?.totals.output_effect_bln_uzs ?? 0))
  const leadingSector = concentrationRows[0]

  if (state.status === 'loading') {
    return (
      <section
        className="scenario-panel scenario-panel--io-shock"
        id="scenario-model-tabpanel-io_sector_shock"
        role="tabpanel"
        aria-labelledby="scenario-model-tab-io_sector_shock"
      >
        <p className="empty-state" role="status" aria-live="polite">
          {t('scenarioLab.ioShock.loading')}
        </p>
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section
        className="scenario-panel scenario-panel--io-shock"
        id="scenario-model-tabpanel-io_sector_shock"
        role="tabpanel"
        aria-labelledby="scenario-model-tab-io_sector_shock"
      >
        <div className="scenario-panel__head page-section-head">
          <h2>{t('scenarioLab.ioShock.title')}</h2>
          <p>{t('scenarioLab.ioShock.unavailable')}</p>
        </div>
        <button type="button" className="ui-secondary-action" onClick={onRetry}>
          {t('buttons.retry')}
        </button>
      </section>
    )
  }

  return (
    <section
      className="scenario-panel scenario-panel--io-shock io-shock"
      id="scenario-model-tabpanel-io_sector_shock"
      role="tabpanel"
      aria-labelledby="scenario-model-tab-io_sector_shock"
    >
      <div className="scenario-panel__head page-section-head">
        <h2>{t('scenarioLab.ioShock.title')}</h2>
        <p>{t('scenarioLab.ioShock.description')}</p>
      </div>

      <div className="io-shock__layout">
        <div className="io-shock__controls" aria-label={t('scenarioLab.ioShock.controlsAria')}>
          <fieldset>
            <legend>{t('scenarioLab.ioShock.demandBucket')}</legend>
            <div className="io-shock__segments">
              {DEMAND_BUCKETS.map((bucket) => (
                <button
                  key={bucket}
                  type="button"
                  className={demandBucket === bucket ? 'active' : ''}
                  aria-pressed={demandBucket === bucket}
                  onClick={() => setDemandBucket(bucket)}
                >
                  {t(`scenarioLab.ioShock.buckets.${bucket}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <label>
            <span>{t('scenarioLab.ioShock.amount')}</span>
            <input
              type="number"
              value={amount}
              step={100}
              onChange={(event) => setAmount(Number(event.target.value))}
            />
          </label>

          <label>
            <span>{t('scenarioLab.ioShock.currency')}</span>
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as ScenarioLabIoShockCurrency)}
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t(`scenarioLab.ioShock.currencies.${option}`)}
                </option>
              ))}
            </select>
          </label>

          {currency === 'mln_usd' ? (
            <label>
              <span>{t('scenarioLab.ioShock.exchangeRate')}</span>
              <input
                type="number"
                value={exchangeRate}
                step={10}
                onChange={(event) => setExchangeRate(Number(event.target.value))}
              />
            </label>
          ) : null}

          <label>
            <span>{t('scenarioLab.ioShock.distribution')}</span>
            <select
              value={distribution}
              onChange={(event) => setDistribution(event.target.value as ScenarioLabIoDistributionMode)}
            >
              {DISTRIBUTION_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {t(`scenarioLab.ioShock.distributions.${mode}`)}
                </option>
              ))}
            </select>
          </label>

          {distribution === 'sector' ? (
            <label className="io-shock__sector-select">
              <span>{t('scenarioLab.ioShock.sector')}</span>
              <select value={selectedSectorCode} onChange={(event) => setSectorCode(event.target.value)}>
                {state.workspace.sectors.map((sector) => (
                  <option key={sector.code} value={sector.code}>
                    {sector.code} · {sector.name}
                  </option>
                ))}
              </select>
              <small>{t('scenarioLab.ioShock.sectorHint', { sectorCount: formatSectorCount(state.workspace.sector_count, locale) })}</small>
            </label>
          ) : null}

          <div className="io-shock__summary" aria-label={t('scenarioLab.ioShock.summary.title')}>
            <h3>{t('scenarioLab.ioShock.summary.title')}</h3>
            <dl>
              <div>
                <dt>{t('scenarioLab.ioShock.summary.bucket')}</dt>
                <dd>{t(`scenarioLab.ioShock.buckets.${request.demand_bucket}`)}</dd>
              </div>
              <div>
                <dt>{t('scenarioLab.ioShock.summary.amount')}</dt>
                <dd>
                  {formatCurrencyAmount(request.amount, request.currency, locale, {
                    maximumFractionDigits: 1,
                    minimumFractionDigits: 1,
                  })}
                </dd>
              </div>
              {request.currency === 'mln_usd' ? (
                <div>
                  <dt>{t('scenarioLab.ioShock.summary.fx')}</dt>
                  <dd>
                    {formatCurrencyAmount(request.exchange_rate_uzs_per_usd ?? 0, 'uzs_usd', locale, {
                      maximumFractionDigits: 1,
                      minimumFractionDigits: 1,
                    })}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>{t('scenarioLab.ioShock.summary.distribution')}</dt>
                <dd>{t(`scenarioLab.ioShock.distributions.${request.distribution}`)}</dd>
              </div>
              {request.distribution === 'sector' && selectedSector ? (
                <div>
                  <dt>{t('scenarioLab.ioShock.summary.selectedSector')}</dt>
                  <dd>
                    {selectedSector.code} · {selectedSector.name}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>{t('scenarioLab.ioShock.summary.dataVintage')}</dt>
                <dd>{state.workspace.data_vintage}</dd>
              </div>
            </dl>
          </div>

          <div className="io-shock__boundary">
            <p>{t('scenarioLab.ioShock.boundary')}</p>
            <p>{t('scenarioLab.ioShock.employmentBoundary')}</p>
          </div>
        </div>

        {result ? (
          <div className="io-shock__results">
            <section className="io-shock__decision-card" aria-labelledby="io-shock-decision-title">
              <div className="io-shock__decision-head">
                <span>{t('scenarioLab.ioShock.decision.eyebrow')}</span>
                <h3 id="io-shock-decision-title">{t('scenarioLab.ioShock.decision.title')}</h3>
                <p>
                  {t('scenarioLab.ioShock.decision.lead', {
                    bucket: t(`scenarioLab.ioShock.buckets.${request.demand_bucket}`),
                    amount: formatCurrencyAmount(request.amount, request.currency, locale, {
                      maximumFractionDigits: 1,
                      minimumFractionDigits: 1,
                    }),
                    distribution: t(`scenarioLab.ioShock.distributions.${request.distribution}`),
                  })}
                </p>
              </div>

              <dl className="io-shock__metric-strip">
                <div className="io-shock__metric-card">
                  <dt>{t('scenarioLab.ioShock.kpis.output')}</dt>
                  <dd>
                    {formatCurrencyAmount(result.totals.output_effect_bln_uzs, 'bln_uzs', locale, {
                      maximumFractionDigits: 1,
                      minimumFractionDigits: 1,
                    })}
                  </dd>
                  <span>{t('scenarioLab.ioShock.kpis.outputNote')}</span>
                </div>
                <div className="io-shock__metric-card">
                  <dt>{t('scenarioLab.ioShock.kpis.valueAdded')}</dt>
                  <dd>
                    {formatCurrencyAmount(result.totals.value_added_effect_bln_uzs, 'bln_uzs', locale, {
                      maximumFractionDigits: 1,
                      minimumFractionDigits: 1,
                    })}
                  </dd>
                  <span>{t('scenarioLab.ioShock.kpis.valueAddedNote')}</span>
                </div>
                <div className="io-shock__metric-card">
                  <dt>{t('scenarioLab.ioShock.kpis.employment')}</dt>
                  <dd>
                    {formatOptionalNumber(result.totals.employment_effect_persons, locale)}
                  </dd>
                  <span>{t('scenarioLab.ioShock.kpis.employmentNote')}</span>
                </div>
                <div className="io-shock__metric-card">
                  <dt>{t('scenarioLab.ioShock.kpis.multiplier')}</dt>
                  <dd>
                    {result.totals.aggregate_output_multiplier === null
                      ? formatUnavailable(locale)
                      : formatNumber(result.totals.aggregate_output_multiplier, locale, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      })}
                  </dd>
                  <span>{t('scenarioLab.ioShock.kpis.multiplierNote')}</span>
                </div>
              </dl>

              <div className="io-shock__meta">
                <span>{state.workspace.framework}</span>
                <span>{t('scenarioLab.ioShock.meta.dataVintage', { vintage: state.workspace.data_vintage })}</span>
                <span>{formatSectorCount(state.workspace.sector_count, locale)}</span>
                <span>
                  {t('scenarioLab.ioShock.convertedShock', {
                    amount: formatCurrencyAmount(result.totals.demand_shock_bln_uzs, 'bln_uzs', locale, {
                      maximumFractionDigits: 1,
                      minimumFractionDigits: 1,
                    }),
                  })}
                </span>
              </div>
            </section>

            {onSaveRun ? (
              <div className="io-shock__actions">
                <button type="button" className="ui-secondary-action" onClick={() => onSaveRun(result, state.workspace)}>
                  {t('scenarioLab.ioShock.saveRun')}
                </button>
                {saveStatus ? (
                  <p className="io-shock__save-status" role="status" aria-live="polite">
                    {saveStatus}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="io-shock__analysis-grid">
              <section className="io-shock__concentration" aria-labelledby="io-shock-concentration-title">
                <div className="io-shock__block-head">
                  <h3 id="io-shock-concentration-title">{t('scenarioLab.ioShock.concentration.title')}</h3>
                  <p>{t('scenarioLab.ioShock.concentration.subtitle')}</p>
                </div>
                <ol className="io-shock__ranked-bars">
                  {concentrationRows.map((sector, index) => {
                    const outputShare = (Math.abs(sector.output_effect_bln_uzs) / totalAbsOutputEffect) * 100
                    return (
                      <li key={sector.sector_code}>
                        <span className="io-shock__rank">{index + 1}</span>
                        <div className="io-shock__sector-effect">
                          <div className="io-shock__sector-title">
                            <strong>{sector.sector_name}</strong>
                            <span>{sector.sector_code} · {t(`comparison.ioEvidence.linkageClass.${sector.linkage_classification}`)}</span>
                          </div>
                          <span className="io-shock__share-track" style={shareStyle(outputShare)} aria-hidden="true">
                            <span />
                          </span>
                          <dl>
                            <div>
                              <dt>{t('scenarioLab.ioShock.table.output')}</dt>
                              <dd>{formatNumber(sector.output_effect_bln_uzs, locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</dd>
                            </div>
                            <div>
                              <dt>{t('scenarioLab.ioShock.table.valueAdded')}</dt>
                              <dd>{formatNumber(sector.value_added_effect_bln_uzs, locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</dd>
                            </div>
                            <div>
                              <dt>{t('scenarioLab.ioShock.table.employment')}</dt>
                              <dd>{formatOptionalNumber(sector.employment_effect_persons, locale)}</dd>
                            </div>
                            <div>
                              <dt>{t('scenarioLab.ioShock.concentration.share')}</dt>
                              <dd>{formatNumber(outputShare, locale, { maximumFractionDigits: 0 })}%</dd>
                            </div>
                          </dl>
                        </div>
                      </li>
                    )
                  })}
                </ol>
                <p className="io-shock__source-note">
                  {t('scenarioLab.ioShock.sourceLabelNote', {
                    artifact: state.workspace.source_artifact,
                  })}
                </p>
              </section>

              <aside className="io-shock__insight-rail" aria-label={t('scenarioLab.ioShock.interpretation.title')}>
                <h3>{t('scenarioLab.ioShock.interpretation.title')}</h3>
                <div>
                  <strong>{t('scenarioLab.ioShock.interpretation.exposure')}</strong>
                  <p>
                    {leadingSector
                      ? t('scenarioLab.ioShock.interpretation.exposureBody', {
                        sector: leadingSector.sector_name,
                        share: formatNumber(
                          (Math.abs(leadingSector.output_effect_bln_uzs) / totalAbsOutputEffect) * 100,
                          locale,
                          { maximumFractionDigits: 0 },
                        ),
                      })
                      : t('scenarioLab.ioShock.interpretation.noExposure')}
                  </p>
                </div>
                <div>
                  <strong>{t('scenarioLab.ioShock.interpretation.boundary')}</strong>
                  <p>{t('scenarioLab.ioShock.interpretation.boundaryBody')}</p>
                </div>
                <div>
                  <strong>{t('scenarioLab.ioShock.interpretation.nextUse')}</strong>
                  <p>{t('scenarioLab.ioShock.interpretation.nextUseBody')}</p>
                </div>
              </aside>
            </div>

            <details className="io-shock__caveats">
              <summary>{t('scenarioLab.ioShock.detailTable')}</summary>
              <div className="io-shock__table-wrap">
                <table className="io-shock__table">
                  <thead>
                    <tr>
                      <th>{t('scenarioLab.ioShock.table.rank')}</th>
                      <th>{t('scenarioLab.ioShock.table.sector')}</th>
                      <th>{t('scenarioLab.ioShock.table.output')}</th>
                      <th>{t('scenarioLab.ioShock.table.valueAdded')}</th>
                      <th>{t('scenarioLab.ioShock.table.employment')}</th>
                      <th>{t('scenarioLab.ioShock.table.linkage')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.top_sectors.map((sector, index) => (
                      <tr key={sector.sector_code}>
                        <td className="io-shock__table-rank">{index + 1}</td>
                        <th scope="row">
                          <span>{t('scenarioLab.ioShock.table.sectorCode')}: {sector.sector_code}</span>
                          <strong>{t('scenarioLab.ioShock.table.sourceLabel')}: {sector.sector_name}</strong>
                        </th>
                        <td>
                          <span
                            className="io-shock__bar-cell"
                            style={contributionStyle(
                              sector.output_effect_bln_uzs,
                              sectorContributionMaxima.output,
                            )}
                          >
                            <span className="io-shock__bar-cell-track" aria-hidden="true">
                              <span className="io-shock__bar-cell-fill" />
                            </span>
                            <span>{formatNumber(sector.output_effect_bln_uzs, locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</span>
                          </span>
                        </td>
                        <td>
                          <span
                            className="io-shock__bar-cell"
                            style={contributionStyle(
                              sector.value_added_effect_bln_uzs,
                              sectorContributionMaxima.valueAdded,
                            )}
                          >
                            <span className="io-shock__bar-cell-track" aria-hidden="true">
                              <span className="io-shock__bar-cell-fill" />
                            </span>
                            <span>{formatNumber(sector.value_added_effect_bln_uzs, locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</span>
                          </span>
                        </td>
                        <td>
                          <span
                            className="io-shock__bar-cell"
                            style={contributionStyle(
                              sector.employment_effect_persons,
                              sectorContributionMaxima.employment,
                            )}
                          >
                            <span className="io-shock__bar-cell-track" aria-hidden="true">
                              <span className="io-shock__bar-cell-fill" />
                            </span>
                            <span>{formatOptionalNumber(sector.employment_effect_persons, locale)}</span>
                          </span>
                        </td>
                        <td>{t(`comparison.ioEvidence.linkageClass.${sector.linkage_classification}`)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            <details className="io-shock__caveats">
              <summary>{t('scenarioLab.ioShock.caveats')}</summary>
              <ul>
                {result.caveats.map((caveat) => (
                  <li key={caveat}>{caveat}</li>
                ))}
              </ul>
            </details>
          </div>
        ) : null}
      </div>
    </section>
  )
}
