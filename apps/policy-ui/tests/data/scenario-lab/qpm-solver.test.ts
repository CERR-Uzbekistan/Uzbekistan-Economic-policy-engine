import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  applyPresetToState,
  buildScenarioLabResults,
} from '../../../src/data/mock/scenario-lab.js'
import { solveScenarioLabQpm } from '../../../src/data/scenario-lab/qpm-solver.js'

type QpmArtifactScenario = {
  scenario_id: string
  paths: {
    gdp_growth: number[]
    inflation: number[]
    policy_rate: number[]
    exchange_rate: number[]
  }
}

function loadQpmArtifactScenario(scenarioId: string): QpmArtifactScenario {
  const artifact = JSON.parse(readFileSync('public/data/qpm.json', 'utf8')) as {
    scenarios: QpmArtifactScenario[]
  }
  const scenario = artifact.scenarios.find((entry) => entry.scenario_id === scenarioId)
  assert.ok(scenario, `Missing QPM artifact scenario ${scenarioId}`)
  return scenario
}

function assertClosePath(actual: number[], expected: number[], tolerance = 0.01) {
  assert.equal(actual.length, expected.length)
  actual.forEach((actualValue, index) => {
    assert.ok(
      Math.abs(actualValue - expected[index]) <= tolerance,
      `Expected ${actualValue} to be within ${tolerance} of ${expected[index]} at index ${index}`,
    )
  })
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

describe('Scenario Lab canonical QPM solver', () => {
  it('matches the public QPM artifact for the exchange-rate shock preset', () => {
    const artifactScenario = loadQpmArtifactScenario('exchange-rate-shock')
    const run = solveScenarioLabQpm(applyPresetToState('exchange-rate-shock'), 8)

    assertClosePath(run.scenario.gdpGrowth, artifactScenario.paths.gdp_growth)
    assertClosePath(run.scenario.inflation, artifactScenario.paths.inflation)
    assertClosePath(run.scenario.policyRate, artifactScenario.paths.policy_rate)
    assertClosePath(run.scenario.exchangeRate, artifactScenario.paths.exchange_rate, 1)
  })

  it('matches the public QPM artifact for the monetary and external-demand presets', () => {
    const rateHike = solveScenarioLabQpm(applyPresetToState('rate-hike-100bp'), 8)
    const externalSlowdown = solveScenarioLabQpm(applyPresetToState('external-slowdown'), 8)

    assertClosePath(rateHike.scenario.inflation, loadQpmArtifactScenario('rate-hike-100bp').paths.inflation)
    assertClosePath(
      externalSlowdown.scenario.gdpGrowth,
      loadQpmArtifactScenario('remittance-downside').paths.gdp_growth,
    )
  })

  it('uses canonical QPM deltas in Scenario Lab charts and attribution', () => {
    const results = buildScenarioLabResults(applyPresetToState('exchange-rate-shock'))
    const macroChart = results.charts_by_tab.macro_path
    const impulseChart = results.impulse_response_chart
    const qpmRun = solveScenarioLabQpm(applyPresetToState('exchange-rate-shock'), 8)

    assert.equal(results.headline_metrics[0].model_attribution[0].model_id, 'qpm-canonical-solver')
    assertClosePath(macroChart.series[0].values, [4.1921, 3.3311, 3.2547, 3.7275])
    assertClosePath(macroChart.series[1].values, [5.4385, 4.9263, 4.6052, 4.5223])
    assert.ok(impulseChart)
    assert.deepEqual(impulseChart.series[1].values.slice(0, 4), [1.11, 2.34, 3.48, 4.36])
    assert.equal(qpmRun.scenario.periods[0], '2026 Q3')
    assert.equal(results.baseline_source?.source, 'overview-artifact')
    assert.equal(results.baseline_source?.metrics.some((metric) => metric.metric_id === 'cpi_yoy'), true)
  })

  it('keeps risk-premium shock signs consistent with depreciation stress', () => {
    const baseline = solveScenarioLabQpm({}, 8)
    const riskPremiumShock = solveScenarioLabQpm({ risk_premium_shock: 1 }, 8)

    assert.ok(
      average(riskPremiumShock.scenario.inflation.slice(0, 4)) >
        average(baseline.scenario.inflation.slice(0, 4)),
    )
    assert.ok(
      average(riskPremiumShock.scenario.policyRate.slice(0, 4)) >
        average(baseline.scenario.policyRate.slice(0, 4)),
    )
  })
})
