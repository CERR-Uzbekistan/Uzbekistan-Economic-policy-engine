import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReferencesFooter } from '../../../src/components/overview/ReferencesFooter.js'

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
            references: {
              title: 'Sources and references',
              summary: '{{count}} sources · exported {{date}}',
              sourceDate: 'Source date: {{date}}',
            },
          },
        },
      },
    },
  })
  return instance
}

describe('ReferencesFooter', () => {
  it('keeps references accessible inside a compact closed disclosure', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ReferencesFooter
          exportedAt="2026-04-21T00:00:00Z"
          references={[
            'State Statistics Agency: national accounts release',
            'Central Bank of Uzbekistan: official reference rate and policy setting',
          ]}
        />
      </I18nextProvider>,
    )

    assert.match(markup, /<details class="overview-references__details">/)
    assert.doesNotMatch(markup, /<details[^>]*open/)
    assert.match(markup, /2 sources · exported/)
    assert.match(markup, /State Statistics Agency: national accounts release/)
    assert.match(markup, /Central Bank of Uzbekistan: official reference rate and policy setting/)
  })
  it('renders structured source provenance as a safe external link', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ReferencesFooter
          exportedAt="2026-07-16T00:00:00Z"
          references={[
            {
              label: 'Statistics Agency CPI',
              period: 'June 2026',
              url: 'https://stat.uz/cpi.pdf',
              observed_at: '2026-07-05T00:00:00Z',
              transformation: 'Official annual index minus 100.',
            },
          ]}
        />
      </I18nextProvider>,
    )

    assert.match(markup, /href="https:\/\/stat\.uz\/cpi\.pdf"/)
    assert.match(markup, /target="_blank" rel="noopener noreferrer"/)
    assert.match(markup, /Source date:/)
    assert.match(markup, /Official annual index minus 100/)
  })
})
