import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import i18next from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { PeTradeShockPanel } from '../../../src/components/scenario-lab/PeTradeShockPanel.js'
import { toScenarioLabPeAnalyticsWorkspace } from '../../../src/data/bridge/pe-adapter.js'
import { validatePeBridgePayload } from '../../../src/data/bridge/pe-guard.js'
import type { PeBridgePayload } from '../../../src/data/bridge/pe-types.js'
import type { ScenarioLabPeAnalyticsState } from '../../../src/data/scenario-lab/pe-analytics-source.js'

const PE_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/pe.json', import.meta.url))

function loadValidPePayload(): PeBridgePayload {
  const validation = validatePeBridgePayload(JSON.parse(readFileSync(PE_PUBLIC_ARTIFACT_PATH, 'utf8')))
  assert.ok(validation.value)
  return validation.value
}

async function createTestI18n(language = 'en') {
  const instance = i18next.createInstance()
  const resources = Object.fromEntries(
    ['en', language].map((locale) => {
      const localePath = fileURLToPath(new URL(`src/locales/${locale}/common.json`, `file://${process.cwd()}/`))
      return [locale, { common: JSON.parse(readFileSync(localePath, 'utf8')) }]
    }),
  )
  await instance.use(initReactI18next).init({
    lng: language,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
    resources,
  })
  return instance
}

function renderPanel(language = 'en') {
  const payload = loadValidPePayload()
  const state: ScenarioLabPeAnalyticsState = {
    status: 'ready',
    payload,
    workspace: toScenarioLabPeAnalyticsWorkspace(payload),
    error: null,
  }
  return createTestI18n(language).then((i18n) =>
    renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <PeTradeShockPanel state={state} onRetry={() => {}} onSaveRun={() => {}} />
      </I18nextProvider>,
    ),
  )
}

describe('PeTradeShockPanel', () => {
  it('renders the concept-aligned tariff incidence workspace', async () => {
    const markup = await renderPanel()

    assert.match(markup, /Policy setup/)
    assert.match(markup, /Search product scope/)
    assert.match(markup, /Search partners/)
    assert.match(markup, /Direct tariff effect/)
    assert.match(markup, /Trade effect/)
    assert.match(markup, /Consumer welfare/)
    assert.match(markup, /Tariff revenue change/)
    assert.match(markup, /Largest direct effects by HS section/)
    assert.match(markup, /Effect share/)
    assert.match(markup, /Import share/)
    assert.match(markup, /Interpretation/)
    assert.match(markup, /tariff cut raises direct import demand/)
    assert.match(markup, /Direct, linear PE incidence estimate only/)
    assert.match(markup, /import-share approximations/)
    assert.match(markup, /Copy result note/)
    assert.match(markup, /Save to Comparison/)
    assert.doesNotMatch(markup, /Run summary/)
    assert.doesNotMatch(markup, /disabled=""[^>]*>Increase/)
  })

  it('shows display labels for partners and regimes instead of raw source tokens', async () => {
    const markup = await renderPanel()

    assert.match(markup, /China/)
    assert.match(markup, /Russian Federation/)
    assert.match(markup, /MFN partners/)
    assert.match(markup, /Free-trade partners/)
    assert.match(markup, /Duty-free partners/)
    assert.doesNotMatch(markup, />Китай/)
    assert.doesNotMatch(markup, />MFN</)
    assert.doesNotMatch(markup, />FTA</)
    assert.doesNotMatch(markup, />FULL</)
  })

  it('keeps partner names localized in Russian mode', async () => {
    const markup = await renderPanel('ru')

    assert.match(markup, /Китай/)
    assert.match(markup, /Партнёры MFN/)
    assert.match(markup, /Партнёры свободной торговли/)
    assert.match(markup, /Беспошлинные партнёры/)
    assert.match(markup, /Только прямая линейная оценка/)
  })
})
