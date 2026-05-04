import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  buildSiatCpiMetricUpdates,
  findMetadataValue,
  parseSiatCpiMomDataset,
  selectAggregateRow,
  SIAT_CPI_MOM_SOURCE_URL,
} from '../sources/siat-cpi.mjs'
import { computeOverviewValueHash } from '../sources/snapshot-hash.mjs'
import { applyMetricUpdatesToSnapshot } from '../sources/update-snapshot.mjs'

const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(testDir, '..', '..', '..')
const fixturePath = join(repoRoot, 'scripts', 'overview', 'source-discovery', 'phase3', 'siat-cpi-all-items-mom-4585.json')
const snapshotPath = join(repoRoot, 'scripts', 'overview', 'overview_source_snapshot.json')
const fetchScriptPath = join(repoRoot, 'scripts', 'overview', 'fetch-overview-sources.mjs')
const exportScriptPath = join(repoRoot, 'scripts', 'overview', 'export-overview.mjs')
const publicOverviewPath = join(repoRoot, 'apps', 'policy-ui', 'public', 'data', 'overview.json')

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

function fixtureJson() {
  return readJson(fixturePath)
}

async function fixtureFetchJson(url) {
  assert.equal(basename(new URL(url).pathname), 'sdmx_data_4585.json')
  return fixtureJson()
}

function datasetRecord(json) {
  return json[0]
}

function aggregateRow(json) {
  return selectAggregateRow(datasetRecord(json).data)
}

function minimalJson({ metadata = datasetRecord(fixtureJson()).metadata, rows } = {}) {
  return [{ metadata: cloneJson(metadata), data: rows }]
}

function makeAggregateRow(periods = {}) {
  return {
    Code: '1',
    Klassifikator_en: 'COMPOSITE INDEX',
    Klassifikator_ru: '\u0421\u0412\u041e\u0414\u041d\u042b\u0419 \u0418\u041d\u0414\u0415\u041a\u0421',
    Klassifikator: 'YIG\u02bbMA INDEKS',
    ...periods,
  }
}

function preMigrationSnapshot() {
  const snapshot = cloneJson(readJson(snapshotPath))
  snapshot.status = 'owner_verified_for_public_artifact'
  snapshot.snapshot_accepted_by = 'project owner'
  snapshot.snapshot_accepted_at = '2026-04-29T05:43:29Z'
  const cpiMom = snapshot.metrics.find((metric) => metric.metric_id === 'cpi_mom')
  cpiMom.source_label = 'Statistics Agency CPI'
  cpiMom.source_period = 'March 2026'
  cpiMom.source_url = 'https://stat.uz/img/press-relizlar/press-release-march-2026-eng_p22295.pdf'
  cpiMom.observed_at = '2026-04-05T00:00:00Z'
  cpiMom.value = 0.6
  cpiMom.previous_value = 0.6
  cpiMom.validation_status = 'valid'
  cpiMom.caveats = [
    'Monthly inflation can be volatile; do not present as trend alone.',
    'previous_value 0.6 is the February 2026 monthly CPI rate shown in the same Statistics Agency March 2026 CPI release.',
  ]
  cpiMom.warnings = []
  delete cpiMom.source_reference
  delete cpiMom.extracted_at
  snapshot.value_hash = computeOverviewValueHash(snapshot)
  return snapshot
}

function assertManualRequired(fn, reason) {
  assert.throws(fn, (error) => {
    assert.equal(error?.reason, reason)
    return true
  })
}

test('parses fixed SIAT 4585 aggregate fixture for CPI MoM current and previous values', () => {
  const dataset = parseSiatCpiMomDataset(fixtureJson(), { sourceUrl: SIAT_CPI_MOM_SOURCE_URL })

  assert.equal(dataset.current.periodKey, '2026-\u041c03')
  assert.equal(dataset.current.periodLabel, 'March 2026')
  assert.equal(dataset.current.indexValue, 100.6)
  assert.equal(dataset.current.value, 0.6)
  assert.equal(dataset.previous.periodKey, '2026-\u041c02')
  assert.equal(dataset.previous.periodLabel, 'February 2026')
  assert.equal(dataset.previous.indexValue, 100.6)
  assert.equal(dataset.previous.value, 0.6)
  assert.equal(dataset.metadata.observedAt, '2026-04-05T00:00:00Z')
})

test('selects exactly one Code 1 composite-index aggregate row', () => {
  const row = makeAggregateRow({ '2026-\u041c02': 100.6, '2026-\u041c03': 100.6 })
  assert.equal(selectAggregateRow([row]), row)

  assertManualRequired(
    () => selectAggregateRow([{ ...row, Code: '1.02' }]),
    'siat_cpi_mom_aggregate_row_match_count',
  )
  assertManualRequired(
    () => selectAggregateRow([row, { ...row }]),
    'siat_cpi_mom_aggregate_row_match_count',
  )
})

test('never uses COICOP product rows to compute headline CPI MoM', () => {
  const json = minimalJson({
    rows: [
      makeAggregateRow({ '2026-\u041c02': 100.6, '2026-\u041c03': 100.6 }),
      {
        Code: '1.02',
        Klassifikator_en: 'FOOD PRODUCTS',
        '2026-\u041c02': 100.9,
        '2026-\u041c03': 101.2,
        '2026-\u041c04': 130,
      },
    ],
  })

  const dataset = parseSiatCpiMomDataset(json, { sourceUrl: SIAT_CPI_MOM_SOURCE_URL })

  assert.equal(dataset.current.periodLabel, 'March 2026')
  assert.equal(dataset.current.value, 0.6)
})

test('accepts Cyrillic-M period keys and ignores Latin-M keys', () => {
  const json = minimalJson({
    rows: [
      makeAggregateRow({
        '2026-\u041c02': 100.6,
        '2026-\u041c03': 100.6,
        '2026-M04': 130,
      }),
    ],
  })

  const dataset = parseSiatCpiMomDataset(json, { sourceUrl: SIAT_CPI_MOM_SOURCE_URL })

  assert.equal(dataset.current.periodKey, '2026-\u041c03')
  assert.equal(dataset.current.value, 0.6)
})

test('returns manual_required when zero valid Cyrillic-M period columns exist', () => {
  const json = minimalJson({
    rows: [makeAggregateRow({ '2026-M02': 100.6, '2026-M03': 100.6 })],
  })

  assertManualRequired(
    () => parseSiatCpiMomDataset(json, { sourceUrl: SIAT_CPI_MOM_SOURCE_URL }),
    'siat_cpi_mom_no_cyrillic_period_keys',
  )
})

test('returns manual_required for aggregate zero sentinel on current or previous month', () => {
  const json = minimalJson({
    rows: [makeAggregateRow({ '2026-\u041c02': 100.6, '2026-\u041c03': 0.0 })],
  })

  assertManualRequired(
    () => parseSiatCpiMomDataset(json, { sourceUrl: SIAT_CPI_MOM_SOURCE_URL }),
    'siat_cpi_mom_zero_sentinel_on_aggregate',
  )
})

test('parses multilingual metadata array and honors value preference order', () => {
  const metadata = [
    {
      name_en: 'Unit of measurement',
      value_ru: 'Percent RU',
      value_uz: 'Percent UZ',
      value_uzc: 'Percent UZC',
    },
    {
      name_en: 'Indicator name',
      value_en: 'English value',
      value_ru: 'Russian value',
    },
  ]

  assert.equal(findMetadataValue(metadata, (name) => name === 'Unit of measurement'), 'Percent RU')
  assert.equal(findMetadataValue(metadata, (name) => name === 'Indicator name'), 'English value')
})

test('requires unit and indicator-name representation proof', () => {
  const badUnit = cloneJson(fixtureJson())
  const unitRecord = datasetRecord(badUnit).metadata.find((record) => record.name_en === 'Unit of measurement')
  unitRecord.value_en = 'Index points'
  assertManualRequired(
    () => parseSiatCpiMomDataset(badUnit, { sourceUrl: SIAT_CPI_MOM_SOURCE_URL }),
    'siat_cpi_mom_unit_not_proven',
  )

  const badName = cloneJson(fixtureJson())
  const nameRecord = datasetRecord(badName).metadata.find((record) => record.name_en === 'Indicator name')
  nameRecord.value_en = 'Consumer prices'
  nameRecord.value_ru = 'Consumer prices'
  nameRecord.value_uz = 'Consumer prices'
  nameRecord.value_uzc = 'Consumer prices'
  assertManualRequired(
    () => parseSiatCpiMomDataset(badName, { sourceUrl: SIAT_CPI_MOM_SOURCE_URL }),
    'siat_cpi_mom_representation_not_proven',
  )
})

test('requires SIAT 4585 indicator identity code', () => {
  const json = cloneJson(fixtureJson())
  const codeRecord = datasetRecord(json).metadata.find(
    (record) => record.name_en === 'Indicator identification number (code)',
  )
  codeRecord.value_en = 'wrong-code'

  assertManualRequired(
    () => parseSiatCpiMomDataset(json, { sourceUrl: SIAT_CPI_MOM_SOURCE_URL }),
    'siat_cpi_mom_indicator_code_mismatch',
  )
})

test('returns manual_required when aggregate index sanity bound fails', () => {
  const json = cloneJson(fixtureJson())
  aggregateRow(json)['2026-\u041c03'] = 106

  assertManualRequired(
    () => parseSiatCpiMomDataset(json, { sourceUrl: SIAT_CPI_MOM_SOURCE_URL }),
    'siat_cpi_mom_sanity_bound_failed',
  )
})

test('derives observed_at from SIAT Last modified date metadata', () => {
  const json = cloneJson(fixtureJson())
  const lastModified = datasetRecord(json).metadata.find((record) => record.name_en === 'Last modified date')
  lastModified.value_en = '2026-04-07'

  const dataset = parseSiatCpiMomDataset(json, { sourceUrl: SIAT_CPI_MOM_SOURCE_URL })

  assert.equal(dataset.metadata.observedAt, '2026-04-07T00:00:00Z')
})

test('builds CPI MoM source-period as human-readable month label', () => {
  const dataset = parseSiatCpiMomDataset(fixtureJson(), { sourceUrl: SIAT_CPI_MOM_SOURCE_URL })

  assert.equal(dataset.current.periodLabel, 'March 2026')
})

test('calculates March 2026 and February 2026 aggregate index minus 100', () => {
  const dataset = parseSiatCpiMomDataset(fixtureJson(), { sourceUrl: SIAT_CPI_MOM_SOURCE_URL })

  assert.equal(dataset.current.indexValue, 100.6)
  assert.equal(dataset.current.value, 0.6)
  assert.equal(dataset.previous.indexValue, 100.6)
  assert.equal(dataset.previous.value, 0.6)
})

test('migrates cpi_mom provenance from PDF to SIAT and flips pending review even when values match', async () => {
  const snapshot = preMigrationSnapshot()
  const before = snapshot.metrics.find((metric) => metric.metric_id === 'cpi_mom')
  const updates = await buildSiatCpiMetricUpdates({
    snapshot,
    extractedAt: '2026-04-29T00:00:00.000Z',
    fetchJson: fixtureFetchJson,
  })
  const result = applyMetricUpdatesToSnapshot(snapshot, updates)
  const after = result.snapshot.metrics.find((metric) => metric.metric_id === 'cpi_mom')

  assert.equal(after.value, before.value)
  assert.equal(after.previous_value, before.previous_value)
  assert.equal(after.source_url, SIAT_CPI_MOM_SOURCE_URL)
  assert.notEqual(after.source_url, before.source_url)
  assert.match(after.source_reference, /sdmx_data_4585/)
  assert.equal(after.extracted_at, '2026-04-29T00:00:00.000Z')
  assert.equal(after.caveats.some((caveat) => /press release/i.test(caveat)), false)
  assert.equal(result.snapshot.status, 'automation_pending_owner_review')
  assert.notEqual(result.snapshot.value_hash, snapshot.value_hash)
})

test('returns manual_required when source latest period is older than current snapshot period', async () => {
  const snapshot = cloneJson(readJson(snapshotPath))
  snapshot.metrics.find((metric) => metric.metric_id === 'cpi_mom').source_period = 'April 2026'

  await assert.rejects(
    () =>
      buildSiatCpiMetricUpdates({
        snapshot,
        extractedAt: '2026-04-29T00:00:00.000Z',
        fetchJson: fixtureFetchJson,
      }),
    (error) => {
      assert.equal(error?.reason, 'siat_cpi_mom_source_older_than_snapshot')
      return true
    },
  )
})

test('returns manual_required when previous month is missing', () => {
  const json = minimalJson({
    rows: [makeAggregateRow({ '2026-\u041c01': 100.7, '2026-\u041c03': 100.6 })],
  })

  assertManualRequired(
    () => parseSiatCpiMomDataset(json, { sourceUrl: SIAT_CPI_MOM_SOURCE_URL }),
    'siat_cpi_mom_previous_month_missing',
  )
})

test('SIAT CPI snapshot update preserves all 17 ids/order and recomputes value_hash', async () => {
  const snapshot = readJson(snapshotPath)
  const originalIds = snapshot.metrics.map((metric) => metric.metric_id)
  const updates = await buildSiatCpiMetricUpdates({
    snapshot,
    extractedAt: '2026-04-29T00:00:00.000Z',
    fetchJson: fixtureFetchJson,
  })

  const result = applyMetricUpdatesToSnapshot(snapshot, updates)

  assert.equal(result.snapshot.metrics.length, 17)
  assert.deepEqual(result.snapshot.metrics.map((metric) => metric.metric_id), originalIds)
  assert.equal(result.snapshot.status, 'automation_pending_owner_review')
  assert.equal('snapshot_accepted_by' in result.snapshot, false)
  assert.equal('snapshot_accepted_at' in result.snapshot, false)
  assert.equal(result.snapshot.value_hash, computeOverviewValueHash(result.snapshot))
  assert.notEqual(result.snapshot.value_hash, snapshot.value_hash)
})

test('Overview exporter refuses automation_pending_owner_review snapshot', async () => {
  const tempRoot = join(tmpdir(), `siat-cpi-export-refusal-${process.pid}-${Date.now()}`)
  mkdirSync(tempRoot, { recursive: true })
  const tempSnapshotPath = join(tempRoot, 'overview_source_snapshot.json')
  const tempOutputPath = join(tempRoot, 'overview.json')
  const snapshot = readJson(snapshotPath)
  const updates = await buildSiatCpiMetricUpdates({
    snapshot,
    extractedAt: '2026-04-29T00:00:00.000Z',
    fetchJson: fixtureFetchJson,
  })
  const result = applyMetricUpdatesToSnapshot(snapshot, updates)
  writeFileSync(tempSnapshotPath, `${JSON.stringify(result.snapshot, null, 2)}\n`, 'utf8')

  const exportResult = spawnSync(
    process.execPath,
    [exportScriptPath, '--exported-at', '2026-04-29T00:00:00.000Z'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        OVERVIEW_SOURCE_SNAPSHOT_PATH: tempSnapshotPath,
        OVERVIEW_OUTPUT_PATH: tempOutputPath,
      },
    },
  )

  assert.notEqual(exportResult.status, 0)
  assert.match(exportResult.stderr, /automation_pending_owner_review/)
  assert.equal(existsSync(tempOutputPath), false)
})

test('SIAT CPI CLI write-snapshot updates source snapshot only and records diff report', () => {
  const tempRoot = join(tmpdir(), `siat-cpi-cli-${process.pid}-${Date.now()}`)
  const tempFixtureDir = join(tempRoot, 'fixtures')
  mkdirSync(tempFixtureDir, { recursive: true })
  const tempSnapshotPath = join(tempRoot, 'overview_source_snapshot.json')
  const diffReportPath = join(tempRoot, 'overview_source_snapshot.diff_report.json')
  writeFileSync(tempSnapshotPath, readFileSync(snapshotPath, 'utf8'), 'utf8')
  writeFileSync(join(tempFixtureDir, 'sdmx_data_4585.json'), readFileSync(fixturePath, 'utf8'), 'utf8')

  const publicBefore = readFileSync(publicOverviewPath, 'utf8')
  const result = spawnSync(
    process.execPath,
    [
      fetchScriptPath,
      '--write-snapshot',
      '--family',
      'siat-cpi',
      '--snapshot',
      tempSnapshotPath,
      '--fixture-dir',
      tempFixtureDir,
      '--diff-report',
      diffReportPath,
    ],
    { cwd: repoRoot, encoding: 'utf8' },
  )

  assert.equal(result.status, 0, result.stderr)
  const written = readJson(tempSnapshotPath)
  const report = readJson(diffReportPath)
  assert.equal(written.status, 'automation_pending_owner_review')
  assert.equal(written.metrics.find((metric) => metric.metric_id === 'cpi_mom').source_url, SIAT_CPI_MOM_SOURCE_URL)
  assert.equal(report.family, 'siat-cpi')
  assert.equal(report.changed, true)
  assert.equal(readFileSync(publicOverviewPath, 'utf8'), publicBefore)
})
