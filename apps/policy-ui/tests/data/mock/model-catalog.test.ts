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
    assert.deepEqual(byTitle.get('QPM'), { label: '2 Fixes', severity: 'warn' })
    assert.deepEqual(byTitle.get('DFM'), { label: 'Active', severity: 'ok' })
    assert.deepEqual(byTitle.get('PE'), { label: 'Fix', severity: 'crit' })
    assert.deepEqual(byTitle.get('I-O'), { label: 'Active', severity: 'ok' })
    assert.deepEqual(byTitle.get('CGE'), { label: 'Gap', severity: 'warn' })
    assert.deepEqual(byTitle.get('FPP'), { label: 'CA exog.', severity: 'warn' })
  })

  it('flags QPM b3 as inactive to trigger the red val.issue styling', () => {
    const qpm = modelCatalogEntries.find((entry) => entry.id === 'qpm-uzbekistan')!
    const b3 = qpm.parameters.find((parameter) => parameter.symbol === 'b_3')
    assert.ok(b3, 'QPM must carry b_3 parameter')
    assert.equal(b3?.inactive, true)
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

  it('page-header meta reflects 6 live models + Apr 2026 audit + 8 open issues', () => {
    assert.equal(modelCatalogMeta.models_total, 6)
    assert.equal(modelCatalogMeta.models_live, 6)
    assert.equal(modelCatalogMeta.last_calibration_audit_label, 'Apr 2026')
    assert.equal(modelCatalogMeta.open_methodology_issues, 8)
  })
})
