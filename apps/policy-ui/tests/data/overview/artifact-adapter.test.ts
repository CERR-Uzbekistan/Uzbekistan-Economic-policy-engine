import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { overviewArtifactToMacroSnapshot } from '../../../src/data/overview/artifact-adapter.js'
import { OVERVIEW_LOCKED_METRICS } from '../../../src/data/overview/artifact-types.js'
import { buildValidOverviewArtifact } from './overview-artifact-fixture.js'

describe('overview artifact adapter', () => {
  it('exposes all 17 locked metrics in grouped Overview view model', () => {
    const artifact = buildValidOverviewArtifact()
    const snapshot = overviewArtifactToMacroSnapshot(artifact)
    const groupedMetricIds = snapshot.indicator_groups?.flatMap((group) =>
      group.metrics.map((metric) => metric.metric_id),
    ) ?? []

    assert.equal(snapshot.headline_metrics.length, 8)
    assert.equal(new Set(groupedMetricIds).size, OVERVIEW_LOCKED_METRICS.length)
    assert.deepEqual(new Set(groupedMetricIds), new Set(artifact.metrics.map((metric) => metric.id)))
  })

  it('makes every artifact metric reachable from a group panel', () => {
    const artifact = buildValidOverviewArtifact()
    const snapshot = overviewArtifactToMacroSnapshot(artifact)
    const groupedMetricIds = new Set(
      snapshot.indicator_groups?.flatMap((group) => group.metrics.map((metric) => metric.metric_id)) ?? [],
    )

    for (const metric of artifact.metrics) {
      assert.equal(groupedMetricIds.has(metric.id), true, `${metric.id} should be grouped`)
    }
  })

  it('falls back to the metric block when panel_groups omits metrics', () => {
    const artifact = buildValidOverviewArtifact()
    artifact.panel_groups = [
      {
        id: 'growth',
        title: 'Growth',
        metric_ids: ['real_gdp_growth_quarter_yoy'],
      },
    ]

    const snapshot = overviewArtifactToMacroSnapshot(artifact)
    const inflation = snapshot.indicator_groups?.find((group) => group.group_id === 'inflation')
    const gold = snapshot.indicator_groups?.find((group) => group.group_id === 'gold')

    assert.ok(inflation?.metrics.some((metric) => metric.metric_id === 'cpi_yoy'))
    assert.ok(gold?.metrics.some((metric) => metric.metric_id === 'gold_price_forecast'))
  })

  it('exposes deterministic summary metrics from artifact values and skips failed metrics', () => {
    const artifact = buildValidOverviewArtifact()
    const failedMetric = artifact.metrics.find((metric) => metric.id === 'imports_yoy')
    if (!failedMetric) throw new Error('fixture missing imports_yoy')
    failedMetric.validation_status = 'failed'

    const snapshot = overviewArtifactToMacroSnapshot(artifact)
    const summaryValues = new Map(
      snapshot.artifact_summary_metrics?.map((metric) => [metric.metric_id, metric.value]) ?? [],
    )

    assert.equal(summaryValues.get('real_gdp_growth_quarter_yoy'), 5.7)
    assert.equal(summaryValues.get('cpi_yoy'), 8.1)
    assert.equal(summaryValues.get('imports_yoy'), undefined)
  })
})
