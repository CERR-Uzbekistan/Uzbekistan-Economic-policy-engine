import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const snapshotPath = resolve(repoRoot, 'scripts', 'overview', 'overview_source_snapshot.json')
const diffReportPath = resolve(repoRoot, 'scripts', 'overview', 'overview_source_snapshot.diff_report.json')
const fetchScriptPath = resolve(repoRoot, 'scripts', 'overview', 'fetch-overview-sources.mjs')
const families = ['cbu-fx', 'siat-trade', 'siat-cpi', 'siat-gdp-annual']

function fail(message) {
  console.error(message)
  process.exit(1)
}

function parseArgs(argv) {
  const args = { _: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = argv[index + 1]
      if (value === undefined || value.startsWith('--')) fail(`Missing value for ${arg}`)
      args[key] = value
      index += 1
    } else {
      args._.push(arg)
    }
  }
  return args
}

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function appendResult(resultsPath, result) {
  const results = readJson(resultsPath, [])
  results.push(result)
  writeJson(resultsPath, results)
}

function truncateText(text, maxLength = 4000) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}\n[truncated]`
}

function resultFromReport(family, report, output) {
  const manualRequired = report?.manual_required ?? null
  let outcome = 'no_change'
  if (manualRequired) outcome = 'manual_required'
  else if (report?.changed) outcome = 'changed'

  return {
    family,
    outcome,
    changed: Boolean(report?.changed),
    status: report?.status ?? null,
    value_hash: report?.value_hash ?? null,
    manual_required: manualRequired,
    diff: Array.isArray(report?.diff) ? report.diff : [],
    output: truncateText(output),
  }
}

function runFamily(args) {
  const family = args.family
  if (!families.includes(family)) fail(`Unsupported family: ${family}`)
  if (!args.results) fail('Missing --results')

  console.log(`Running Overview source family: ${family}`)
  const run = spawnSync(process.execPath, [
    fetchScriptPath,
    '--write-snapshot',
    '--family',
    family,
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`
  if (output.trim()) console.log(output.trimEnd())

  if (run.status === 0) {
    const report = readJson(diffReportPath, null)
    appendResult(args.results, resultFromReport(family, report, output))
    return
  }

  appendResult(args.results, {
    family,
    outcome: 'error',
    changed: false,
    status: null,
    value_hash: null,
    manual_required: null,
    diff: [],
    error: {
      exit_code: run.status,
      signal: run.signal,
      message: truncateText(output.trim() || `Family ${family} failed without output.`),
    },
  })
}

function formatValue(value) {
  if (value === null || value === undefined) return '`null`'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return `\`${String(value)}\``
  }
  return `\`${JSON.stringify(value)}\``
}

function diffLine(entry) {
  return `- \`${entry.metric_id}.${entry.field}\`: ${formatValue(entry.old_value)} -> ${formatValue(entry.new_value)}`
}

function summarizeResult(result) {
  if (result.outcome === 'error') return 'error'
  if (result.outcome === 'manual_required') return `manual_required: ${result.manual_required?.reason ?? 'review required'}`
  if (result.outcome === 'changed') return `changed (${result.diff.length} field${result.diff.length === 1 ? '' : 's'})`
  return 'no change'
}

function buildAggregateReport(results, snapshot) {
  const allDiffs = results.flatMap((result) => result.diff ?? [])
  const manualRequired = results
    .filter((result) => result.manual_required)
    .map((result) => ({
      family: result.family,
      ...result.manual_required,
    }))
  const errors = results
    .filter((result) => result.outcome === 'error')
    .map((result) => ({
      family: result.family,
      ...result.error,
    }))

  return {
    generated_at: new Date().toISOString(),
    family: 'overview-source-refresh',
    families: results.map((result) => ({
      family: result.family,
      outcome: result.outcome,
      changed: Boolean(result.changed),
      status: result.status,
      value_hash: result.value_hash,
      manual_required: result.manual_required,
      error: result.error ?? null,
      changed_fields: (result.diff ?? []).map((entry) => `${entry.metric_id}.${entry.field}`),
    })),
    snapshot: snapshotPath,
    changed: results.some((result) => result.changed),
    status: snapshot.status,
    value_hash: snapshot.value_hash,
    manual_required: manualRequired.length > 0 ? manualRequired : null,
    family_errors: errors.length > 0 ? errors : null,
    diff: allDiffs,
  }
}

function hasMeaningfulRunOutput(results) {
  return results.some((result) => result.changed || result.manual_required || result.outcome === 'error')
}

function buildPrBody(report, results) {
  const lines = [
    '## Owner Action Required',
    '',
    'Review the source snapshot changes, resolve any manual-required items or family errors, and accept/export in a separate owner commit only after review.',
    '',
    `- Current snapshot status: \`${report.status ?? 'unknown'}\``,
    `- New value_hash: \`${report.value_hash ?? 'missing'}\``,
    '',
    'This PR does not publish apps/policy-ui/public/data/overview.json. Owner acceptance/export is a separate commit.',
    '',
    '## Family Results',
    '',
    '| Family | Result |',
    '| --- | --- |',
    ...results.map((result) => `| \`${result.family}\` | ${summarizeResult(result)} |`),
    '',
  ]

  if (report.manual_required) {
    lines.push('## manual_required', '')
    for (const item of report.manual_required) {
      lines.push(`- \`${item.family}\`: ${item.reason ?? 'review required'}`)
      if (item.details && Object.keys(item.details).length > 0) {
        lines.push(`  - details: \`${JSON.stringify(item.details)}\``)
      }
    }
    lines.push('')
  }

  if (report.family_errors) {
    lines.push('## Family Errors', '')
    for (const item of report.family_errors) {
      lines.push(`- \`${item.family}\`: exit ${item.exit_code ?? 'unknown'}`)
      if (item.message) lines.push('')
      if (item.message) lines.push('```text', item.message, '```', '')
    }
  }

  lines.push('## Changed Metric Fields', '')
  if (Array.isArray(report.diff) && report.diff.length > 0) {
    lines.push(...report.diff.map(diffLine))
  } else {
    lines.push('- No metric field changes in this run.')
  }
  lines.push('')

  return `${lines.join('\n')}\n`
}

function buildSummary(report, results, prOperation = 'pending', prUrl = '') {
  const manual = results.filter((result) => result.manual_required)
  const errors = results.filter((result) => result.outcome === 'error')
  const changedCount = results.filter((result) => result.changed).length
  const lines = [
    '## Overview Source Refresh',
    '',
    `- Families run: ${results.map((result) => `\`${result.family}\``).join(', ') || 'none'}`,
    `- Changed/no change: ${changedCount} changed, ${results.length - changedCount} without metric changes`,
    `- Snapshot status: \`${report.status ?? 'unknown'}\``,
    `- value_hash: \`${report.value_hash ?? 'missing'}\``,
    `- PR result: ${prOperation}${prUrl ? ` (${prUrl})` : ''}`,
    '',
    '### Family Results',
    '',
    '| Family | Result |',
    '| --- | --- |',
    ...results.map((result) => `| \`${result.family}\` | ${summarizeResult(result)} |`),
    '',
    '### manual_required Outcomes',
    '',
  ]

  if (manual.length === 0) lines.push('- None')
  else lines.push(...manual.map((result) => `- \`${result.family}\`: ${result.manual_required?.reason ?? 'review required'}`))

  lines.push('', '### Family Errors', '')
  if (errors.length === 0) lines.push('- None')
  else lines.push(...errors.map((result) => `- \`${result.family}\`: ${result.error?.message ?? 'error'}`))
  lines.push('')

  return `${lines.join('\n')}\n`
}

function finalize(args) {
  if (!args.results) fail('Missing --results')
  if (!args.body) fail('Missing --body')
  if (!args.summary) fail('Missing --summary')

  const results = readJson(args.results, [])
  const snapshot = readJson(snapshotPath, {})
  const report = buildAggregateReport(results, snapshot)

  if (hasMeaningfulRunOutput(results)) {
    writeJson(diffReportPath, report)
  } else if (args['original-diff-report'] && existsSync(args['original-diff-report'])) {
    writeFileSync(diffReportPath, readFileSync(args['original-diff-report'], 'utf8'), 'utf8')
  }

  writeFileSync(args.body, buildPrBody(report, results), 'utf8')
  writeFileSync(args.summary, buildSummary(report, results), 'utf8')
}

function appendPrResult(args) {
  if (!args.summary) fail('Missing --summary')
  const results = readJson(args.results, [])
  const snapshot = readJson(snapshotPath, {})
  const report = buildAggregateReport(results, snapshot)
  const operation = args.operation || 'no-op'
  const url = args.url || ''
  writeFileSync(args.summary, buildSummary(report, results, operation, url), 'utf8')
}

function failIfFamilyErrors(args) {
  if (!args.results) fail('Missing --results')
  const errors = readJson(args.results, []).filter((result) => result.outcome === 'error')
  if (errors.length === 0) return
  for (const error of errors) {
    console.error(`${error.family}: ${error.error?.message ?? 'family failed'}`)
  }
  process.exit(1)
}

const args = parseArgs(process.argv.slice(2))
const command = args._[0]

if (command === 'run-family') runFamily(args)
else if (command === 'finalize') finalize(args)
else if (command === 'append-pr-result') appendPrResult(args)
else if (command === 'fail-if-family-errors') failIfFamilyErrors(args)
else fail(`Unknown command: ${command ?? '(missing)'}`)
