import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { basename, dirname, join, resolve } from 'node:path'
import {
  buildSiatTradeMetricUpdates,
  calculateSiatTradeMetrics,
  parseSiatTradeDataset,
  SIAT_TRADE_BALANCE_CAVEAT,
} from '../sources/siat-trade.mjs'
import { computeOverviewValueHash } from '../sources/snapshot-hash.mjs'
import { applyMetricUpdatesToSnapshot } from '../sources/update-snapshot.mjs'

const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(testDir, '..', '..', '..')
const fixtureDir = join(repoRoot, 'scripts', 'overview', 'test-fixtures', 'siat-trade')
const snapshotPath = join(repoRoot, 'scripts', 'overview', 'overview_source_snapshot.json')
const fetchScriptPath = join(repoRoot, 'scripts', 'overview', 'fetch-overview-sources.mjs')
const exportsUrl = 'https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_2407.json'
const importsUrl = 'https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_2414.json'

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

async function fixtureFetchJson(url) {
  return readJson(join(fixtureDir, basename(new URL(url).pathname)))
}

test('parses fixed SIAT export and import fixtures for current and prior-year periods', () => {
  const exportsDataset = parseSiatTradeDataset(readJson(join(fixtureDir, 'sdmx_data_2407.json')), {
    expectedFlow: 'exports',
    sourceUrl: exportsUrl,
  })
  const importsDataset = parseSiatTradeDataset(readJson(join(fixtureDir, 'sdmx_data_2414.json')), {
    expectedFlow: 'imports',
    sourceUrl: importsUrl,
  })

  assert.equal(exportsDataset.current.periodLabel, 'January-February 2026')
  assert.equal(exportsDataset.prior.periodLabel, 'January-February 2025')
  assert.equal(exportsDataset.current.value, 3546.808)
  assert.equal(exportsDataset.prior.value, 4643)
  assert.equal(importsDataset.current.value, 8058.287)
  assert.equal(importsDataset.prior.value, 6202.6)
})

test('computes SIAT exports YoY, imports YoY, and goods trade balance sign convention', () => {
  const exportsDataset = parseSiatTradeDataset(readJson(join(fixtureDir, 'sdmx_data_2407.json')), {
    expectedFlow: 'exports',
    sourceUrl: exportsUrl,
  })
  const importsDataset = parseSiatTradeDataset(readJson(join(fixtureDir, 'sdmx_data_2414.json')), {
    expectedFlow: 'imports',
    sourceUrl: importsUrl,
  })

  assert.deepEqual(calculateSiatTradeMetrics(exportsDataset, importsDataset), {
    exportsYoy: -23.61,
    importsYoy: 29.92,
    tradeBalance: -4.51,
  })
})

test('rejects SIAT current and prior-year window mismatches', () => {
  const json = cloneJson(readJson(join(fixtureDir, 'sdmx_data_2407.json')))
  json.observations[0].end_month = 1
  json.observations[0].period_label = 'January 2025'

  assert.throws(
    () => parseSiatTradeDataset(json, { expectedFlow: 'exports', sourceUrl: exportsUrl }),
    /siat_trade_reject_mismatched_windows/,
  )
})

test('rejects SIAT unit mismatches instead of converting by guesswork', () => {
  const json = cloneJson(readJson(join(fixtureDir, 'sdmx_data_2407.json')))
  json.metadata.unit = 'UZS billion'

  assert.throws(
    () => parseSiatTradeDataset(json, { expectedFlow: 'exports', sourceUrl: exportsUrl }),
    /siat_trade_unit_mismatch/,
  )
})

test('builds SIAT trade metric updates with source provenance and no live network', async () => {
  const snapshot = readJson(snapshotPath)
  const updates = await buildSiatTradeMetricUpdates({
    snapshot,
    extractedAt: '2026-04-29T00:00:00Z',
    fetchJson: fixtureFetchJson,
  })

  const exportsUpdate = updates.find((metric) => metric.metric_id === 'exports_yoy')
  const importsUpdate = updates.find((metric) => metric.metric_id === 'imports_yoy')
  const balanceUpdate = updates.find((metric) => metric.metric_id === 'trade_balance')

  assert.equal(exportsUpdate.value, -23.61)
  assert.equal(importsUpdate.value, 29.92)
  assert.equal(balanceUpdate.value, -4.51)
  assert.equal(exportsUpdate.source_period, 'January-February 2026')
  assert.match(exportsUpdate.source_reference, /sdmx_data_2407/)
  assert.equal(balanceUpdate.caveats[0], SIAT_TRADE_BALANCE_CAVEAT)
})

test('SIAT snapshot update preserves all 17 locked ids in order and forces pending owner review', async () => {
  const snapshot = readJson(snapshotPath)
  const originalIds = snapshot.metrics.map((metric) => metric.metric_id)
  const updates = await buildSiatTradeMetricUpdates({
    snapshot,
    extractedAt: '2026-04-29T00:00:00Z',
    fetchJson: fixtureFetchJson,
  })

  const result = applyMetricUpdatesToSnapshot(snapshot, updates)

  assert.equal(result.snapshot.metrics.length, 17)
  assert.deepEqual(result.snapshot.metrics.map((metric) => metric.metric_id), originalIds)
  assert.equal(result.snapshot.status, 'automation_pending_owner_review')
  assert.equal('snapshot_accepted_by' in result.snapshot, false)
  assert.equal('snapshot_accepted_at' in result.snapshot, false)
})

test('SIAT metric values and provenance recompute value_hash', async () => {
  const snapshot = readJson(snapshotPath)
  const updates = await buildSiatTradeMetricUpdates({
    snapshot,
    extractedAt: '2026-04-29T00:00:00Z',
    fetchJson: fixtureFetchJson,
  })

  const result = applyMetricUpdatesToSnapshot(snapshot, updates)

  assert.equal(result.snapshot.value_hash, computeOverviewValueHash(result.snapshot))
  assert.notEqual(result.snapshot.value_hash, snapshot.value_hash)
})

test('SIAT CLI reports manual_required in diff report and leaves snapshot unchanged', () => {
  const tempRoot = join(tmpdir(), `siat-manual-required-${process.pid}-${Date.now()}`)
  const badFixtureDir = join(tempRoot, 'fixtures')
  mkdirSync(badFixtureDir, { recursive: true })
  const tempSnapshotPath = join(tempRoot, 'overview_source_snapshot.json')
  const diffReportPath = join(tempRoot, 'overview_source_snapshot.diff_report.json')
  const snapshotText = readFileSync(snapshotPath, 'utf8')
  writeFileSync(tempSnapshotPath, snapshotText, 'utf8')

  const badExports = cloneJson(readJson(join(fixtureDir, 'sdmx_data_2407.json')))
  badExports.metadata.unit = 'UZS billion'
  writeFileSync(join(badFixtureDir, 'sdmx_data_2407.json'), `${JSON.stringify(badExports, null, 2)}\n`, 'utf8')
  writeFileSync(
    join(badFixtureDir, 'sdmx_data_2414.json'),
    readFileSync(join(fixtureDir, 'sdmx_data_2414.json'), 'utf8'),
    'utf8',
  )

  const result = spawnSync(
    process.execPath,
    [
      fetchScriptPath,
      '--write-snapshot',
      '--family',
      'siat-trade',
      '--snapshot',
      tempSnapshotPath,
      '--fixture-dir',
      badFixtureDir,
      '--diff-report',
      diffReportPath,
    ],
    { cwd: repoRoot, encoding: 'utf8' },
  )

  assert.equal(result.status, 0, result.stderr)
  assert.equal(readFileSync(tempSnapshotPath, 'utf8'), snapshotText)
  const report = readJson(diffReportPath)
  assert.equal(report.changed, false)
  assert.equal(report.manual_required.reason, 'siat_trade_unit_mismatch')
  assert.deepEqual(report.diff, [])
})
