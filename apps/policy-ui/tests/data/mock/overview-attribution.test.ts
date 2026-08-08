import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { overviewV1Data } from '../../../src/data/mock/overview.js'

describe('overview mock model attribution consistency', () => {
  it('every headline attribution.model_id appears in snapshot.model_ids', () => {
    const declared = new Set(overviewV1Data.model_ids)
    for (const metric of overviewV1Data.headline_metrics) {
      for (const attribution of metric.model_attribution) {
        assert.ok(
          declared.has(attribution.model_id),
          `headline metric ${metric.metric_id} has attribution model_id ` +
            `'${attribution.model_id}' which is not in ` +
            `snapshot.model_ids [${[...declared].join(', ')}]`,
        )
      }
    }
  })

  it('every snapshot.model_ids entry is used by at least one headline metric', () => {
    const used = new Set(
      overviewV1Data.headline_metrics.flatMap((metric) =>
        metric.model_attribution.map((attribution) => attribution.model_id),
      ),
    )
    for (const declared of overviewV1Data.model_ids) {
      assert.ok(
        used.has(declared),
        `snapshot.model_ids declares '${declared}' but no headline metric ` +
          `is attributed to it`,
      )
    }
  })
})
