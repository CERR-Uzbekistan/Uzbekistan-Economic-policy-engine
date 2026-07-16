import type {
  CgeBridgePayload,
  CgeChanges,
  CgeControlValues,
  CgeParameters,
  CgeResults,
  CgeScenarioResult,
} from '../bridge/cge-types.js'

type Equilibrium = CgeResults & {
  current_account_residual: number
  domestic_market_residual: number
  composite_market_residual: number
  government_budget_residual: number
}

export class CgeSolverError extends Error {}

function round(value: number, digits = 6): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function parametersFromControls(payload: CgeBridgePayload, controls: CgeControlValues): CgeParameters {
  const base = payload.calibration.parameters
  return {
    ...base,
    wm: base.wm * (1 + controls.world_import_price_change_pct / 100),
    tm: Math.max(0, base.tm + controls.import_tariff_change_pp / 100),
    G: base.G * (1 + controls.government_consumption_change_pct / 100),
    re: base.re * (1 + controls.remittances_change_pct / 100),
  }
}

function equilibrium(p: CgeParameters, er: number): Equilibrium | null {
  const pd = 1
  const pe = (er * p.we) / (1 + p.te)
  const pm = er * p.wm * (1 + p.tm)
  if (pe <= 0 || pm <= 0) return null
  try {
    const eToD = ((pe / pd) / (p.bt / (1 - p.bt))) ** (1 / (p.rho_t - 1))
    const cetInner = p.bt * eToD ** p.rho_t + (1 - p.bt)
    const ds = p.X / (p.at * cetInner ** (1 / p.rho_t))
    const E = eToD * ds
    const mToD = ((pd / pm) * (p.bq / (1 - p.bq))) ** (1 / (1 + p.rho_q))
    const M = mToD * ds
    const compositeInner = p.bq * M ** -p.rho_q + (1 - p.bq) * ds ** -p.rho_q
    const Q = p.aq * compositeInner ** (-1 / p.rho_q)
    const positive = [eToD, ds, E, mToD, M, Q]
    if (!positive.every((value) => Number.isFinite(value) && value > 0)) return null
    const Pq = (pm * M + pd * ds) / Q
    const Pt = Pq * (1 + p.ts)
    const Px = (pe * E + pd * ds) / p.X
    const Y = Px * p.X + p.tr * Pq + p.re * er
    const TAX = p.tm * p.wm * er * M + p.te * pe * E + p.ts * Pq * Q + p.ty * Y
    const Sg = TAX - p.G * Pt - p.tr * Pq + p.ft * er
    const S = p.sy * Y + er * p.B + Sg
    const Cn = (Y * (1 - p.ty - p.sy)) / Pt
    const Z = S / Pt
    const Qd = Cn + Z + p.G
    const currentAccount = p.wm * M - p.we * E - p.ft - p.re
    return {
      Er: er, Pe: pe, Pm: pm, Pd: pd, E, M, Ds: ds, Dd: ds, Q, Qs: Q, Qd,
      X: p.X, Pq, Pt, Px, TAX, Y, Sg, Cn, S, Z, TB: pe * E - pm * M,
      current_account_residual: currentAccount - p.B,
      domestic_market_residual: 0,
      composite_market_residual: Qd - Q,
      government_budget_residual: TAX - p.G * Pt - p.tr * Pq + p.ft * er - Sg,
    }
  } catch {
    return null
  }
}

export function runCgeScenario(payload: CgeBridgePayload, controls: CgeControlValues): CgeScenarioResult {
  payload.controls.forEach((definition) => {
    const value = controls[definition.id]
    if (!Number.isFinite(value) || value < definition.min || value > definition.max) {
      throw new CgeSolverError(`${definition.id} is outside its approved range.`)
    }
  })
  const p = parametersFromControls(payload, controls)
  let lower = 0.001
  let upper = 1000
  let lowerValue = equilibrium(p, lower)?.current_account_residual ?? Number.NaN
  const upperValue = equilibrium(p, upper)?.current_account_residual ?? Number.NaN
  if (!Number.isFinite(lowerValue) || !Number.isFinite(upperValue) || lowerValue * upperValue > 0) {
    throw new CgeSolverError('The selected controls do not bracket an equilibrium.')
  }
  let er = 1
  let solved: Equilibrium | null = null
  let iterations = 0
  for (iterations = 1; iterations <= 100; iterations += 1) {
    er = (lower + upper) / 2
    solved = equilibrium(p, er)
    if (!solved || !Number.isFinite(solved.current_account_residual)) break
    if (Math.abs(solved.current_account_residual) < 1e-12) break
    if (lowerValue * solved.current_account_residual <= 0) upper = er
    else {
      lower = er
      lowerValue = solved.current_account_residual
    }
  }
  if (!solved || Math.abs(solved.current_account_residual) >= 1e-8 || Math.abs(solved.composite_market_residual) >= 1e-8) {
    throw new CgeSolverError('The selected controls did not converge to an accounting-consistent result.')
  }
  const residualKeys = [
    'current_account_residual', 'domestic_market_residual',
    'composite_market_residual', 'government_budget_residual',
  ] as const
  const accountingResiduals = Object.fromEntries(residualKeys.map((key) => [key, solved[key]]))
  const resultKeys = Object.keys(payload.calibration.base_results) as Array<keyof CgeResults>
  const results = Object.fromEntries(resultKeys.map((key) => [key, round(solved[key])])) as CgeResults
  const changeKeys: Array<[keyof CgeChanges, keyof CgeResults]> = [
    ['Er_pct_change', 'Er'], ['E_pct_change', 'E'], ['M_pct_change', 'M'],
    ['Ds_pct_change', 'Ds'], ['Q_pct_change', 'Q'], ['Y_pct_change', 'Y'],
    ['Cn_pct_change', 'Cn'], ['TAX_pct_change', 'TAX'], ['Sg_pct_change', 'Sg'],
    ['S_pct_change', 'S'], ['Z_pct_change', 'Z'],
  ]
  const changes = Object.fromEntries(changeKeys.map(([changeKey, resultKey]) => {
    const base = payload.calibration.base_results[resultKey]
    return [changeKey, round(((results[resultKey] - base) / Math.abs(base)) * 100, 4)]
  })) as CgeChanges
  return {
    results,
    changes_from_base: changes,
    accounting_residuals: accountingResiduals,
    solver: {
      converged: true,
      method: 'bisection',
      iterations,
      exchange_rate: round(er),
      normalized_exchange_rate: round(er),
      exchange_rate_semantics: 'normalized relative-price index',
    },
    control_values: controls,
    parameters_used: p,
    error: null,
  }
}
