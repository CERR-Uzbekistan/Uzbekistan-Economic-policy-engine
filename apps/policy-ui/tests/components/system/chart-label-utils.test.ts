import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { prettyPrintMethodologyLabel } from '../../../src/components/system/chart-label-utils.js'

describe('prettyPrintMethodologyLabel', () => {
  it('renders ASCII fan-chart label to Unicode', () => {
    const raw = 'Out-of-sample RMSE fan chart, sigma = 0.45 pp * sqrt(h), h=1'
    assert.equal(
      prettyPrintMethodologyLabel(raw),
      'Out-of-sample RMSE fan chart, σ = 0.45 pp × √(h), h=1',
    )
  })

  it('leaves ASCII strings without the tokens unchanged', () => {
    const raw = 'Analyst-set 1 pp band'
    assert.equal(prettyPrintMethodologyLabel(raw), raw)
  })

  it('only replaces sigma as a whole word', () => {
    const raw = 'sigmaplot: sigma'
    assert.equal(prettyPrintMethodologyLabel(raw), 'sigmaplot: σ')
  })
})
