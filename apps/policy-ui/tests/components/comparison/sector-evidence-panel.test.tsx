import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import { renderToStaticMarkup } from 'react-dom/server'
import { SectorEvidencePanel } from '../../../src/components/comparison/SectorEvidencePanel.js'
import type { ComparisonSectorEvidence } from '../../../src/contracts/data-contract.js'

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
          comparison: {
            ioEvidence: {
              title: 'I-O sector evidence',
              status: 'Validated',
              note:
                'This panel describes structural sector transmission evidence from the I-O data layer. It is not a macro forecast, scenario delta, or causal effect of the scenarios above.',
              sourceArtifact: 'Source coverage',
              sourceCoverageIo: 'I-O source tables and public data snapshot',
              publishedDataFile: 'published data file',
              dataVintage: 'Data date',
              exportedAt: 'Updated',
              sectorCount: 'Sectors',
              framework: 'Framework',
              units: 'Units',
              linkageCounts: 'Linkage classes',
              caveats: 'Limitations',
              linkageClass: {
                key: 'Key',
                backward: 'Backward-only',
                forward: 'Forward-only',
                weak: 'Weak',
              },
            },
          },
        },
      },
    },
  })
  return instance
}

const evidence: ComparisonSectorEvidence = {
  source_artifact: 'io_model/io_data.json',
  data_vintage: '2022',
  exported_at: '2026-04-09',
  sector_count: 136,
  framework: 'Leontief - symmetric IO table at basic prices',
  units: 'thousand UZS',
  linkage_counts: [
    { classification: 'key', value: 1 },
    { classification: 'backward', value: 2 },
    { classification: 'forward', value: 3 },
    { classification: 'weak', value: 130 },
  ],
  caveats: ['Type II arrays are not part of this bridge payload.'],
}

describe('SectorEvidencePanel', () => {
  it('renders honest non-overclaiming copy and IO provenance', async () => {
    const i18n = await createTestI18n()
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <SectorEvidencePanel evidence={evidence} />
      </I18nextProvider>,
    )

    assert.match(markup, /I-O sector evidence/)
    assert.match(markup, /structural sector transmission evidence/)
    assert.match(markup, /not a macro forecast/)
    assert.match(markup, /scenario delta/)
    assert.match(markup, /causal effect/)
    assert.match(markup, /I-O source tables and public data snapshot/)
    assert.match(markup, /Type II arrays are not part of this published data file/)
  })
})
