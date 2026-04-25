import type { Caveat, ModelAttribution } from '../../contracts/data-contract.js'
import type { IoBridgePayload, IoFinalDemand, IoMetadata, IoSector } from './io-types.js'

export type IoValidationIssue = {
  path: string
  message: string
  severity: 'error'
}

export type IoValidationResult = {
  ok: boolean
  value: IoBridgePayload | null
  issues: IoValidationIssue[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function pushError(issues: IoValidationIssue[], path: string, message: string) {
  issues.push({ path, message, severity: 'error' })
}

function nonEmptyString(value: unknown, issues: IoValidationIssue[], path: string): string | null {
  if (typeof value !== 'string' || value.length === 0) {
    pushError(issues, path, 'Expected a non-empty string.')
    return null
  }
  return value
}

function finiteNumber(value: unknown, issues: IoValidationIssue[], path: string): number | null {
  if (!isFiniteNumber(value)) {
    pushError(issues, path, 'Expected a finite number.')
    return null
  }
  return value
}

function integer(value: unknown, issues: IoValidationIssue[], path: string, min = 0): number | null {
  if (!Number.isInteger(value) || (value as number) < min) {
    pushError(issues, path, `Expected an integer >= ${min}.`)
    return null
  }
  return value as number
}

function parseAttribution(value: unknown, issues: IoValidationIssue[]): ModelAttribution | null {
  if (!isRecord(value)) {
    pushError(issues, 'attribution', 'Expected an object.')
    return null
  }
  const output = {} as ModelAttribution
  let ok = true
  for (const field of ['model_id', 'model_name', 'module', 'version', 'run_id', 'data_version', 'timestamp'] as const) {
    const parsed = nonEmptyString(value[field], issues, `attribution.${field}`)
    if (!parsed) {
      ok = false
      continue
    }
    output[field] = parsed
  }
  return ok ? output : null
}

function parseStringArray(value: unknown, issues: IoValidationIssue[], path: string): string[] | null {
  if (!Array.isArray(value)) {
    pushError(issues, path, 'Expected an array of strings.')
    return null
  }
  let ok = true
  const output: string[] = []
  value.forEach((entry, index) => {
    if (typeof entry !== 'string') {
      pushError(issues, `${path}[${index}]`, 'Expected a string.')
      ok = false
      return
    }
    output.push(entry)
  })
  return ok ? output : null
}

function parseCaveats(value: unknown, issues: IoValidationIssue[]): Caveat[] | null {
  if (!Array.isArray(value)) {
    pushError(issues, 'caveats', 'Expected an array.')
    return null
  }
  let ok = true
  const caveats: Caveat[] = []
  value.forEach((entry, index) => {
    const path = `caveats[${index}]`
    if (!isRecord(entry)) {
      pushError(issues, path, 'Expected an object.')
      ok = false
      return
    }
    const caveatId = nonEmptyString(entry.caveat_id, issues, `${path}.caveat_id`)
    const severity = entry.severity
    const message = nonEmptyString(entry.message, issues, `${path}.message`)
    const affectedMetrics = parseStringArray(entry.affected_metrics, issues, `${path}.affected_metrics`)
    const affectedModels = parseStringArray(entry.affected_models, issues, `${path}.affected_models`)
    if (!(severity === 'info' || severity === 'warning' || severity === 'critical')) {
      pushError(issues, `${path}.severity`, 'Expected one of info|warning|critical.')
      ok = false
    }
    if (!caveatId || !message || !affectedMetrics || !affectedModels) {
      ok = false
      return
    }
    if (severity === 'info' || severity === 'warning' || severity === 'critical') {
      caveats.push({
        caveat_id: caveatId,
        severity,
        message,
        affected_metrics: affectedMetrics,
        affected_models: affectedModels,
      })
    }
  })
  return ok ? caveats : null
}

function parseMetadata(value: unknown, issues: IoValidationIssue[]): IoMetadata | null {
  if (!isRecord(value)) {
    pushError(issues, 'metadata', 'Expected an object.')
    return null
  }
  const exportedAt = nonEmptyString(value.exported_at, issues, 'metadata.exported_at')
  const sourceScriptSha = value.source_script_sha
  const solverVersion = nonEmptyString(value.solver_version, issues, 'metadata.solver_version')
  const sourceArtifact = nonEmptyString(value.source_artifact, issues, 'metadata.source_artifact')
  const sourceArtifactGenerated = nonEmptyString(
    value.source_artifact_generated,
    issues,
    'metadata.source_artifact_generated',
  )
  const sourceTitle = nonEmptyString(value.source_title, issues, 'metadata.source_title')
  const source = nonEmptyString(value.source, issues, 'metadata.source')
  const framework = nonEmptyString(value.framework, issues, 'metadata.framework')
  const units = nonEmptyString(value.units, issues, 'metadata.units')
  const baseYear = integer(value.base_year, issues, 'metadata.base_year', 1900)
  const nSectors = integer(value.n_sectors, issues, 'metadata.n_sectors', 1)
  if (!(sourceScriptSha === null || typeof sourceScriptSha === 'string')) {
    pushError(issues, 'metadata.source_script_sha', 'Expected a string or null.')
  }
  if (
    !exportedAt ||
    !(sourceScriptSha === null || typeof sourceScriptSha === 'string') ||
    !solverVersion ||
    !sourceArtifact ||
    !sourceArtifactGenerated ||
    !sourceTitle ||
    !source ||
    !framework ||
    !units ||
    baseYear === null ||
    nSectors === null
  ) {
    return null
  }
  return {
    exported_at: exportedAt,
    source_script_sha: sourceScriptSha,
    solver_version: solverVersion,
    source_artifact: sourceArtifact,
    source_artifact_generated: sourceArtifactGenerated,
    source_title: sourceTitle,
    source,
    framework,
    units,
    base_year: baseYear,
    n_sectors: nSectors,
  }
}

function parseFinalDemand(value: unknown, issues: IoValidationIssue[], path: string): IoFinalDemand | null {
  if (!isRecord(value)) {
    pushError(issues, path, 'Expected an object.')
    return null
  }
  const household = finiteNumber(value.household, issues, `${path}.household`)
  const government = finiteNumber(value.government, issues, `${path}.government`)
  const npish = finiteNumber(value.npish, issues, `${path}.npish`)
  const gfcf = finiteNumber(value.gfcf, issues, `${path}.gfcf`)
  const inventories = finiteNumber(value.inventories, issues, `${path}.inventories`)
  const exportsValue = finiteNumber(value.exports, issues, `${path}.exports`)
  const total = finiteNumber(value.total, issues, `${path}.total`)
  if (
    household === null ||
    government === null ||
    npish === null ||
    gfcf === null ||
    inventories === null ||
    exportsValue === null ||
    total === null
  ) {
    return null
  }
  return { household, government, npish, gfcf, inventories, exports: exportsValue, total }
}

function optionalFiniteNumber(value: unknown, issues: IoValidationIssue[], path: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (!isFiniteNumber(value)) {
    pushError(issues, path, 'Expected a finite number when present.')
    return undefined
  }
  return value
}

function parseSectors(value: unknown, issues: IoValidationIssue[], expectedLength: number): IoSector[] | null {
  if (!Array.isArray(value)) {
    pushError(issues, 'sectors', 'Expected an array.')
    return null
  }
  let ok = value.length === expectedLength
  if (!ok) pushError(issues, 'sectors', `Expected ${expectedLength} sectors.`)
  const sectors: IoSector[] = []
  value.forEach((entry, index) => {
    const path = `sectors[${index}]`
    if (!isRecord(entry)) {
      pushError(issues, path, 'Expected an object.')
      ok = false
      return
    }
    const id = integer(entry.id, issues, `${path}.id`)
    const code = nonEmptyString(entry.code, issues, `${path}.code`)
    const nameRu = nonEmptyString(entry.name_ru, issues, `${path}.name_ru`)
    const output = finiteNumber(entry.output_thousand_uzs, issues, `${path}.output_thousand_uzs`)
    const totalResources = finiteNumber(
      entry.total_resources_thousand_uzs,
      issues,
      `${path}.total_resources_thousand_uzs`,
    )
    const imports = finiteNumber(entry.imports_thousand_uzs, issues, `${path}.imports_thousand_uzs`)
    const gva = finiteNumber(entry.gva_thousand_uzs, issues, `${path}.gva_thousand_uzs`)
    const coe = finiteNumber(
      entry.compensation_of_employees_thousand_uzs,
      issues,
      `${path}.compensation_of_employees_thousand_uzs`,
    )
    const gos = finiteNumber(
      entry.gross_operating_surplus_thousand_uzs,
      issues,
      `${path}.gross_operating_surplus_thousand_uzs`,
    )
    const outputMultiplier = finiteNumber(entry.output_multiplier, issues, `${path}.output_multiplier`)
    const valueAddedMultiplier = finiteNumber(
      entry.value_added_multiplier,
      issues,
      `${path}.value_added_multiplier`,
    )
    const employmentTotal = optionalFiniteNumber(entry.employment_total, issues, `${path}.employment_total`)
    const employmentFormal = optionalFiniteNumber(entry.employment_formal, issues, `${path}.employment_formal`)
    const employmentInformal = optionalFiniteNumber(entry.employment_informal, issues, `${path}.employment_informal`)
    const finalDemand = parseFinalDemand(entry.final_demand, issues, `${path}.final_demand`)
    if (
      id === null ||
      !code ||
      !nameRu ||
      output === null ||
      totalResources === null ||
      imports === null ||
      gva === null ||
      coe === null ||
      gos === null ||
      outputMultiplier === null ||
      valueAddedMultiplier === null ||
      !finalDemand
    ) {
      ok = false
      return
    }
    if (id !== index) {
      pushError(issues, `${path}.id`, `Expected id to equal index ${index}.`)
      ok = false
    }
    sectors.push({
      id,
      code,
      name_ru: nameRu,
      output_thousand_uzs: output,
      total_resources_thousand_uzs: totalResources,
      imports_thousand_uzs: imports,
      gva_thousand_uzs: gva,
      compensation_of_employees_thousand_uzs: coe,
      gross_operating_surplus_thousand_uzs: gos,
      employment_total: employmentTotal,
      employment_formal: employmentFormal,
      employment_informal: employmentInformal,
      output_multiplier: outputMultiplier,
      value_added_multiplier: valueAddedMultiplier,
      final_demand: finalDemand,
    })
  })
  return ok ? sectors : null
}

function parseNumberArray(value: unknown, issues: IoValidationIssue[], path: string, expectedLength: number): number[] | null {
  if (!Array.isArray(value)) {
    pushError(issues, path, 'Expected an array of finite numbers.')
    return null
  }
  let ok = value.length === expectedLength
  if (!ok) pushError(issues, path, `Expected ${expectedLength} entries.`)
  const output: number[] = []
  value.forEach((entry, index) => {
    if (!isFiniteNumber(entry)) {
      pushError(issues, `${path}[${index}]`, 'Expected a finite number.')
      ok = false
      return
    }
    output.push(entry)
  })
  return ok ? output : null
}

function parseMatrix(value: unknown, issues: IoValidationIssue[], path: string, expectedSize: number): number[][] | null {
  if (!Array.isArray(value)) {
    pushError(issues, path, 'Expected a matrix array.')
    return null
  }
  let ok = value.length === expectedSize
  if (!ok) pushError(issues, path, `Expected ${expectedSize} rows.`)
  const matrix: number[][] = []
  value.forEach((row, index) => {
    const parsed = parseNumberArray(row, issues, `${path}[${index}]`, expectedSize)
    if (!parsed) {
      ok = false
      return
    }
    matrix.push(parsed)
  })
  return ok ? matrix : null
}

export function validateIoBridgePayload(value: unknown): IoValidationResult {
  const issues: IoValidationIssue[] = []
  if (!isRecord(value)) {
    return {
      ok: false,
      value: null,
      issues: [{ path: '$', message: 'IO bridge payload must be an object.', severity: 'error' }],
    }
  }
  const attribution = parseAttribution(value.attribution, issues)
  const metadata = parseMetadata(value.metadata, issues)
  const n = metadata?.n_sectors ?? 0
  const sectors = n > 0 ? parseSectors(value.sectors, issues, n) : null
  const matricesRecord = isRecord(value.matrices) ? value.matrices : null
  if (!matricesRecord) pushError(issues, 'matrices', 'Expected an object.')
  const technicalCoefficients = matricesRecord
    ? parseMatrix(matricesRecord.technical_coefficients, issues, 'matrices.technical_coefficients', n)
    : null
  const leontiefInverse = matricesRecord
    ? parseMatrix(matricesRecord.leontief_inverse, issues, 'matrices.leontief_inverse', n)
    : null
  const totalsRecord = isRecord(value.totals) ? value.totals : null
  if (!totalsRecord) pushError(issues, 'totals', 'Expected an object.')
  const output = totalsRecord ? parseNumberArray(totalsRecord.output_thousand_uzs, issues, 'totals.output_thousand_uzs', n) : null
  const totalResources = totalsRecord
    ? parseNumberArray(totalsRecord.total_resources_thousand_uzs, issues, 'totals.total_resources_thousand_uzs', n)
    : null
  const finalDemand = totalsRecord
    ? parseNumberArray(totalsRecord.final_demand_thousand_uzs, issues, 'totals.final_demand_thousand_uzs', n)
    : null
  const imports = totalsRecord ? parseNumberArray(totalsRecord.imports_thousand_uzs, issues, 'totals.imports_thousand_uzs', n) : null
  const caveats = parseCaveats(value.caveats, issues)

  if (
    !attribution ||
    !metadata ||
    !sectors ||
    !technicalCoefficients ||
    !leontiefInverse ||
    !output ||
    !totalResources ||
    !finalDemand ||
    !imports ||
    !caveats ||
    issues.length > 0
  ) {
    return { ok: false, value: null, issues }
  }

  return {
    ok: true,
    value: {
      attribution,
      sectors,
      matrices: { technical_coefficients: technicalCoefficients, leontief_inverse: leontiefInverse },
      totals: {
        output_thousand_uzs: output,
        total_resources_thousand_uzs: totalResources,
        final_demand_thousand_uzs: finalDemand,
        imports_thousand_uzs: imports,
      },
      caveats,
      metadata,
    },
    issues: [],
  }
}
