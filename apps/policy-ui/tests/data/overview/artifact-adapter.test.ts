import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { overviewArtifactToMacroSnapshot } from '../../../src/data/overview/artifact-adapter.js'
import { OVERVIEW_LOCKED_METRICS } from '../../../src/data/overview/artifact-types.js'
import { buildValidOverviewArtifact } from './overview-artifact-fixture.js'

function assertClose(actual: number | null | undefined, expected: number): void {
  if (typeof actual !== 'number') {
    throw new Error(`${actual} should be a number`)
  }
  assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} should be close to ${expected}`)
}

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

  it('uses percentage-point delta semantics for percent-rate metrics instead of misleading delta_pct', () => {
    const artifact = buildValidOverviewArtifact()
    const cpiYoy = artifact.metrics.find((metric) => metric.id === 'cpi_yoy')
    const cpiMom = artifact.metrics.find((metric) => metric.id === 'cpi_mom')
    const gdp = artifact.metrics.find((metric) => metric.id === 'real_gdp_growth_quarter_yoy')
    const policyRate = artifact.metrics.find((metric) => metric.id === 'policy_rate')
    if (!cpiYoy || !cpiMom || !gdp || !policyRate) throw new Error('fixture missing rate metrics')
    cpiYoy.value = 7.1
    cpiYoy.previous_value = 7.3
    cpiMom.value = 0.6
    cpiMom.previous_value = 0.4
    gdp.value = 8.7
    gdp.previous_value = 6.8
    policyRate.value = 14
    policyRate.previous_value = 13.5

    const snapshot = overviewArtifactToMacroSnapshot(artifact)
    const metrics = new Map(
      snapshot.indicator_groups?.flatMap((group) => group.metrics.map((metric) => [metric.metric_id, metric])) ?? [],
    )

    assertClose(metrics.get('cpi_yoy')?.delta_value, -0.2)
    assert.equal(metrics.get('cpi_yoy')?.delta_unit, 'pp')
    assert.equal(metrics.get('cpi_yoy')?.delta_pct, null)
    assertClose(metrics.get('cpi_mom')?.delta_value, 0.2)
    assert.equal(metrics.get('cpi_mom')?.delta_unit, 'pp')
    assert.equal(metrics.get('cpi_mom')?.delta_pct, null)
    assertClose(metrics.get('real_gdp_growth_quarter_yoy')?.delta_value, 1.9)
    assert.equal(metrics.get('real_gdp_growth_quarter_yoy')?.delta_unit, 'pp')
    assert.equal(metrics.get('real_gdp_growth_quarter_yoy')?.delta_pct, null)
    assert.equal(metrics.get('policy_rate')?.delta_value, 0.5)
    assert.equal(metrics.get('policy_rate')?.delta_unit, 'pp')
    assert.equal(metrics.get('policy_rate')?.delta_pct, null)
  })

  it('derives deterministic comparison periods without caveat parsing', () => {
    const artifact = buildValidOverviewArtifact()
    const annualGdp = artifact.metrics.find((metric) => metric.id === 'real_gdp_growth_annual_yoy')
    const cpiYoy = artifact.metrics.find((metric) => metric.id === 'cpi_yoy')
    const quarterlyGdp = artifact.metrics.find((metric) => metric.id === 'real_gdp_growth_quarter_yoy')
    const nowcast = artifact.metrics.find((metric) => metric.id === 'gdp_nowcast_current_quarter')
    if (!annualGdp || !cpiYoy || !quarterlyGdp || !nowcast) throw new Error('fixture missing comparison metrics')
    annualGdp.source_period = '2025'
    cpiYoy.source_period = 'March 2026'
    quarterlyGdp.source_period = '2026 Q1'
    nowcast.source_period = '2026 Q2'

    const snapshot = overviewArtifactToMacroSnapshot(artifact)
    const metrics = new Map(
      snapshot.indicator_groups?.flatMap((group) => group.metrics.map((metric) => [metric.metric_id, metric])) ?? [],
    )

    assert.equal(metrics.get('real_gdp_growth_annual_yoy')?.comparison_period, '2024')
    assert.equal(metrics.get('cpi_yoy')?.comparison_period, 'Feb 2026')
    assert.equal(metrics.get('real_gdp_growth_quarter_yoy')?.comparison_period, '2025 Q1')
    assert.equal(metrics.get('gdp_nowcast_current_quarter')?.comparison_period, null)
  })

  it('exposes claim labels from claim_type semantics for actual, nowcast, calculated, and forecast metrics', () => {
    const snapshot = overviewArtifactToMacroSnapshot(buildValidOverviewArtifact())
    const metrics = new Map(
      snapshot.indicator_groups?.flatMap((group) => group.metrics.map((metric) => [metric.metric_id, metric])) ?? [],
    )

    assert.equal(metrics.get('real_gdp_growth_quarter_yoy')?.claim_label_key, 'overview.claimLabels.observed')
    assert.equal(metrics.get('gdp_nowcast_current_quarter')?.claim_label_key, 'overview.claimLabels.nowcast')
    assert.equal(metrics.get('trade_balance')?.claim_label_key, 'overview.claimLabels.calculated')
    assert.equal(metrics.get('usd_uzs_mom_change')?.claim_label_key, 'overview.claimLabels.calculated')
    assert.equal(metrics.get('gold_price_forecast')?.claim_label_key, 'overview.claimLabels.forecast')
  })
})
