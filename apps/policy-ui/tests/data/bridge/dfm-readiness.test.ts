import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { assessDfmReadiness } from '../../../src/data/bridge/dfm-readiness.js'
import { buildValidDfmPayload } from './dfm-fixture.js'

function operationalPayload() {
  const payload = buildValidDfmPayload()
  payload.nowcast.current_quarter.period = '2026Q2'
  payload.nowcast.current_quarter.quarter_start_date = '2026-04-01'
  payload.nowcast.forecast_horizon = [
    {
      ...structuredClone(payload.nowcast.current_quarter),
      period: '2026Q3',
      quarter_start_date: '2026-07-01',
      horizon_quarters: 1,
    },
  ]
  payload.factor.last_data_date = '2026-04-01'
  payload.metadata.source_artifact_exported_at = '2026-04-08T10:09:12Z'
  payload.metadata.readiness_status = {
    ...payload.metadata.readiness_status,
    public_status: 'operational',
    source_refit_in_ci: 'available',
    economist_signoff: 'available',
  }
  return payload
}

describe('DFM operational readiness', () => {
  it('does not treat a recently re-exported internal-preview artifact as current', () => {
    const payload = buildValidDfmPayload()
    payload.metadata.exported_at = '2026-07-16T09:42:27Z'
    const assessment = assessDfmReadiness(payload, new Date('2026-07-16T12:00:00Z'))

    assert.equal(assessment.status, 'unavailable')
    assert.ok(assessment.reasons.some((reason) => reason.code === 'source_vintage_stale'))
    assert.ok(assessment.reasons.some((reason) => reason.code === 'current_quarter_mismatch'))
    assert.ok(assessment.reasons.some((reason) => reason.code === 'economist_signoff_missing'))
  })

  it('rejects future-dated upstream source timestamps', () => {
    const payload = operationalPayload()
    payload.metadata.source_artifact_exported_at = '2026-04-11T12:00:00Z'
    const assessment = assessDfmReadiness(payload, new Date('2026-04-10T12:00:00Z'))

    assert.equal(assessment.status, 'unavailable')
    assert.equal(assessment.source_age_days, null)
    assert.ok(assessment.reasons.some((reason) => reason.code === 'source_vintage_stale'))
  })

  it('becomes available only when source, period, forecast, CI, and sign-off gates pass', () => {
    const assessment = assessDfmReadiness(
      operationalPayload(),
      new Date('2026-04-10T12:00:00Z'),
    )

    assert.equal(assessment.status, 'available')
    assert.deepEqual(assessment.reasons, [])
    assert.equal(assessment.expected_quarter, '2026Q2')
  })
})