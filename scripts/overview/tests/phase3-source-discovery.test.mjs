import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(testDir, '..', '..', '..')
const reportPath = join(repoRoot, 'docs', 'overview', 'phase3-source-discovery.md')
const fixtureRoot = join(repoRoot, 'scripts', 'overview', 'source-discovery', 'phase3')

const targetMetrics = [
  'real_gdp_growth_annual_yoy',
  'real_gdp_growth_quarter_yoy',
  'cpi_yoy',
  'cpi_mom',
  'food_cpi_yoy',
  'policy_rate',
]

const lockedPaths = [
  'scripts/overview/export-overview.mjs',
  'apps/policy-ui/public/data/overview.json',
]

function sectionFor(report, metricId) {
  const sectionPattern = new RegExp(`### ${metricId}\\n([\\s\\S]*?)(?=\\n### |\\n## |$)`)
  return report.match(sectionPattern)?.[1] ?? ''
}

function candidateBlocks(section) {
  return section.split(/\n(?=candidate_source:|secondary_candidate_source:|rejected_candidate_source:)/)
}

test('Phase 3a source discovery report exists and covers every target metric', () => {
  assert.equal(existsSync(reportPath), true)
  const report = readFileSync(reportPath, 'utf8')

  for (const metricId of targetMetrics) {
    const section = sectionFor(report, metricId)
    assert.ok(section.includes(`metric_id: ${metricId}`), `${metricId} must have a metric section`)
    assert.match(section, /current_snapshot_value_period:/, `${metricId} must include current snapshot context`)
    assert.match(section, /candidate_source:/, `${metricId} must include at least one candidate source`)
  }
})

test('every automatable candidate references a saved source fixture', () => {
  const report = readFileSync(reportPath, 'utf8')

  for (const metricId of targetMetrics) {
    for (const block of candidateBlocks(sectionFor(report, metricId))) {
      if (!/recommendation: automatable/.test(block)) continue

      const fixturePath = block.match(/sample_fixture: `([^`]+)`/)?.[1]
      assert.ok(fixturePath, `${metricId} automatable candidate must include sample_fixture`)
      assert.ok(fixturePath.startsWith('scripts/overview/source-discovery/phase3/'))
      assert.equal(existsSync(join(repoRoot, fixturePath)), true, `${fixturePath} must exist`)
    }
  }

  assert.equal(existsSync(fixtureRoot), true)
})

test('every manual-required metric has a reason and candidate source reference', () => {
  const report = readFileSync(reportPath, 'utf8')

  for (const metricId of targetMetrics) {
    const section = sectionFor(report, metricId)
    if (!/recommendation: manual_required_only/.test(section)) continue

    assert.match(section, /manual_required_reason:/, `${metricId} manual-required candidate must include a reason`)
    assert.match(section, /source_url: `[^`]+`/, `${metricId} manual-required candidate must include source URL`)
  }
})

test('Phase 3a discovery leaves exporter and public artifacts unchanged', () => {
  const diff = spawnSync(
    'git',
    ['diff', '--name-only', '--', ...lockedPaths],
    { cwd: repoRoot, encoding: 'utf8' },
  )
  assert.equal(diff.status, 0, diff.stderr)
  assert.equal(diff.stdout.trim(), '')

  const stagedDiff = spawnSync(
    'git',
    ['diff', '--cached', '--name-only', '--', ...lockedPaths],
    { cwd: repoRoot, encoding: 'utf8' },
  )
  assert.equal(stagedDiff.status, 0, stagedDiff.stderr)
  assert.equal(stagedDiff.stdout.trim(), '')
})
