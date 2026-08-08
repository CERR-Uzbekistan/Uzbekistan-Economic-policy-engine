import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { validateCgeBridgePayload } from '../../../src/data/bridge/cge-guard.js'
import type { CgeBridgePayload, CgeResults } from '../../../src/data/bridge/cge-types.js'
import { CgeSolverError, runCgeScenario } from '../../../src/data/scenario-lab/cge-solver.js'

const ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/cge.json', import.meta.url))

function loadPayload(): CgeBridgePayload {
  const validation = validateCgeBridgePayload(JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8')))
  assert.ok(validation.value)
  return validation.value
}

describe('CGE scenario solver', () => {
  it('reproduces the calibrated base and accounting identities', () => {
    const payload = loadPayload()
    const controls = payload.presets.find((entry) => entry.preset_id === 'baseline')!.controls
    const result = runCgeScenario(payload, controls)

    assert.equal(result.solver.converged, true)
    assert.ok(Object.values(result.changes_from_base).every((value) => Math.abs(value) < 0.001))
    assert.ok(Object.values(result.accounting_residuals).every((value) => Math.abs(value) < 1e-8))
  })

  it('reproduces the world import-price source benchmark', () => {
    const payload = loadPayload()
    const controls = payload.presets.find((entry) => entry.preset_id === 'world_import_price_benchmark')!.controls
    const benchmark = payload.benchmarks.find((entry) => entry.benchmark_id === 'energy_world_import_price')!
    const result = runCgeScenario(payload, controls)

    Object.entries(benchmark.expected_results).forEach(([key, expected]) => {
      const actual = result.results[key as keyof CgeResults]
      assert.ok(Math.abs(actual - expected!) <= benchmark.tolerance)
    })
  })

  it('enforces the approved public control bounds', () => {
    const payload = loadPayload()
    const controls = structuredClone(payload.presets[0].controls)
    controls.world_import_price_change_pct = 100

    assert.throws(() => runCgeScenario(payload, controls), CgeSolverError)
  })

  it('returns aggregate comparative-static outputs without forbidden claims', () => {
    const payload = loadPayload()
    const result = runCgeScenario(payload, payload.presets[2].controls)
    const serialized = JSON.stringify(result).toLowerCase()

    assert.ok('E_pct_change' in result.changes_from_base)
    assert.ok('TAX_pct_change' in result.changes_from_base)
    assert.doesNotMatch(serialized, /gdp_growth|sector_results|employment|uzs_usd/)
  })
})