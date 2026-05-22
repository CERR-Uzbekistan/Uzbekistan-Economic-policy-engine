import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import i18next from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { IoSectorShockPanel } from '../../../src/components/scenario-lab/IoSectorShockPanel.js'
import { toScenarioLabIoAnalyticsWorkspace } from '../../../src/data/adapters/scenario-lab-io-analytics.js'
import { validateIoBridgePayload } from '../../../src/data/bridge/io-guard.js'
import type { IoBridgePayload } from '../../../src/data/bridge/io-types.js'
import type { ScenarioLabIoAnalyticsState } from '../../../src/data/scenario-lab/io-analytics-source.js'

const IO_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/io.json', import.meta.url))

function loadValidIoPayload(): IoBridgePayload {
  const validation = validateIoBridgePayload(JSON.parse(readFileSync(IO_PUBLIC_ARTIFACT_PATH, 'utf8')))
  assert.ok(validation.value)
  return validation.value
}

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
          buttons: { retry: 'Retry' },
          comparison: {
            ioEvidence: {
              linkageClass: {
                key: 'Key',
                backward: 'Backward-only',
                forward: 'Forward-only',
                weak: 'Weak',
              },
            },
          },
          scenarioLab: {
            ioShock: {
              title: 'I-O Sector Shock',
              description: 'Run a final-demand shock.',
              loading: 'Loading I-O analytics data...',
              unavailable: 'I-O analytics data is unavailable.',
              controlsAria: 'I-O sector shock controls',
              policyShockType: 'Policy use case',
              policyShockTypeHint: 'Use cases choose the demand bucket and allocation.',
              demandBucket: 'Demand shock type',
              demandBucketHint: 'Used for selected-demand allocation.',
              amount: 'Shock amount',
              currency: 'Currency',
              exchangeRate: 'FX assumption, UZS/USD',
              distribution: 'Distribution',
              sector: 'Target sector',
              sectorHint: 'Single-sector shocks route the final-demand vector to one of {{count}} sectors.',
              boundary: 'Scope: sector accounting only. This is not a macro, price, or employment forecast.',
              employmentBoundary: 'Jobs are fixed-intensity estimates.',
              topSectors: 'Top affected sectors',
              caveats: 'Source caveats',
              convertedShock: 'Converted demand shock: {{amount}} bln UZS',
              sourceLabelNote:
                'Sector labels are shown as source labels from {{artifact}} and are not translated here.',
              units: {
                employmentEstimate: 'employment count estimate',
              },
              claimLabels: {
                output: 'Accounting multiplier / structural sector linkage',
                gdpContribution: 'I-O value-added accounting contribution, not macro forecast',
                employment: 'Linear employment-intensity estimate, not labor-market forecast',
              },
              whatThisMeans: {
                title: 'What this means',
                body: 'This demand shock requires {{output}} bln UZS of total resources and carries {{valueAdded}} bln UZS of value-added accounting contribution. Employment is shown as {{employment}} estimated positions from fixed sector intensities.',
              },
              buckets: {
                consumption: 'Consumption',
                government: 'Government',
                investment: 'Investment',
                export: 'Export',
              },
              policyShockTypes: {
                public_investment_project: 'Public investment project',
                export_expansion: 'Export expansion',
                domestic_demand_reallocation: 'Domestic demand support',
                government_procurement: 'Government procurement',
                single_sector_final_demand: 'Single-sector final-demand shock',
                single_sector_production_disabled: 'Single-sector production shock (not yet available)',
              },
              distributions: {
                final_demand: 'By selected demand shares',
                output: 'By sector resource shares',
                gva: 'By GVA shares',
                equal: 'Equal across sectors',
                sector: 'To one sector',
              },
              currencies: {
                bln_uzs: 'Billion UZS',
                mln_usd: 'Million USD',
              },
              summary: {
                title: 'Current run',
                bucket: 'Demand bucket',
                amount: 'Amount',
                fx: 'FX assumption',
                distribution: 'Distribution mode',
                selectedSector: 'Selected sector',
                dataVintage: 'Base year',
                policyUse: 'Policy use case',
                compact: '{{bucket}} · {{amount}} · {{distribution}} · {{vintage}}',
                fxCompact: 'FX: {{fx}}',
                sectorCompact: 'Sector: {{sector}}',
              },
              kpis: {
                output: 'Total resources',
                valueAdded: 'Value added',
                gdpContribution: 'GDP accounting contribution',
                employment: 'Jobs estimate',
                multiplier: 'Resource multiplier',
                outputNote: 'Domestic output plus import content',
                valueAddedNote: 'Accounting GDP contribution',
                employmentNote: 'Fixed-intensity estimate',
                multiplierNote: 'Total resources per 1 UZS final-demand shock',
              },
              importContent: {
                title: 'Domestic and import content',
                body:
                  'Estimated with each sector source import share. This is an I-O accounting split, not a trade forecast.',
                domestic: 'Domestic resource part',
                imported: 'Import content',
                share: 'Import share',
              },
              decision: {
                eyebrow: 'Decision view',
                title: 'Final-demand shock result',
                lead: '{{bucket}} shock of {{amount}}, allocated {{distribution}}.',
                sectorLead: 'Shock of {{amount}} assigned to {{sector}}.',
              },
              meta: {
                dataVintage: 'Base year {{vintage}}',
                auditPassed: 'Data checks passed {{passed}}/{{total}}',
                auditFailed: 'Data checks need review: {{failed}}',
              },
              concentration: {
                title: 'Where the effect concentrates',
                subtitle:
                  'Top sectors by total-resource response. Value-added and employment are shown beside each row.',
                share: 'Share',
              },
              sensitivity: {
                title: 'Advanced robustness checks',
                subtitle: 'Compare allocation and assumption choices against the base run.',
                allocations: 'Allocation modes',
                parameters: 'Assumption ranges',
                deltaLabel: 'vs base',
                headers: {
                  case: 'Case',
                  output: 'Resources',
                  valueAdded: 'Value added',
                  employment: 'Employment',
                  multiplier: 'Mult.',
                },
                cases: {
                  'allocation-final-demand': {
                    label: 'Selected final-demand shares',
                    assumption: 'Uses the chosen final-demand bucket shares.',
                  },
                  'allocation-output': {
                    label: 'Sector resource shares',
                    assumption: 'Allocates the same shock by baseline total-resource shares.',
                  },
                  'allocation-sector': {
                    label: 'One selected sector',
                    assumption: 'Routes the shock to the selected sector only.',
                  },
                  'employment-low': {
                    label: 'Employment intensity low',
                    assumption: 'Employment coefficients scaled down by 15%.',
                  },
                  'employment-base': {
                    label: 'Employment intensity base',
                    assumption: 'Uses the source employment coefficients.',
                  },
                  'employment-high': {
                    label: 'Employment intensity high',
                    assumption: 'Employment coefficients scaled up by 15%.',
                  },
                  'import-leakage-low': {
                    label: 'Import leakage low',
                    assumption: 'Import leakage scaled down by 10%.',
                  },
                  'import-leakage-base': {
                    label: 'Import leakage base',
                    assumption: 'Uses source import shares.',
                  },
                  'import-leakage-high': {
                    label: 'Import leakage high',
                    assumption: 'Import leakage scaled up by 10%.',
                  },
                  'fx-low': {
                    label: 'FX conversion low',
                    assumption: 'USD shocks converted with FX 10% lower.',
                  },
                  'fx-base': {
                    label: 'FX conversion base',
                    assumption: 'Uses the selected FX assumption.',
                  },
                  'fx-high': {
                    label: 'FX conversion high',
                    assumption: 'USD shocks converted with FX 10% higher.',
                  },
                },
                note:
                  'Sensitivity rows are deterministic re-runs of the same static I-O calculation; they do not add prices, substitution, fiscal feedback, or general-equilibrium effects.',
              },
              interpretation: {
                title: 'Interpretation',
                exposure: 'Largest exposure',
                exposureBody: '{{sector}} accounts for {{share}}% of the total-resource effect.',
                noExposure: 'No sector concentration is available for this shock.',
                boundary: 'Boundary',
                boundaryBody:
                  'Read this as sector transmission evidence. It is not a price, inflation, or macro forecast.',
                sensitivity: 'Sensitivity',
                sensitivityBody:
                  'Use advanced checks to see whether the sector story changes under allocation, jobs, import, or FX assumptions.',
                nextUse: 'Next model to link',
                nextUseBody:
                  'Save this run for Comparison, then connect it to PE tariff shocks or future CGE work when model links are available.',
              },
              detailTable: 'Detailed sector table',
              dataChecks: {
                title: 'Data quality checks',
                note:
                  'These checks test artifact structure and accounting identities. They do not validate behavioral responses or forecast accuracy.',
              },
              table: {
                rank: 'Rank',
                sector: 'Sector',
                sectorCode: 'Code',
                sourceLabel: 'Source label',
                output: 'Total resources, bln UZS',
                valueAdded: 'Value added, bln UZS',
                employment: 'Employment',
                linkage: 'Linkage',
              },
            },
          },
        },
      },
    },
  })
  return instance
}

describe('IoSectorShockPanel', () => {
  it('renders controls, sector results, and honest employment/boundary copy', async () => {
    const payload = loadValidIoPayload()
    const state: ScenarioLabIoAnalyticsState = {
      status: 'ready',
      payload,
      workspace: toScenarioLabIoAnalyticsWorkspace(payload),
      error: null,
    }
    const i18n = await createTestI18n()

    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <IoSectorShockPanel state={state} onRetry={() => {}} />
      </I18nextProvider>,
    )

    assert.match(markup, /I-O Sector Shock/)
    assert.match(markup, /Shock amount/)
    assert.match(markup, /Policy use case/)
    assert.match(markup, /Public investment project/)
    assert.match(markup, /Single-sector production shock \(not yet available\)/)
    assert.match(markup, /Currency/)
    assert.match(markup, /Final-demand shock result/)
    assert.match(markup, /Data checks passed/)
    assert.match(markup, /Where the effect concentrates/)
    assert.match(markup, /Interpretation/)
    assert.match(markup, /Advanced robustness checks/)
    assert.match(markup, /Compare allocation and assumption choices/)
    assert.match(markup, /Selected final-demand shares/)
    assert.match(markup, /Sector resource shares/)
    assert.match(markup, /One selected sector/)
    assert.match(markup, /Employment intensity low/)
    assert.match(markup, /Employment intensity high/)
    assert.match(markup, /Import leakage low/)
    assert.match(markup, /Import leakage high/)
    assert.match(markup, /Current run/)
    assert.match(markup, /Used for selected-demand allocation/)
    assert.match(markup, /By selected demand shares/)
    assert.match(markup, /Accounting GDP contribution/)
    assert.match(markup, /Jobs estimate/)
    assert.match(markup, /Domestic output plus import content/)
    assert.match(markup, /Domestic and import content/)
    assert.match(markup, /Domestic resource part/)
    assert.match(markup, /Import share/)
    assert.match(markup, /Fixed-intensity estimate/)
    assert.match(markup, /Read this as sector transmission evidence/)
    assert.match(markup, /Detailed sector table/)
    assert.match(markup, /Data quality checks/)
    assert.match(markup, /Coefficient bounds/)
    assert.match(markup, /Sector labels are shown as source labels/)
    assert.match(markup, /Code:/)
    assert.match(markup, /Source label:/)
    assert.doesNotMatch(markup, /If a Export shock/)
    assert.doesNotMatch(markup, /n\/a/)
    assert.doesNotMatch(markup, /gross output/i)
    assert.doesNotMatch(markup, /Import-substitution/)
    assert.doesNotMatch(markup, /scenarioLab\.ioShock\.sensitivity/)
    assert.match(markup, /not a macro, price, or employment forecast/)
    assert.match(markup, /fixed-intensity estimates/)
  })

  it('renders a non-breaking fallback when IO analytics is unavailable', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <IoSectorShockPanel
          state={{ status: 'error', payload: null, workspace: null, error: 'failed' }}
          onRetry={() => {}}
        />
      </I18nextProvider>,
    )

    assert.match(markup, /I-O analytics data is unavailable/)
    assert.match(markup, /Retry/)
  })
})
