import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  buildSiatGdpAnnualMetricUpdates,
  parseSiatGdpAnnualDataset,
  selectNationalAggregateRow,
  SIAT_GDP_ANNUAL_SOURCE_URL,
} from '../sources/siat-gdp-annual.mjs'
import { computeOverviewValueHash } from '../sources/snapshot-hash.mjs'
import { applyMetricUpdatesToSnapshot } from '../sources/update-snapshot.mjs'

const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(testDir, '..', '..', '..')
const fixtureDir = join(repoRoot, 'scripts', 'overview', 'test-fixtures', 'siat-gdp-annual')
const fixturePath = join(fixtureDir, 'sdmx_data_582.json')
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
  assert.equal(basename(new URL(url).pathname), 'sdmx_data_582.json')
  return fixtureJson()
}

function datasetRecord(json) {
  return json[0]
}

function aggregateRow(json) {
  return selectNationalAggregateRow(datasetRecord(json).data)
}

function minimalJson({ metadata = datasetRecord(fixtureJson()).metadata, rows } = {}) {
  return [{ metadata: cloneJson(metadata), data: rows }]
}

function makeNationalRow(periods = {}) {
  return {
    Code: '1700',
    Klassifikator: 'O‘zbekiston Respublikasi',
    Klassifikator_ru: 'Республика Узбекистан',
    Klassifikator_en: 'Republic of Uzbekistan',
    Klassifikator_uzc: 'Ўзбекистон Республикаси',
    ...periods,
  }
}

function metadataRecord(json, englishName) {
  return datasetRecord(json).metadata.find((record) => record.name_en === englishName)
}

function preMigrationSnapshot() {
  const snapshot = cloneJson(readJson(snapshotPath))
  snapshot.status = 'owner_verified_for_public_artifact'
  snapshot.snapshot_accepted_by = 'project owner'
  snapshot.snapshot_accepted_at = '2026-04-29T10:34:43Z'
  const metric = snapshot.metrics.find((entry) => entry.metric_id === 'real_gdp_growth_annual_yoy')
  metric.value = 7.7
  metric.previous_value = 6.7
  metric.source_label = 'Statistics Agency national accounts'
  metric.source_period = '2025'
  metric.source_url = 'https://stat.uz/img/news/analitika-vvp_eng_p32560.pdf'
  metric.observed_at = '2026-01-26T00:00:00Z'
  metric.validation_status = 'valid'
  metric.caveats = [
    'Preliminary annual national accounts release; owner verification is still required before public export.',
    'previous_value 6.7 is the 2024 annual real GDP growth rate shown in the same Statistics Agency annual GDP release.',
  ]
  metric.warnings = []
  delete metric.source_reference
  delete metric.extracted_at
  snapshot.value_hash = computeOverviewValueHash(snapshot)
  return snapshot
}

function assertManualRequired(fn, reason) {
  assert.throws(fn, (error) => {
    assert.equal(error?.reason, reason)
    return true
  })
}

test('parses fixed SIAT 582 annual GDP fixture for current and previous growth values', () => {
  const dataset = parseSiatGdpAnnualDataset(fixtureJson(), { sourceUrl: SIAT_GDP_ANNUAL_SOURCE_URL })

  assert.equal(dataset.current.periodLabel, '2025')
  assert.equal(dataset.current.indexValue, 107.7)
  assert.equal(dataset.current.value, 7.7)
  assert.equal(dataset.previous.periodLabel, '2024')
  assert.equal(dataset.previous.indexValue, 106.7)
  assert.equal(dataset.previous.value, 6.7)
  assert.equal(dataset.metadata.observedAt, '2026-01-27T00:00:00Z')
})

test('requires SIAT 582 indicator identity code', () => {
  const json = cloneJson(fixtureJson())
  metadataRecord(json, 'Indicator identification number (code)').value_en = '1.01.01.9999'

  assertManualRequired(
    () => parseSiatGdpAnnualDataset(json, { sourceUrl: SIAT_GDP_ANNUAL_SOURCE_URL }),
    'siat_gdp_annual_indicator_code_mismatch',
  )
})

test('selects exactly one Code 1700 national aggregate row', () => {
  const row = makeNationalRow({ 2024: 106.7, 2025: 107.7 })
  assert.equal(selectNationalAggregateRow([row]), row)

  assertManualRequired(
    () => selectNationalAggregateRow([{ ...row, Code: '1701' }]),
    'siat_gdp_annual_aggregate_row_missing',
  )
  assertManualRequired(
    () => selectNationalAggregateRow([row, { ...row }]),
    'siat_gdp_annual_aggregate_row_duplicate',
  )
})

test('does not leak sectoral or regional rows where Code is not 1700', () => {
  const json = minimalJson({
    rows: [
      makeNationalRow({ 2024: 106.7, 2025: 107.7 }),
      {
        Code: '0100',
        Klassifikator_en: 'Republic of Uzbekistan',
        2024: 106.7,
        2025: 125,
        2026: 130,
      },
    ],
  })

  const dataset = parseSiatGdpAnnualDataset(json, { sourceUrl: SIAT_GDP_ANNUAL_SOURCE_URL })

  assert.equal(dataset.current.periodLabel, '2025')
  assert.equal(dataset.current.value, 7.7)
})

test('accepts 4-digit annual period keys and ignores monthly or Cyrillic-month keys', () => {
  const json = minimalJson({
    rows: [
      makeNationalRow({
        2024: 106.7,
        2025: 107.7,
        '2025-M01': 150,
        '2025-М02': 151,
      }),
    ],
  })

  const dataset = parseSiatGdpAnnualDataset(json, { sourceUrl: SIAT_GDP_ANNUAL_SOURCE_URL })

  assert.equal(dataset.current.periodLabel, '2025')
  assert.equal(dataset.current.value, 7.7)
})

test('returns manual_required when no 4-digit annual period keys exist', () => {
  const json = minimalJson({
    rows: [makeNationalRow({ '2025-M01': 107.7, '2025-М02': 106.7 })],
  })

  assertManualRequired(
    () => parseSiatGdpAnnualDataset(json, { sourceUrl: SIAT_GDP_ANNUAL_SOURCE_URL }),
    'siat_gdp_annual_no_year_period_keys',
  )
})

test('requires prior-year=100 unit proof with EN to RU to UZ to UZC fallback', () => {
  const unitValues = [
    ['value_en', 'as a percentage of the corresponding period of the previous year'],
    ['value_ru', 'в процентах к соответствующему периоду предыдущего года'],
    ['value_uz', 'o‘tgan yilning mos davriga nisbatan foizda'],
    ['value_uzc', 'ўтган йилнинг мос даврига нисбатан фоизда'],
  ]

  for (const [key, value] of unitValues) {
    const json = cloneJson(fixtureJson())
    const unitRecord = metadataRecord(json, 'Unit of measurement')
    unitRecord.value_en = ''
    unitRecord.value_ru = ''
    unitRecord.value_uz = ''
    unitRecord.value_uzc = ''
    unitRecord[key] = value

    const dataset = parseSiatGdpAnnualDataset(json, { sourceUrl: SIAT_GDP_ANNUAL_SOURCE_URL })
    assert.equal(dataset.current.value, 7.7)
  }
})

test('rejects ambiguous or direct-percent unit representation', () => {
  const json = cloneJson(fixtureJson())
  const unitRecord = metadataRecord(json, 'Unit of measurement')
  unitRecord.value_en = 'percent'
  unitRecord.value_ru = ''
  unitRecord.value_uz = ''
  unitRecord.value_uzc = ''

  assertManualRequired(
    () => parseSiatGdpAnnualDataset(json, { sourceUrl: SIAT_GDP_ANNUAL_SOURCE_URL }),
    'siat_gdp_annual_unit_representation_unproven',
  )
})

test('calculates annual GDP growth as index minus 100 for 2025 and previous 2024', () => {
  const dataset = parseSiatGdpAnnualDataset(fixtureJson(), { sourceUrl: SIAT_GDP_ANNUAL_SOURCE_URL })

  assert.equal(dataset.current.indexValue, 107.7)
  assert.equal(dataset.current.value, 7.7)
  assert.equal(dataset.previous.indexValue, 106.7)
  assert.equal(dataset.previous.value, 6.7)
})

test('returns manual_required when previous year is missing', () => {
  const json = minimalJson({
    rows: [makeNationalRow({ 2023: 106.3, 2025: 107.7 })],
  })

  assertManualRequired(
    () => parseSiatGdpAnnualDataset(json, { sourceUrl: SIAT_GDP_ANNUAL_SOURCE_URL }),
    'siat_gdp_annual_previous_year_missing',
  )
})

test('returns manual_required when source latest period is older than current snapshot period', async () => {
  const snapshot = cloneJson(readJson(snapshotPath))
  snapshot.metrics.find((metric) => metric.metric_id === 'real_gdp_growth_annual_yoy').source_period = '2026'

  await assert.rejects(
    () =>
      buildSiatGdpAnnualMetricUpdates({
        snapshot,
        extractedAt: '2026-04-29T00:00:00.000Z',
        fetchJson: fixtureFetchJson,
      }),
    (error) => {
      assert.equal(error?.reason, 'siat_gdp_annual_source_older_than_snapshot')
      return true
    },
  )
})

test('returns manual_required when SIAT 582 source URL cannot be resolved', async () => {
  await assert.rejects(
    () =>
      buildSiatGdpAnnualMetricUpdates({
        snapshot: readJson(snapshotPath),
        extractedAt: '2026-04-29T00:00:00.000Z',
        fetchJson: async () => {
          throw new Error('fixture missing')
        },
      }),
    (error) => {
      assert.equal(error?.reason, 'siat_gdp_annual_source_url_unresolved')
      return true
    },
  )
})

test('rejects zero, null, non-finite, and ambiguous numeric raw values', () => {
  for (const [value, reason] of [
    [0, 'siat_gdp_annual_raw_value_missing'],
    [null, 'siat_gdp_annual_raw_value_missing'],
    [Number.NaN, 'siat_gdp_annual_non_numeric_value'],
    ['107,7', 'siat_gdp_annual_numeric_parsing_ambiguous'],
  ]) {
    const json = cloneJson(fixtureJson())
    aggregateRow(json)[2025] = value
    assertManualRequired(
      () => parseSiatGdpAnnualDataset(json, { sourceUrl: SIAT_GDP_ANNUAL_SOURCE_URL }),
      reason,
    )
  }
})

test('returns manual_required when raw index sanity bound fails', () => {
  const json = cloneJson(fixtureJson())
  aggregateRow(json)[2025] = 200

  assertManualRequired(
    () => parseSiatGdpAnnualDataset(json, { sourceUrl: SIAT_GDP_ANNUAL_SOURCE_URL }),
    'siat_gdp_annual_sanity_bound_failed',
  )
})

test('derives observed_at from SIAT Last modified date metadata', () => {
  const json = cloneJson(fixtureJson())
  metadataRecord(json, 'Last modified date').value_en = '2026-01-27'

  const dataset = parseSiatGdpAnnualDataset(json, { sourceUrl: SIAT_GDP_ANNUAL_SOURCE_URL })

  assert.equal(dataset.metadata.observedAt, '2026-01-27T00:00:00Z')
})

test('builds annual GDP source_period as 2025', async () => {
  const updates = await buildSiatGdpAnnualMetricUpdates({
    snapshot: readJson(snapshotPath),
    extractedAt: '2026-04-29T00:00:00.000Z',
    fetchJson: fixtureFetchJson,
  })

  assert.equal(updates[0].source_period, '2025')
})

test('migrates annual GDP provenance from PDF to SIAT and flips pending review even when values match', async () => {
  const snapshot = preMigrationSnapshot()
  const before = snapshot.metrics.find((metric) => metric.metric_id === 'real_gdp_growth_annual_yoy')
  const updates = await buildSiatGdpAnnualMetricUpdates({
    snapshot,
    extractedAt: '2026-04-29T00:00:00.000Z',
    fetchJson: fixtureFetchJson,
  })
  const result = applyMetricUpdatesToSnapshot(snapshot, updates)
  const after = result.snapshot.metrics.find((metric) => metric.metric_id === 'real_gdp_growth_annual_yoy')

  assert.equal(after.value, before.value)
  assert.equal(after.previous_value, before.previous_value)
  assert.equal(after.source_url, SIAT_GDP_ANNUAL_SOURCE_URL)
  assert.notEqual(after.source_url, before.source_url)
  assert.match(after.source_reference, /sdmx_data_582/)
  assert.match(after.source_reference, /lib\.stat\.uz/)
  assert.equal(after.extracted_at, '2026-04-29T00:00:00.000Z')
  assert.equal(after.observed_at, '2026-01-27T00:00:00Z')
  assert.equal(after.caveats.some((caveat) => /Preliminary annual national accounts release/i.test(caveat)), false)
  assert.equal(after.caveats.some((caveat) => /previous_value 6\.7 is 2024 SIAT 582 index 106\.7 minus 100\./.test(caveat)), true)
  assert.equal(result.snapshot.status, 'automation_pending_owner_review')
  assert.notEqual(result.snapshot.value_hash, snapshot.value_hash)
})

test('SIAT annual GDP snapshot update preserves all 17 ids/order and recomputes value_hash', async () => {
  const snapshot = readJson(snapshotPath)
  const originalIds = snapshot.metrics.map((metric) => metric.metric_id)
  const updates = await buildSiatGdpAnnualMetricUpdates({
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

test('Overview exporter refuses automation_pending_owner_review annual GDP snapshot', async () => {
  const tempRoot = join(tmpdir(), `siat-gdp-export-refusal-${process.pid}-${Date.now()}`)
  mkdirSync(tempRoot, { recursive: true })
  const tempSnapshotPath = join(tempRoot, 'overview_source_snapshot.json')
  const tempOutputPath = join(tempRoot, 'overview.json')
  const snapshot = readJson(snapshotPath)
  const updates = await buildSiatGdpAnnualMetricUpdates({
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

test('SIAT annual GDP CLI write-snapshot updates source snapshot only and records diff report', () => {
  const tempRoot = join(tmpdir(), `siat-gdp-cli-${process.pid}-${Date.now()}`)
  const tempFixtureDir = join(tempRoot, 'fixtures')
  mkdirSync(tempFixtureDir, { recursive: true })
  const tempSnapshotPath = join(tempRoot, 'overview_source_snapshot.json')
  const diffReportPath = join(tempRoot, 'overview_source_snapshot.diff_report.json')
  writeFileSync(tempSnapshotPath, readFileSync(snapshotPath, 'utf8'), 'utf8')
  writeFileSync(join(tempFixtureDir, 'sdmx_data_582.json'), readFileSync(fixturePath, 'utf8'), 'utf8')

  const publicBefore = readFileSync(publicOverviewPath, 'utf8')
  const result = spawnSync(
    process.execPath,
    [
      fetchScriptPath,
      '--write-snapshot',
      '--family',
      'siat-gdp-annual',
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
  assert.equal(written.metrics.find((metric) => metric.metric_id === 'real_gdp_growth_annual_yoy').source_url, SIAT_GDP_ANNUAL_SOURCE_URL)
  assert.equal(report.family, 'siat-gdp-annual')
  assert.equal(report.changed, true)
  assert.equal(readFileSync(publicOverviewPath, 'utf8'), publicBefore)
})
