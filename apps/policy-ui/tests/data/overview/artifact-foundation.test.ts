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

  it('maps a valid artifact into the current Overview view model', () => {
    const artifact = buildValidOverviewArtifact()
    const snapshot = overviewArtifactToMacroSnapshot(artifact)

    assert.equal(snapshot.snapshot_id, 'overview-artifact')
    assert.equal(snapshot.generated_at, artifact.exported_at)
    assert.equal(snapshot.headline_metrics.length, 8)
    assert.equal(snapshot.headline_metrics[0].metric_id, 'real_gdp_growth_quarter_yoy')
    assert.equal(snapshot.headline_metrics[1].metric_id, 'gdp_nowcast_current_quarter')
    assert.equal(snapshot.headline_metrics[0].source_label, 'Statistics Agency quarterly GDP')
    assert.ok(snapshot.references.some((reference) => reference.includes('Statistics Agency quarterly GDP')))
  })
})
