import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

type OverviewMetric = {
  id: string
  value: number | string
  unit: string
  source_label: string
  source_period: string
}

type QpmBaselineMetric = {
  metric_id: string
  value: number | string
  unit: string
  source_label: string
  source_period: string
}

const OVERVIEW_PATH = 'public/data/overview.json'
const QPM_PATH = 'public/data/qpm.json'

test('keeps the published QPM baseline synchronized with the current Overview artifact', () => {
  const overview = JSON.parse(readFileSync(OVERVIEW_PATH, 'utf8')) as {
    exported_at: string
    metrics: OverviewMetric[]
  }
  const qpm = JSON.parse(readFileSync(QPM_PATH, 'utf8')) as {
    attribution: {
      timestamp: string
    }
    metadata: {
      baseline_source: {
        source: string
        source_artifact: string
        exported_at: string
        metrics: QpmBaselineMetric[]
      }
    }
  }

  const baseline = qpm.metadata.baseline_source
  assert.equal(baseline.source, 'overview-artifact')
  assert.equal(baseline.source_artifact, 'apps/policy-ui/public/data/overview.json')
  assert.equal(baseline.exported_at, overview.exported_at)
  assert.equal(qpm.attribution.timestamp, overview.exported_at)

  const overviewById = new Map(overview.metrics.map((metric) => [metric.id, metric]))
  assert.ok(baseline.metrics.length > 0)
  for (const metric of baseline.metrics) {
    const current = overviewById.get(metric.metric_id)
    assert.ok(current, 'Missing Overview baseline metric ' + metric.metric_id)
    assert.equal(metric.value, current.value, metric.metric_id + ' value is stale')
    assert.equal(metric.unit, current.unit, metric.metric_id + ' unit is stale')
    assert.equal(metric.source_label, current.source_label, metric.metric_id + ' source is stale')
    assert.equal(metric.source_period, current.source_period, metric.metric_id + ' period is stale')
  }
})
