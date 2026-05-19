import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { ModelCatalogCard } from '../../../src/components/model-explorer/ModelCatalogCard.js'
import { ModelDetail } from '../../../src/components/model-explorer/ModelDetail.js'
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
            card: {
              currentUse: 'Current app use',
              methodologyOnly: 'Methodology only',
              selectAria: 'Inspect {{model}} model',
            },
            status: {
              active: 'Active',
              notActive: 'Not active',
            },
            statusNotice: {
              referenceTitle: 'Reference only',
              referenceBody:
                'This model is documented for methodology context. It is not connected to Scenario Lab runs or public model artifacts in the current preview.',
              activationTitle: 'Required before activation',
            },
            tabs: {
              aria: 'Model detail tabs',
              overview: 'Overview',
              equations: 'Equations',
              parameters: 'Parameters',
              dataSources: 'Data sources',
              caveats: 'Caveats',
            },
            purpose: { title: 'Purpose' },
            equations: {
              title: 'Core equations',
              smePendingAria: 'Equation rendering needs review',
              smePendingChip: 'Review needed',
            },
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

describe('Model Explorer catalog cards', () => {
  it('uses one clear active status label instead of duplicated live/active badges', async () => {
    const qpmEntry = modelCatalogEntries.find((entry) => entry.id === 'qpm-uzbekistan')!
    const i18n = await createTestI18n()

    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ModelCatalogCard entry={qpmEntry} isActive onSelect={() => undefined} />
      </I18nextProvider>,
    )

    assert.match(markup, /Active/)
    assert.match(markup, /Current app use/)
    assert.doesNotMatch(markup, /Live data/)
  })

  it('labels inactive model cards as methodology-only reference lanes', async () => {
    const peEntry = modelCatalogEntries.find((entry) => entry.id === 'cge-model')!
    const i18n = await createTestI18n()

    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ModelCatalogCard entry={peEntry} isActive={false} onSelect={() => undefined} />
      </I18nextProvider>,
    )

    assert.match(markup, /Not active/)
    assert.match(markup, /Methodology only/)
  })

  it('renders a reference-only boundary when an inactive model is inspected', async () => {
    const cgeEntry = modelCatalogEntries.find((entry) => entry.id === 'cge-model')!
    const i18n = await createTestI18n()

    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <ModelDetail entry={cgeEntry} activeTab="overview" onTabChange={() => undefined} />
      </I18nextProvider>,
    )

    assert.match(markup, /Reference only/)
    assert.match(markup, /not connected to Scenario Lab runs/)
    assert.match(markup, /Required before activation/)
    assert.match(markup, /Economist-approved SAM/)
  })
})
