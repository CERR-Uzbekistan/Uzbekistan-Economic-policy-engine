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
              demandBucket: 'Demand shock type',
              amount: 'Shock amount',
              currency: 'Currency',
              exchangeRate: 'FX assumption, UZS/USD',
              distribution: 'Distribution',
              sector: 'Sector',
              sectorHint: 'Single-sector shocks route the final-demand vector to one of {{count}} sectors.',
              boundary:
                'Sector transmission only. Value-added is an I-O accounting contribution to GDP, not a macro forecast.',
              employmentBoundary:
                'Employment is a linear employment-intensity estimate, not a labor-market forecast.',
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
                body: 'This demand shock produces {{output}} bln UZS of gross output effect and {{valueAdded}} bln UZS of value-added accounting contribution. Employment is shown as {{employment}} estimated positions from fixed sector intensities.',
              },
              buckets: {
                consumption: 'Consumption',
                government: 'Government',
                investment: 'Investment',
                export: 'Export',
              },
              distributions: {
                output: 'By output shares',
                gva: 'By GVA shares',
                equal: 'Equal across sectors',
                sector: 'Single sector',
              },
              currencies: {
                bln_uzs: 'Billion UZS',
                mln_usd: 'Million USD',
              },
              summary: {
                title: 'Run summary',
                bucket: 'Demand bucket',
                amount: 'Amount',
                fx: 'FX assumption',
                distribution: 'Distribution mode',
                selectedSector: 'Selected sector',
                dataVintage: 'Data vintage',
              },
              kpis: {
                output: 'Output effect',
                valueAdded: 'Value-added effect',
                gdpContribution: 'GDP accounting contribution',
                employment: 'Employment effect',
                multiplier: 'Output multiplier',
              },
              table: {
                rank: 'Rank',
                sector: 'Sector',
                sectorCode: 'Code',
                sourceLabel: 'Source label',
                output: 'Output, bln UZS',
                valueAdded: 'VA, bln UZS',
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
    assert.match(markup, /Currency/)
    assert.match(markup, /Top affected sectors/)
    assert.match(markup, /Run summary/)
    assert.match(markup, /Demand bucket/)
    assert.match(markup, /GDP accounting contribution/)
    assert.match(markup, /Employment effect/)
    assert.match(markup, /Accounting multiplier \/ structural sector linkage/)
    assert.match(markup, /I-O value-added accounting contribution, not macro forecast/)
    assert.match(markup, /Linear employment-intensity estimate, not labor-market forecast/)
    assert.match(markup, /What this means/)
    assert.match(markup, /Sector labels are shown as source labels/)
    assert.match(markup, /Code:/)
    assert.match(markup, /Source label:/)
    assert.match(markup, /employment count estimate/)
    assert.doesNotMatch(markup, /n\/a/)
    assert.match(markup, /not a macro forecast/)
    assert.match(markup, /linear employment-intensity estimate/)
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
