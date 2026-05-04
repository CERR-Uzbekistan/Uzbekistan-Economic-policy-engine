import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCbuFxMetricUpdates } from './sources/cbu-fx.mjs'
import { buildSiatCpiMetricUpdates } from './sources/siat-cpi.mjs'
import { buildSiatGdpAnnualMetricUpdates } from './sources/siat-gdp-annual.mjs'
import { buildSiatTradeMetricUpdates, isManualRequiredError } from './sources/siat-trade.mjs'
import { applyMetricUpdatesToSnapshot, formatDiffReport } from './sources/update-snapshot.mjs'

const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..', '..')
const defaultSnapshotPath = join(repoRoot, 'scripts', 'overview', 'overview_source_snapshot.json')

function fail(message) {
  throw new Error(message)
}

function parseArgs(argv) {
  const options = {
    family: 'cbu-fx',
    snapshot: defaultSnapshotPath,
    dryRun: false,
    writeSnapshot: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--write-snapshot') options.writeSnapshot = true
    else if (arg === '--family') {
      options.family = argv[index + 1]
      index += 1
    } else if (arg === '--snapshot') {
      options.snapshot = argv[index + 1]
      index += 1
    } else if (arg === '--latest-date') {
      options.latestDate = argv[index + 1]
      index += 1
    } else if (arg === '--prior-month-date') {
      options.priorMonthDate = argv[index + 1]
      index += 1
    } else if (arg === '--prior-year-date') {
      options.priorYearDate = argv[index + 1]
      index += 1
    } else if (arg === '--fixture-dir') {
      options.fixtureDir = argv[index + 1]
      index += 1
    } else if (arg === '--diff-report') {
      options.diffReport = argv[index + 1]
      index += 1
    } else {
      fail(`Unknown argument: ${arg}`)
    }
  }

  if (!['cbu-fx', 'siat-trade', 'siat-cpi', 'siat-gdp-annual'].includes(options.family)) {
    fail(`Unsupported Overview source family: ${options.family}`)
  }
  if (options.dryRun && options.writeSnapshot) fail('Use either --dry-run or --write-snapshot, not both.')
  if (!options.dryRun && !options.writeSnapshot) options.dryRun = true
  return options
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function fixtureFetchJson(fixtureDir) {
  return async (_url, requestedDate) => readJson(join(fixtureDir, `${requestedDate}.json`))
}

function siatFixtureFetchJson(fixtureDir) {
  return async (url) => {
    const urlBasename = basename(new URL(url).pathname)
    const primaryPath = join(fixtureDir, urlBasename)
    if (existsSync(primaryPath)) return readJson(primaryPath)

    if (urlBasename === 'sdmx_data_4585.json') {
      const discoveryFixturePath = join(fixtureDir, 'siat-cpi-all-items-mom-4585.json')
      if (existsSync(discoveryFixturePath)) return readJson(discoveryFixturePath)
    }
    if (urlBasename === 'sdmx_data_582.json') {
      const discoveryFixturePath = join(fixtureDir, 'siat-gdp-growth-annual-582.json')
      if (existsSync(discoveryFixturePath)) return readJson(discoveryFixturePath)
    }

    return readJson(primaryPath)
  }
}

function buildDiffReport(args, snapshotPath, result, manualRequired = null) {
  return {
    generated_at: new Date().toISOString(),
    family: args.family,
    snapshot: snapshotPath,
    changed: result.changed,
    status: result.snapshot.status,
    value_hash: result.value_hash,
    manual_required: manualRequired,
    diff: result.diff,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const snapshotPath = resolve(args.snapshot)
  const snapshot = readJson(snapshotPath)
  const siatFetchJson = args.fixtureDir ? siatFixtureFetchJson(resolve(args.fixtureDir)) : undefined
  let result
  let manualRequired = null

  try {
    let updates
    if (args.family === 'cbu-fx') {
      updates = await buildCbuFxMetricUpdates({
        latestDate: args.latestDate,
        priorMonthDate: args.priorMonthDate,
        priorYearDate: args.priorYearDate,
        fetchJson: args.fixtureDir ? fixtureFetchJson(resolve(args.fixtureDir)) : undefined,
      })
    } else if (args.family === 'siat-trade') {
      updates = await buildSiatTradeMetricUpdates({
        snapshot,
        fetchJson: siatFetchJson,
      })
    } else if (args.family === 'siat-cpi') {
      updates = await buildSiatCpiMetricUpdates({
        snapshot,
        fetchJson: siatFetchJson,
      })
    } else {
      updates = await buildSiatGdpAnnualMetricUpdates({
        snapshot,
        fetchJson: siatFetchJson,
      })
    }
    result = applyMetricUpdatesToSnapshot(snapshot, updates)
  } catch (error) {
    if (!isManualRequiredError(error)) throw error
    manualRequired = {
      reason: error.reason ?? error.message,
      details: error.details ?? {},
    }
    result = {
      snapshot,
      diff: [],
      changed: false,
      value_hash: snapshot.value_hash,
    }
  }

  if (manualRequired) {
    console.log(`manual_required: ${manualRequired.reason}`)
    console.log(JSON.stringify(manualRequired.details))
  } else {
    console.log(formatDiffReport(result.diff))
  }
  console.log(`status: ${result.snapshot.status}`)
  console.log(`value_hash: ${result.value_hash}`)

  if (args.writeSnapshot) {
    const diffReportPath = resolve(args.diffReport ?? join(dirname(snapshotPath), 'overview_source_snapshot.diff_report.json'))
    if (result.changed) {
      writeFileSync(snapshotPath, `${JSON.stringify(result.snapshot, null, 2)}\n`, 'utf8')
      console.log(`Wrote source snapshot: ${snapshotPath}`)
    } else {
      console.log(`No source snapshot changes written: ${snapshotPath}`)
    }
    writeFileSync(diffReportPath, `${JSON.stringify(buildDiffReport(args, snapshotPath, result, manualRequired), null, 2)}\n`, 'utf8')
    console.log(`Wrote diff report: ${diffReportPath}`)
  } else {
    console.log('Dry run only; source snapshot and public overview.json were not written.')
  }
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
