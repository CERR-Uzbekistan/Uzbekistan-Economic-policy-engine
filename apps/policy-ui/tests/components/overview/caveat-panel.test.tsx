import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { CaveatPanel } from '../../../src/components/overview/CaveatPanel.js'
import type { Caveat } from '../../../src/contracts/data-contract.js'

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
            caveats: {
              title: 'Model caveats',
              description: 'Known limitations affecting the metrics above.',
              affectedMetrics: 'Affects: {{metrics}}',
              severity: {
                critical: 'Critical',
                warning: 'Warning',
                info: 'Info',
              },
            },
          },
        },
      },
    },
  })
  return instance
}

describe('CaveatPanel', () => {
  it('returns null when caveats array is empty', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <CaveatPanel caveats={[]} />
      </I18nextProvider>,
    )
    assert.equal(markup, '')
  })

  it('renders caveats sorted by severity (critical → warning → info)', async () => {
    const caveats: Caveat[] = [
      {
        caveat_id: 'info-1',
        severity: 'info',
        message: 'Info caveat',
        affected_metrics: [],
        affected_models: [],
      },
      {
        caveat_id: 'critical-1',
        severity: 'critical',
        message: 'Critical caveat',
        affected_metrics: [],
        affected_models: [],
      },
      {
        caveat_id: 'warning-1',
        severity: 'warning',
        message: 'Warning caveat',
        affected_metrics: [],
        affected_models: [],
      },
    ]

    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <CaveatPanel caveats={caveats} />
      </I18nextProvider>,
    )

    const criticalIdx = markup.indexOf('Critical caveat')
    const warningIdx = markup.indexOf('Warning caveat')
    const infoIdx = markup.indexOf('Info caveat')

    assert.ok(criticalIdx > 0, 'expected critical caveat to render')
    assert.ok(warningIdx > criticalIdx, 'expected warning after critical')
    assert.ok(infoIdx > warningIdx, 'expected info after warning')

    assert.match(markup, /overview-caveat--critical/)
    assert.match(markup, /overview-caveat--warning/)
    assert.match(markup, /overview-caveat--info/)
  })

  it('renders affected metrics line when affected_metrics is non-empty', async () => {
    const caveats: Caveat[] = [
      {
        caveat_id: 'test',
        severity: 'warning',
        message: 'Test',
        affected_metrics: ['gdp_growth', 'inflation'],
        affected_models: [],
      },
    ]

    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <CaveatPanel caveats={caveats} />
      </I18nextProvider>,
    )

    assert.match(markup, /Affects: gdp_growth, inflation/)
  })
})
