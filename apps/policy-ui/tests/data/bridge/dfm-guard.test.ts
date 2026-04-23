import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { validateDfmBridgePayload } from '../../../src/data/bridge/dfm-guard.js'
import { buildValidDfmPayload } from './dfm-fixture.js'

function clonePayload<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

describe('dfm bridge guard', () => {
  it('accepts a valid payload', () => {
    const payload = buildValidDfmPayload()
    const validation = validateDfmBridgePayload(payload)

    assert.equal(validation.ok, true)
    assert.ok(validation.value)
    assert.equal(validation.issues.length, 0)
  })

  it('rejects required top-level fields with path-scoped issues', () => {
    const requiredTopLevelFields = [
      'attribution',
      'nowcast',
      'factor',
      'indicators',
      'caveats',
      'metadata',
    ] as const

    for (const field of requiredTopLevelFields) {
      const payload = clonePayload(buildValidDfmPayload()) as Record<string, unknown>
      delete payload[field]
      const validation = validateDfmBridgePayload(payload)

      assert.equal(validation.ok, false, `expected payload without "${field}" to fail`)
      assert.equal(
        validation.issues.some((issue) => issue.path === field),
        true,
        `expected path-level issue for "${field}"`,
      )
    }
  })

  it('rejects data_version that is an ISO timestamp rather than a vintage tag', () => {
    const payload = clonePayload(buildValidDfmPayload())
    payload.attribution.data_version = '2026-04-22T21:00:00Z'

    const validation = validateDfmBridgePayload(payload)

    assert.equal(validation.ok, false)
    assert.equal(
      validation.issues.some((issue) => issue.path === 'attribution.data_version'),
      true,
    )
  })

  it('rejects a malformed period string on current_quarter', () => {
    const payload = clonePayload(buildValidDfmPayload())
    payload.nowcast.current_quarter.period = '2026-Q1'

    const validation = validateDfmBridgePayload(payload)

    assert.equal(validation.ok, false)
    assert.equal(
      validation.issues.some((issue) => issue.path === 'nowcast.current_quarter.period'),
      true,
    )
  })

  it('rejects an out-of-range gdp_growth_yoy_pct on current_quarter', () => {
    const payload = clonePayload(buildValidDfmPayload())
    payload.nowcast.current_quarter.gdp_growth_yoy_pct = -100

    const validation = validateDfmBridgePayload(payload)

    assert.equal(validation.ok, false)
    assert.equal(
      validation.issues.some(
        (issue) => issue.path === 'nowcast.current_quarter.gdp_growth_yoy_pct',
      ),
      true,
    )
  })

  it('rejects null gdp_growth_yoy_pct on current_quarter (required on the nowcast point)', () => {
    const payload = clonePayload(buildValidDfmPayload())
    ;(payload.nowcast.current_quarter as { gdp_growth_yoy_pct: number | null }).gdp_growth_yoy_pct = null

    const validation = validateDfmBridgePayload(payload)

    assert.equal(validation.ok, false)
    assert.equal(
      validation.issues.some(
        (issue) => issue.path === 'nowcast.current_quarter.gdp_growth_yoy_pct',
      ),
      true,
    )
  })

  it('accepts null gdp_growth_yoy_pct on history entries (first four quarters have no YoY)', () => {
    const payload = clonePayload(buildValidDfmPayload())
    assert.equal(payload.nowcast.history[0].gdp_growth_yoy_pct, null)

    const validation = validateDfmBridgePayload(payload)

    assert.equal(validation.ok, true)
  })

  it('rejects an empty history array', () => {
    const payload = clonePayload(buildValidDfmPayload())
    payload.nowcast.history = []

    const validation = validateDfmBridgePayload(payload)

    assert.equal(validation.ok, false)
    assert.equal(
      validation.issues.some((issue) => issue.path === 'nowcast.history'),
      true,
    )
  })

  it('rejects an empty indicators array', () => {
    const payload = clonePayload(buildValidDfmPayload())
    payload.indicators = []

    const validation = validateDfmBridgePayload(payload)

    assert.equal(validation.ok, false)
    assert.equal(
      validation.issues.some((issue) => issue.path === 'indicators'),
      true,
    )
  })

  it('rejects a bare-string caveat.affected_metrics (auto_unbox regression guard)', () => {
    const payload = clonePayload(buildValidDfmPayload())
    ;(payload.caveats[0] as unknown as { affected_metrics: unknown }).affected_metrics = 'gdp_growth'

    const validation = validateDfmBridgePayload(payload)

    assert.equal(validation.ok, false)
    assert.equal(
      validation.issues.some((issue) => issue.path === 'caveats[0].affected_metrics'),
      true,
    )
  })

  it('rejects an uncertainty band where lower_pct > upper_pct', () => {
    const payload = clonePayload(buildValidDfmPayload())
    payload.nowcast.current_quarter.uncertainty.bands[0].lower_pct = 9
    payload.nowcast.current_quarter.uncertainty.bands[0].upper_pct = 6

    const validation = validateDfmBridgePayload(payload)

    assert.equal(validation.ok, false)
    assert.equal(
      validation.issues.some(
        (issue) => issue.path === 'nowcast.current_quarter.uncertainty.bands[0]',
      ),
      true,
    )
  })

  it('accepts a caveat with `source` populated', () => {
    const payload = clonePayload(buildValidDfmPayload())
    payload.caveats[0].source = 'dfm_nowcast/dfm_data.js meta.n_factors'

    const validation = validateDfmBridgePayload(payload)

    assert.equal(validation.ok, true)
    assert.equal(validation.value?.caveats[0].source, 'dfm_nowcast/dfm_data.js meta.n_factors')
  })

  it('accepts a caveat without `source` (optional field)', () => {
    const payload = clonePayload(buildValidDfmPayload())
    delete (payload.caveats[1] as { source?: string }).source

    const validation = validateDfmBridgePayload(payload)

    assert.equal(validation.ok, true)
    assert.equal(validation.value?.caveats[1].source, undefined)
  })

  it('rejects an indicator missing `loading`', () => {
    const payload = clonePayload(buildValidDfmPayload())
    delete (payload.indicators[0] as { loading?: number }).loading

    const validation = validateDfmBridgePayload(payload)

    assert.equal(validation.ok, false)
    assert.equal(
      validation.issues.some((issue) => issue.path === 'indicators[0].loading'),
      true,
    )
  })

  it('rejects an indicator with an invalid `frequency` enum value', () => {
    const payload = clonePayload(buildValidDfmPayload())
    ;(payload.indicators[0] as unknown as { frequency: string }).frequency = 'weekly'

    const validation = validateDfmBridgePayload(payload)

    assert.equal(validation.ok, false)
    assert.equal(
      validation.issues.some((issue) => issue.path === 'indicators[0].frequency'),
      true,
    )
  })

  it('accepts a null latest_value on an indicator', () => {
    const payload = clonePayload(buildValidDfmPayload())
    assert.equal(payload.indicators[2].latest_value, null)

    const validation = validateDfmBridgePayload(payload)

    assert.equal(validation.ok, true)
  })

  it('requires the extra metadata fields source_artifact and source_artifact_exported_at', () => {
    const payload = clonePayload(buildValidDfmPayload())
    delete (payload.metadata as { source_artifact?: string }).source_artifact

    const validation = validateDfmBridgePayload(payload)

    assert.equal(validation.ok, false)
    assert.equal(
      validation.issues.some((issue) => issue.path === 'metadata.source_artifact'),
      true,
    )
  })
})
