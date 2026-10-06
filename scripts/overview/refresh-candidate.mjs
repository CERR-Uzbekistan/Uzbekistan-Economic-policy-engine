import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { buildCbuFxMetricUpdates } from './sources/cbu-fx.mjs'
import { buildSiatTradeMetricUpdates } from './sources/siat-trade.mjs'
import { buildSiatCpiMetricUpdates, SIAT_CPI_MOM_SOURCE_URL } from './sources/siat-cpi.mjs'
import { buildSiatGdpAnnualMetricUpdates } from './sources/siat-gdp-annual.mjs'
import { buildWorldBankGoldMetricUpdates } from './sources/world-bank-gold.mjs'
import { fetchJsonWithRetry, fetchArrayBufferWithRetry } from './sources/http.mjs'
import { resolveRefreshExportedAt } from './sources/refresh-clock.mjs'
import { applyMetricUpdatesToSnapshot } from './sources/update-snapshot.mjs'
import { buildReviewedReleaseMetricUpdates } from './sources/reviewed-releases.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const args = Object.fromEntries(Array.from({ length: Math.floor((process.argv.length - 2) / 2) }, (_, index) => process.argv.slice(2 + index * 2, 4 + index * 2)))
if (!args['--out'] || !args['--as-of']) throw new Error('Required: --out directory --as-of ISO timestamp')
const now = args['--as-of']
if (!Number.isFinite(Date.parse(now))) throw new Error('Invalid as-of timestamp')
const output = resolve(args['--out'])
if (!output.startsWith(`${root}/`) && !output.startsWith(`${root}\\`)) throw new Error('Candidate must stay inside the workspace')
await mkdir(resolve(output, 'raw'), { recursive: true })
const json = async path => JSON.parse(await readFile(path, 'utf8'))
const hash = data => createHash('sha256').update(data).digest('hex')
let snapshot = await json(resolve(root, 'scripts/overview/overview_source_snapshot.json'))
const report = { generated_at: now, checked_at: now, status: 'validated', scope: 'Configured source families; freshness is evaluated separately per metric', families: [], sources: [], diff: [] }
const capturedJson = new Map()
async function capture(url, body, extension) {
  const bytes = Buffer.from(body)
  const digest = hash(bytes)
  const path = `raw/${digest}.${extension}`
  await writeFile(resolve(output, path), bytes)
  report.sources.push({ url, sha256: digest, bytes: bytes.length, path, representation: extension === 'json' ? 'normalized JSON' : 'downloaded bytes', fetched_at: now })
}
async function fetchJson(url) {
  const data = await fetchJsonWithRetry(url)
  await capture(url, JSON.stringify(data), 'json')
  capturedJson.set(url, data)
  return data
}
async function fetchArrayBuffer(url) {
  const data = await fetchArrayBufferWithRetry(url)
  await capture(url, Buffer.from(data), 'xlsx')
  return data
}
function apply(updates) {
  const result = applyMetricUpdatesToSnapshot(snapshot, updates, { publicStatus: 'source_verified_for_public_artifact', sourceVerifiedBy: 'validated-official-source-refresh', sourceVerifiedAt: now })
  snapshot = result.snapshot
  report.diff.push(...result.diff)
  return result.changed
}
const builders = {
  'cbu-fx': buildCbuFxMetricUpdates,
  'siat-trade': buildSiatTradeMetricUpdates,
  'siat-cpi': buildSiatCpiMetricUpdates,
  'siat-gdp-annual': buildSiatGdpAnnualMetricUpdates,
  'world-bank-gold': buildWorldBankGoldMetricUpdates,
}
for (const [family, build] of Object.entries(builders)) {
  try {
    const updates = await build({ snapshot, latestDate: now.slice(0, 10), extractedAt: now, fetchJson, fetchArrayBuffer })
    report.families.push({ family, status: 'validated', changed: apply(updates), metrics: updates.map(value => value.metric_id) })
  } catch (error) {
    report.status = 'degraded'
    report.families.push({ family, status: 'retained', reason: error.reason ?? error.message })
  }
}
const releases = await json(resolve(root, 'scripts/overview/reviewed-releases.json'))
for (const release of releases.releases) {
  try {
    const response = await fetch(release.url, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const body = Buffer.from(await response.arrayBuffer())
    await capture(release.url, body, release.sha256 ? 'pdf' : 'html')
    const updates = buildReviewedReleaseMetricUpdates({
      release, body, snapshot, asOf: now, siatCpiJson: capturedJson.get(SIAT_CPI_MOM_SOURCE_URL),
    })
    report.families.push({ family: release.id, status: 'validated', changed: apply(updates) })
  } catch (error) {
    report.status = 'degraded'
    report.families.push({ family: release.id, status: 'retained', reason: error.reason ?? error.message })
  }
}
const snapshotFile = resolve(output, 'source-snapshot.json')
await writeFile(snapshotFile, `${JSON.stringify(snapshot, null, 2)}\n`)
const artifactFile = resolve(output, 'overview.json')
// Export after acquisition; the run start can precede retained extraction timestamps.
report.exported_at = resolveRefreshExportedAt(now, new Date().toISOString())
const exported = spawnSync(process.execPath, [resolve(root, 'scripts/overview/export-overview.mjs'), '--exported-at', report.exported_at], {
  env: { ...process.env, OVERVIEW_SOURCE_SNAPSHOT_PATH: snapshotFile, OVERVIEW_OUTPUT_PATH: artifactFile }, encoding: 'utf8', cwd: root,
})
if (exported.status !== 0) throw new Error(exported.error?.message || exported.stderr || exported.stdout || 'Exporter failed')
report.snapshot_sha256 = hash(await readFile(snapshotFile))
report.artifact_sha256 = hash(await readFile(artifactFile))
report.changed = report.diff.length > 0
report.value_hash = snapshot.value_hash
report.snapshot_status = snapshot.status
await writeFile(resolve(output, 'refresh-report.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ status: report.status, changed_fields: report.diff.length, families: report.families, artifact_sha256: report.artifact_sha256 }, null, 2))
