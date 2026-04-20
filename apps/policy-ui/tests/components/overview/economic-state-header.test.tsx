import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { EconomicStateHeader } from '../../../src/components/overview/EconomicStateHeader.js'
import { LanguageContext } from '../../../src/state/language-context.js'

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
            header: {
              kicker: 'Economic State',
              modelListFallback: 'MODEL SET',
              draftedFrom: 'State narrative · drafted from {{models}} baseline',
              updatedAt: 'Updated {{date}}',
            },
          },
        },
      },
    },
  })
  return instance
}

describe('EconomicStateHeader', () => {
  it('composes the drafted-from provenance line from model IDs', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <LanguageContext.Provider value={{ language: 'en', setLanguage: () => {} }}>
          <MemoryRouter>
            <EconomicStateHeader
              summary="Growth remains resilient while inflation moderates."
              updatedAt="2026-04-17T09:05:00+05:00"
              modelIds={['dfm_nowcast', 'qpm_uzbekistan']}
              outputAction={{
                action_id: 'export-brief',
                title: 'Prepare snapshot brief',
                summary: 'Generate a concise note.',
                target_href: '/scenario-lab?preset=snapshot-brief',
              }}
            />
          </MemoryRouter>
        </LanguageContext.Provider>
      </I18nextProvider>,
    )

    assert.match(markup, /class="state-header__meta/)
    assert.match(markup, /State narrative · drafted from DFM \+ QPM baseline/)
    assert.match(markup, /Updated/)
    assert.match(markup, /Prepare snapshot brief/)
  })
})
