import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { modelCatalogEntries, modelCatalogMeta } from '../../../src/data/mock/model-catalog.js'

describe('model catalog mock', () => {
  it('ships 6 catalog entries covering QPM, DFM, PE, I-O, CGE, FPP', () => {
    assert.equal(modelCatalogEntries.length, 6)
    const titles = modelCatalogEntries.map((entry) => entry.title)
    assert.deepEqual(titles, ['QPM', 'DFM', 'PE', 'I-O', 'CGE', 'FPP'])
  })

  it('carries severity-coded status labels matching the prototype spec', () => {
    const byTitle = new Map(modelCatalogEntries.map((entry) => [entry.title, entry.status]))
    assert.deepEqual(byTitle.get('QPM'), { label: 'Active', severity: 'ok' })
    assert.deepEqual(byTitle.get('DFM'), { label: 'Active', severity: 'ok' })
    assert.deepEqual(byTitle.get('PE'), { label: 'Not active', severity: 'warn' })
    assert.deepEqual(byTitle.get('I-O'), { label: 'Active', severity: 'ok' })
    assert.deepEqual(byTitle.get('CGE'), { label: 'Not active', severity: 'warn' })
    assert.deepEqual(byTitle.get('FPP'), { label: 'Not active', severity: 'warn' })
  })

  it('documents QPM b3 as active after external-demand channel activation', () => {
    const qpm = modelCatalogEntries.find((entry) => entry.id === 'qpm-uzbekistan')!
    const b3 = qpm.parameters.find((parameter) => parameter.symbol === 'b_3')
    assert.ok(b3, 'QPM must carry b_3 parameter')
    assert.equal(b3?.value, '0.30')
    assert.equal(b3?.inactive, undefined)
    assert.equal(
      qpm.caveats.some((caveat) => /inactive/i.test(`${caveat.title} ${caveat.body}`)),
      false,
    )
  })

  it('keeps DFM description aligned with the current bridge artifact scope', () => {
    const dfm = modelCatalogEntries.find((entry) => entry.id === 'dfm-nowcast')!

    assert.match(dfm.description, /Current-quarter GDP nowcasting/)
    assert.doesNotMatch(`${dfm.description} ${dfm.purpose}`, /3-month|3 month|ahead forecast/i)
  })

  it('renders source validation summaries on non-QPM models without SME sentinels', () => {
    const nonQpm = modelCatalogEntries.filter((entry) => entry.id !== 'qpm-uzbekistan')
    for (const entry of nonQpm) {
      assert.ok(entry.validation_summary.length > 0, `${entry.title} should carry validation prose`)
      assert.ok(
        entry.validation_summary.every((paragraph) => !paragraph.includes('[SME content pending]')),
        `${entry.title} should not carry the SME sentinel`,
      )
    }
  })

  it('page-header meta separates active bridge-backed models from planned model lanes', () => {
    assert.equal(modelCatalogMeta.models_total, 6)
    assert.equal(modelCatalogMeta.models_live, 3)
    assert.equal(modelCatalogMeta.last_calibration_audit_label, 'Apr 2026')
    assert.equal(modelCatalogMeta.open_methodology_issues, 9)
  })

  it('keeps planned PE, CGE, and FPP models behind production activation requirements', () => {
    const planned = modelCatalogEntries.filter((entry) => entry.status.severity !== 'ok')

    assert.deepEqual(
      planned.map((entry) => entry.title),
      ['PE', 'CGE', 'FPP'],
    )
    for (const entry of planned) {
      assert.equal(entry.activation_requirements?.length, 3, `${entry.title} should list activation gates`)
      assert.match(entry.description, /Planned|Requires/)
      assert.equal(
        entry.stats.some((stat) => /Missing|Needed|Gated|review/i.test(stat.value)),
        true,
        `${entry.title} should not present production-style stats`,
      )
    }
  })
})
