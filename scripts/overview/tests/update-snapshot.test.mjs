import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { computeOverviewValueHash } from '../sources/snapshot-hash.mjs'
import {
  SOURCE_VERIFIED_FOR_PUBLIC_ARTIFACT,
  applyMetricUpdatesToSnapshot,
} from '../sources/update-snapshot.mjs'

const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(testDir, '..', '..', '..')
const snapshotPath = join(repoRoot, 'scripts', 'overview', 'overview_source_snapshot.json')

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

test('source-verified mode marks strict automation updates as public-exportable', () => {
  const snapshot = cloneJson(readJson(snapshotPath))
  const metric = snapshot.metrics.find((entry) => entry.metric_id === 'usd_uzs_level')
  assert.ok(metric)

  const result = applyMetricUpdatesToSnapshot(
    snapshot,
    [
      {
        metric_id: 'usd_uzs_level',
        value: metric.value + 1,
        extracted_at: '2026-05-18T05:00:00.000Z',
      },
    ],
    {
      publicStatus: SOURCE_VERIFIED_FOR_PUBLIC_ARTIFACT,
      sourceVerifiedBy: 'github-actions[bot]',
      sourceVerifiedAt: '2026-05-18T05:00:00.000Z',
    },
  )

  assert.equal(result.changed, true)
  assert.equal(result.snapshot.status, SOURCE_VERIFIED_FOR_PUBLIC_ARTIFACT)
  assert.equal(result.snapshot.source_verified_by, 'github-actions[bot]')
  assert.equal(result.snapshot.source_verified_at, '2026-05-18T05:00:00.000Z')
  assert.equal('snapshot_accepted_by' in result.snapshot, false)
  assert.equal('snapshot_accepted_at' in result.snapshot, false)
  assert.equal(result.snapshot.value_hash, computeOverviewValueHash(result.snapshot))
})
