import type { Caveat, ModelAttribution } from '../../contracts/data-contract.js'
import {
  QPM_CANONICAL_SCENARIO_ORDER,
  type QpmBridgePayload,
  type QpmParameter,
  type QpmScenario,
  type QpmScenarioId,
} from './qpm-types.js'

type ValidationSeverity = 'error'

export type QpmValidationIssue = {
  path: string
  message: string
  severity: ValidationSeverity
}

export type QpmValidationResult = {
  ok: boolean
  value: QpmBridgePayload | null
  issues: QpmValidationIssue[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isQpmScenarioId(value: unknown): value is QpmScenarioId {
  return (
    value === 'baseline' ||
    value === 'rate-cut-100bp' ||
    value === 'rate-hike-100bp' ||
    value === 'exchange-rate-shock' ||
    value === 'remittance-downside'
  )
}

function pushError(issues: QpmValidationIssue[], path: string, message: string) {
  issues.push({ path, message, severity: 'error' })
}

function parseStringArray(
  value: unknown,
  issues: QpmValidationIssue[],
  path: string,
): string[] | null {
  if (!Array.isArray(value)) {
    pushError(issues, path, 'Expected an array of strings.')
    return null
  }
  const output: string[] = []
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index]
    if (typeof entry !== 'string') {
      pushError(issues, `${path}[${index}]`, 'Expected a string.')
      continue
    }
    output.push(entry)
  }
  return output
}

function parseNumberArray(
  value: unknown,
  issues: QpmValidationIssue[],
  path: string,
): number[] | null {
  if (!Array.isArray(value)) {
    pushError(issues, path, 'Expected an array of finite numbers.')
    return null
  }
  const output: number[] = []
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index]
    if (!isFiniteNumber(entry)) {
      pushError(issues, `${path}[${index}]`, 'Expected a finite number.')
      continue
    }
    output.push(entry)
  }
  return output
}

function parseAttribution(value: unknown, issues: QpmValidationIssue[]): ModelAttribution | null {
  if (!isRecord(value)) {
    pushError(issues, 'attribution', 'Expected an object.')
    return null
  }
  const requiredFields: Array<keyof ModelAttribution> = [
    'model_id',
    'model_name',
    'module',
    'version',
    'run_id',
    'data_version',
    'timestamp',
  ]

  const output = {} as ModelAttribution
  for (const field of requiredFields) {
    const raw = value[field]
    if (typeof raw !== 'string' || raw.length === 0) {
      pushError(issues, `attribution.${field}`, 'Expected a non-empty string.')
      continue
    }
    output[field] = raw
  }
  return output
}

function parseParameter(
  value: unknown,
  index: number,
  issues: QpmValidationIssue[],
): QpmParameter | null {
  const path = `parameters[${index}]`
  if (!isRecord(value)) {
    pushError(issues, path, 'Expected an object.')
    return null
  }

  const symbol = value.symbol
  const label = value.label
  const rawValue = value.value
  const rangeMin = value.range_min
  const rangeMax = value.range_max
  const description = value.description
  const descriptionRu = value.description_ru
  const descriptionUz = value.description_uz

  if (typeof symbol !== 'string' || symbol.length === 0) {
    pushError(issues, `${path}.symbol`, 'Expected a non-empty string.')
  }
  if (typeof label !== 'string' || label.length === 0) {
    pushError(issues, `${path}.label`, 'Expected a non-empty string.')
  }
  if (!isFiniteNumber(rawValue)) {
    pushError(issues, `${path}.value`, 'Expected a finite number.')
  }
  if (!isFiniteNumber(rangeMin)) {
    pushError(issues, `${path}.range_min`, 'Expected a finite number.')
  }
  if (!isFiniteNumber(rangeMax)) {
    pushError(issues, `${path}.range_max`, 'Expected a finite number.')
  }
  if (!(description === null || typeof description === 'string')) {
    pushError(issues, `${path}.description`, 'Expected a string or null.')
  }
  if (!(descriptionRu === null || typeof descriptionRu === 'string')) {
    pushError(issues, `${path}.description_ru`, 'Expected a string or null.')
  }
  if (!(descriptionUz === null || typeof descriptionUz === 'string')) {
    pushError(issues, `${path}.description_uz`, 'Expected a string or null.')
  }

  if (
    typeof symbol !== 'string' ||
    typeof label !== 'string' ||
    !isFiniteNumber(rawValue) ||
    !isFiniteNumber(rangeMin) ||
    !isFiniteNumber(rangeMax) ||
    !(description === null || typeof description === 'string') ||
    !(descriptionRu === null || typeof descriptionRu === 'string') ||
    !(descriptionUz === null || typeof descriptionUz === 'string')
  ) {
    return null
  }

  return {
    symbol,
    label,
    value: rawValue,
    range_min: rangeMin,
    range_max: rangeMax,
    description,
    description_ru: descriptionRu,
    description_uz: descriptionUz,
  }
}

function parseCaveat(value: unknown, index: number, issues: QpmValidationIssue[]): Caveat | null {
  const path = `caveats[${index}]`
  if (!isRecord(value)) {
    pushError(issues, path, 'Expected an object.')
    return null
  }

  const caveatId = value.caveat_id
  const severity = value.severity
  const message = value.message
  const affectedMetrics = parseStringArray(value.affected_metrics, issues, `${path}.affected_metrics`)
  const affectedModels = parseStringArray(value.affected_models, issues, `${path}.affected_models`)

  if (typeof caveatId !== 'string' || caveatId.length === 0) {
    pushError(issues, `${path}.caveat_id`, 'Expected a non-empty string.')
  }
  if (!(severity === 'info' || severity === 'warning' || severity === 'critical')) {
    pushError(issues, `${path}.severity`, 'Expected one of info|warning|critical.')
  }
  if (typeof message !== 'string' || message.length === 0) {
    pushError(issues, `${path}.message`, 'Expected a non-empty string.')
  }

  if (
    typeof caveatId !== 'string' ||
    !(severity === 'info' || severity === 'warning' || severity === 'critical') ||
    typeof message !== 'string' ||
    !affectedMetrics ||
    !affectedModels
  ) {
    return null
  }

  return {
    caveat_id: caveatId,
    severity,
    message,
    affected_metrics: affectedMetrics,
    affected_models: affectedModels,
  }
}

function parseScenario(value: unknown, index: number, issues: QpmValidationIssue[]): QpmScenario | null {
  const path = `scenarios[${index}]`
  if (!isRecord(value)) {
    pushError(issues, path, 'Expected an object.')
    return null
  }

  const scenarioId = value.scenario_id
  const scenarioName = value.scenario_name
  const description = value.description
  const horizonQuarters = value.horizon_quarters
  const periods = parseStringArray(value.periods, issues, `${path}.periods`)

  if (!isQpmScenarioId(scenarioId)) {
    pushError(issues, `${path}.scenario_id`, 'Expected one canonical QPM scenario id.')
  }
  if (typeof scenarioName !== 'string' || scenarioName.length === 0) {
    pushError(issues, `${path}.scenario_name`, 'Expected a non-empty string.')
  }
  if (typeof description !== 'string' || description.length === 0) {
    pushError(issues, `${path}.description`, 'Expected a non-empty string.')
  }
  if (!Number.isInteger(horizonQuarters) || (horizonQuarters as number) <= 0) {
    pushError(issues, `${path}.horizon_quarters`, 'Expected a positive integer.')
  }

  const rawPaths = value.paths
  if (!isRecord(rawPaths)) {
    pushError(issues, `${path}.paths`, 'Expected an object.')
    return null
  }

  const gdpPath = parseNumberArray(rawPaths.gdp_growth, issues, `${path}.paths.gdp_growth`)
  const inflationPath = parseNumberArray(rawPaths.inflation, issues, `${path}.paths.inflation`)
  const policyRatePath = parseNumberArray(rawPaths.policy_rate, issues, `${path}.paths.policy_rate`)
  const exchangeRatePath = parseNumberArray(rawPaths.exchange_rate, issues, `${path}.paths.exchange_rate`)

  const rawShocks = value.shocks_applied
  if (!isRecord(rawShocks)) {
    pushError(issues, `${path}.shocks_applied`, 'Expected an object.')
    return null
  }
  const rsShock = rawShocks.rs_shock
  const sShock = rawShocks.s_shock
  const gapShock = rawShocks.gap_shock
  const pieShock = rawShocks.pie_shock

  if (!isFiniteNumber(rsShock)) {
    pushError(issues, `${path}.shocks_applied.rs_shock`, 'Expected a finite number.')
  }
  if (!isFiniteNumber(sShock)) {
    pushError(issues, `${path}.shocks_applied.s_shock`, 'Expected a finite number.')
  }
  if (!isFiniteNumber(gapShock)) {
    pushError(issues, `${path}.shocks_applied.gap_shock`, 'Expected a finite number.')
  }
  if (!isFiniteNumber(pieShock)) {
    pushError(issues, `${path}.shocks_applied.pie_shock`, 'Expected a finite number.')
  }

  const solverIterations = value.solver_iterations
  if (!Number.isInteger(solverIterations) || (solverIterations as number) <= 0) {
    pushError(issues, `${path}.solver_iterations`, 'Expected a positive integer.')
  }

  if (
    !isQpmScenarioId(scenarioId) ||
    typeof scenarioName !== 'string' ||
    typeof description !== 'string' ||
    !Number.isInteger(horizonQuarters) ||
    !periods ||
    !gdpPath ||
    !inflationPath ||
    !policyRatePath ||
    !exchangeRatePath ||
    !isFiniteNumber(rsShock) ||
    !isFiniteNumber(sShock) ||
    !isFiniteNumber(gapShock) ||
    !isFiniteNumber(pieShock) ||
    !Number.isInteger(solverIterations)
  ) {
    return null
  }

  const requiredLength = horizonQuarters as number
  const pathEntries = [
    ['gdp_growth', gdpPath] as const,
    ['inflation', inflationPath] as const,
    ['policy_rate', policyRatePath] as const,
    ['exchange_rate', exchangeRatePath] as const,
  ]
  for (const [metricId, values] of pathEntries) {
    if (values.length !== requiredLength) {
      pushError(
        issues,
        `${path}.paths.${metricId}`,
        `Expected ${requiredLength} entries, received ${values.length}.`,
      )
    }
  }
  if (periods.length !== requiredLength) {
    pushError(
      issues,
      `${path}.periods`,
      `Expected ${requiredLength} entries, received ${periods.length}.`,
    )
  }

  // Unit-convention checks from the bridge contract.
  for (let pointIndex = 0; pointIndex < policyRatePath.length; pointIndex += 1) {
    const valueAtPoint = policyRatePath[pointIndex]
    if (valueAtPoint < -5 || valueAtPoint > 100) {
      pushError(
        issues,
        `${path}.paths.policy_rate[${pointIndex}]`,
        'policy_rate must be expressed in percent (expected range roughly -5..100).',
      )
    }
  }
  for (let pointIndex = 0; pointIndex < exchangeRatePath.length; pointIndex += 1) {
    const valueAtPoint = exchangeRatePath[pointIndex]
    if (valueAtPoint < 1000 || valueAtPoint > 1000000) {
      pushError(
        issues,
        `${path}.paths.exchange_rate[${pointIndex}]`,
        'exchange_rate must be a UZS/USD level (expected thousands range).',
      )
    }
  }

  return {
    scenario_id: scenarioId,
    scenario_name: scenarioName,
    description,
    horizon_quarters: requiredLength,
    periods,
    paths: {
      gdp_growth: gdpPath,
      inflation: inflationPath,
      policy_rate: policyRatePath,
      exchange_rate: exchangeRatePath,
    },
    shocks_applied: {
      rs_shock: rsShock,
      s_shock: sShock,
      gap_shock: gapShock,
      pie_shock: pieShock,
    },
    solver_iterations: solverIterations as number,
  }
}

export function validateQpmBridgePayload(input: unknown): QpmValidationResult {
  const issues: QpmValidationIssue[] = []
  if (!isRecord(input)) {
    return {
      ok: false,
      value: null,
      issues: [
        {
          path: '$',
          message: 'QPM bridge payload must be an object.',
          severity: 'error',
        },
      ],
    }
  }

  const attribution = parseAttribution(input.attribution, issues)

  const parametersRaw = input.parameters
  if (!Array.isArray(parametersRaw)) {
    pushError(issues, 'parameters', 'Expected an array.')
  }
  const parameters = Array.isArray(parametersRaw)
    ? parametersRaw
        .map((parameter, index) => parseParameter(parameter, index, issues))
        .filter((parameter): parameter is QpmParameter => parameter !== null)
    : []

  const scenariosRaw = input.scenarios
  if (!Array.isArray(scenariosRaw)) {
    pushError(issues, 'scenarios', 'Expected an array.')
  }
  const scenarios = Array.isArray(scenariosRaw)
    ? scenariosRaw
        .map((scenario, index) => parseScenario(scenario, index, issues))
        .filter((scenario): scenario is QpmScenario => scenario !== null)
    : []

  const caveatsRaw = input.caveats
  if (!Array.isArray(caveatsRaw)) {
    pushError(issues, 'caveats', 'Expected an array.')
  }
  const caveats = Array.isArray(caveatsRaw)
    ? caveatsRaw
        .map((caveat, index) => parseCaveat(caveat, index, issues))
        .filter((caveat): caveat is Caveat => caveat !== null)
    : []

  const metadataRaw = input.metadata
  if (!isRecord(metadataRaw)) {
    pushError(issues, 'metadata', 'Expected an object.')
  }
  const exportedAt = isRecord(metadataRaw) ? metadataRaw.exported_at : undefined
  const sourceScriptSha = isRecord(metadataRaw) ? metadataRaw.source_script_sha : undefined
  const solverVersion = isRecord(metadataRaw) ? metadataRaw.solver_version : undefined

  if (typeof exportedAt !== 'string' || exportedAt.length === 0) {
    pushError(issues, 'metadata.exported_at', 'Expected a non-empty string.')
  }
  if (!(sourceScriptSha === null || typeof sourceScriptSha === 'string')) {
    pushError(issues, 'metadata.source_script_sha', 'Expected a string or null.')
  }
  if (typeof solverVersion !== 'string' || solverVersion.length === 0) {
    pushError(issues, 'metadata.solver_version', 'Expected a non-empty string.')
  }

  const scenarioCounts = new Map<QpmScenarioId, number>()
  for (const scenarioId of QPM_CANONICAL_SCENARIO_ORDER) {
    scenarioCounts.set(scenarioId, 0)
  }
  for (const scenario of scenarios) {
    scenarioCounts.set(scenario.scenario_id, (scenarioCounts.get(scenario.scenario_id) ?? 0) + 1)
  }
  for (const scenarioId of QPM_CANONICAL_SCENARIO_ORDER) {
    const count = scenarioCounts.get(scenarioId) ?? 0
    if (count === 0) {
      pushError(issues, 'scenarios', `Missing canonical scenario "${scenarioId}".`)
    } else if (count > 1) {
      pushError(issues, 'scenarios', `Scenario "${scenarioId}" appears ${count} times.`)
    }
  }

  const hasErrors = issues.length > 0
  if (
    hasErrors ||
    !attribution ||
    typeof exportedAt !== 'string' ||
    !(sourceScriptSha === null || typeof sourceScriptSha === 'string') ||
    typeof solverVersion !== 'string'
  ) {
    return { ok: false, value: null, issues }
  }

  return {
    ok: true,
    value: {
      attribution,
      parameters,
      scenarios,
      caveats,
      metadata: {
        exported_at: exportedAt,
        source_script_sha: sourceScriptSha,
        solver_version: solverVersion,
      },
    },
    issues,
  }
}
