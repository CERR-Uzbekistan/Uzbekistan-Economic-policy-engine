import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { IndicatorPanelGrid } from '../../../src/components/overview/IndicatorPanelGrid.js'
import { overviewArtifactToMacroSnapshot } from '../../../src/data/overview/artifact-adapter.js'
import { buildValidOverviewArtifact } from '../../data/overview/overview-artifact-fixture.js'

async function createTestI18n() {
  const instance = i18next.createInstance()
  await instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
    resources: {
      en: {
        common: {
          overview: {
            common: { middleDot: '·' },
            delta: {
              vsPeriodBasis: 'vs {{period}} {{basis}}',
            },
            tradeBalance: {
              deficit: 'deficit',
              surplus: 'surplus',
              balanced: 'balanced',
              usdBnPattern: 'USD {{value}}bn {{position}}',
            },
            fx: {
              stronger: 'UZS stronger',
              weaker: 'UZS weaker',
              unchanged: 'unchanged',
            },
            claimLabels: {
              observed: 'Observed',
              calculated: 'Calculated',
              nowcast: 'Nowcast',
              reference: 'Reference',
              forecast: 'Forecast',
            },
            indicators: {
              title: 'Indicator panels',
              description: 'All metrics',
              inflationPair: 'CPI and food inflation pair',
              tradeFlowPair: 'Exports / Imports',
              usdUzsPair: 'USD/UZS',
              primarySource: 'Primary source: {{source}}',
              forecastExternal: 'Forecast (external)',
              groups: {
                growth: 'Growth',
                inflation: 'Inflation',
                trade: 'Trade',
                monetary_fx: 'Monetary / FX',
                gold: 'Gold',
              },
              status: {
                warning: 'Caution',
                failed: 'Failed',
              },
            },
            comparisonBasis: {
              cpi_yoy: 'print',
              food_cpi_yoy: 'print',
              cpi_mom: 'print',
              usd_uzs_level: 'official reference rate',
              usd_uzs_mom_change: 'monthly FX change',
              usd_uzs_yoy_change: 'annual FX change',
              trade_balance: 'trade balance',
              gold_price_forecast: 'forecast vintage',
            },
          },
        },
      },
    },
  })
  return instance
}

describe('IndicatorPanelGrid', () => {
  it('omits grouped panels gracefully when static fallback has no artifact groups', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <IndicatorPanelGrid />
      </I18nextProvider>,
    )

    assert.equal(markup, '')
  })

  it('renders the Gold panel with all required gold metrics', async () => {
    const i18n = await createTestI18n()
    const snapshot = overviewArtifactToMacroSnapshot(buildValidOverviewArtifact())
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <IndicatorPanelGrid groups={snapshot.indicator_groups} />
      </I18nextProvider>,
    )

    assert.match(markup, /Gold/)
    assert.match(markup, /overview-indicator-panel--gold/)
    assert.match(markup, /Gold price/)
    assert.match(markup, /Gold price change/)
    assert.match(markup, /Gold price forecast/)
  })

  it('renders warning metrics with visible caution status instead of omitting them', async () => {
    const i18n = await createTestI18n()
    const artifact = buildValidOverviewArtifact()
    const warningMetric = artifact.metrics.find((metric) => metric.id === 'gold_price_forecast')
    if (!warningMetric) throw new Error('fixture missing gold_price_forecast')
    warningMetric.validation_status = 'warning'
    warningMetric.warnings = ['External forecast assumption.']
    const snapshot = overviewArtifactToMacroSnapshot(artifact)
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <IndicatorPanelGrid groups={snapshot.indicator_groups} />
      </I18nextProvider>,
    )

    assert.match(markup, /Gold price forecast/)
    assert.match(markup, /Caution/)
    assert.match(markup, /ui-chip--warn/)
  })

  it('renders accessible comparison-basis labels in grouped indicator row deltas', async () => {
    const i18n = await createTestI18n()
    const snapshot = overviewArtifactToMacroSnapshot(buildValidOverviewArtifact())
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <IndicatorPanelGrid groups={snapshot.indicator_groups} />
      </I18nextProvider>,
    )

    assert.match(markup, /overview-indicator-row__delta/)
    assert.match(markup, /vs Feb 2026 print/)
    assert.match(markup, /forecast vintage/)
    assert.doesNotMatch(markup, /overview-indicator-row__basis/)
  })

  it('visually pairs CPI YoY and Food CPI YoY while keeping both metric ids queryable', async () => {
    const i18n = await createTestI18n()
    const snapshot = overviewArtifactToMacroSnapshot(buildValidOverviewArtifact())
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <IndicatorPanelGrid groups={snapshot.indicator_groups} />
      </I18nextProvider>,
    )

    const pairHeaderIndex = markup.indexOf('CPI and food inflation pair')
    const cpiIndex = markup.indexOf('data-metric-id="cpi_yoy"')
    const foodIndex = markup.indexOf('data-metric-id="food_cpi_yoy"')
    const momIndex = markup.indexOf('data-metric-id="cpi_mom"')

    assert.ok(pairHeaderIndex > 0)
    assert.ok(cpiIndex > pairHeaderIndex)
    assert.ok(foodIndex > cpiIndex)
    assert.ok(momIndex > foodIndex)
    assert.match(markup, /overview-indicator-row--paired[^"]*"[^>]*data-metric-id="cpi_yoy"/)
    assert.match(markup, /overview-indicator-row--paired[^"]*"[^>]*data-metric-id="food_cpi_yoy"/)
    assert.doesNotMatch(markup, /<(article|section)[^>]*overview-indicator-row--paired/)
  })

  it('renders CPI MoM deltas as pp and labels claim type from claim_type', async () => {
    const i18n = await createTestI18n()
    const artifact = buildValidOverviewArtifact()
    const cpiMom = artifact.metrics.find((metric) => metric.id === 'cpi_mom')
    if (!cpiMom) throw new Error('fixture missing cpi_mom')
    cpiMom.value = 0.7
    cpiMom.previous_value = 0.5
    const snapshot = overviewArtifactToMacroSnapshot(artifact)
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <IndicatorPanelGrid groups={snapshot.indicator_groups} />
      </I18nextProvider>,
    )

    assert.match(markup, /data-metric-id="cpi_mom"[\s\S]*\+0\.2 pp vs Feb 2026 print/)
    assert.match(markup, /data-metric-id="cpi_mom"[\s\S]*overview-indicator-row__claim-label[^>]*>Observed</)
    assert.doesNotMatch(markup, /data-metric-id="cpi_mom"[\s\S]*\+0\.2 %/)
  })

  it('renders FX interpretation and trade-balance sign labels without raw ambiguous units', async () => {
    const i18n = await createTestI18n()
    const artifact = buildValidOverviewArtifact()
    const fxLevel = artifact.metrics.find((metric) => metric.id === 'usd_uzs_level')
    const fxMom = artifact.metrics.find((metric) => metric.id === 'usd_uzs_mom_change')
    const tradeBalance = artifact.metrics.find((metric) => metric.id === 'trade_balance')
    if (!fxLevel || !fxMom || !tradeBalance) throw new Error('fixture missing required metrics')
    fxLevel.value = 12400
    fxLevel.previous_value = 12500
    fxMom.value = 0.9
    fxMom.previous_value = 1.1
    tradeBalance.value = -4.51
    tradeBalance.previous_value = -4.25
    const snapshot = overviewArtifactToMacroSnapshot(artifact)
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <IndicatorPanelGrid groups={snapshot.indicator_groups} />
      </I18nextProvider>,
    )

    assert.match(markup, /data-metric-id="usd_uzs_level"[\s\S]*UZS stronger 0\.8%/)
    assert.match(markup, /data-metric-id="usd_uzs_mom_change"[\s\S]*UZS stronger 0\.2 pp/)
    assert.match(markup, /data-metric-id="usd_uzs_mom_change"[\s\S]*Calculated/)
    assert.match(markup, /data-metric-id="trade_balance"[\s\S]*USD 4\.51bn deficit/)
    assert.match(markup, /data-metric-id="trade_balance"[\s\S]*Calculated/)
    assert.doesNotMatch(markup, /USD million or USD billion/)
  })

  it('renders balanced and surplus trade-balance states', async () => {
    const i18n = await createTestI18n()
    const surplusArtifact = buildValidOverviewArtifact()
    const surplusMetric = surplusArtifact.metrics.find((metric) => metric.id === 'trade_balance')
    if (!surplusMetric) throw new Error('fixture missing trade_balance')
    surplusMetric.value = 4.51
    const surplusSnapshot = overviewArtifactToMacroSnapshot(surplusArtifact)
    const surplusMarkup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <IndicatorPanelGrid groups={surplusSnapshot.indicator_groups} />
      </I18nextProvider>,
    )

    const balancedArtifact = buildValidOverviewArtifact()
    const balancedMetric = balancedArtifact.metrics.find((metric) => metric.id === 'trade_balance')
    if (!balancedMetric) throw new Error('fixture missing trade_balance')
    balancedMetric.value = 0
    const balancedSnapshot = overviewArtifactToMacroSnapshot(balancedArtifact)
    const balancedMarkup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <IndicatorPanelGrid groups={balancedSnapshot.indicator_groups} />
      </I18nextProvider>,
    )

    assert.match(surplusMarkup, /USD 4\.51bn surplus/)
    assert.match(balancedMarkup, /balanced/)
  })

  it('renders Trade balance before the exports/imports pair', async () => {
    const i18n = await createTestI18n()
    const snapshot = overviewArtifactToMacroSnapshot(buildValidOverviewArtifact())
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <IndicatorPanelGrid groups={snapshot.indicator_groups} />
      </I18nextProvider>,
    )

    const tradeBalanceIndex = markup.indexOf('data-metric-id="trade_balance"')
    const subheadIndex = markup.indexOf('Exports / Imports')
    const exportsIndex = markup.indexOf('data-metric-id="exports_yoy"')
    const importsIndex = markup.indexOf('data-metric-id="imports_yoy"')

    assert.ok(tradeBalanceIndex > 0)
    assert.ok(subheadIndex > tradeBalanceIndex)
    assert.ok(exportsIndex > subheadIndex)
    assert.ok(importsIndex > exportsIndex)
    assert.match(markup, /overview-indicator-row--paired[^"]*"[^>]*data-metric-id="exports_yoy"/)
    assert.match(markup, /overview-indicator-row--paired[^"]*"[^>]*data-metric-id="imports_yoy"/)
  })

  it('renders Monetary/FX with policy rate, USD/UZS pair, then REER and wide-panel hook', async () => {
    const i18n = await createTestI18n()
    const snapshot = overviewArtifactToMacroSnapshot(buildValidOverviewArtifact())
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <IndicatorPanelGrid groups={snapshot.indicator_groups} />
      </I18nextProvider>,
    )

    const panelIndex = markup.indexOf('overview-indicator-panel--monetary_fx')
    const policyIndex = markup.indexOf('data-metric-id="policy_rate"')
    const subheadIndex = markup.indexOf('USD/UZS', policyIndex)
    const levelIndex = markup.indexOf('data-metric-id="usd_uzs_level"')
    const momIndex = markup.indexOf('data-metric-id="usd_uzs_mom_change"')
    const yoyIndex = markup.indexOf('data-metric-id="usd_uzs_yoy_change"')
    const reerIndex = markup.indexOf('data-metric-id="reer_level"')

    assert.ok(panelIndex > 0)
    assert.match(markup, /overview-indicator-panel--monetary_fx overview-indicator-panel--wide/)
    assert.match(markup, /data-panel-wide="true"/)
    assert.ok(policyIndex > panelIndex)
    assert.ok(subheadIndex > policyIndex)
    assert.ok(levelIndex > subheadIndex)
    assert.ok(momIndex > levelIndex)
    assert.ok(yoyIndex > momIndex)
    assert.ok(reerIndex > yoyIndex)
    assert.match(markup, /overview-indicator-row--paired[^"]*"[^>]*data-metric-id="usd_uzs_level"/)
    assert.match(markup, /overview-indicator-row--paired[^"]*"[^>]*data-metric-id="usd_uzs_mom_change"/)
    assert.match(markup, /overview-indicator-row--paired[^"]*"[^>]*data-metric-id="usd_uzs_yoy_change"/)
  })

  it('demotes Gold forecast with a forecast row hook and external caption', async () => {
    const i18n = await createTestI18n()
    const snapshot = overviewArtifactToMacroSnapshot(buildValidOverviewArtifact())
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <IndicatorPanelGrid groups={snapshot.indicator_groups} />
      </I18nextProvider>,
    )

    assert.match(
      markup,
      /overview-indicator-row--forecast[^"]*"[^>]*data-metric-id="gold_price_forecast"[^>]*data-row-kind="forecast"/,
    )
    assert.match(markup, /data-metric-id="gold_price_forecast"[\s\S]*Forecast \(external\)/)
  })

  it('renders one panel-level source line per visible panel', async () => {
    const i18n = await createTestI18n()
    const snapshot = overviewArtifactToMacroSnapshot(buildValidOverviewArtifact())
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <IndicatorPanelGrid groups={snapshot.indicator_groups} />
      </I18nextProvider>,
    )

    const panelCount = (markup.match(/overview-indicator-panel overview-indicator-panel--/g) ?? []).length
    const sourceLineCount = (markup.match(/overview-indicator-panel__source/g) ?? []).length
    assert.equal(panelCount, 5)
    assert.equal(sourceLineCount, panelCount)
    assert.match(markup, /Primary source: Statistics Agency foreign trade/)
  })

  it('renders compact row source periods while keeping full row source provenance reachable', async () => {
    const i18n = await createTestI18n()
    const snapshot = overviewArtifactToMacroSnapshot(buildValidOverviewArtifact())
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <IndicatorPanelGrid groups={snapshot.indicator_groups} />
      </I18nextProvider>,
    )

    assert.match(
      markup,
      /data-metric-id="exports_yoy"[\s\S]*overview-indicator-row__source-period" aria-label="2026 Q1 · Statistics Agency foreign trade" title="2026 Q1 · Statistics Agency foreign trade"[^>]*>2026 Q1</,
    )
    assert.doesNotMatch(
      markup,
      /data-metric-id="exports_yoy"[\s\S]*overview-indicator-row__source-period[^>]*>2026 Q1 · Statistics Agency foreign trade</,
    )
  })
})
