import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { overviewArtifactToMacroSnapshot } from '../../../src/data/overview/artifact-adapter.js'
import { validateOverviewArtifact } from '../../../src/data/overview/artifact-guard.js'
import { OVERVIEW_LOCKED_METRICS } from '../../../src/data/overview/artifact-types.js'
import { buildValidOverviewArtifact } from './overview-artifact-fixture.js'

describe('overview artifact foundation', () => {
  it('validates the locked Overview metric set', () => {
    const artifact = buildValidOverviewArtifact()
    const result = validateOverviewArtifact(artifact)

    assert.equal(result.ok, true)
    assert.equal(result.ok ? result.value.metrics.length : 0, OVERVIEW_LOCKED_METRICS.length)
  })

  it('rejects missing locked metric ids', () => {
    const artifact = buildValidOverviewArtifact()
    artifact.metrics = artifact.metrics.filter((metric) => metric.id !== 'gold_price_forecast')
    const result = validateOverviewArtifact(artifact)

    assert.equal(result.ok, false)
    assert.ok(result.issues.some((issue) => issue.message.includes('gold_price_forecast')))
  })

  it('rejects freshness ages that do not match the upstream timestamp', () => {
    const artifact = buildValidOverviewArtifact()
    artifact.metrics[0].freshness.age_days += 1
    const result = validateOverviewArtifact(artifact)

    assert.equal(result.ok, false)
    assert.ok(
      result.issues.some((issue) => issue.path.endsWith('freshness.age_days') && issue.message.includes('recomputed age')),
    )
  })

  it('rejects upstream timestamps later than artifact export', () => {
    const artifact = buildValidOverviewArtifact()
    const metric = artifact.metrics[0]
    metric.observed_at = '2026-04-27T08:00:00Z'
    metric.freshness.as_of = metric.observed_at
    metric.freshness.age_days = 0
    const result = validateOverviewArtifact(artifact)

    assert.equal(result.ok, false)
    assert.ok(
      result.issues.some((issue) => issue.path.endsWith('freshness.as_of') && issue.message.includes('later than artifact export')),
    )
  })

  it('rejects headline-card ordering gaps after freshness suppression', () => {
    const artifact = buildValidOverviewArtifact()
    const nowcast = artifact.metrics.find((metric) => metric.id === 'gdp_nowcast_current_quarter')
    assert.ok(nowcast)
    nowcast.top_card = false
    nowcast.top_card_order = undefined
    const result = validateOverviewArtifact(artifact)

    assert.equal(result.ok, false)
    assert.ok(
      result.issues.some((issue) => issue.path.endsWith('top_card_order') && issue.message.includes('contiguous')),
    )
  })

  it('maps a valid artifact into the current Overview view model', () => {
    const artifact = buildValidOverviewArtifact()
    const snapshot = overviewArtifactToMacroSnapshot(artifact)

    assert.equal(snapshot.snapshot_id, 'overview-artifact')
    assert.equal(snapshot.generated_at, artifact.exported_at)
    assert.equal(snapshot.headline_metrics.length, 8)
    assert.equal(snapshot.headline_metrics[0].metric_id, 'real_gdp_growth_quarter_yoy')
    assert.equal(snapshot.headline_metrics[1].metric_id, 'gdp_nowcast_current_quarter')
    assert.equal(snapshot.headline_metrics[0].source_label, 'Statistics Agency quarterly GDP')
    assert.ok(
      snapshot.references.some((reference) =>
        typeof reference === 'string'
          ? reference.includes('Statistics Agency quarterly GDP')
          : reference.label.includes('Statistics Agency quarterly GDP') && Boolean(reference.url),
      ),
    )
  })
})
