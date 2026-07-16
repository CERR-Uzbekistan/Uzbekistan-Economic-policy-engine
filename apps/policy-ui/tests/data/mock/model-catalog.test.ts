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
    assert.deepEqual(byTitle.get('PE'), { label: 'Active', severity: 'ok' })
    assert.deepEqual(byTitle.get('I-O'), { label: 'Active', severity: 'ok' })
    assert.deepEqual(byTitle.get('CGE'), { label: 'Not active', severity: 'warn' })
    assert.deepEqual(byTitle.get('FPP'), { label: 'Not active', severity: 'warn' })
  })

  it('documents QPM b3 as active after external-demand channel activation', () => {
    const qpm = modelCatalogEntries.find((entry) => entry.id === 'qpm-uzbekistan')!
    const b3 = qpm.parameters.find((parameter) => parameter.symbol === 'b3')
    assert.ok(b3, 'QPM must carry b3 parameter')
    assert.equal(b3?.value, '0.3')
    assert.equal(b3?.inactive, undefined)
    assert.equal(
      qpm.caveats.some((caveat) => /inactive/i.test(`${caveat.title} ${caveat.body}`)),
      false,
    )
  })

  it('documents the canonical QPM parameter set and Scenario Lab boundaries', () => {
    const qpm = modelCatalogEntries.find((entry) => entry.id === 'qpm-uzbekistan')!
    const symbols = qpm.parameters.map((parameter) => parameter.symbol)

    assert.deepEqual(symbols, [
      'b1',
      'b2',
      'b3',
      'b4',
      'a1',
      'a2',
      'a3',
      'a4',
      'g1',
      'g2',
      'g3',
      'e1',
      'pi_target',
      'rs_neutral',
      'potential_growth',
      'rho_external',
    ])
    assert.match(qpm.model_note?.summary ?? '', /calibrated, not formally estimated/)
    assert.match(
      qpm.model_note?.items.map((item) => item.value).join(' ') ?? '',
      /accounting views/,
    )
    assert.equal(qpm.validation_checks?.length, 5)
    assert.equal(
      qpm.validation_checks?.some(
        (check) => check.label === 'Impulse-response signs' && check.status === 'pass',
      ),
      true,
    )
    assert.equal(
      qpm.validation_checks?.some(
        (check) => check.label === 'Economist review needed' && check.status === 'needs_review',
      ),
      true,
    )
  })

  it('keeps DFM description aligned with the current bridge artifact scope', () => {
    const dfm = modelCatalogEntries.find((entry) => entry.id === 'dfm-nowcast')!

    assert.match(dfm.description, /Current-quarter GDP nowcasting/)
    assert.match(dfm.description, /35 high-frequency inputs plus quarterly GDP target/)
    assert.equal(dfm.stats[0].value, '35')
    assert.equal(dfm.stats[0].label, 'Inputs')
    assert.match(dfm.model_note?.summary ?? '', /model nowcast/)
    assert.match(dfm.model_note?.items.map((item) => item.value).join(' ') ?? '', /not percentage-point GDP effects/)
    assert.doesNotMatch(`${dfm.description} ${dfm.purpose}`, /3-month|3 month|ahead forecast/i)
    assert.match(dfm.validation_summary.join(' '), /standardized factor signals/)
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
    assert.equal(modelCatalogMeta.models_live, 4)
    assert.equal(modelCatalogMeta.last_calibration_audit_label, 'Apr 2026')
    assert.equal(modelCatalogMeta.open_methodology_issues, 6)
  })

  it('exposes reconciled CGE evidence without activating the public scenario lane', () => {
    const cge = modelCatalogEntries.find((entry) => entry.id === 'cge-model')!

    assert.deepEqual(cge.status, { label: 'Not active', severity: 'warn' })
    assert.equal(cge.stats[0].value, '2021')
    assert.equal(cge.stats[1].value, '<0.001%')
    assert.equal(cge.stats[2].value, '1')
    assert.match(cge.description, /Formula-reconciled/)
    assert.match(cge.purpose, /no sector, labor, household-distribution, or time-path block/)
    assert.equal(cge.parameters.find((parameter) => parameter.symbol === 'σq')?.value, '0.70')
    assert.equal(cge.parameters.find((parameter) => parameter.symbol === 'σt')?.value, '0.70')
    assert.match(cge.model_note?.items.map((item) => item.value).join(' ') ?? '', /normalized relative-price index, not UZS\/USD/)
    assert.equal(cge.validation_checks?.filter((check) => check.status === 'pass').length, 3)
    assert.equal(cge.validation_checks?.filter((check) => check.status === 'needs_review').length, 2)
    assert.equal(cge.bridge_evidence?.evidence_metrics?.find((metric) => metric.label === 'Accounting residuals')?.value, '<1e-8')
    assert.equal(cge.activation_requirements?.length, 3)
  })

  it('keeps FPP behind production activation requirements', () => {
    const fpp = modelCatalogEntries.find((entry) => entry.id === 'fpp-fiscal')!

    assert.deepEqual(fpp.status, { label: 'Not active', severity: 'warn' })
    assert.equal(fpp.activation_requirements?.length, 3)
    assert.match(fpp.description, /Planned/)
    assert.equal(
      fpp.stats.some((stat) => /Missing|Needed|Gated|review/i.test(stat.value)),
      true,
    )
  })
})