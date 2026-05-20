import { useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ScenarioLabPeAnalyticsWorkspace,
  ScenarioLabPeSectionEffect,
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
const CONCENTRATION_ROWS = 5

function formatUsdMillion(
  value: number | null | undefined,
  locale: string | undefined,
  unitLabel: string,
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return formatUnavailable(locale)
  }
  return `${formatNumber(value / 1000, locale, { maximumFractionDigits: 0 })} ${unitLabel}`
}

function formatSignedUsdMillion(
  value: number | null | undefined,
  locale: string | undefined,
  unitLabel: string,
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return formatUnavailable(locale)
  }
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${formatNumber(Math.abs(value) / 1000, locale, { maximumFractionDigits: 0 })} ${unitLabel}`
}

function selectedOptionExists(options: string[], selected: string): boolean {
  return selected === ALL_VALUE || options.includes(selected)
}

function barStyle(value: number, maxAbsValue: number): CSSProperties {
  const width = maxAbsValue > 0 ? Math.max(4, (Math.abs(value) / maxAbsValue) * 100) : 0
  return { '--io-bar-width': `${width}%` } as CSSProperties
}

function getShortSectionName(section: ScenarioLabPeSectionEffect): string {
  return section.section_name.replace(/\s+and\s+/gi, ' & ')
}

export function PeTradeShockPanel({ state, onRetry, onSaveRun, saveStatus }: PeTradeShockPanelProps) {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const usdMillionUnit = t('scenarioLab.peShock.units.usdMillion')
  const [tariffCutPct, setTariffCutPct] = useState(DEFAULT_TARIFF_CUT_PCT)
  const [sectionId, setSectionId] = useState(ALL_VALUE)
  const [regime, setRegime] = useState(ALL_VALUE)
  const [partnerName, setPartnerName] = useState(ALL_VALUE)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

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
  const concentrationRows = useMemo(() => result?.top_sections.slice(0, CONCENTRATION_ROWS) ?? [], [result])
  const maxTradeEffect = useMemo(
    () => Math.max(1, ...concentrationRows.map((section) => Math.abs(section.trade_effect_usd))),
    [concentrationRows],
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
  const leadingSection = concentrationRows[0]
  const resultNote = result
    ? t('scenarioLab.peShock.copyNote', {
        cut: formatPercent(request.tariff_cut_pct, locale, 1),
        scope: selectedSectionName,
        partnerScope: selectedScopeLabel,
        tradeEffect: formatSignedUsdMillion(result.totals.trade_effect_usd, locale, usdMillionUnit),
        welfare: formatSignedUsdMillion(result.totals.welfare_usd, locale, usdMillionUnit),
        revenue: formatSignedUsdMillion(result.totals.revenue_change_usd, locale, usdMillionUnit),
      })
    : ''

  async function handleCopyResultNote() {
    if (!resultNote) return
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      setCopyStatus(t('scenarioLab.peShock.copyUnavailable'))
      return
    }
    try {
      await navigator.clipboard.writeText(resultNote)
      setCopyStatus(t('scenarioLab.peShock.copyStatus'))
    } catch {
      setCopyStatus(t('scenarioLab.peShock.copyUnavailable'))
    }
  }

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
      <div className="scenario-panel__head page-section-head pe-shock__header">
        <h2>{t('scenarioLab.peShock.title')}</h2>
        <p>{t('scenarioLab.peShock.description')}</p>
      </div>

      <div className="pe-shock__workspace">
        <aside className="pe-shock__setup-card" aria-label={t('scenarioLab.peShock.controlsAria')}>
          <div className="pe-shock__section-head">
            <h3>{t('scenarioLab.peShock.setup.title')}</h3>
            <p>{t('scenarioLab.peShock.setup.description')}</p>
          </div>

          <fieldset className="pe-shock__tariff-field">
            <legend>{t('scenarioLab.peShock.tariffChange')}</legend>
            <div className="pe-shock__tariff-control">
              <div className="pe-shock__direction" aria-label={t('scenarioLab.peShock.directionLabel')}>
                <button type="button" className="active" aria-pressed="true">
                  {t('scenarioLab.peShock.direction.cut')}
                </button>
                <button type="button" disabled title={t('scenarioLab.peShock.direction.increaseDisabled')}>
                  {t('scenarioLab.peShock.direction.increase')}
                </button>
              </div>
              <label className="pe-shock__pct-input">
                <span>{t('scenarioLab.peShock.tariffCut')}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={tariffCutPct}
                  onChange={(event) => setTariffCutPct(Number(event.target.value))}
                />
                <b aria-hidden="true">%</b>
              </label>
            </div>
          </fieldset>

          <label className="pe-shock__field">
            <span>{t('scenarioLab.peShock.productScope')}</span>
            <select value={selectedSectionId} onChange={(event) => setSectionId(event.target.value)}>
              <option value={ALL_VALUE}>{t('scenarioLab.peShock.allSections')}</option>
              {state.workspace.sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.id} · {section.name}
                </option>
              ))}
            </select>
          </label>

          <label className="pe-shock__field">
            <span>{t('scenarioLab.peShock.partnerScope')}</span>
            <select value={selectedPartnerName} onChange={(event) => setPartnerName(event.target.value)}>
              <option value={ALL_VALUE}>{t('scenarioLab.peShock.allPartners')}</option>
              {state.workspace.partners.map((partner) => (
                <option key={partner.name} value={partner.name}>
                  {partner.name} · {formatPercent(partner.import_share * 100, locale, 1)}
                </option>
              ))}
            </select>
          </label>

          <label className="pe-shock__field">
            <span>{t('scenarioLab.peShock.regime')}</span>
            <select value={selectedRegime} onChange={(event) => setRegime(event.target.value)}>
              {regimeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === ALL_VALUE ? t('scenarioLab.peShock.allRegimes') : option.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <div className="pe-shock__coverage" aria-label={t('scenarioLab.peShock.baseline.title')}>
            <h3>{t('scenarioLab.peShock.baseline.title')}</h3>
            <dl>
              <div>
                <dt>{t('scenarioLab.peShock.baseline.importBase')}</dt>
                <dd>{formatUsdMillion(result?.totals.import_base_usd, locale, usdMillionUnit)}</dd>
              </div>
              <div>
                <dt>{t('scenarioLab.peShock.baseline.importCoverage')}</dt>
                <dd>{formatPercent((result?.totals.partner_import_share ?? 0) * 100, locale, 1)}</dd>
              </div>
              <div>
                <dt>{t('scenarioLab.peShock.baseline.sourceScope')}</dt>
                <dd>{t('scenarioLab.peShock.meta.sections', { count: state.workspace.section_count })}</dd>
              </div>
              <div>
                <dt>{t('scenarioLab.peShock.baseline.baseYear')}</dt>
                <dd>{state.workspace.data_vintage}</dd>
              </div>
            </dl>
          </div>

          <div className="pe-shock__boundary">
            <p>{t('scenarioLab.peShock.boundary')}</p>
            <p>{t('scenarioLab.peShock.partnerBoundary')}</p>
          </div>
        </aside>

        {result ? (
          <div className="pe-shock__decision-view">
            <section className="pe-shock__decision-card" aria-labelledby="pe-shock-decision-title">
              <div className="pe-shock__decision-head">
                <span>{t('scenarioLab.peShock.decision.eyebrow')}</span>
                <h3 id="pe-shock-decision-title">{t('scenarioLab.peShock.decision.title')}</h3>
                <p>
                  {t('scenarioLab.peShock.decision.lead', {
                    cut: formatPercent(request.tariff_cut_pct, locale, 1),
                    scope: selectedSectionName,
                    partnerScope: selectedScopeLabel,
                  })}
                </p>
              </div>

              <dl className="pe-shock__metric-strip">
                <div className="pe-shock__metric-card pe-shock__metric-card--trade">
                  <dt>{t('scenarioLab.peShock.kpis.tradeEffect')}</dt>
                  <dd>{formatSignedUsdMillion(result.totals.trade_effect_usd, locale, usdMillionUnit)}</dd>
                  <span>{t('scenarioLab.peShock.tradeoff.tradeExpansion')}</span>
                </div>
                <div className="pe-shock__metric-card pe-shock__metric-card--benefit">
                  <dt>{t('scenarioLab.peShock.kpis.welfare')}</dt>
                  <dd>{formatSignedUsdMillion(result.totals.welfare_usd, locale, usdMillionUnit)}</dd>
                  <span>{t('scenarioLab.peShock.tradeoff.benefit')}</span>
                </div>
                <div className="pe-shock__metric-card pe-shock__metric-card--cost">
                  <dt>{t('scenarioLab.peShock.kpis.revenue')}</dt>
                  <dd>{formatSignedUsdMillion(result.totals.revenue_change_usd, locale, usdMillionUnit)}</dd>
                  <span>{t('scenarioLab.peShock.tradeoff.fiscalCost')}</span>
                </div>
              </dl>
            </section>

            <div className="pe-shock__evidence-grid">
              <section className="pe-shock__concentration" aria-labelledby="pe-shock-concentration-title">
                <div className="pe-shock__subhead">
                  <h3 id="pe-shock-concentration-title">{t('scenarioLab.peShock.topSections')}</h3>
                  <p>
                    {t('scenarioLab.peShock.sourceLabelNote', {
                      source: state.workspace.source_artifact,
                    })}
                  </p>
                </div>
                <ol className="pe-shock__ranked-bars">
                  {concentrationRows.map((section, index) => (
                    <li key={section.section_id}>
                      <div className="pe-shock__rank">
                        <span>{index + 1}</span>
                      </div>
                      <div className="pe-shock__bar-main">
                        <div className="pe-shock__bar-label">
                          <strong>{getShortSectionName(section)}</strong>
                          <span>{section.section_id}</span>
                        </div>
                        <div className="pe-shock__bar-track">
                          <span className="pe-shock__bar-fill" style={barStyle(section.trade_effect_usd, maxTradeEffect)} />
                        </div>
                      </div>
                      <dl className="pe-shock__bar-values">
                        <div>
                          <dt>{t('scenarioLab.peShock.table.importBase')}</dt>
                          <dd>{formatUsdMillion(section.import_usd, locale, usdMillionUnit)}</dd>
                        </div>
                        <div>
                          <dt>{t('scenarioLab.peShock.table.tradeEffect')}</dt>
                          <dd>{formatSignedUsdMillion(section.trade_effect_usd, locale, usdMillionUnit)}</dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ol>
              </section>

              <aside className="pe-shock__insight-rail" aria-label={t('scenarioLab.peShock.interpretation.title')}>
                <h3>{t('scenarioLab.peShock.interpretation.title')}</h3>
                <ul>
                  <li>
                    {t('scenarioLab.peShock.interpretation.exposure', {
                      section: leadingSection ? getShortSectionName(leadingSection) : formatUnavailable(locale),
                    })}
                  </li>
                  <li>
                    {t('scenarioLab.peShock.interpretation.fiscal', {
                      revenue: formatSignedUsdMillion(result.totals.revenue_change_usd, locale, usdMillionUnit),
                    })}
                  </li>
                  <li>{t('scenarioLab.peShock.interpretation.next')}</li>
                </ul>
                <div className="pe-shock__actions">
                  {onSaveRun ? (
                    <button type="button" className="btn-primary" onClick={() => onSaveRun(result, state.workspace)}>
                      {t('scenarioLab.peShock.saveRun')}
                    </button>
                  ) : null}
                  <button type="button" className="ui-secondary-action" onClick={() => void handleCopyResultNote()}>
                    {t('scenarioLab.peShock.copyResultNote')}
                  </button>
                  {saveStatus ? (
                    <p className="io-shock__save-status" role="status" aria-live="polite">
                      {saveStatus}
                    </p>
                  ) : null}
                  {copyStatus ? (
                    <p className="io-shock__save-status" role="status" aria-live="polite">
                      {copyStatus}
                    </p>
                  ) : null}
                </div>
              </aside>
            </div>

            <details className="io-shock__caveats pe-shock__caveats">
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
