import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import i18next from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { CgeReformShockPanel } from '../../../src/components/scenario-lab/CgeReformShockPanel.js'
import { validateCgeBridgePayload } from '../../../src/data/bridge/cge-guard.js'
import type { ScenarioLabCgeState } from '../../../src/data/scenario-lab/cge-analytics-source.js'

const ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/cge.json', import.meta.url))

async function renderPanel(language = 'en') {
  const validation = validateCgeBridgePayload(JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8')))
  assert.ok(validation.value)
  const localePath = fileURLToPath(new URL('src/locales/' + language + '/common.json', 'file://' + process.cwd() + '/'))
  const fallbackPath = fileURLToPath(new URL('src/locales/en/common.json', 'file://' + process.cwd() + '/'))
  const instance = i18next.createInstance()
  await instance.use(initReactI18next).init({
    lng: language,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
    resources: {
      en: { common: JSON.parse(readFileSync(fallbackPath, 'utf8')) },
      [language]: { common: JSON.parse(readFileSync(localePath, 'utf8')) },
    },
  })
  const state: ScenarioLabCgeState = { status: 'ready', payload: validation.value, error: null }
  return renderToStaticMarkup(
    <I18nextProvider i18n={instance}>
      <CgeReformShockPanel state={state} onRetry={() => {}} />
    </I18nextProvider>,
  )
}

describe('CgeReformShockPanel', () => {
  it('renders the bounded experimental reference lane', async () => {
    const markup = await renderPanel()

    assert.match(markup, /Experimental reference/)
    assert.match(markup, /Not model-owner approved/)
    assert.match(markup, /World import-price change/)
    assert.match(markup, /type="range"[^>]*step="any"/)
    assert.match(markup, /Change from the calibrated base/)
    assert.match(markup, /Exact workbook match/)
    assert.match(markup, /No GDP forecast, sector, labor, distribution/)
    assert.match(markup, /relative-price index is normalized/i)
    assert.doesNotMatch(markup, /world_import_price_change_pct/)
  })

  it('uses translated visible labels in Russian', async () => {
    const markup = await renderPanel('ru')

    assert.match(markup, /Экспериментальный расчёт/)
    assert.match(markup, /Изменение мировой цены импорта/)
    assert.match(markup, /Не утверждено владельцем модели/)
    assert.doesNotMatch(markup, /World import-price benchmark/)
  })
})