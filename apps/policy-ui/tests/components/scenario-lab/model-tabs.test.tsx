import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { ScenarioLabModelTabs } from '../../../src/components/scenario-lab/ScenarioLabModelTabs.js'
import { ScenarioLabTabShell } from '../../../src/components/scenario-lab/ScenarioLabTabShell.js'

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
            modelTabs: {
              title: 'Analysis tabs',
              description: 'Run model-native scenarios in one workspace.',
              tabsAria: 'Scenario Lab model tabs',
              macroQpm: 'Macro / QPM',
              ioSectorShock: 'I-O Sector Shock',
              savedRuns: 'Saved Runs',
              synthesisPreview: 'Synthesis Preview',
              status: {
                active: 'Active',
                next: 'Next',
                shell: 'Shell',
                planned: 'Planned',
              },
            },
            modelTabShell: {
              eyebrow: 'Model tab',
              io: {
                title: 'I-O Sector Shock',
                description: 'MCP-aligned I-O analytics contract.',
                items: {
                  inputs: 'Inputs: demand bucket and amount.',
                  outputs: 'Outputs: sector effects.',
                  boundary: 'Boundary: sector transmission evidence only; not a macro forecast.',
                },
              },
              saved: {
                title: 'Saved Runs',
                description: '{{count}} saved run(s).',
                items: {
                  macro: 'QPM macro runs keep their shape.',
                  io: 'I-O runs save sector outputs.',
                  compare: 'Comparison renders separate blocks.',
                },
              },
              synthesis: {
                title: 'Synthesis Preview',
                description: 'Planned.',
                items: {
                  chain: 'PE -> I-O -> CGE -> FPP.',
                  layers: 'QPM and DFM layers.',
                  reconciliation: 'Reconciliation table.',
                },
              },
            },
          },
        },
      },
    },
  })
  return instance
}

describe('ScenarioLabModelTabs', () => {
  it('renders Macro/QPM as active and keeps Synthesis disabled', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ScenarioLabModelTabs activeTab="macro_qpm" onTabChange={() => {}} />
      </I18nextProvider>,
    )

    assert.match(markup, /role="tablist"/)
    assert.match(markup, /Macro \/ QPM/)
    assert.match(markup, /I-O Sector Shock/)
    assert.match(markup, /aria-selected="true"[^>]*><span>Macro \/ QPM<\/span>/)
    assert.match(markup, /aria-disabled="true"[^>]*disabled="">/)
    assert.match(markup, /Synthesis Preview/)
  })

  it('renders the I-O shell with non-overclaiming boundary copy', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ScenarioLabTabShell tab="io_sector_shock" />
      </I18nextProvider>,
    )

    assert.match(markup, /I-O Sector Shock/)
    assert.match(markup, /sector transmission evidence only/)
    assert.match(markup, /not a macro forecast/)
  })
})
