import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
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

test('preserves the captured QPM baseline when current observations advance', () => {
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
  assert.equal(qpm.attribution.timestamp, baseline.exported_at)
  assert.ok(Date.parse(baseline.exported_at) <= Date.parse(overview.exported_at))
  assert.equal(createHash('sha256').update(readFileSync(QPM_PATH)).digest('hex'), 'd0f034422e7c3ca4501447e732cfbdbe15bb1e7a534075912680da91b7dcb9bb')

  const overviewById = new Map(overview.metrics.map((metric) => [metric.id, metric]))
  assert.ok(baseline.metrics.length > 0)
  for (const metric of baseline.metrics) {
    const current = overviewById.get(metric.metric_id)
    assert.ok(current, 'Missing Overview baseline metric ' + metric.metric_id)
    assert.equal(metric.unit, current.unit, metric.metric_id + ' unit changed')
    assert.ok(metric.source_label && metric.source_period, 'Captured baseline provenance missing')
  }
})
