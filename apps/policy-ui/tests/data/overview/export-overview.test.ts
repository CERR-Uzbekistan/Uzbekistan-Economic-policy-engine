import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { validateOverviewArtifact } from '../../../src/data/overview/artifact-guard.js'
import {
  OVERVIEW_LOCKED_METRICS,
  OVERVIEW_TOP_CARD_METRIC_IDS,
  type OverviewArtifact,
} from '../../../src/data/overview/artifact-types.js'

const repoRoot = resolve(process.cwd(), '..', '..')
const exporterPath = join(repoRoot, 'scripts', 'overview', 'export-overview.mjs')
const sourceSnapshotPath = join(repoRoot, 'scripts', 'overview', 'overview_source_snapshot.json')
const publicOverviewArtifactPath = join(repoRoot, 'apps', 'policy-ui', 'public', 'data', 'overview.json')
const fixedExportedAt = '2026-07-17T09:32:00Z'
const freshnessWarningMetricIds = [
  'gdp_nowcast_current_quarter',
  'reer_level',
  'gold_price_forecast',
]

function tempPath(name: string): string {
  return join(mkdtempSync(join(tmpdir(), 'overview-export-')), name)
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function buildVerifiedFixturePath(): string {
  const source = readJson(sourceSnapshotPath) as Record<string, unknown>
  const fixture: Record<string, unknown> = {
    ...source,
    status: 'owner_verified_for_public_artifact',
    snapshot_accepted_by: 'test-owner',
    snapshot_accepted_at: '2026-04-27T00:00:00Z',
  }
  delete fixture.draft_note
  const fixturePath = tempPath('verified-overview-source.json')
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8')
  return fixturePath
}

function buildDraftFixturePath(): string {
  const source = readJson(sourceSnapshotPath) as Record<string, unknown>
  const fixture: Record<string, unknown> = {
    ...source,
    status: 'draft_not_for_public_artifact',
  }
  delete fixture.snapshot_accepted_by
  delete fixture.snapshot_accepted_at
  const fixturePath = tempPath('draft-overview-source.json')
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8')
  return fixturePath
}

function buildSourceVerifiedFixturePath(): string {
  const source = readJson(sourceSnapshotPath) as Record<string, unknown>
  const fixture: Record<string, unknown> = {
    ...source,
    status: 'source_verified_for_public_artifact',
    source_verified_by: 'github-actions[bot]',
    source_verified_at: '2026-04-27T00:00:00Z',
  }
  delete fixture.snapshot_accepted_by
  delete fixture.snapshot_accepted_at
  const fixturePath = tempPath('source-verified-overview-source.json')
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8')
  return fixturePath
}

function buildAutomationPendingFixturePath(): string {
  const source = readJson(sourceSnapshotPath) as Record<string, unknown>
  const fixture: Record<string, unknown> = {
    ...source,
    status: 'automation_pending_owner_review',
  }
  delete fixture.snapshot_accepted_by
  delete fixture.snapshot_accepted_at
  const fixturePath = tempPath('automation-pending-overview-source.json')
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8')
  return fixturePath
}

function runExporter(options: {
  sourcePath?: string
  outputPath?: string
  exportedAt?: string
}) {
  const outputPath = options.outputPath ?? tempPath('overview.json')
  const result = spawnSync(
    process.execPath,
    [exporterPath, '--exported-at', options.exportedAt ?? fixedExportedAt],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        OVERVIEW_EXPORTER_FORCE_COMPILED: '1',
        OVERVIEW_SOURCE_SNAPSHOT_PATH: options.sourcePath ?? buildVerifiedFixturePath(),
        OVERVIEW_OUTPUT_PATH: outputPath,
      },
      encoding: 'utf8',
    },
  )
  return { ...result, outputPath }
}

describe('overview exporter', () => {
  it('commits a production overview.json artifact that passes the Overview UI guard', () => {
    assert.equal(existsSync(publicOverviewArtifactPath), true)

    const artifact = readJson(publicOverviewArtifactPath) as OverviewArtifact
    const validation = validateOverviewArtifact(artifact)
    assert.equal(validation.ok, true)
    assert.equal(artifact.validation_status, 'warning')
  })

  it('refuses to export a draft source snapshot', () => {
    const result = runExporter({ sourcePath: buildDraftFixturePath() })

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /draft_not_for_public_artifact/)
  })

  it('refuses to export an automation-pending source snapshot', () => {
    const result = runExporter({ sourcePath: buildAutomationPendingFixturePath() })

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /automation_pending_owner_review/)
    assert.equal(existsSync(result.outputPath), false)
  })

  it('allows source-verified official snapshots for automatic public export', () => {
    const result = runExporter({ sourcePath: buildSourceVerifiedFixturePath() })

    assert.equal(result.status, 0, result.stderr)
    assert.equal(existsSync(result.outputPath), true)
    const artifact = readJson(result.outputPath) as OverviewArtifact
    assert.equal(validateOverviewArtifact(artifact).ok, true)
  })

  it('refuses owner-verified snapshots when value_hash no longer matches values or provenance', () => {
    const source = readJson(buildVerifiedFixturePath()) as {
      value_hash: string
      metrics: Array<{ metric_id: string; value: number }>
    }
    const fxLevel = source.metrics.find((metric) => metric.metric_id === 'usd_uzs_level')
    assert.ok(fxLevel)
    fxLevel.value += 1
    const badSourcePath = tempPath('stale-value-hash.json')
    writeFileSync(badSourcePath, `${JSON.stringify(source, null, 2)}\n`, 'utf8')

    const result = runExporter({ sourcePath: badSourcePath })

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /value_hash/)
  })

  it('writes a deterministic artifact that passes the Overview UI guard', () => {
    const first = runExporter({})
    const second = runExporter({})

    assert.equal(first.status, 0, first.stderr)
    assert.equal(second.status, 0, second.stderr)
    assert.equal(readFileSync(first.outputPath, 'utf8'), readFileSync(second.outputPath, 'utf8'))

    const artifact = readJson(first.outputPath) as OverviewArtifact
    const validation = validateOverviewArtifact(artifact)
    assert.equal(validation.ok, true)
    assert.equal(artifact.exported_at, fixedExportedAt)
    assert.equal(artifact.generated_by, 'scripts/overview/export-overview.mjs')
    assert.equal(artifact.validation_status, 'warning')
    assert.deepEqual(
      artifact.metrics.map((metric) => metric.id),
      OVERVIEW_LOCKED_METRICS.map((metric) => metric.id),
    )
  })

  it('keeps the top-card subset and order aligned with the Overview lock', () => {
    const result = runExporter({})
    assert.equal(result.status, 0, result.stderr)

    const artifact = readJson(result.outputPath) as OverviewArtifact
    const eligibleTopCardIds = OVERVIEW_TOP_CARD_METRIC_IDS.filter((metricId) => {
      const metric = artifact.metrics.find((entry) => entry.id === metricId)
      return metric?.validation_status === 'valid' && metric.freshness.status === 'current'
    })

    assert.deepEqual(
      artifact.metrics.filter((metric) => metric.top_card).map((metric) => metric.id),
      eligibleTopCardIds,
    )
    assert.deepEqual(
      artifact.metrics
        .filter((metric) => metric.top_card)
        .map((metric) => metric.top_card_order),
      eligibleTopCardIds.map((_, index) => index + 1),
    )
  })

  it('keeps unresolved or old metrics out of current headline use', () => {
    const result = runExporter({})
    assert.equal(result.status, 0, result.stderr)

    const artifact = readJson(result.outputPath) as OverviewArtifact
    for (const metricId of freshnessWarningMetricIds) {
      const metric = artifact.metrics.find((entry) => entry.id === metricId)
      assert.notEqual(metric?.freshness.status, 'current')
      assert.notEqual(metric?.top_card, true)
    }

    const nowcast = artifact.metrics.find((entry) => entry.id === 'gdp_nowcast_current_quarter')
    assert.equal(nowcast?.validation_status, 'warning')
    assert.ok(nowcast?.warnings.length)

    const reer = artifact.metrics.find((entry) => entry.id === 'reer_level')
    assert.equal(reer?.source_label, 'CERR, REER')
    assert.equal(reer?.validation_status, 'warning')
    assert.match(reer?.warnings.join(' '), /Source URL is pending/)
  })

  it('fails export when a locked metric is missing', () => {
    const source = readJson(buildVerifiedFixturePath()) as {
      metrics: Array<{ metric_id: string }>
    }
    source.metrics = source.metrics.filter((metric) => metric.metric_id !== 'gold_price_forecast')
    const badSourcePath = tempPath('missing-metric.json')
    writeFileSync(badSourcePath, `${JSON.stringify(source, null, 2)}\n`, 'utf8')

    const result = runExporter({ sourcePath: badSourcePath })

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Missing locked metric id gold_price_forecast/)
  })

  it('fails export when source snapshot metadata conflicts with the locked metric contract', () => {
    const source = readJson(buildVerifiedFixturePath()) as {
      metrics: Array<{ metric_id: string; claim_type: string }>
    }
    const cpi = source.metrics.find((metric) => metric.metric_id === 'cpi_yoy')
    assert.ok(cpi)
    cpi.claim_type = 'reference'
    const badSourcePath = tempPath('invalid-source.json')
    writeFileSync(badSourcePath, `${JSON.stringify(source, null, 2)}\n`, 'utf8')

    const result = runExporter({ sourcePath: badSourcePath })

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /claim_type must be observed/)
  })
})
