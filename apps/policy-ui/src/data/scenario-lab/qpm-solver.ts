import type { ModelAttribution, ScenarioLabAssumptionState } from '../../contracts/data-contract'

export const QPM_SCENARIO_ATTRIBUTION: ModelAttribution = {
  model_id: 'qpm-canonical-solver',
  model_name: 'Quarterly Projection Model (Uzbekistan)',
  module: 'qpm',
  version: '0.2.0',
  run_id: 'scenario-lab-qpm-canonical',
  data_version: '2026Q1',
  timestamp: '2026-05-21T00:00:00+05:00',
}

const EXTERNAL_DEMAND_RHO = 0.75
const EXCHANGE_RATE_BASE_UZS_PER_USD = 12650
const DEFAULT_PARAMS = {
  b1: 0.7,
  b2: 0.2,
  b3: 0.3,
  b4: 0.6,
  a1: 0.6,
  a2: 0.2,
  a3: 0.65,
  a4: 0.12,
  g1: 0.8,
  g2: 1.5,
  g3: 0.5,
  e1: 0.7,
  inflationTarget: 5,
  neutralRealRate: 3.5,
  potentialGrowth: 6,
}

const INITIAL_LEVELS = {
  inflation: 10.5,
  policyRate: 13.5,
  outputGap: -1.5,
  nerDepreciation: 8,
}

export type QpmLevelPaths = {
  periods: string[]
  gdpGrowth: number[]
  inflation: number[]
  policyRate: number[]
  exchangeRate: number[]
}

export type QpmScenarioRun = {
  attribution: ModelAttribution
  baseline: QpmLevelPaths
  scenario: QpmLevelPaths
  deltas: {
    gdpGrowth: number[]
    inflation: number[]
    policyRate: number[]
    exchangeRate: number[]
  }
  solver: {
    baselineConverged: boolean
    scenarioConverged: boolean
    baselineIterations: number
    scenarioIterations: number
  }
}

type QpmShocks = {
  demand?: number
  inflation?: number
  exchange?: number
  monetary?: number
  risk?: number
  externalDemand?: number
}

type QpmRawSolution = {
  gap: number[]
  pi4: number[]
  rs: number[]
  s: number[]
  d4ls: number[]
  iterations: number
  converged: boolean
}

function safeGet(values: number[], index: number): number {
  return index >= 0 && index < values.length ? values[index] : 0
}

function roundTo(value: number, decimals = 4): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function quarterLabels(startYear: number, startQuarter: number, n: number): string[] {
  const labels: string[] = []
  let year = startYear
  let quarter = startQuarter
  for (let index = 0; index < n; index += 1) {
    labels.push(`${year} Q${quarter}`)
    quarter += 1
    if (quarter > 4) {
      quarter = 1
      year += 1
    }
  }
  return labels
}

function solveCore(shocks: QpmShocks, horizonPoints: number, a4 = DEFAULT_PARAMS.a4): QpmRawSolution {
  const transitions = Math.max(0, horizonPoints - 1)
  const shockIndex = 5
  const n = transitions + shockIndex + 11

  const gap = Array(n).fill(0)
  const pi = Array(n).fill(0)
  const pi4 = Array(n).fill(0)
  const rs = Array(n).fill(0)
  const rrGap = Array(n).fill(0)
  const mci = Array(n).fill(0)
  const rmc = Array(n).fill(0)
  const s = Array(n).fill(0)
  const lCpi = Array(n).fill(0)
  const lZGap = Array(n).fill(0)
  const d4ls = Array(n).fill(0)
  const dpm = Array(n).fill(0)

  const initialPi = INITIAL_LEVELS.inflation - DEFAULT_PARAMS.inflationTarget
  const initialRs =
    INITIAL_LEVELS.policyRate -
    (DEFAULT_PARAMS.neutralRealRate + DEFAULT_PARAMS.inflationTarget)
  const initialD4ls = INITIAL_LEVELS.nerDepreciation - DEFAULT_PARAMS.inflationTarget

  for (let t = 0; t < shockIndex; t += 1) {
    gap[t] = INITIAL_LEVELS.outputGap
    pi[t] = initialPi
    rs[t] = initialRs
    s[t] = (initialD4ls * t) / Math.max(1, shockIndex - 1)
  }
  for (let t = 1; t < shockIndex; t += 1) {
    lCpi[t] = lCpi[t - 1] + pi[t - 1] / 4
    lZGap[t] = s[t] - lCpi[t]
  }

  const shockGap = Array(n).fill(0)
  const shockPi = Array(n).fill(0)
  const shockS = Array(n).fill(0)
  const shockRs = Array(n).fill(0)
  const shockRho = Array(n).fill(0)
  const gapStar = Array(n).fill(0)

  shockGap[shockIndex] = shocks.demand ?? 0
  shockPi[shockIndex] = shocks.inflation ?? 0
  shockS[shockIndex] = shocks.exchange ?? 0
  shockRs[shockIndex] = shocks.monetary ?? 0
  shockRho[shockIndex] = shocks.risk ?? 0
  gapStar[shockIndex] = shocks.externalDemand ?? 0
  for (let t = shockIndex + 1; t < n; t += 1) {
    gapStar[t] = EXTERNAL_DEMAND_RHO * gapStar[t - 1]
  }

  let iterations = 0
  let converged = false

  for (let iteration = 0; iteration < 600; iteration += 1) {
    iterations = iteration + 1
    const pi0 = [...pi]
    const s0 = [...s]
    const gap0 = [...gap]

    for (let t = n - 2; t >= shockIndex; t -= 1) {
      s[t] =
        (1 - DEFAULT_PARAMS.e1) * safeGet(s, t + 1) +
        DEFAULT_PARAMS.e1 * safeGet(s, t - 1) -
        (rs[t] - shockRho[t]) / 4 +
        shockS[t]
    }

    for (let t = shockIndex; t < n - 1; t += 1) {
      lCpi[t] = lCpi[t - 1] + safeGet(pi, t - 1) / 4
      lZGap[t] = safeGet(s, t) - lCpi[t]
      dpm[t] = safeGet(s, t) - safeGet(s, t - 1)
      rmc[t] = DEFAULT_PARAMS.a3 * safeGet(gap, t - 1) + (1 - DEFAULT_PARAMS.a3) * lZGap[t]

      pi[t] =
        DEFAULT_PARAMS.a1 * safeGet(pi, t - 1) +
        (1 - DEFAULT_PARAMS.a1) * safeGet(pi, t + 1) +
        DEFAULT_PARAMS.a2 * rmc[t] +
        a4 * dpm[t] +
        shockPi[t]

      lCpi[t] = lCpi[t - 1] + pi[t] / 4
      lZGap[t] = safeGet(s, t) - lCpi[t]
      pi4[t] =
        (safeGet(pi, t) + safeGet(pi, t - 1) + safeGet(pi, t - 2) + safeGet(pi, t - 3)) /
        4

      rs[t] =
        DEFAULT_PARAMS.g1 * safeGet(rs, t - 1) +
        (1 - DEFAULT_PARAMS.g1) *
          (safeGet(pi, t + 1) + DEFAULT_PARAMS.g2 * safeGet(pi4, t + 4) + DEFAULT_PARAMS.g3 * safeGet(gap, t - 1)) +
        shockRs[t]

      rrGap[t] = rs[t] - safeGet(pi, t + 1)
      mci[t] = DEFAULT_PARAMS.b4 * rrGap[t] - (1 - DEFAULT_PARAMS.b4) * lZGap[t]
      gap[t] =
        DEFAULT_PARAMS.b1 * safeGet(gap, t - 1) -
        DEFAULT_PARAMS.b2 * mci[t] +
        DEFAULT_PARAMS.b3 * gapStar[t] +
        shockGap[t]

      rmc[t] = DEFAULT_PARAMS.a3 * gap[t] + (1 - DEFAULT_PARAMS.a3) * lZGap[t]
      pi[t] =
        DEFAULT_PARAMS.a1 * safeGet(pi, t - 1) +
        (1 - DEFAULT_PARAMS.a1) * safeGet(pi, t + 1) +
        DEFAULT_PARAMS.a2 * rmc[t] +
        a4 * dpm[t] +
        shockPi[t]
      lCpi[t] = lCpi[t - 1] + pi[t] / 4
      lZGap[t] = safeGet(s, t) - lCpi[t]
      pi4[t] =
        (safeGet(pi, t) + safeGet(pi, t - 1) + safeGet(pi, t - 2) + safeGet(pi, t - 3)) /
        4

      rs[t] =
        DEFAULT_PARAMS.g1 * safeGet(rs, t - 1) +
        (1 - DEFAULT_PARAMS.g1) *
          (safeGet(pi, t + 1) + DEFAULT_PARAMS.g2 * safeGet(pi4, t + 4) + DEFAULT_PARAMS.g3 * gap[t]) +
        shockRs[t]
      rrGap[t] = rs[t] - safeGet(pi, t + 1)
      mci[t] = DEFAULT_PARAMS.b4 * rrGap[t] - (1 - DEFAULT_PARAMS.b4) * lZGap[t]
    }

    for (let t = 0; t < n; t += 1) {
      d4ls[t] = safeGet(s, t) - safeGet(s, t - 4)
    }

    let maxDiff = 0
    for (let t = shockIndex; t < n; t += 1) {
      maxDiff = Math.max(maxDiff, Math.abs(pi[t] - pi0[t]), Math.abs(s[t] - s0[t]), Math.abs(gap[t] - gap0[t]))
    }
    if (iteration > 3 && maxDiff < 1e-8) {
      converged = true
      break
    }
  }

  const endIndex = shockIndex + horizonPoints
  return {
    gap: gap.slice(shockIndex, endIndex),
    pi4: pi4.slice(shockIndex, endIndex),
    rs: rs.slice(shockIndex, endIndex),
    s: s.slice(shockIndex, endIndex),
    d4ls: d4ls.slice(shockIndex, endIndex),
    iterations,
    converged,
  }
}

function baselineExchangeRateReference(baseline: QpmRawSolution): number[] {
  const d4lsLevel = baseline.d4ls.map((value) => DEFAULT_PARAMS.inflationTarget + value)
  const exchangeRate = [EXCHANGE_RATE_BASE_UZS_PER_USD]
  for (let index = 1; index < d4lsLevel.length; index += 1) {
    exchangeRate.push(exchangeRate[index - 1] * (1 + d4lsLevel[index] / 400))
  }
  return exchangeRate
}

function levelPaths(
  raw: QpmRawSolution,
  baseline: QpmRawSolution,
  baselineExchangeRate: number[],
): QpmLevelPaths {
  const neutralNominal = DEFAULT_PARAMS.neutralRealRate + DEFAULT_PARAMS.inflationTarget
  return {
    periods: quarterLabels(2026, 1, raw.gap.length),
    gdpGrowth: raw.gap.map((value) => roundTo(DEFAULT_PARAMS.potentialGrowth + value)),
    inflation: raw.pi4.map((value) => roundTo(DEFAULT_PARAMS.inflationTarget + value)),
    policyRate: raw.rs.map((value) => roundTo(neutralNominal + value)),
    exchangeRate: raw.s.map((value, index) =>
      roundTo(baselineExchangeRate[index] * Math.exp((value - baseline.s[index]) / 100), 1),
    ),
  }
}

function deltas(path: number[], baseline: number[]): number[] {
  return path.map((value, index) => roundTo(value - baseline[index]))
}

function toQpmShocks(values: ScenarioLabAssumptionState): { shocks: QpmShocks; a4: number } {
  const passThroughAdjustment = clamp(values.pass_through_adjustment ?? 0, -0.5, 0.8)
  return {
    shocks: {
      demand:
        0.12 * (values.gov_spending_change ?? 0) +
        0.03 * (values.remittance_change ?? 0),
      inflation:
        0.08 * (values.commodity_price_change ?? 0) +
        0.04 * (values.tariff_change ?? 0),
      monetary: values.policy_rate_change ?? 0,
      exchange: values.exchange_rate_change ?? 0,
      externalDemand: values.export_demand_change ?? 0,
      risk: values.risk_premium_shock ?? 0,
    },
    a4: DEFAULT_PARAMS.a4 * (1 + passThroughAdjustment),
  }
}

export function solveScenarioLabQpm(
  values: ScenarioLabAssumptionState,
  horizonPoints = 12,
): QpmScenarioRun {
  const { shocks, a4 } = toQpmShocks(values)
  const baselineRaw = solveCore({}, horizonPoints)
  const scenarioRaw = solveCore(shocks, horizonPoints, a4)
  const baselineExchangeRate = baselineExchangeRateReference(baselineRaw)
  const baseline = levelPaths(baselineRaw, baselineRaw, baselineExchangeRate)
  const scenario = levelPaths(scenarioRaw, baselineRaw, baselineExchangeRate)

  return {
    attribution: QPM_SCENARIO_ATTRIBUTION,
    baseline,
    scenario,
    deltas: {
      gdpGrowth: deltas(scenario.gdpGrowth, baseline.gdpGrowth),
      inflation: deltas(scenario.inflation, baseline.inflation),
      policyRate: deltas(scenario.policyRate, baseline.policyRate),
      exchangeRate: deltas(scenario.exchangeRate, baseline.exchangeRate),
    },
    solver: {
      baselineConverged: baselineRaw.converged,
      scenarioConverged: scenarioRaw.converged,
      baselineIterations: baselineRaw.iterations,
      scenarioIterations: scenarioRaw.iterations,
    },
  }
}
