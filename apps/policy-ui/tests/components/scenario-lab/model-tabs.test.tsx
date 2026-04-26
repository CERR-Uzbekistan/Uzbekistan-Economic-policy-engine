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
              plannedTitle: 'Planned model lanes',
              plannedDescription: 'Coming next. These lanes do not run models in this preview.',
              macroQpm: 'Macro / QPM',
              ioSectorShock: 'I-O Sector Shock',
              peTradeShock: 'PE Trade Shock',
              cgeReformShock: 'CGE Reform Shock',
              fppFiscalPath: 'FPP Fiscal Path',
              savedRuns: 'Saved Runs',
              synthesisPreview: 'Synthesis Preview',
              subtitle: {
                macroQpm: 'Macro scenario simulation',
                ioSectorShock: 'Sector linkage analysis',
                peTradeShock: 'Trade incidence, planned',
                cgeReformShock: 'General equilibrium reform analysis, planned',
                fppFiscalPath: 'Fiscal consistency, planned',
                savedRuns: 'Saved analytical runs',
                synthesisPreview: 'Cross-model synthesis, planned',
              },
              status: {
                active: 'Active',
                next: 'Next',
                bridgePilot: 'Bridge pilot',
                shell: 'Shell',
                planned: 'Planned',
              },
            },
            modelTabShell: {
              eyebrow: 'Model tab',
              plannedStatus: 'Planned / disabled',
              io: {
                title: 'I-O Sector Shock',
                description: 'MCP-aligned I-O analytics contract.',
                items: {
                  inputs: 'Inputs: demand bucket and amount.',
                  outputs: 'Outputs: sector effects.',
                  boundary: 'Boundary: sector transmission evidence only; not a macro forecast.',
                },
              },
              pe: {
                title: 'PE Trade Shock',
                description: 'Planned partial-equilibrium trade analysis.',
                items: {
                  inputs: 'Expected inputs: tariff and product group.',
                  outputs: 'Expected outputs: import and export effects.',
                  boundary: 'Integration boundary: direct trade-channel evidence only.',
                },
              },
              cge: {
                title: 'CGE Reform Shock',
                description: 'Planned economy-wide reform analysis.',
                items: {
                  inputs: 'Expected inputs: productivity and tax assumptions.',
                  outputs: 'Expected outputs: welfare and sector reallocation.',
                  boundary: 'Integration boundary: CGE contract required before activation.',
                },
              },
              fpp: {
                title: 'FPP Fiscal Path',
                description: 'Planned fiscal-programming path analysis.',
                items: {
                  inputs: 'Expected inputs: revenue and debt assumptions.',
                  outputs: 'Expected outputs: deficit and debt path.',
                  boundary: 'Integration boundary: fiscal sustainability evidence only.',
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
  it('renders active model tabs and demotes planned lanes outside the tablist', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ScenarioLabModelTabs activeTab="macro_qpm" onTabChange={() => {}} />
      </I18nextProvider>,
    )

    assert.match(markup, /role="tablist"/)
    assert.match(markup, /Macro \/ QPM/)
    assert.match(markup, /I-O Sector Shock/)
    assert.match(markup, /Saved Runs/)
    assert.match(markup, /Planned model lanes/)
    assert.match(markup, /PE Trade Shock/)
    assert.match(markup, /CGE Reform Shock/)
    assert.match(markup, /FPP Fiscal Path/)
    assert.match(markup, /Macro scenario simulation/)
    assert.match(markup, /Sector linkage analysis/)
    assert.match(markup, /Bridge pilot/)
    assert.doesNotMatch(markup, /scenario-model-tabs__status">Next/)
    assert.match(markup, /Trade incidence, planned/)
    assert.match(markup, /General equilibrium reform analysis, planned/)
    assert.match(markup, /Fiscal consistency, planned/)
    assert.match(markup, /aria-selected="true"[^>]*><span>Macro \/ QPM<\/span>/)
    assert.match(markup, /Synthesis Preview/)
    assert.equal(markup.match(/role="tab"/g)?.length, 3)
    assert.doesNotMatch(markup, /id="scenario-model-tab-pe_trade_shock"/)
    assert.doesNotMatch(markup, /id="scenario-model-tab-synthesis_preview"/)
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

  it('renders planned PE/CGE/FPP placeholders without implying active computation', async () => {
    const i18n = await createTestI18n()
    const peMarkup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ScenarioLabTabShell tab="pe_trade_shock" />
      </I18nextProvider>,
    )
    const cgeMarkup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ScenarioLabTabShell tab="cge_reform_shock" />
      </I18nextProvider>,
    )
    const fppMarkup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ScenarioLabTabShell tab="fpp_fiscal_path" />
      </I18nextProvider>,
    )

    assert.match(peMarkup, /Planned \/ disabled/)
    assert.match(peMarkup, /Expected inputs: tariff/)
    assert.match(peMarkup, /direct trade-channel evidence only/)
    assert.match(cgeMarkup, /Planned \/ disabled/)
    assert.match(cgeMarkup, /CGE contract required before activation/)
    assert.match(fppMarkup, /Planned \/ disabled/)
    assert.match(fppMarkup, /fiscal sustainability evidence only/)
  })
})
