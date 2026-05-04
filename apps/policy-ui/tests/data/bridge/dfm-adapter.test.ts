import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  prettyPrintMethodologyLabel,
  toDfmAdapterOutput,
} from '../../../src/data/bridge/dfm-adapter.js'
import { buildValidDfmPayload } from './dfm-fixture.js'

describe('dfm adapter', () => {
  it('maps nowcast fields from the bridge payload', () => {
    const payload = buildValidDfmPayload()
    const output = toDfmAdapterOutput(payload)

    assert.equal(output.nowcast.last_observed_date, payload.nowcast.last_observed_date)
    assert.equal(output.nowcast.current.period, payload.nowcast.current_quarter.period)
    assert.equal(
      output.nowcast.current.gdp_growth_yoy_pct,
      payload.nowcast.current_quarter.gdp_growth_yoy_pct,
    )
    assert.equal(
      output.nowcast.current.horizon_quarters,
      payload.nowcast.current_quarter.horizon_quarters,
    )
    assert.equal(output.nowcast.history.length, payload.nowcast.history.length)
    assert.equal(output.nowcast.forecast.length, 0)
  })

  it('preserves factor path length and values', () => {
    const payload = buildValidDfmPayload()
    const output = toDfmAdapterOutput(payload)

    assert.equal(output.factor.dates.length, payload.factor.dates.length)
    assert.equal(output.factor.path.length, payload.factor.path.length)
    assert.deepEqual(output.factor.path, payload.factor.path)
    assert.equal(output.factor.converged, true)
  })

  it('preserves indicators with their categorical and numeric fields', () => {
    const payload = buildValidDfmPayload()
    const output = toDfmAdapterOutput(payload)

    assert.equal(output.indicators.length, payload.indicators.length)
    assert.equal(output.indicators[0].indicator_id, payload.indicators[0].indicator_id)
    assert.equal(output.indicators[0].loading, payload.indicators[0].loading)
    assert.equal(output.indicators[2].latest_value, null)
  })

  it('round-trips all three uncertainty bands with confidence-level ordering intact', () => {
    const payload = buildValidDfmPayload()
    const output = toDfmAdapterOutput(payload)

    const bands = output.nowcast.current.uncertainty.bands
    assert.equal(bands.length, 3)
    assert.equal(bands[0].confidence_level, 0.5)
    assert.equal(bands[1].confidence_level, 0.7)
    assert.equal(bands[2].confidence_level, 0.9)
    for (const band of bands) {
      assert.ok(band.lower_pct <= band.upper_pct)
    }
    assert.equal(output.nowcast.current.uncertainty.is_illustrative, false)
  })

  it('preserves the methodology_label verbatim (ASCII) in the transform output', () => {
    const payload = buildValidDfmPayload()
    const output = toDfmAdapterOutput(payload)

    const label = output.nowcast.current.uncertainty.methodology_label
    assert.equal(label, payload.nowcast.current_quarter.uncertainty.methodology_label)
    // Confirms the adapter transform does not invoke prettyPrintMethodologyLabel.
    assert.equal(label.includes('sigma'), true)
    assert.equal(label.includes('sqrt'), true)
    assert.equal(label.includes('σ'), false)
    assert.equal(label.includes('√'), false)
  })

  it('prettyPrintMethodologyLabel renders ASCII fan-chart label to Unicode', () => {
    const raw = 'Out-of-sample RMSE fan chart, sigma = 0.45 pp * sqrt(h), h=1'
    const printed = prettyPrintMethodologyLabel(raw)

    assert.equal(
      printed,
      'Out-of-sample RMSE fan chart, σ = 0.45 pp × √(h), h=1',
    )
  })

  it('carries extra metadata fields through to adapter meta output', () => {
    const payload = buildValidDfmPayload()
    const output = toDfmAdapterOutput(payload)

    assert.equal(output.meta.source_artifact, payload.metadata.source_artifact)
    assert.equal(
      output.meta.source_artifact_exported_at,
      payload.metadata.source_artifact_exported_at,
    )
    assert.equal(output.meta.source_script_sha, null)
  })
})
