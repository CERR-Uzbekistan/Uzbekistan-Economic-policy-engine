import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { ModelDetail } from '../../../src/components/model-explorer/ModelDetail.js'
import type { ModelCatalogEntry } from '../../../src/contracts/data-contract.js'
import { modelCatalogEntries } from '../../../src/data/mock/model-catalog.js'

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
          modelExplorer: {
            tabs: {
              aria: 'Model detail tabs',
              overview: 'Overview',
              equations: 'Equations',
              parameters: 'Parameters',
              dataSources: 'Data sources',
              caveats: 'Caveats',
            },
            purpose: { title: 'Purpose' },
            equations: { title: 'Core equations' },
            parameters: {
              title: 'Key parameters',
              symbol: 'Symbol',
              name: 'Name',
              value: 'Value',
              range: 'Range',
              empty: 'No parameters are documented for this model.',
            },
            caveats: {
              title: 'Caveats',
              empty: 'No caveats are documented for this model.',
              trackedPrefix: 'Tracked as issue',
              target: 'Target {{version}}.',
            },
            dataSources: {
              title: 'Data sources',
              empty: 'No data sources are documented for this model.',
            },
            validation: { title: 'Validation summary' },
            bridgeEvidence: {
              title: 'Model evidence',
              sourceArtifact: 'Source coverage',
              sourceCoverageIo: 'I-O source tables and public data snapshot',
              publishedDataFile: 'published data file',
              dataVintage: 'Data date',
              exportedAt: 'Updated',
              solverVersion: 'Solver',
              sectorCount: 'Sectors',
              framework: 'Framework',
              units: 'Units',
              linkageCounts: 'Linkage classes',
              caveats: 'Limitations',
            },
          },
        },
      },
    },
  })
  return instance
}

describe('ModelDetail IO model evidence', () => {
  it('renders the model evidence section on an enriched I-O detail entry', async () => {
    const ioEntry = modelCatalogEntries.find((entry) => entry.id === 'io-model')!
    const enrichedEntry: ModelCatalogEntry = {
      ...ioEntry,
      bridge_evidence: {
        status_label: 'Validated',
        source_artifact: 'io_model/io_data.json',
        data_version: '2022',
        exported_at: '2026-04-09',
        solver_version: '0.1.0',
        sector_count: 136,
        framework: 'Leontief - symmetric IO table at basic prices',
        units: 'thousand UZS',
        linkage_counts: [
          { label: 'Key', value: '1' },
          { label: 'Backward-only', value: '2' },
          { label: 'Forward-only', value: '3' },
          { label: 'Weak', value: '130' },
        ],
        caveats: ['Type II arrays are not part of this bridge payload.'],
      },
    }
    const i18n = await createTestI18n()

    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ModelDetail entry={enrichedEntry} activeTab="overview" onTabChange={() => undefined} />
      </I18nextProvider>,
    )

    assert.match(markup, /Model evidence/)
    assert.match(markup, /I-O source tables and public data snapshot/)
    assert.match(markup, /136/)
    assert.match(markup, /Type II arrays are not part of this published data file/)
  })
})
