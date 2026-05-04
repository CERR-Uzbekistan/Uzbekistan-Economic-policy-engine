import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { NowcastBanner } from '../../../src/components/overview/NowcastBanner.js'

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
            nowcast: {
              banner: {
                title: 'Live nowcast unavailable',
                subtitle: 'Showing reference data',
                retry: 'Retry',
              },
            },
          },
        },
      },
    },
  })
  return instance
}

async function renderBanner(props: Parameters<typeof NowcastBanner>[0]): Promise<string> {
  const instance = await createTestI18n()
  return renderToStaticMarkup(
    createElement(
      I18nextProvider,
      { i18n: instance },
      createElement(NowcastBanner, props),
    ),
  )
}

describe('NowcastBanner', () => {
  it('renders with alert role, title, subtitle, and retry button', async () => {
    const html = await renderBanner({
      errorKind: 'transport',
      errorDetail: 'HTTP 503',
      onRetry: () => {},
    })
    assert.equal(html.includes('role="alert"'), true)
    assert.equal(html.includes('Live nowcast unavailable'), true)
    assert.equal(html.includes('Showing reference data'), true)
    assert.equal(html.includes('Retry'), true)
    assert.equal(html.includes('HTTP 503'), true)
    assert.equal(html.includes('transport'), true)
  })

  it('renders with validation error kind', async () => {
    const html = await renderBanner({
      errorKind: 'validation',
      errorDetail: 'nowcast.current_quarter: invalid',
      onRetry: () => {},
    })
    assert.equal(html.includes('validation'), true)
    assert.equal(html.includes('invalid'), true)
  })

  it('omits the technical detail line gracefully when errorDetail is absent', async () => {
    const html = await renderBanner({
      errorKind: 'transport',
      onRetry: () => {},
    })
    assert.equal(html.includes('transport'), true)
  })
})
