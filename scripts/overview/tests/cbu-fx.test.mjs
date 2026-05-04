import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { buildCbuFxMetricUpdates, parseCbuUsdObservation, SIGN_CONVENTION } from '../sources/cbu-fx.mjs'
import { addUtcMonths, percentChange } from '../sources/math.mjs'
import { computeOverviewValueHash, HASHED_METRIC_FIELDS } from '../sources/snapshot-hash.mjs'
import { applyMetricUpdatesToSnapshot } from '../sources/update-snapshot.mjs'

const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(testDir, '..', '..', '..')
const fixtureDir = join(repoRoot, 'scripts', 'overview', 'test-fixtures', 'cbu-fx')
const snapshotPath = join(repoRoot, 'scripts', 'overview', 'overview_source_snapshot.json')

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

async function fixtureFetchJson(_url, requestedDate) {
  return readJson(join(fixtureDir, `${requestedDate}.json`))
}

test('parses CBU FX JSON fixture', () => {
  const json = readJson(join(fixtureDir, '2026-04-27.json'))
  const observation = parseCbuUsdObservation(json, '2026-04-27')

  assert.deepEqual(observation, {
    requestedDate: '2026-04-27',
    actualDate: '2026-04-27',
    rate: 12020.48,
    sourceUrl: 'https://cbu.uz/en/arkhiv-kursov-valyut/json/USD/2026-04-27/',
  })
})

test('captures nearest available CBU date when actual differs from requested', () => {
  const json = readJson(join(fixtureDir, '2025-04-27.json'))
  const observation = parseCbuUsdObservation(json, '2025-04-27')

  assert.equal(observation.requestedDate, '2025-04-27')
  assert.equal(observation.actualDate, '2025-04-25')
})

test('computes MoM and YoY arithmetic with 2 decimal rounding', async () => {
  const updates = await buildCbuFxMetricUpdates({
    latestDate: '2026-04-27',
    priorMonthDate: '2026-03-27',
    priorYearDate: '2025-04-27',
    extractedAt: '2026-04-27T00:00:00Z',
    fetchJson: fixtureFetchJson,
  })

  assert.equal(updates.find((metric) => metric.metric_id === 'usd_uzs_mom_change').value, -1.31)
  assert.equal(updates.find((metric) => metric.metric_id === 'usd_uzs_yoy_change').value, -7.01)
  assert.equal(percentChange(105, 100), 5)
  assert.equal(percentChange(95, 100), -5)
})

test('clamps prior comparison dates to the target month end', () => {
  assert.equal(addUtcMonths('2026-03-31', -1), '2026-02-28')
  assert.equal(addUtcMonths('2026-03-29', -1), '2026-02-28')
  assert.equal(addUtcMonths('2024-02-29', -12), '2023-02-28')
})

test('records sign convention and date provenance in metric caveats and warnings', async () => {
  const updates = await buildCbuFxMetricUpdates({
    latestDate: '2026-04-27',
    priorMonthDate: '2026-03-27',
    priorYearDate: '2025-04-27',
    extractedAt: '2026-04-27T00:00:00Z',
    fetchJson: fixtureFetchJson,
  })
  const yoy = updates.find((metric) => metric.metric_id === 'usd_uzs_yoy_change')

  assert.ok(yoy.caveats.some((caveat) => caveat.includes(SIGN_CONVENTION)))
  assert.ok(yoy.caveats.some((caveat) => caveat.includes('requested 2025-04-27; actual CBU date/rate 2025-04-25 returned')))
  assert.ok(yoy.warnings.some((warning) => warning.includes('Prior-year requested date 2025-04-27 differed')))
})

test('snapshot update preserves all 17 locked ids in existing order and forces pending review', async () => {
  const snapshot = readJson(snapshotPath)
  const originalIds = snapshot.metrics.map((metric) => metric.metric_id)
  const updates = await buildCbuFxMetricUpdates({
    latestDate: '2026-04-27',
    priorMonthDate: '2026-03-27',
    priorYearDate: '2025-04-27',
    extractedAt: '2026-04-27T00:00:00Z',
    fetchJson: fixtureFetchJson,
  })
  updates[0].value = 12021.48

  const result = applyMetricUpdatesToSnapshot(snapshot, updates)

  assert.equal(result.snapshot.metrics.length, 17)
  assert.deepEqual(result.snapshot.metrics.map((metric) => metric.metric_id), originalIds)
  assert.equal(result.snapshot.status, 'automation_pending_owner_review')
  assert.equal('snapshot_accepted_by' in result.snapshot, false)
  assert.equal('snapshot_accepted_at' in result.snapshot, false)
})

test('automation writes and recomputes value_hash after updates', async () => {
  const snapshot = readJson(snapshotPath)
  const updates = await buildCbuFxMetricUpdates({
    latestDate: '2026-04-27',
    priorMonthDate: '2026-03-27',
    priorYearDate: '2025-04-27',
    extractedAt: '2026-04-27T00:00:00Z',
    fetchJson: fixtureFetchJson,
  })
  updates[0].value = 12022.48

  const result = applyMetricUpdatesToSnapshot(snapshot, updates)

  assert.equal(result.snapshot.value_hash, computeOverviewValueHash(result.snapshot))
  assert.notEqual(result.snapshot.value_hash, snapshot.value_hash)
})

test('every value_hash field mutation forces pending owner review', () => {
  const snapshot = readJson(snapshotPath)
  const targetMetricId = 'usd_uzs_level'
  const targetMetric = snapshot.metrics.find((metric) => metric.metric_id === targetMetricId)

  for (const field of HASHED_METRIC_FIELDS.filter((entry) => entry !== 'metric_id')) {
    const update = { metric_id: targetMetricId }
    const currentValue = targetMetric[field]
    if (typeof currentValue === 'number') update[field] = currentValue + 1
    else if (Array.isArray(currentValue)) update[field] = [...currentValue, `test mutation for ${field}`]
    else if (field === 'previous_value' && currentValue === null) update[field] = 1
    else update[field] = `${currentValue ?? 'missing'} test mutation`

    const result = applyMetricUpdatesToSnapshot(snapshot, [update])

    assert.notEqual(result.snapshot.value_hash, snapshot.value_hash, `${field} should affect value_hash`)
    assert.equal(result.snapshot.status, 'automation_pending_owner_review', `${field} should force pending review`)
    assert.equal('snapshot_accepted_by' in result.snapshot, false, `${field} should clear accepter`)
    assert.equal('snapshot_accepted_at' in result.snapshot, false, `${field} should clear acceptance time`)
  }
})
