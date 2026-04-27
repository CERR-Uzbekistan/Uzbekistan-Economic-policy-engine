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
            indicators: {
              title: 'Indicator panels',
              description: 'All metrics',
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
})
