import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { KnowledgeHubContentView } from '../../src/components/knowledge-hub/KnowledgeHubContentView.js'
import { knowledgeHubContentMock } from '../../src/data/mock/knowledge-hub.js'

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
          trustState: {
            labels: {
              staticCuratedContent: 'Static curated content',
              planned: 'Planned',
            },
          },
          knowledgeHub: {
            staticPilotBanner: 'Curated static pilot content — not a live legal or research feed.',
            metadata: {
              sourceStatic: 'Source: static pilot content',
              reviewCurated: 'Review state: curated pilot copy',
              reviewedBy: 'Reviewed by {{reviewer}}',
              author: 'Author: {{author}}',
              sourceDate: 'Source date: {{date}}',
            },
            reforms: {
              title: 'Reform tracker',
              helper: 'Policy actions linked to affected models and economic domains.',
              empty: 'No reforms are currently tracked.',
            },
            briefs: {
              title: 'Research briefs',
              helper: 'CERR team analysis.',
              empty: 'No research briefs are currently available.',
              aiDraftedChip: 'AI-drafted',
              byline: {
                aiDrafted: 'AI-drafted',
                reviewedBy: 'reviewed by {{reviewer}}',
                readTime: '{{minutes}} min read',
              },
            },
          },
        },
      },
    },
  })
  return instance
}

describe('Knowledge Hub static content metadata', () => {
  it('renders the static-content warning and lightweight source/review metadata', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <KnowledgeHubContentView content={knowledgeHubContentMock} />
      </I18nextProvider>,
    )

    assert.match(markup, /Static curated content/)
    assert.match(markup, /not a live legal or research feed/)
    assert.match(markup, /Source: static pilot content/)
    assert.match(markup, /Review state: curated pilot copy/)
    assert.match(markup, /Reviewed by CERR Trade Desk/)
    assert.match(markup, /Source date: 05 Mar 2026/)
  })
})
