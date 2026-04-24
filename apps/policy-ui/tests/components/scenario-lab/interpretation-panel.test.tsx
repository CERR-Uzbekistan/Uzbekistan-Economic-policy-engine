import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { renderToStaticMarkup } from 'react-dom/server'
import { InterpretationPanel } from '../../../src/components/scenario-lab/InterpretationPanel.js'
import type { ScenarioLabInterpretation } from '../../../src/contracts/data-contract.js'

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
          scenarioLab: {
            interpretation: {
              title: 'Interpretation',
              description: 'Translate model outputs into decision language.',
              sections: {
                whatChanged: 'What changed',
                whyItChanged: 'Why it changed',
                keyRisks: 'Key risks',
                policyImplications: 'Policy implications',
                suggestedNextScenarios: 'Suggested next scenarios',
              },
              aiAttribution: {
                title: 'AI-assisted · Unreviewed draft',
                body:
                  'This interpretation was drafted from structured simulation outputs using the {{engine}}. Human review is required before citing externally.',
                engineTemplate: 'template narrative engine',
                engineAssisted: 'assisted narrative engine',
                engineReviewed: 'reviewed narrative engine',
                reviewedMeta: 'Reviewed by {{reviewer_name}} on {{review_date}}.',
              },
            },
          },
        },
      },
    },
  })
  return instance
}

function buildInterpretation(
  overrides: Partial<ScenarioLabInterpretation> = {},
): ScenarioLabInterpretation {
  return {
    what_changed: ['GDP growth softened.'],
    why_it_changed: ['External demand weakened.'],
    key_risks: ['Persistent imported inflation.'],
    policy_implications: ['Tighten policy sequencing.'],
    suggested_next_scenarios: ['External slowdown with fiscal consolidation.'],
    metadata: { generation_mode: 'template' },
    ...overrides,
  }
}

describe('InterpretationPanel', () => {
  it('ALWAYS renders the AI-attribution disclaimer in template mode', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <InterpretationPanel
            interpretation={buildInterpretation({ metadata: { generation_mode: 'template' } })}
          />
        </I18nextProvider>
      </MemoryRouter>,
    )

    assert.match(markup, /class="ai-attribution"/)
    assert.match(markup, /AI-assisted · Unreviewed draft/)
    assert.match(markup, /template narrative engine/)
  })

  it('switches engine wording in assisted mode but keeps disclaimer visible', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <InterpretationPanel
            interpretation={buildInterpretation({ metadata: { generation_mode: 'assisted' } })}
          />
        </I18nextProvider>
      </MemoryRouter>,
    )

    assert.match(markup, /class="ai-attribution"/)
    assert.match(markup, /assisted narrative engine/)
    assert.doesNotMatch(markup, /template narrative engine/)
  })

  it('renders reviewer meta line when reviewed mode carries a reviewer name', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <InterpretationPanel
            interpretation={buildInterpretation({
              metadata: {
                generation_mode: 'reviewed',
                reviewer_name: 'M. Usmanov',
                reviewed_at: '2026-04-20T09:15:00+05:00',
              },
            })}
          />
        </I18nextProvider>
      </MemoryRouter>,
    )

    assert.match(markup, /class="ai-attribution"/)
    assert.match(markup, /reviewed narrative engine/)
    assert.match(markup, /Reviewed by M\. Usmanov/)
  })

  it('renders clickable Link anchors for suggested_next entries', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <I18nextProvider i18n={i18n}>
          <InterpretationPanel
            interpretation={buildInterpretation({
              suggested_next: [
                {
                  label: 'Pair with a remittance shock',
                  target_route: '/scenario-lab',
                  target_preset: 'russia_slowdown',
                },
                {
                  label: 'Compare with baseline and tight-money',
                  target_route: '/comparison',
                },
              ],
            })}
          />
        </I18nextProvider>
      </MemoryRouter>,
    )

    assert.match(markup, /href="\/scenario-lab\?preset=russia_slowdown"/)
    assert.match(markup, /href="\/comparison"/)
  })
})
