import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  buildWorldBankGoldMetricUpdates,
  parseWorldBankGoldWorkbook,
  parseWorldBankGoldXlsx,
  WORLD_BANK_GOLD_SOURCE_URL,
} from '../sources/world-bank-gold.mjs'
import { computeOverviewValueHash } from '../sources/snapshot-hash.mjs'
import { applyMetricUpdatesToSnapshot } from '../sources/update-snapshot.mjs'

const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(testDir, '..', '..', '..')
const snapshotPath = join(repoRoot, 'scripts', 'overview', 'overview_source_snapshot.json')
const fetchScriptPath = join(repoRoot, 'scripts', 'overview', 'fetch-overview-sources.mjs')

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineCell(ref, value) {
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`
}

function numberCell(ref, value) {
  return `<c r="${ref}"><v>${value}</v></c>`
}

function workbookEntries() {
  return new Map([
    [
      'xl/workbook.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Monthly Prices" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ],
    [
      'xl/_rels/workbook.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>`,
    ],
    ['xl/sharedStrings.xml', '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>'],
    [
      'xl/worksheets/sheet2.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1">${inlineCell('A1', 'World Bank Commodity Price Data (The Pink Sheet)')}</row>
<row r="4">${inlineCell('A4', 'Updated on May 04, 2026')}</row>
<row r="5">${inlineCell('C5', 'Gold')}</row>
<row r="6">${inlineCell('C6', '($/troy oz)')}</row>
<row r="7">${inlineCell('C7', 'GOLD')}</row>
<row r="8">${inlineCell('A8', '2026M02')}${numberCell('C8', 5019.97)}</row>
<row r="9">${inlineCell('A9', '2026M03')}${numberCell('C9', 4855.54)}</row>
<row r="10">${inlineCell('A10', '2026M04')}${numberCell('C10', 4721.42)}</row>
</sheetData></worksheet>`,
    ],
  ])
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function writeUInt16(value) {
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16LE(value)
  return buffer
}

function writeUInt32(value) {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32LE(value)
  return buffer
}

function createStoredZip(entries) {
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const [name, text] of entries) {
    const nameBuffer = Buffer.from(name, 'utf8')
    const data = Buffer.from(text, 'utf8')
    const crc = crc32(data)
    const localHeader = Buffer.concat([
      writeUInt32(0x04034b50),
      writeUInt16(20),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(crc),
      writeUInt32(data.length),
      writeUInt32(data.length),
      writeUInt16(nameBuffer.length),
      writeUInt16(0),
      nameBuffer,
    ])
    localParts.push(localHeader, data)

    centralParts.push(
      Buffer.concat([
        writeUInt32(0x02014b50),
        writeUInt16(20),
        writeUInt16(20),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt32(crc),
        writeUInt32(data.length),
        writeUInt32(data.length),
        writeUInt16(nameBuffer.length),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt32(0),
        writeUInt32(offset),
        nameBuffer,
      ]),
    )
    offset += localHeader.length + data.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const localFiles = Buffer.concat(localParts)
  const eocd = Buffer.concat([
    writeUInt32(0x06054b50),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(entries.size),
    writeUInt16(entries.size),
    writeUInt32(centralDirectory.length),
    writeUInt32(localFiles.length),
    writeUInt16(0),
  ])

  return Buffer.concat([localFiles, centralDirectory, eocd])
}

function preMigrationSnapshot() {
  const snapshot = cloneJson(readJson(snapshotPath))
  const level = snapshot.metrics.find((metric) => metric.metric_id === 'gold_price_level')
  const change = snapshot.metrics.find((metric) => metric.metric_id === 'gold_price_change')

  Object.assign(level, {
    value: 4855.54,
    previous_value: 5019.97,
    source_period: 'March 2026 monthly average',
    observed_at: '2026-04-02T00:00:00Z',
    extracted_at: null,
  })

  Object.assign(change, {
    value: -3.28,
    source_period: 'March 2026 vs February 2026',
    source_reference:
      'Calculated from World Bank Pink Sheet monthly gold prices: 4855.54 for March 2026 and 5019.97 for February 2026',
    observed_at: null,
    extracted_at: '2026-04-27T00:00:00Z',
  })

  snapshot.status = 'owner_verified_for_public_artifact'
  snapshot.snapshot_accepted_by = 'project owner'
  snapshot.snapshot_accepted_at = '2026-04-29T05:43:29Z'
  snapshot.value_hash = computeOverviewValueHash(snapshot)
  return snapshot
}

test('parses World Bank Pink Sheet monthly gold values from workbook XML', () => {
  const dataset = parseWorldBankGoldWorkbook(workbookEntries())

  assert.equal(dataset.observedAt, '2026-05-04T00:00:00Z')
  assert.equal(dataset.current.periodLabel, 'April 2026')
  assert.equal(dataset.current.value, 4721.42)
  assert.equal(dataset.previous.periodLabel, 'March 2026')
  assert.equal(dataset.previous.value, 4855.54)
})

test('parses minimal XLSX ZIP and builds gold level/change updates', async () => {
  const snapshot = preMigrationSnapshot()
  const updates = await buildWorldBankGoldMetricUpdates({
    snapshot,
    extractedAt: '2026-05-19T06:30:00.000Z',
    fetchArrayBuffer: async () => createStoredZip(workbookEntries()),
  })

  const level = updates.find((metric) => metric.metric_id === 'gold_price_level')
  const change = updates.find((metric) => metric.metric_id === 'gold_price_change')

  assert.equal(level.value, 4721.42)
  assert.equal(level.previous_value, 4855.54)
  assert.equal(level.source_period, 'April 2026 monthly average')
  assert.equal(level.source_url, WORLD_BANK_GOLD_SOURCE_URL)
  assert.equal(change.value, -2.76)
  assert.equal(change.source_period, 'April 2026 vs March 2026')

  const parsed = parseWorldBankGoldXlsx(createStoredZip(workbookEntries()))
  assert.equal(parsed.current.value, 4721.42)
})

test('World Bank gold snapshot update preserves all locked ids and can be source-verified', async () => {
  const snapshot = preMigrationSnapshot()
  const updates = await buildWorldBankGoldMetricUpdates({
    snapshot,
    extractedAt: '2026-05-19T06:30:00.000Z',
    fetchArrayBuffer: async () => createStoredZip(workbookEntries()),
  })

  const result = applyMetricUpdatesToSnapshot(snapshot, updates, {
    publicStatus: 'source_verified_for_public_artifact',
    sourceVerifiedBy: 'test',
    sourceVerifiedAt: '2026-05-19T06:30:00Z',
  })

  assert.equal(result.snapshot.metrics.length, 17)
  assert.equal(result.snapshot.status, 'source_verified_for_public_artifact')
  assert.equal(result.snapshot.source_verified_by, 'test')
  assert.equal(result.snapshot.value_hash, computeOverviewValueHash(result.snapshot))
})

test('World Bank gold CLI reports manual_required and leaves snapshot unchanged on invalid workbook', () => {
  const tempRoot = join(tmpdir(), `world-bank-gold-manual-required-${process.pid}-${Date.now()}`)
  mkdirSync(tempRoot, { recursive: true })
  const tempSnapshotPath = join(tempRoot, 'overview_source_snapshot.json')
  const diffReportPath = join(tempRoot, 'overview_source_snapshot.diff_report.json')
  const snapshotText = readFileSync(snapshotPath, 'utf8')
  writeFileSync(tempSnapshotPath, snapshotText, 'utf8')
  writeFileSync(join(tempRoot, 'CMO-Historical-Data-Monthly.xlsx'), Buffer.from('not a zip file'))

  const result = spawnSync(
    process.execPath,
    [
      fetchScriptPath,
      '--write-snapshot',
      '--family',
      'world-bank-gold',
      '--snapshot',
      tempSnapshotPath,
      '--fixture-dir',
      tempRoot,
      '--diff-report',
      diffReportPath,
    ],
    { cwd: repoRoot, encoding: 'utf8' },
  )

  assert.equal(result.status, 0, result.stderr)
  assert.equal(readFileSync(tempSnapshotPath, 'utf8'), snapshotText)
  const report = readJson(diffReportPath)
  assert.equal(report.changed, false)
  assert.equal(report.manual_required.reason, 'world_bank_gold_xlsx_zip_eocd_missing')
})
