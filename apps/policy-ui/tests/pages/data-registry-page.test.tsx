import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import i18next from 'i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { PRIMARY_NAV_ITEMS } from '../../src/app/shell/nav.js'
import { DataRegistryContent } from '../../src/components/data-registry/DataRegistryContent.js'
import type { PeBridgePayload } from '../../src/data/bridge/pe-types.js'
import { buildDataRegistry } from '../../src/data/data-registry/source.js'
import { buildValidDfmPayload } from '../data/bridge/dfm-fixture.js'
import { buildValidQpmPayload } from '../data/bridge/qpm-fixture.js'
import type { IoBridgePayload } from '../../src/data/bridge/io-types.js'

const ROUTER_SOURCE_PATH = fileURLToPath(new URL('../../../src/app/router.tsx', import.meta.url))
const PE_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../public/data/pe.json', import.meta.url))

function minimalIoPayload(): IoBridgePayload {
  return {
    attribution: {
      model_id: 'IO',
      model_name: 'Input-Output Sector Analytics',
      module: 'io_model',
      version: '0.1.0',
      run_id: 'io-export-2026-04-22',
      data_version: '2022',
      timestamp: '2026-04-22T08:00:00Z',
    },
    sectors: [
      {
        id: 0,
        code: 'A',
        name_ru: 'Agriculture',
        output_thousand_uzs: 100,
        total_resources_thousand_uzs: 110,
        imports_thousand_uzs: 10,
        gva_thousand_uzs: 50,
        compensation_of_employees_thousand_uzs: 20,
        gross_operating_surplus_thousand_uzs: 30,
        output_multiplier: 1.1,
        value_added_multiplier: 0.5,
        final_demand: {
          household: 40,
          government: 10,
          npish: 0,
          gfcf: 10,
          inventories: 0,
          exports: 20,
          total: 80,
        },
      },
    ],
    sector_dictionary: [
      {
        code: 'A',
        source_label: 'Agriculture',
        display_label_en: 'Agriculture',
        display_label_ru: 'Agriculture',
        display_label_uz: null,
        broad_group: 'agriculture',
        tradable_tag: null,
        value_chain_tag: null,
      },
    ],
    matrices: {
      technical_coefficients: [[0.1]],
      leontief_inverse: [[1.1]],
    },
    totals: {
      output_thousand_uzs: [100],
      total_resources_thousand_uzs: [110],
      final_demand_thousand_uzs: [80],
      imports_thousand_uzs: [10],
    },
    caveats: [],
    metadata: {
      exported_at: '2026-04-22T08:00:00Z',
      source_script_sha: null,
      solver_version: '0.1.0',
      source_artifact: 'io_model/io_data.json',
      source_artifact_generated: '2026-04-22T08:00:00Z',
      source_workbooks: [
        {
          role: 'symmetric_input_output_table',
          file_name: 'ТЗВ 2022 136х136.xlsx',
          sheets: ['ТЗВ всего'],
          description: 'Source symmetric input-output table.',
        },
      ],
      source_title: 'Uzbekistan Input-Output Table',
      source: 'Statistical Agency',
      framework: 'SNA',
      units: 'thousand UZS',
      base_year: 2022,
      n_sectors: 1,
    },
  }
}

function loadPublicPePayload(): PeBridgePayload {
  return JSON.parse(readFileSync(PE_PUBLIC_ARTIFACT_PATH, 'utf8')) as PeBridgePayload
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
          trustState: {
            labels: {
              artifactGuardChecked: 'Format checked',
              planned: 'Not active',
              lastValidationCheck: 'Last validation check',
            },
          },
          overview: { common: { middleDot: '·' } },
          dataRegistry: {
            summary: { aria: 'summary' },
            filters: {
              aria: 'filters',
              all: 'All',
              active: 'Active files',
              warnings: 'Warnings',
              planned: 'Not active',
              missingUnavailable: 'Missing / unavailable',
              empty: 'No records match this filter.',
            },
            legend: {
              title: 'Status legend',
              valid: {
                label: 'Format checked',
                description:
                  'Data file loaded and passed format checks. This is not economic or model validation.',
              },
              warning: {
                label: 'Warning',
                description: 'Data file loaded, but caveats or date warnings exist.',
              },
              planned: {
                label: 'Not active',
                description: 'Intentionally absent in this release.',
              },
              lastValidationCheck: {
                description: 'Last time this page checked the data files.',
              },
            },
            status: {
              valid: 'Format checked',
              warning: 'Warning',
              failed: 'Failed',
              missing: 'Missing',
              unavailable: 'Unavailable',
              planned: 'Not active',
            },
            sections: {
              dataSources: { title: 'Data sources', description: 'Sources.' },
              modelInputs: { title: 'Model inputs', description: 'Inputs.' },
              bridgeOutputs: { title: 'Model outputs', description: 'Outputs.' },
              plannedArtifacts: { title: 'Not active yet', description: 'Inactive records.' },
              vintages: { title: 'Vintages', description: 'Vintages.' },
              validation: { title: 'Update status', description: 'Validation.' },
              warnings: { title: 'Stale/missing warnings', description: 'Warnings.' },
            },
            table: {
              type: 'Type',
              domain: 'Domain',
              status: 'Status',
              vintage: 'Source date',
              export: 'Updated',
              source: 'Source',
              owner: 'Owner / source system',
              notes: 'Notes',
            },
            registryType: {
              source_series: 'Source series',
              model_input: 'Model input',
              bridge_output: 'Model output',
              planned_artifact: 'Not active',
            },
            artifact: {
              dataVintage: 'Source date',
              exportTimestamp: 'Updated',
              sourceVintage: 'Source date',
              lastValidationCheck: 'Last validation check',
              owner: 'Owner',
              sourceSystem: 'Source system',
              solver: 'Solver',
              caveats: 'Caveats',
              consumers: 'Consumer surfaces',
            },
            detail: {
              summary: 'View checks',
              validationScope: 'Validation scope',
              freshnessRule: 'Freshness rule',
              caveats: 'Caveats',
              sourceVsExport: 'Source date vs update',
            },
            vintages: { boundary: 'The source date and update time can differ.' },
            warnings: { empty: 'No warnings.' },
            links: { modelExplorer: 'Model Explorer methodology' },
          },
        },
      },
    },
  })
  return instance
}

describe('Data Registry page', () => {
  it('adds the route and nav item in the intended order while preserving existing routes', () => {
    const routerSource = readFileSync(ROUTER_SOURCE_PATH, 'utf8')
    const expectedRouteOrder = [
      "path: 'overview'",
      "path: 'scenario-lab'",
      "path: 'comparison'",
      "path: 'model-explorer'",
      "path: 'data-registry'",
      "path: 'knowledge-hub'",
    ]
    let previousIndex = -1
    for (const routeSnippet of expectedRouteOrder) {
      const nextIndex = routerSource.indexOf(routeSnippet)
      assert.ok(nextIndex > previousIndex, `${routeSnippet} should appear after previous route`)
      previousIndex = nextIndex
    }

    assert.deepEqual(PRIMARY_NAV_ITEMS.map((item) => item.path), [
      '/overview',
      '/scenario-lab',
      '/comparison',
      '/model-explorer',
      '/data-registry',
      '/knowledge-hub',
    ])
  })

  it('renders registry sections and current/planned rows', async () => {
    const i18n = await createTestI18n()
    const registry = buildDataRegistry({
      qpm: { status: 'loaded', payload: buildValidQpmPayload() },
      dfm: { status: 'loaded', payload: buildValidDfmPayload() },
      io: { status: 'loaded', payload: minimalIoPayload() },
      pe: { status: 'loaded', payload: loadPublicPePayload() },
      now: new Date('2026-04-25T12:00:00Z'),
    })

    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <DataRegistryContent
            registry={registry}
            title="Data Sources"
            description="Source health."
            loadingLabel="Loading data sources..."
          />
        </MemoryRouter>
      </I18nextProvider>,
    )

    assert.match(markup, /Data Sources/)
    assert.match(markup, /Status legend/)
    assert.match(markup, /Active files/)
    assert.match(markup, /Missing \/ unavailable/)
    assert.match(markup, /Format checked/)
    assert.match(markup, /not economic or model validation/)
    assert.match(markup, /Intentionally absent in this release/)
    assert.match(markup, /Last validation check/)
    assert.match(markup, /Data sources/)
    assert.match(markup, /Model inputs/)
    assert.match(markup, /Model outputs/)
    assert.match(markup, /Not active yet/)
    assert.match(markup, /Vintages/)
    assert.match(markup, /Update status/)
    assert.match(markup, /Stale\/missing warnings/)
    assert.match(markup, /\/data\/qpm\.json/)
    assert.match(markup, /\/data\/dfm\.json/)
    assert.match(markup, /\/data\/io\.json/)
    assert.match(markup, /\/data\/pe\.json/)
    assert.match(markup, /High-frequency indicators/)
    assert.match(markup, /PE Trade Shock/)
    assert.match(markup, /CGE aggregate reform reference/)
    assert.match(markup, /\/data\/cge\.json/)
    assert.match(markup, /FPP Fiscal Path/)
    assert.match(markup, /Not active/)
    assert.match(markup, /Source series/)
    assert.match(markup, /Model input/)
    assert.match(markup, /Model output/)
    assert.match(markup, /Not active/)
    assert.match(markup, /Owner \/ source system/)
    assert.match(markup, /View checks/)
    assert.match(markup, /Validation scope/)
    assert.match(markup, /Freshness rule/)
    assert.match(markup, /Source date vs update/)
    assert.match(markup, /Data Sources/)
  })
})
