import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { validateCgeBridgePayload } from '../../../src/data/bridge/cge-guard.js'
import type { CgeBridgePayload } from '../../../src/data/bridge/cge-types.js'

const ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/cge.json', import.meta.url))

function loadArtifact(): CgeBridgePayload {
  return JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8')) as CgeBridgePayload
}

describe('CGE public artifact', () => {
  it('accepts the checked-in experimental reference artifact', () => {
    const validation = validateCgeBridgePayload(loadArtifact())

    assert.equal(validation.ok, true)
    assert.ok(validation.value)
    assert.equal(validation.value.metadata.approval_status, 'not_model_owner_approved')
    assert.equal(validation.value.controls.length, 4)
    assert.equal(validation.value.benchmarks.length, 2)
    assert.ok(validation.value.benchmarks.every((entry) => entry.max_abs_error <= entry.tolerance))
    assert.ok(validation.value.excluded_sources.some((entry) => /28\.01\.2024/.test(entry.source_file)))
  })

  it('rejects public fields outside the aggregate CGE boundary', () => {
    const invalid = structuredClone(loadArtifact()) as CgeBridgePayload & {
      metadata: CgeBridgePayload['metadata'] & { gdp_growth?: number }
    }
    invalid.metadata.gdp_growth = 6.2

    const validation = validateCgeBridgePayload(invalid)

    assert.equal(validation.ok, false)
    assert.ok(validation.issues.some((issue) => issue.path.endsWith('.gdp_growth')))
  })

  it('rejects benchmark evidence that exceeds tolerance', () => {
    const invalid = structuredClone(loadArtifact())
    invalid.benchmarks[0].max_abs_error = invalid.benchmarks[0].tolerance * 2

    const validation = validateCgeBridgePayload(invalid)

    assert.equal(validation.ok, false)
    assert.ok(validation.issues.some((issue) => issue.path === 'benchmarks[0]'))
  })
})