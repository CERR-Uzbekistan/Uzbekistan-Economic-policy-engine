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
type TariffDirection = 'cut' | 'increase'

const PARTNER_DISPLAY_NAMES: Record<string, { en: string; uz: string }> = {
  Китай: { en: 'China', uz: 'Xitoy' },
  'Российская Федерация': { en: 'Russian Federation', uz: 'Rossiya Federatsiyasi' },
  Казахстан: { en: 'Kazakhstan', uz: 'Qozogiston' },
  Турция: { en: 'Turkiye', uz: 'Turkiya' },
  'Республика Корея': { en: 'Republic of Korea', uz: 'Koreya Respublikasi' },
  Германия: { en: 'Germany', uz: 'Germaniya' },
  Индия: { en: 'India', uz: 'Hindiston' },
  Туркменистан: { en: 'Turkmenistan', uz: 'Turkmaniston' },
  Беларусь: { en: 'Belarus', uz: 'Belarus' },
  'Соединенные Штаты Америки': { en: 'United States', uz: 'AQSh' },
  Швейцария: { en: 'Switzerland', uz: 'Shveytsariya' },
  Франция: { en: 'France', uz: 'Fransiya' },
  Кыргызстан: { en: 'Kyrgyzstan', uz: 'Qirgiziston' },
  'Иран (Исламская Республика)': { en: 'Iran', uz: 'Eron' },
  Италия: { en: 'Italy', uz: 'Italiya' },
  Япония: { en: 'Japan', uz: 'Yaponiya' },
  'Объединенные Арабские Эмираты': { en: 'United Arab Emirates', uz: 'Birlashgan Arab Amirliklari' },
  Австрия: { en: 'Austria', uz: 'Avstriya' },
  Вьетнам: { en: 'Viet Nam', uz: 'Vetnam' },
  Бразилия: { en: 'Brazil', uz: 'Braziliya' },
  Польша: { en: 'Poland', uz: 'Polsha' },
  Литва: { en: 'Lithuania', uz: 'Litva' },
  Украина: { en: 'Ukraine', uz: 'Ukraina' },
  Таджикистан: { en: 'Tajikistan', uz: 'Tojikiston' },
  Нидерланды: { en: 'Netherlands', uz: 'Niderlandiya' },
  Словения: { en: 'Slovenia', uz: 'Sloveniya' },
  'Соединенное Королевство Великобритании и Северной Ирландии': {
    en: 'United Kingdom',
    uz: 'Buyuk Britaniya',
  },
  Грузия: { en: 'Georgia', uz: 'Gruziya' },
  Афганистан: { en: 'Afghanistan', uz: 'Afgoniston' },
  Индонезия: { en: 'Indonesia', uz: 'Indoneziya' },
  Чехия: { en: 'Czechia', uz: 'Chexiya' },
  Мексика: { en: 'Mexico', uz: 'Meksika' },
  Латвия: { en: 'Latvia', uz: 'Latviya' },
  Таиланд: { en: 'Thailand', uz: 'Tailand' },
  Пакистан: { en: 'Pakistan', uz: 'Pokiston' },
  Малайзия: { en: 'Malaysia', uz: 'Malayziya' },
  Венгрия: { en: 'Hungary', uz: 'Vengriya' },
  'Гонконг, Специальный административный район Китая': { en: 'Hong Kong SAR, China', uz: 'Gonkong SAR, Xitoy' },
  Бельгия: { en: 'Belgium', uz: 'Belgiya' },
  Испания: { en: 'Spain', uz: 'Ispaniya' },
  Сингапур: { en: 'Singapore', uz: 'Singapur' },
  Ирландия: { en: 'Ireland', uz: 'Irlandiya' },
  Финляндия: { en: 'Finland', uz: 'Finlyandiya' },
  Азербайджан: { en: 'Azerbaijan', uz: 'Ozarbayjon' },
  Словакия: { en: 'Slovakia', uz: 'Slovakiya' },
  Бангладеш: { en: 'Bangladesh', uz: 'Bangladesh' },
  Румыния: { en: 'Romania', uz: 'Ruminiya' },
  Греция: { en: 'Greece', uz: 'Gretsiya' },
  Дания: { en: 'Denmark', uz: 'Daniya' },
  Эквадор: { en: 'Ecuador', uz: 'Ekvador' },
  Швеция: { en: 'Sweden', uz: 'Shvetsiya' },
  Монголия: { en: 'Mongolia', uz: 'Mongoliya' },
  Эстония: { en: 'Estonia', uz: 'Estoniya' },
  Болгария: { en: 'Bulgaria', uz: 'Bolgariya' },
  Аргентина: { en: 'Argentina', uz: 'Argentina' },
  Канада: { en: 'Canada', uz: 'Kanada' },
  'Тайвань (провинция Китая)': { en: 'Taiwan, China', uz: 'Tayvan, Xitoy' },
  Египет: { en: 'Egypt', uz: 'Misr' },
  Норвегия: { en: 'Norway', uz: 'Norvegiya' },
  Ирак: { en: 'Iraq', uz: 'Iroq' },
}

type Translate = (key: string, options?: Record<string, unknown>) => string

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

function shareStyle(value: number): CSSProperties {
  return { '--pe-share-width': `${Math.min(100, Math.max(0, value))}%` } as CSSProperties
}

function getShortSectionName(section: ScenarioLabPeSectionEffect): string {
  return section.section_name.replace(/\s+and\s+/gi, ' & ')
}

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function getPartnerDisplayName(partnerName: string, locale: string | undefined): string {
  const display = PARTNER_DISPLAY_NAMES[partnerName]
  if (!display) return partnerName
  if (locale?.startsWith('ru')) return partnerName
  if (locale?.startsWith('uz')) return display.uz
  return display.en
}

function getRegimeLabel(regime: string, t: Translate): string {
  const normalized = regime.toLocaleLowerCase()
  if (normalized === ALL_VALUE) return t('scenarioLab.peShock.allRegimes')
  const key = `scenarioLab.peShock.regimeLabels.${normalized}`
  const label = t(key)
  return label === key ? regime.toUpperCase() : label
}

export function PeTradeShockPanel({ state, onRetry, onSaveRun, saveStatus }: PeTradeShockPanelProps) {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const usdMillionUnit = t('scenarioLab.peShock.units.usdMillion')
  const [tariffDirection, setTariffDirection] = useState<TariffDirection>('cut')
  const [tariffChangePct, setTariffChangePct] = useState(DEFAULT_TARIFF_CUT_PCT)
  const [sectionId, setSectionId] = useState(ALL_VALUE)
  const [regime, setRegime] = useState(ALL_VALUE)
  const [partnerName, setPartnerName] = useState(ALL_VALUE)
  const [productQuery, setProductQuery] = useState('')
  const [partnerQuery, setPartnerQuery] = useState('')
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

  const selectedSectionId =
    state.workspace?.sections.some((section) => section.id === sectionId) || sectionId === ALL_VALUE
      ? sectionId
      : ALL_VALUE
  const regimeOptions = state.workspace?.regimes ?? [ALL_VALUE]
  const selectedRegime = selectedOptionExists(regimeOptions, regime) ? regime : ALL_VALUE
  const partnerOptions = state.workspace?.partners.map((partner) => partner.name) ?? []
  const selectedPartnerName = selectedOptionExists(partnerOptions, partnerName) ? partnerName : ALL_VALUE
  const sectionById = state.workspace?.sections.find((section) => section.id === selectedSectionId)
  const selectedPartner = state.workspace?.partners.find((partner) => partner.name === selectedPartnerName)
  const filteredSections = useMemo(() => {
    const query = normalizeSearchText(productQuery)
    const sections = state.workspace?.sections ?? []
    const matches = query
      ? sections.filter((section) => normalizeSearchText(`${section.id} ${section.name}`).includes(query))
      : sections
    if (sectionById && !matches.some((section) => section.id === sectionById.id)) {
      return [sectionById, ...matches]
    }
    return matches
  }, [productQuery, sectionById, state.workspace?.sections])
  const filteredPartners = useMemo(() => {
    const query = normalizeSearchText(partnerQuery)
    const partners = state.workspace?.partners ?? []
    const matches = query
      ? partners.filter((partner) =>
          normalizeSearchText(
            `${getPartnerDisplayName(partner.name, locale)} ${partner.name} ${getRegimeLabel(partner.regime, t)}`,
          ).includes(query),
        )
      : partners
    if (selectedPartner && !matches.some((partner) => partner.name === selectedPartner.name)) {
      return [selectedPartner, ...matches]
    }
    return matches
  }, [locale, partnerQuery, selectedPartner, state.workspace?.partners, t])

  const request: ScenarioLabPeShockRequest = useMemo(
    () => ({
      tariff_cut_pct:
        (tariffDirection === 'increase' ? -1 : 1) *
        Math.abs(Number.isFinite(tariffChangePct) ? tariffChangePct : DEFAULT_TARIFF_CUT_PCT),
      section_id: selectedSectionId,
      regime: selectedRegime,
      partner_name: selectedPartnerName,
    }),
    [selectedPartnerName, selectedRegime, selectedSectionId, tariffChangePct, tariffDirection],
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
  const totalAbsTradeEffect = useMemo(
    () => Math.max(1, Math.abs(result?.totals.trade_effect_usd ?? 0)),
    [result?.totals.trade_effect_usd],
  )
  const selectedSectionName =
    request.section_id === ALL_VALUE
      ? t('scenarioLab.peShock.allSections')
      : sectionById?.name ?? request.section_id
  const selectedScopeLabel =
    request.partner_name !== ALL_VALUE
      ? getPartnerDisplayName(request.partner_name, locale)
      : request.regime !== ALL_VALUE
        ? t('scenarioLab.peShock.scope.regime', { regime: getRegimeLabel(request.regime, t) })
        : t('scenarioLab.peShock.allPartners')
  const leadingSection = concentrationRows[0]
  const resultNote = result
    ? t('scenarioLab.peShock.copyNote', {
        change: formatPercent(Math.abs(request.tariff_cut_pct), locale, 1),
        direction: t(`scenarioLab.peShock.direction.${request.tariff_cut_pct < 0 ? 'increaseAction' : 'cutAction'}`),
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
                <button
                  type="button"
                  className={tariffDirection === 'cut' ? 'active' : undefined}
                  aria-pressed={tariffDirection === 'cut'}
                  onClick={() => setTariffDirection('cut')}
                >
                  {t('scenarioLab.peShock.direction.cut')}
                </button>
                <button
                  type="button"
                  className={tariffDirection === 'increase' ? 'active' : undefined}
                  aria-pressed={tariffDirection === 'increase'}
                  onClick={() => setTariffDirection('increase')}
                >
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
                  value={tariffChangePct}
                  onChange={(event) => setTariffChangePct(Number(event.target.value))}
                />
                <b aria-hidden="true">%</b>
              </label>
            </div>
          </fieldset>

          <div className="pe-shock__field">
            <span id="pe-product-scope-label" className="pe-shock__field-label">
              {t('scenarioLab.peShock.productScope')}
            </span>
            <input
              id="pe-product-scope-search"
              className="pe-shock__filter-input"
              type="search"
              value={productQuery}
              placeholder={t('scenarioLab.peShock.productSearch')}
              aria-label={t('scenarioLab.peShock.productSearch')}
              onChange={(event) => setProductQuery(event.target.value)}
            />
            <select
              className="pe-shock__select"
              aria-labelledby="pe-product-scope-label"
              value={selectedSectionId}
              onChange={(event) => setSectionId(event.target.value)}
            >
              <option value={ALL_VALUE}>{t('scenarioLab.peShock.allSections')}</option>
              {filteredSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.id} · {section.name}
                </option>
              ))}
              {filteredSections.length === 0 ? <option disabled>{t('scenarioLab.peShock.noMatches')}</option> : null}
            </select>
          </div>

          <div className="pe-shock__field">
            <span id="pe-partner-scope-label" className="pe-shock__field-label">
              {t('scenarioLab.peShock.partnerScope')}
            </span>
            <input
              id="pe-partner-scope-search"
              className="pe-shock__filter-input"
              type="search"
              value={partnerQuery}
              placeholder={t('scenarioLab.peShock.partnerSearch')}
              aria-label={t('scenarioLab.peShock.partnerSearch')}
              onChange={(event) => setPartnerQuery(event.target.value)}
            />
            <select
              className="pe-shock__select"
              aria-labelledby="pe-partner-scope-label"
              value={selectedPartnerName}
              onChange={(event) => setPartnerName(event.target.value)}
            >
              <option value={ALL_VALUE}>{t('scenarioLab.peShock.allPartners')}</option>
              {filteredPartners.map((partner) => (
                <option key={partner.name} value={partner.name}>
                  {getPartnerDisplayName(partner.name, locale)} · {formatPercent(partner.import_share * 100, locale, 1)}
                </option>
              ))}
              {filteredPartners.length === 0 ? <option disabled>{t('scenarioLab.peShock.noMatches')}</option> : null}
            </select>
          </div>

          <label className="pe-shock__field">
            <span>{t('scenarioLab.peShock.regime')}</span>
            <select className="pe-shock__select" value={selectedRegime} onChange={(event) => setRegime(event.target.value)}>
              {regimeOptions.map((option) => (
                <option key={option} value={option}>
                  {getRegimeLabel(option, t)}
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
                    change: formatPercent(Math.abs(request.tariff_cut_pct), locale, 1),
                    direction: t(
                      `scenarioLab.peShock.direction.${request.tariff_cut_pct < 0 ? 'increaseAction' : 'cutAction'}`,
                    ),
                    scope: selectedSectionName,
                    partnerScope: selectedScopeLabel,
                  })}
                </p>
              </div>

              <dl className="pe-shock__metric-strip">
                <div
                  className={`pe-shock__metric-card pe-shock__metric-card--trade ${
                    result.totals.trade_effect_usd < 0 ? 'is-negative' : 'is-positive'
                  }`}
                >
                  <dt>{t('scenarioLab.peShock.kpis.tradeEffect')}</dt>
                  <dd>{formatSignedUsdMillion(result.totals.trade_effect_usd, locale, usdMillionUnit)}</dd>
                  <span>{t('scenarioLab.peShock.tradeoff.tradeExpansion')}</span>
                </div>
                <div
                  className={`pe-shock__metric-card pe-shock__metric-card--benefit ${
                    result.totals.welfare_usd < 0 ? 'is-negative' : 'is-positive'
                  }`}
                >
                  <dt>{t('scenarioLab.peShock.kpis.welfare')}</dt>
                  <dd>{formatSignedUsdMillion(result.totals.welfare_usd, locale, usdMillionUnit)}</dd>
                  <span>{t('scenarioLab.peShock.tradeoff.benefit')}</span>
                </div>
                <div
                  className={`pe-shock__metric-card pe-shock__metric-card--cost ${
                    result.totals.revenue_change_usd < 0 ? 'is-negative' : 'is-positive'
                  }`}
                >
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
                  {concentrationRows.map((section, index) => {
                    const effectShare = (Math.abs(section.trade_effect_usd) / totalAbsTradeEffect) * 100
                    const importShare =
                      result.totals.import_base_usd > 0 ? (section.import_usd / result.totals.import_base_usd) * 100 : 0
                    return (
                    <li
                      key={section.section_id}
                      className={section.trade_effect_usd < 0 ? 'is-negative' : 'is-positive'}
                    >
                      <div className="pe-shock__rank">
                        <span>{index + 1}</span>
                      </div>
                      <div className="pe-shock__bar-main">
                        <div className="pe-shock__bar-label">
                          <strong>{getShortSectionName(section)}</strong>
                          <span>{section.section_id}</span>
                        </div>
                        <div className="pe-shock__impact-stack">
                          <div className="pe-shock__impact-row">
                            <span>{t('scenarioLab.peShock.table.effectShare')}</span>
                            <div className="pe-shock__bar-track">
                              <span
                                className="pe-shock__bar-fill"
                                style={barStyle(section.trade_effect_usd, maxTradeEffect)}
                              />
                            </div>
                            <strong>
                              {formatSignedUsdMillion(section.trade_effect_usd, locale, usdMillionUnit)} ·{' '}
                              {formatPercent(effectShare, locale, 1)}
                            </strong>
                          </div>
                          <div className="pe-shock__impact-row pe-shock__impact-row--base">
                            <span>{t('scenarioLab.peShock.table.importShare')}</span>
                            <div className="pe-shock__bar-track">
                              <span className="pe-shock__bar-fill" style={shareStyle(importShare)} />
                            </div>
                            <strong>
                              {formatUsdMillion(section.import_usd, locale, usdMillionUnit)} ·{' '}
                              {formatPercent(importShare, locale, 1)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </li>
                  )})}
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
