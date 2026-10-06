import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { computeOverviewValueHash } from '../sources/snapshot-hash.mjs'
import { resolveRefreshExportedAt } from '../sources/refresh-clock.mjs'

test('export follows subsecond extraction and multi-minute acquisition', () => {
  const start = '2026-10-02T10:41:28Z'
  const extraction = '2026-10-02T10:41:28.128Z'
  const completion = '2026-10-02T10:44:52.437Z'
  const exportedAt = resolveRefreshExportedAt(start, completion)
  assert.equal(exportedAt, completion)
  assert.ok(Date.parse(exportedAt) > Date.parse(extraction))
  assert.equal(extraction, '2026-10-02T10:41:28.128Z')
})

test('invalid and reversed clocks fail rather than blessing future source data', () => {
  assert.throws(() => resolveRefreshExportedAt('invalid', '2026-10-02T10:41:28Z'))
  assert.throws(() => resolveRefreshExportedAt('2026-10-02T10:41:28Z', 'invalid'))
  assert.throws(() => resolveRefreshExportedAt('2026-10-02T10:41:28Z', '2026-10-02T10:41:27Z'))
})

test('workflow publishes the validated candidate without reexporting at run start', () => {
  const workflow = readFileSync(new URL('../../../.github/workflows/overview-artifact-refresh.yml', import.meta.url), 'utf8')
  const candidate = readFileSync(new URL('../refresh-candidate.mjs', import.meta.url), 'utf8')
  assert.ok(workflow.includes('cp tmp/overview-refresh-candidate/overview.json "$PUBLIC_OVERVIEW_PATH"'))
  assert.ok(!workflow.includes('export-overview.mjs --exported-at'))
  assert.ok(candidate.includes("'--exported-at', report.exported_at"))
})


test('real exporter accepts collection before completion and rejects future extraction', () => {
  const directory = mkdtempSync(join(tmpdir(), 'overview-clock-'))
  try {
    // Frozen before this run's clock; production refreshes must not move this fixture.
    const snapshot = JSON.parse(readFileSync(new URL('../test-fixtures/refresh-clock-source-snapshot.json', import.meta.url), 'utf8'))
    const metric = snapshot.metrics.find(value => value.metric_id === 'usd_uzs_mom_change')
    metric.observed_at = null
    metric.extracted_at = '2026-10-04T10:41:28.128Z'
    snapshot.value_hash = computeOverviewValueHash(snapshot.metrics)
    const source = join(directory, 'snapshot.json')
    writeFileSync(source, JSON.stringify(snapshot))
    const exporter = fileURLToPath(new URL('../export-overview.mjs', import.meta.url))
    const run = exportedAt => spawnSync(process.execPath, [exporter, '--exported-at', exportedAt], {
      env: { ...process.env, OVERVIEW_SOURCE_SNAPSHOT_PATH: source, OVERVIEW_OUTPUT_PATH: join(directory, 'overview.json') }, encoding: 'utf8',
    })
    const before = run('2026-10-04T10:41:28Z')
    assert.notEqual(before.status, 0)
    assert.match(before.stderr, /Metric usd_uzs_mom_change has freshness timestamp 2026-10-04T10:41:28\.128Z after artifact export/)
    const after = run(resolveRefreshExportedAt('2026-10-04T10:41:28Z', '2026-10-04T10:44:52.437Z'))
    assert.equal(after.status, 0, after.stderr)
    const artifact = JSON.parse(readFileSync(join(directory, 'overview.json'), 'utf8'))
    assert.equal(artifact.exported_at, '2026-10-04T10:44:52.437Z')
    const exportedMetric = artifact.metrics.find(value => value.id === metric.metric_id)
    assert.equal(exportedMetric.extracted_at, metric.extracted_at)
    assert.equal(exportedMetric.freshness.as_of, metric.extracted_at)

    // Completion time must not bless genuinely future-dated source data.
    metric.extracted_at = '2026-10-04T10:44:52.438Z'
    snapshot.value_hash = computeOverviewValueHash(snapshot.metrics)
    writeFileSync(source, JSON.stringify(snapshot))
    const future = run(artifact.exported_at)
    assert.notEqual(future.status, 0)
    assert.match(future.stderr, /Metric usd_uzs_mom_change has freshness timestamp 2026-10-04T10:44:52\.438Z after artifact export/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
