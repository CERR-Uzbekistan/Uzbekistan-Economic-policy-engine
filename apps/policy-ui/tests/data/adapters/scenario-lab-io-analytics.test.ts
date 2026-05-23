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
    assert.equal(workspace.audit.ok, true)
    assert.equal(workspace.audit.failed, 0)
    assert.equal(
      workspace.audit.checks.some((check) => check.id === 'coefficient-bounds'),
      true,
    )
    assert.equal(
      workspace.audit.checks.some((check) => check.id === 'final-demand-coverage'),
      true,
    )
    assert.equal(
      workspace.caveats.some((caveat) => caveat.includes('Employment effects use sector employment arrays generated from the Employment.xlsx source workbook')),
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
    assert.equal(result.totals.import_content_effect_bln_uzs > 0, true)
    assert.equal(result.totals.domestic_resource_effect_bln_uzs > 0, true)
    assert.equal(result.totals.weighted_import_share > 0 && result.totals.weighted_import_share < 1, true)
    assert.equal(
      Math.abs(
        result.totals.output_effect_bln_uzs -
          result.totals.import_content_effect_bln_uzs -
          result.totals.domestic_resource_effect_bln_uzs,
      ) < 0.01,
      true,
    )
    assert.equal(
      result.totals.gdp_accounting_contribution_bln_uzs,
      result.totals.value_added_effect_bln_uzs,
    )
    assert.equal(result.totals.aggregate_output_multiplier !== null, true)
    assert.equal(result.totals.output_effect_bln_uzs < 3_000, true)
    assert.equal(result.totals.value_added_effect_bln_uzs < 1_500, true)
    assert.equal(typeof result.totals.employment_effect_persons, 'number')
    assert.equal((result.totals.employment_effect_persons ?? 0) > 0, true)
    assert.equal(result.top_sectors.length, 10)
    assert.equal(result.sensitivity?.allocation_modes.length, 3)
    assert.equal(result.sensitivity?.parameter_ranges.length, 9)
    assert.equal(
      typeof result.sensitivity?.allocation_modes[0].import_content_effect_bln_uzs,
      'number',
    )
    assert.equal(typeof result.top_sectors[0].employment_effect_persons, 'number')
    assert.equal(
      Math.abs(
        result.top_sectors[0].output_effect_bln_uzs -
          result.top_sectors[0].import_content_effect_bln_uzs -
          result.top_sectors[0].domestic_resource_effect_bln_uzs,
      ) < 0.01,
      true,
    )
    assert.equal(
      Math.abs(result.top_sectors[0].output_effect_bln_uzs) >=
        Math.abs(result.top_sectors[1].output_effect_bln_uzs),
      true,
    )
  })

  it('keeps the I-O monetary scale in billion UZS for displayed totals', () => {
    const result = runScenarioLabIoDemandShock(loadValidIoPayload(), {
      demand_bucket: 'export',
      amount: 1000,
      currency: 'bln_uzs',
      distribution: 'final_demand',
    })

    assert.equal(result.totals.demand_shock_bln_uzs, 1000)
    assert.equal(result.totals.aggregate_output_multiplier, 1.627)
    assert.equal(result.totals.output_effect_bln_uzs, 1626.991)
    assert.equal(result.totals.value_added_effect_bln_uzs, 654.768)
    assert.equal(result.top_sectors[0].sector_code, 'C24.4')
    assert.equal(result.top_sectors[0].value_added_effect_bln_uzs, 154.947)
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

  it('uses selected final-demand shares when the allocation mode is final demand', () => {
    const payload = loadValidIoPayload()
    const exportShock = runScenarioLabIoDemandShock(payload, {
      demand_bucket: 'export',
      amount: 1000,
      currency: 'bln_uzs',
      distribution: 'final_demand',
    })
    const consumptionShock = runScenarioLabIoDemandShock(payload, {
      demand_bucket: 'consumption',
      amount: 1000,
      currency: 'bln_uzs',
      distribution: 'final_demand',
    })

    assert.equal(exportShock.request.distribution, 'final_demand')
    assert.equal(consumptionShock.request.distribution, 'final_demand')
    assert.notDeepEqual(
      exportShock.top_sectors.slice(0, 3).map((sector) => sector.sector_code),
      consumptionShock.top_sectors.slice(0, 3).map((sector) => sector.sector_code),
    )
  })

  it('scales 1 bln UZS shocks proportionally and keeps sector rankings deterministic', () => {
    const payload = loadValidIoPayload()
    const oneBlnShock = runScenarioLabIoDemandShock(payload, {
      demand_bucket: 'export',
      amount: 1,
      currency: 'bln_uzs',
      distribution: 'final_demand',
    })
    const thousandBlnShock = runScenarioLabIoDemandShock(payload, {
      demand_bucket: 'export',
      amount: 1000,
      currency: 'bln_uzs',
      distribution: 'final_demand',
    })
    const repeatedShock = runScenarioLabIoDemandShock(payload, {
      demand_bucket: 'export',
      amount: 1000,
      currency: 'bln_uzs',
      distribution: 'final_demand',
    })

    assert.equal(
      Math.abs(thousandBlnShock.totals.output_effect_bln_uzs - oneBlnShock.totals.output_effect_bln_uzs * 1000) <
        0.1,
      true,
    )
    assert.equal(
      Math.abs(
        thousandBlnShock.totals.value_added_effect_bln_uzs -
          oneBlnShock.totals.value_added_effect_bln_uzs * 1000,
      ) < 0.5,
      true,
    )
    assert.deepEqual(
      thousandBlnShock.top_sectors.map((sector) => sector.sector_code),
      repeatedShock.top_sectors.map((sector) => sector.sector_code),
    )
  })

  it('returns allocation, employment, import-leakage, and FX sensitivity ranges without forecast framing', () => {
    const result = runScenarioLabIoDemandShock(loadValidIoPayload(), {
      demand_bucket: 'export',
      amount: 100,
      currency: 'mln_usd',
      exchange_rate_uzs_per_usd: 12_500,
      distribution: 'output',
      sector_code: 'F',
    })
    assert.ok(result.sensitivity)
    const allocationIds = result.sensitivity.allocation_modes.map((item) => item.id)
    const rangeIds = result.sensitivity.parameter_ranges.map((item) => item.id)
    const employmentLow = result.sensitivity.parameter_ranges.find((item) => item.id === 'employment-low')
    const employmentHigh = result.sensitivity.parameter_ranges.find((item) => item.id === 'employment-high')
    const fxLow = result.sensitivity.parameter_ranges.find((item) => item.id === 'fx-low')
    const fxHigh = result.sensitivity.parameter_ranges.find((item) => item.id === 'fx-high')
    const leakageBase = result.sensitivity.parameter_ranges.find((item) => item.id === 'import-leakage-base')

    assert.deepEqual(allocationIds, [
      'allocation-final-demand',
      'allocation-output',
      'allocation-sector',
    ])
    assert.equal(rangeIds.includes('employment-low'), true)
    assert.equal(rangeIds.includes('import-leakage-base'), true)
    assert.equal(rangeIds.includes('fx-high'), true)
    assert.ok(employmentLow)
    assert.ok(employmentHigh)
    assert.ok(employmentLow.employment_effect_persons)
    assert.ok(employmentHigh.employment_effect_persons)
    assert.equal((employmentLow.employment_effect_persons ?? 0) < (employmentHigh.employment_effect_persons ?? 0), true)
    assert.ok(fxLow)
    assert.ok(fxHigh)
    assert.equal(fxLow.output_effect_bln_uzs < fxHigh.output_effect_bln_uzs, true)
    assert.ok(leakageBase)
    assert.equal(leakageBase.output_effect_bln_uzs < result.totals.output_effect_bln_uzs, true)
    assert.equal(result.sensitivity.parameter_ranges.every((item) => !/forecast/i.test(item.assumption)), true)
  })
})
