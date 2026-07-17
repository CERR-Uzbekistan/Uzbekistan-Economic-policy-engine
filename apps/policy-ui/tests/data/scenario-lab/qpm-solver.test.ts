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

function subtractPath(path: number[], baseline: number[]): number[] {
  return path.map((value, index) => value - baseline[index])
}

function percentageDeviation(path: number[], baseline: number[]): number[] {
  return path.map((value, index) => ((value / baseline[index]) - 1) * 100)
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
  it('matches public QPM shock effects when the Overview baseline level moves', () => {
    const artifactBaseline = loadQpmArtifactScenario('baseline')
    const artifactScenario = loadQpmArtifactScenario('exchange-rate-shock')
    const run = solveScenarioLabQpm(applyPresetToState('exchange-rate-shock'), 8)

    assertClosePath(
      run.deltas.gdpGrowth,
      subtractPath(artifactScenario.paths.gdp_growth, artifactBaseline.paths.gdp_growth),
    )
    assertClosePath(
      run.deltas.inflation,
      subtractPath(artifactScenario.paths.inflation, artifactBaseline.paths.inflation),
    )
    assertClosePath(
      run.deltas.policyRate,
      subtractPath(artifactScenario.paths.policy_rate, artifactBaseline.paths.policy_rate),
    )
    assertClosePath(
      percentageDeviation(run.scenario.exchangeRate, run.baseline.exchangeRate),
      percentageDeviation(
        artifactScenario.paths.exchange_rate,
        artifactBaseline.paths.exchange_rate,
      ),
      0.02,
    )
  })

  it('matches the public QPM artifact for the monetary and external-demand presets', () => {
    const artifactBaseline = loadQpmArtifactScenario('baseline')
    const artifactRateHike = loadQpmArtifactScenario('rate-hike-100bp')
    const artifactExternalSlowdown = loadQpmArtifactScenario('remittance-downside')
    const rateHike = solveScenarioLabQpm(applyPresetToState('rate-hike-100bp'), 8)
    const externalSlowdown = solveScenarioLabQpm(applyPresetToState('external-slowdown'), 8)

    assertClosePath(
      rateHike.deltas.inflation,
      subtractPath(artifactRateHike.paths.inflation, artifactBaseline.paths.inflation),
    )
    assertClosePath(
      externalSlowdown.deltas.gdpGrowth,
      subtractPath(
        artifactExternalSlowdown.paths.gdp_growth,
        artifactBaseline.paths.gdp_growth,
      ),
    )
  })

  it('uses canonical QPM deltas in Scenario Lab charts and attribution', () => {
    const results = buildScenarioLabResults(applyPresetToState('exchange-rate-shock'))
    const macroChart = results.charts_by_tab.macro_path
    const impulseChart = results.impulse_response_chart
    const qpmRun = solveScenarioLabQpm(applyPresetToState('exchange-rate-shock'), 8)

    assert.equal(results.headline_metrics[0].model_attribution[0].model_id, 'qpm-canonical-solver')
    assertClosePath(macroChart.series[0].values, qpmRun.baseline.gdpGrowth.slice(0, 4))
    assertClosePath(macroChart.series[1].values, qpmRun.scenario.gdpGrowth.slice(0, 4))
    assert.ok(impulseChart)
    assert.deepEqual(impulseChart.series[1].values.slice(0, 4), [1.11, 2.34, 3.48, 4.36])
    const startMatch = qpmRun.scenario.periods[0].match(/^(20\d{2}) Q([1-4])$/)
    assert.ok(startMatch)
    const startIndex = Number(startMatch[1]) * 4 + Number(startMatch[2])
    const exportDate = new Date(qpmRun.baselineSource.exported_at)
    const exportQuarterIndex = exportDate.getUTCFullYear() * 4 + Math.floor(exportDate.getUTCMonth() / 3) + 1
    assert.ok(startIndex >= exportQuarterIndex)
    assert.equal(results.baseline_source?.source, 'overview-artifact')
    assert.equal(results.baseline_source?.metrics.some((metric) => metric.metric_id === 'cpi_yoy'), true)
  })

  it('anchors visible baseline levels to the current Overview snapshot instead of raw steady-state transition', () => {
    const run = solveScenarioLabQpm({}, 8)

    const metricValue = (metricId: string) => {
      const metric = run.baselineSource.metrics.find((entry) => entry.metric_id === metricId)
      assert.ok(metric)
      return metric.value
    }

    assertClosePath(run.baseline.gdpGrowth.slice(0, 1), [metricValue('real_gdp_growth_quarter_yoy')])
    assertClosePath(run.baseline.inflation.slice(0, 1), [metricValue('cpi_yoy')])
    assertClosePath(run.baseline.policyRate.slice(0, 1), [metricValue('policy_rate')])
    assert.equal(
      run.baselineSource.metrics.some((metric) => metric.metric_id === 'gdp_nowcast_current_quarter'),
      false,
    )
    assert.equal(
      run.baselineSource.metrics.some((metric) => metric.metric_id === 'real_gdp_growth_quarter_yoy'),
      true,
    )
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
