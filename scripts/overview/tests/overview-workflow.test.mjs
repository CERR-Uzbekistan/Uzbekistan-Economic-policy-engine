import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(testDir, '..', '..', '..')
const workflowScriptPath = join(repoRoot, 'scripts', 'overview', 'overview-source-refresh-workflow.mjs')

function tempJson(name, value) {
  const path = join(mkdtempSync(join(tmpdir(), 'overview-workflow-')), name)
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  return path
}

test('automatic public export gate blocks promotion when any source family requires manual review', () => {
  const resultsPath = tempJson('family-results.json', [
    {
      family: 'siat-trade',
      outcome: 'manual_required',
      changed: false,
      manual_required: {
        reason: 'siat_trade_missing_machine_readable_metadata',
      },
      diff: [],
    },
  ])

  const result = spawnSync(
    process.execPath,
    [
      workflowScriptPath,
      'verify-public-export-ready',
      '--results',
      resultsPath,
    ],
    { cwd: repoRoot, encoding: 'utf8' },
  )

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /siat_trade_missing_machine_readable_metadata/)
  assert.match(result.stderr, /public export blocked/i)
  assert.doesNotMatch(result.stdout, /Overview public export ready/)
})

test('partial gate rejects incomplete family results rather than treating missing checks as healthy', () => {
  const path = tempJson('results.json', [{ family: 'cbu-fx', outcome: 'changed', status: 'source_verified_for_public_artifact' }])
  const result = spawnSync(process.execPath, [workflowScriptPath, 'verify-public-export-ready', '--results', path, '--allow-partial', 'true'], { cwd: repoRoot, encoding: 'utf8' })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /exactly one result/)
})

test('partial gate retains a failing family and admits independently validated changes with a degraded warning', () => {
  const path = tempJson('results.json', ['cbu-fx', 'siat-trade', 'siat-cpi', 'siat-gdp-annual', 'world-bank-gold'].map(family => family === 'siat-cpi'
    ? { family, outcome: 'manual_required', manual_required: { reason: 'source_older' } }
    : { family, outcome: family === 'cbu-fx' ? 'changed' : 'no_change', status: 'source_verified_for_public_artifact' }))
  const result = spawnSync(process.execPath, [workflowScriptPath, 'verify-public-export-ready', '--results', path, '--allow-partial', 'true'], { cwd: repoRoot, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stderr, /DEGRADED.*siat-cpi.*retained unchanged/)
})

test('partial gate fails when every attempted change is unavailable', () => {
  const path = tempJson('results.json', ['cbu-fx', 'siat-trade', 'siat-cpi', 'siat-gdp-annual', 'world-bank-gold'].map(family => ({ family, outcome: 'error', error: { message: 'offline' } })))
  const result = spawnSync(process.execPath, [workflowScriptPath, 'verify-public-export-ready', '--results', path, '--allow-partial', 'true'], { cwd: repoRoot, encoding: 'utf8' })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /no independently validated/)
})
