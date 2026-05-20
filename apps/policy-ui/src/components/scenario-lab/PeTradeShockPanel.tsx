import { useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ScenarioLabPeAnalyticsWorkspace,
  ScenarioLabPeShockRequest,
  ScenarioLabPeShockResult,
} from '../../contracts/data-contract.js'
import type { ScenarioLabPeAnalyticsState } from '../../data/scenario-lab/pe-analytics-source.js'
import { runScenarioLabPeTradeShock } from '../../data/scenario-lab/pe-analytics-source.js'
import { formatNumber, formatPercent, formatUnavailable } from '../../lib/format/locale-format.js'

type PeTradeShockPanelProps = {
  state: ScenarioLabPeAnalyticsState
  onRetry: () => void
  onSaveRun?: (result: ScenarioLabPeShockResult, workspace: ScenarioLabPeAnalyticsWorkspace) => void
  saveStatus?: string | null
}

const ALL_VALUE = 'all'
const DEFAULT_TARIFF_CUT_PCT = 20

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

function formatSignedUsdThousand(
  value: number | null | undefined,
  locale: string | undefined,
  unitLabel: string,
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return formatUnavailable(locale)
  }
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${formatNumber(Math.abs(value), locale, { maximumFractionDigits: 0 })} ${unitLabel}`
}

function selectedOptionExists(options: string[], selected: string): boolean {
  return selected === ALL_VALUE || options.includes(selected)
}

function barStyle(value: number, maxAbsValue: number): CSSProperties {
  const width = maxAbsValue > 0 ? Math.max(4, (Math.abs(value) / maxAbsValue) * 100) : 0
  return { '--io-bar-width': `${width}%` } as CSSProperties
}

export function PeTradeShockPanel({ state, onRetry, onSaveRun, saveStatus }: PeTradeShockPanelProps) {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const usdThousandUnit = t('scenarioLab.peShock.units.usdThousand')
  const [tariffCutPct, setTariffCutPct] = useState(DEFAULT_TARIFF_CUT_PCT)
  const [sectionId, setSectionId] = useState(ALL_VALUE)
  const [regime, setRegime] = useState(ALL_VALUE)
  const [partnerName, setPartnerName] = useState(ALL_VALUE)

  const selectedSectionId =
    state.workspace?.sections.some((section) => section.id === sectionId) || sectionId === ALL_VALUE
      ? sectionId
      : ALL_VALUE
  const regimeOptions = state.workspace?.regimes ?? [ALL_VALUE]
  const selectedRegime = selectedOptionExists(regimeOptions, regime) ? regime : ALL_VALUE
  const partnerOptions = state.workspace?.partners.map((partner) => partner.name) ?? []
  const selectedPartnerName = selectedOptionExists(partnerOptions, partnerName) ? partnerName : ALL_VALUE

  const request: ScenarioLabPeShockRequest = useMemo(
    () => ({
      tariff_cut_pct: Number.isFinite(tariffCutPct) ? tariffCutPct : DEFAULT_TARIFF_CUT_PCT,
      section_id: selectedSectionId,
      regime: selectedRegime,
      partner_name: selectedPartnerName,
    }),
    [selectedPartnerName, selectedRegime, selectedSectionId, tariffCutPct],
  )

  const result = useMemo(() => {
    if (state.status !== 'ready') return null
    return runScenarioLabPeTradeShock(state.payload, request)
  }, [request, state])
  const maxTradeEffect = useMemo(
    () => Math.max(1, ...(result?.top_sections.map((section) => Math.abs(section.trade_effect_usd)) ?? [])),
    [result],
  )
  const maxRevenueEffect = useMemo(
    () => Math.max(1, ...(result?.top_sections.map((section) => Math.abs(section.revenue_change_usd)) ?? [])),
    [result],
  )
  const selectedSectionName =
    request.section_id === ALL_VALUE
      ? t('scenarioLab.peShock.allSections')
      : state.workspace?.sections.find((section) => section.id === request.section_id)?.name ?? request.section_id
  const selectedScopeLabel =
    request.partner_name !== ALL_VALUE
      ? request.partner_name
      : request.regime !== ALL_VALUE
        ? t('scenarioLab.peShock.scope.regime', { regime: request.regime.toUpperCase() })
        : t('scenarioLab.peShock.allPartners')

  if (state.status === 'loading') {
    return (
      <section
        className="scenario-panel scenario-panel--pe-shock"
        id="scenario-model-tabpanel-pe_trade_shock"
        role="tabpanel"
        aria-labelledby="scenario-model-tab-pe_trade_shock"
      >
        <p className="empty-state" role="status" aria-live="polite">
          {t('scenarioLab.peShock.loading')}
        </p>
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section
        className="scenario-panel scenario-panel--pe-shock"
        id="scenario-model-tabpanel-pe_trade_shock"
        role="tabpanel"
        aria-labelledby="scenario-model-tab-pe_trade_shock"
      >
        <div className="scenario-panel__head page-section-head">
          <h2>{t('scenarioLab.peShock.title')}</h2>
          <p>{t('scenarioLab.peShock.unavailable')}</p>
        </div>
        <button type="button" className="ui-secondary-action" onClick={onRetry}>
          {t('buttons.retry')}
        </button>
      </section>
    )
  }

  return (
    <section
      className="scenario-panel scenario-panel--pe-shock io-shock pe-shock"
      id="scenario-model-tabpanel-pe_trade_shock"
      role="tabpanel"
      aria-labelledby="scenario-model-tab-pe_trade_shock"
    >
      <div className="scenario-panel__head page-section-head">
        <h2>{t('scenarioLab.peShock.title')}</h2>
        <p>{t('scenarioLab.peShock.description')}</p>
      </div>

      <div className="io-shock__layout pe-shock__layout">
        <div className="io-shock__controls pe-shock__setup" aria-label={t('scenarioLab.peShock.controlsAria')}>
          <div className="pe-shock__section-head">
            <span>{t('scenarioLab.peShock.setup.step')}</span>
            <h3>{t('scenarioLab.peShock.setup.title')}</h3>
            <p>{t('scenarioLab.peShock.setup.description')}</p>
          </div>

          <label>
            <span>{t('scenarioLab.peShock.tariffCut')}</span>
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              value={tariffCutPct}
              onChange={(event) => setTariffCutPct(Number(event.target.value))}
            />
          </label>

          <label>
            <span>{t('scenarioLab.peShock.section')}</span>
            <select value={selectedSectionId} onChange={(event) => setSectionId(event.target.value)}>
              <option value={ALL_VALUE}>{t('scenarioLab.peShock.allSections')}</option>
              {state.workspace.sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.id} · {section.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{t('scenarioLab.peShock.regime')}</span>
            <select value={selectedRegime} onChange={(event) => setRegime(event.target.value)}>
              {regimeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === ALL_VALUE ? t('scenarioLab.peShock.allRegimes') : option}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{t('scenarioLab.peShock.partner')}</span>
            <select value={selectedPartnerName} onChange={(event) => setPartnerName(event.target.value)}>
              <option value={ALL_VALUE}>{t('scenarioLab.peShock.allPartners')}</option>
              {state.workspace.partners.map((partner) => (
                <option key={partner.name} value={partner.name}>
                  {partner.name} · {formatPercent(partner.import_share * 100, locale, 1)}
                </option>
              ))}
            </select>
          </label>

          <div className="io-shock__summary pe-shock__baseline" aria-label={t('scenarioLab.peShock.baseline.title')}>
            <h3>{t('scenarioLab.peShock.baseline.title')}</h3>
            <dl>
              <div>
                <dt>{t('scenarioLab.peShock.baseline.importBase')}</dt>
                <dd>{formatUsdThousand(result?.totals.import_base_usd, locale, usdThousandUnit)}</dd>
              </div>
              <div>
                <dt>{t('scenarioLab.peShock.baseline.importCoverage')}</dt>
                <dd>{formatPercent((result?.totals.partner_import_share ?? 0) * 100, locale, 1)}</dd>
              </div>
              <div>
                <dt>{t('scenarioLab.peShock.baseline.baseYear')}</dt>
                <dd>{state.workspace.data_vintage}</dd>
              </div>
              <div>
                <dt>{t('scenarioLab.peShock.baseline.sourceScope')}</dt>
                <dd>{t('scenarioLab.peShock.meta.sections', { count: state.workspace.section_count })}</dd>
              </div>
            </dl>
          </div>

          <div className="io-shock__summary pe-shock__summary" aria-label={t('scenarioLab.peShock.summary.title')}>
            <h3>{t('scenarioLab.peShock.summary.title')}</h3>
            <dl>
              <div>
                <dt>{t('scenarioLab.peShock.summary.cut')}</dt>
                <dd>{formatPercent(request.tariff_cut_pct, locale, 1)}</dd>
              </div>
              <div>
                <dt>{t('scenarioLab.peShock.summary.section')}</dt>
                <dd>{selectedSectionName}</dd>
              </div>
              <div>
                <dt>{t('scenarioLab.peShock.summary.partnerScope')}</dt>
                <dd>{selectedScopeLabel}</dd>
              </div>
              <div>
                <dt>{t('scenarioLab.peShock.summary.dataVintage')}</dt>
                <dd>{state.workspace.data_vintage}</dd>
              </div>
            </dl>
          </div>

          <div className="io-shock__boundary">
            <p>{t('scenarioLab.peShock.boundary')}</p>
            <p>{t('scenarioLab.peShock.partnerBoundary')}</p>
          </div>
        </div>

        {result ? (
          <div className="io-shock__results">
            <section className="pe-shock__decision" aria-labelledby="pe-shock-decision-title">
              <span className="claim-label">{t('scenarioLab.peShock.claimLabels.direct')}</span>
              <h3 id="pe-shock-decision-title">{t('scenarioLab.peShock.decision.title')}</h3>
              <p>
                {t('scenarioLab.peShock.decision.body', {
                  cut: formatPercent(request.tariff_cut_pct, locale, 1),
                  scope: selectedSectionName,
                  partnerScope: selectedScopeLabel,
                  tradeEffect: formatUsdThousand(result.totals.trade_effect_usd, locale, usdThousandUnit),
                  welfare: formatUsdThousand(result.totals.welfare_usd, locale, usdThousandUnit),
                  revenue: formatSignedUsdThousand(result.totals.revenue_change_usd, locale, usdThousandUnit),
                })}
              </p>
            </section>

            <dl className="pe-shock__tradeoff">
              <div className="pe-shock__tradeoff-item pe-shock__tradeoff-item--benefit">
                <dt>{t('scenarioLab.peShock.kpis.welfare')}</dt>
                <dd>{formatUsdThousand(result.totals.welfare_usd, locale, usdThousandUnit)}</dd>
                <span>{t('scenarioLab.peShock.tradeoff.benefit')}</span>
              </div>
              <div className="pe-shock__tradeoff-item pe-shock__tradeoff-item--cost">
                <dt>{t('scenarioLab.peShock.kpis.revenue')}</dt>
                <dd>{formatSignedUsdThousand(result.totals.revenue_change_usd, locale, usdThousandUnit)}</dd>
                <span>{t('scenarioLab.peShock.tradeoff.fiscalCost')}</span>
              </div>
              <div className="pe-shock__tradeoff-item">
                <dt>{t('scenarioLab.peShock.kpis.tradeEffect')}</dt>
                <dd>{formatUsdThousand(result.totals.trade_effect_usd, locale, usdThousandUnit)}</dd>
                <span>{t('scenarioLab.peShock.tradeoff.tradeExpansion')}</span>
              </div>
              <div className="pe-shock__tradeoff-item">
                <dt>{t('scenarioLab.peShock.kpis.impactPct')}</dt>
                <dd>{formatPercent(result.totals.impact_pct, locale, 2)}</dd>
                <span>{t('scenarioLab.peShock.tradeoff.importBase')}</span>
              </div>
            </dl>

            <div className="io-shock__meta">
              <span>{state.workspace.framework}</span>
              <span>{state.workspace.data_vintage}</span>
              <span>{t('scenarioLab.peShock.meta.sections', { count: state.workspace.section_count })}</span>
              <span>{t('scenarioLab.peShock.meta.partners', { count: state.workspace.partner_count })}</span>
            </div>

            {onSaveRun ? (
              <div className="io-shock__actions pe-shock__actions">
                <button type="button" className="ui-secondary-action" onClick={() => onSaveRun(result, state.workspace)}>
                  {t('scenarioLab.peShock.saveRun')}
                </button>
                <span>{t('scenarioLab.peShock.saveRunHint')}</span>
                {saveStatus ? (
                  <p className="io-shock__save-status" role="status" aria-live="polite">
                    {saveStatus}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="io-shock__table-wrap">
              <h3>{t('scenarioLab.peShock.topSections')}</h3>
              <p className="io-shock__source-note">
                {t('scenarioLab.peShock.sourceLabelNote', {
                  source: state.workspace.source_artifact,
                })}
              </p>
              <table className="io-shock__table">
                <thead>
                  <tr>
                    <th>{t('scenarioLab.peShock.table.rank')}</th>
                    <th>{t('scenarioLab.peShock.table.section')}</th>
                    <th>{t('scenarioLab.peShock.table.importBase')}</th>
                    <th>{t('scenarioLab.peShock.table.tradeEffect')}</th>
                    <th>{t('scenarioLab.peShock.table.welfare')}</th>
                    <th>{t('scenarioLab.peShock.table.revenue')}</th>
                    <th>{t('scenarioLab.peShock.table.elasticity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.top_sections.map((section, index) => (
                    <tr key={section.section_id}>
                      <td className="io-shock__rank">{index + 1}</td>
                      <th scope="row">
                        <span>{section.section_id}</span>
                        <strong>{section.section_name}</strong>
                      </th>
                      <td>{formatUsdThousand(section.import_usd, locale, usdThousandUnit)}</td>
                      <td>
                        <span className="io-shock__bar-cell">
                          <span className="io-shock__bar-cell-track">
                            <span
                              className="io-shock__bar-cell-fill"
                              style={barStyle(section.trade_effect_usd, maxTradeEffect)}
                            />
                          </span>
                          <span>{formatUsdThousand(section.trade_effect_usd, locale, usdThousandUnit)}</span>
                        </span>
                      </td>
                      <td>{formatUsdThousand(section.welfare_usd, locale, usdThousandUnit)}</td>
                      <td>
                        <span className="io-shock__bar-cell pe-shock__bar-cell--revenue">
                          <span className="io-shock__bar-cell-track">
                            <span
                              className="io-shock__bar-cell-fill"
                              style={barStyle(section.revenue_change_usd, maxRevenueEffect)}
                            />
                          </span>
                          <span>{formatSignedUsdThousand(section.revenue_change_usd, locale, usdThousandUnit)}</span>
                        </span>
                      </td>
                      <td>{formatNumber(section.elasticity, locale, { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <details className="io-shock__caveats">
              <summary>{t('scenarioLab.peShock.caveats')}</summary>
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
