import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  runScenarioLabIoDemandShock,
  toScenarioLabIoAnalyticsWorkspace,
} from '../../../src/data/adapters/scenario-lab-io-analytics.js'
import { validateIoBridgePayload } from '../../../src/data/bridge/io-guard.js'
import type { IoBridgePayload } from '../../../src/data/bridge/io-types.js'

const IO_PUBLIC_ARTIFACT_PATH = fileURLToPath(new URL('../../../../public/data/io.json', import.meta.url))

function loadValidIoPayload(): IoBridgePayload {
  const validation = validateIoBridgePayload(JSON.parse(readFileSync(IO_PUBLIC_ARTIFACT_PATH, 'utf8')))
  assert.ok(validation.value)
  return validation.value
}

describe('scenario lab IO analytics adapter', () => {
  it('maps the public IO bridge into Scenario Lab analytics workspace data', () => {
    const workspace = toScenarioLabIoAnalyticsWorkspace(loadValidIoPayload())

    assert.equal(workspace.sector_count, 136)
    assert.equal(workspace.data_vintage, '2022')
    assert.equal(workspace.sectors.length, 136)
    assert.equal(
      workspace.caveats.some((caveat) => caveat.includes('Employment effects use sector employment arrays')),
      true,
    )
  })

  it('runs a final-demand shock and returns ranked sector effects without employment overclaiming', () => {
    const result = runScenarioLabIoDemandShock(loadValidIoPayload(), {
      demand_bucket: 'export',
      amount: 1000,
      currency: 'bln_uzs',
      distribution: 'output',
    })

    assert.equal(result.totals.demand_shock_bln_uzs, 1000)
    assert.equal(typeof result.totals.output_effect_bln_uzs, 'number')
    assert.equal(result.totals.output_effect_bln_uzs > 1000, true)
    assert.equal(result.totals.value_added_effect_bln_uzs > 0, true)
    assert.equal(
      result.totals.gdp_accounting_contribution_bln_uzs,
      result.totals.value_added_effect_bln_uzs,
    )
    assert.equal(result.totals.aggregate_output_multiplier !== null, true)
    assert.equal(typeof result.totals.employment_effect_persons, 'number')
    assert.equal((result.totals.employment_effect_persons ?? 0) > 0, true)
    assert.equal(result.top_sectors.length, 10)
    assert.equal(typeof result.top_sectors[0].employment_effect_persons, 'number')
    assert.equal(
      Math.abs(result.top_sectors[0].output_effect_bln_uzs) >=
        Math.abs(result.top_sectors[1].output_effect_bln_uzs),
      true,
    )
  })

  it('converts million USD shocks through the supplied FX assumption', () => {
    const result = runScenarioLabIoDemandShock(loadValidIoPayload(), {
      demand_bucket: 'export',
      amount: 100,
      currency: 'mln_usd',
      exchange_rate_uzs_per_usd: 12_500,
      distribution: 'equal',
    })

    assert.equal(result.totals.input_shock, 100)
    assert.equal(result.totals.input_currency, 'mln_usd')
    assert.equal(result.totals.demand_shock_bln_uzs, 1250)
    assert.equal(result.totals.output_effect_bln_uzs > 1250, true)
  })
})
