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
