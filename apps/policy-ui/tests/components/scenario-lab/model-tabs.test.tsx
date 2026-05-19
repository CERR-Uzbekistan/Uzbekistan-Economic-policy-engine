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
              description: 'Run each active model in one workspace.',
              tabsAria: 'Scenario Lab model tabs',
              plannedTitle: 'Inactive model lanes',
              plannedDescription: 'These analysis lanes are shown for orientation only and do not run yet.',
              macroQpm: 'Macro / QPM',
              ioSectorShock: 'I-O Sector Shock',
              peTradeShock: 'PE Trade Shock',
              cgeReformShock: 'CGE Reform Shock',
              fppFiscalPath: 'FPP Fiscal Path',
              savedRuns: 'Saved Runs',
              synthesisPreview: 'Synthesis',
              subtitle: {
              macroQpm: 'Macro scenario simulation',
              ioSectorShock: 'Sector linkage analysis',
                peTradeShock: 'Direct tariff incidence',
                cgeReformShock: 'General equilibrium reform analysis, not active',
                fppFiscalPath: 'Fiscal consistency, not active',
                savedRuns: 'Saved analytical runs',
                synthesisPreview: 'Cross-model synthesis, not active',
              },
              status: {
                active: 'Active',
                next: 'Next',
                bridgePilot: 'Active data',
                shell: 'Local',
                planned: 'Not active',
              },
            },
            modelTabShell: {
              eyebrow: 'Model tab',
              plannedStatus: 'Not active',
              io: {
                title: 'I-O Sector Shock',
                description: 'I-O data layer.',
                items: {
                  inputs: 'Inputs: demand bucket and amount.',
                  outputs: 'Outputs: sector effects.',
                  boundary: 'Boundary: sector transmission evidence only; not a macro forecast.',
                },
              },
              pe: {
                title: 'PE Trade Shock',
                description: 'Direct tariff-incidence analysis from the PE public data file.',
                items: {
                  inputs: 'Inputs: tariff cut, HS section, partner or regime scope, and section elasticity set.',
                  outputs: 'Outputs: trade creation, diversion, welfare, revenue, and import-base effects.',
                  boundary: 'Boundary: direct trade-channel evidence only.',
                },
              },
              cge: {
                title: 'CGE Reform Shock',
                description: 'Economy-wide reform analysis is not active yet.',
                items: {
                  inputs: 'Expected inputs: productivity and tax assumptions.',
                  outputs: 'Expected outputs: welfare and sector reallocation.',
                  boundary: 'Boundary: model-owner approval required before activation.',
                },
              },
              fpp: {
                title: 'FPP Fiscal Path',
                description: 'Fiscal path analysis is not active yet.',
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
                title: 'Synthesis',
                description: 'Cross-model reconciliation is not active yet.',
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
    assert.match(markup, /Inactive model lanes/)
    assert.match(markup, /<details class="scenario-model-tabs__planned">/)
    assert.match(markup, /PE Trade Shock/)
    assert.match(markup, /CGE Reform Shock/)
    assert.match(markup, /FPP Fiscal Path/)
    assert.match(markup, /Macro scenario simulation/)
    assert.match(markup, /Sector linkage analysis/)
    assert.match(markup, /Active data/)
    assert.doesNotMatch(markup, /scenario-model-tabs__status">Next/)
    assert.match(markup, /Direct tariff incidence/)
    assert.match(markup, /General equilibrium reform analysis, not active/)
    assert.match(markup, /Fiscal consistency, not active/)
    assert.match(markup, /aria-selected="true"[^>]*><span>Macro \/ QPM<\/span>/)
    assert.match(markup, /Synthesis/)
    assert.equal(markup.match(/role="tab"/g)?.length, 4)
    assert.match(markup, /id="scenario-model-tab-pe_trade_shock"/)
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

  it('renders active PE shell and planned CGE/FPP placeholders without implying active computation', async () => {
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

    assert.doesNotMatch(peMarkup, /Not active/)
    assert.match(peMarkup, /Inputs: tariff cut/)
    assert.match(peMarkup, /direct trade-channel evidence only/)
    assert.match(cgeMarkup, /Not active/)
    assert.match(cgeMarkup, /model-owner approval required before activation/)
    assert.match(fppMarkup, /Not active/)
    assert.match(fppMarkup, /fiscal sustainability evidence only/)
  })
})
