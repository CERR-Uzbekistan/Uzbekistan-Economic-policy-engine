import type { IoBridgePayload, IoSector } from './io-types.js'

export type IoAuditCheckStatus = 'pass' | 'caveat' | 'fail'

export type IoAuditCheck = {
  id: string
  label: string
  status: IoAuditCheckStatus
  detail: string
}

export type IoAuditReport = {
  ok: boolean
  checks: IoAuditCheck[]
}

const BASELINE_RELATIVE_TOLERANCE = 0.0002
const BASELINE_ABSOLUTE_TOLERANCE = 5
const INVERSE_IDENTITY_TOLERANCE = 0.000001

function pushCheck(checks: IoAuditCheck[], check: IoAuditCheck) {
  checks.push(check)
}

function maxAbs(values: number[]): number {
  return values.reduce((max, value) => Math.max(max, Math.abs(value)), 0)
}

function multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0))
}

function leontiefIdentityResidual(payload: IoBridgePayload): number {
  const coefficients = payload.matrices.technical_coefficients
  const inverse = payload.matrices.leontief_inverse
  const n = payload.metadata.n_sectors
  let maxResidual = 0

  for (let rowIndex = 0; rowIndex < n; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < n; columnIndex += 1) {
      let product = 0
      for (let innerIndex = 0; innerIndex < n; innerIndex += 1) {
        const identityValue = rowIndex === innerIndex ? 1 : 0
        product += (identityValue - coefficients[rowIndex][innerIndex]) * inverse[innerIndex][columnIndex]
      }
      const target = rowIndex === columnIndex ? 1 : 0
      maxResidual = Math.max(maxResidual, Math.abs(product - target))
    }
  }

  return maxResidual
}

function isUsableSquareMatrix(matrix: number[][], expectedSize: number): boolean {
  return (
    matrix.length === expectedSize &&
    matrix.every(
      (row) =>
        row.length === expectedSize &&
        row.every((value) => Number.isFinite(value)),
    )
  )
}

function hasAlignedSectorArrays(payload: IoBridgePayload): boolean {
  const n = payload.metadata.n_sectors
  const dictionaryCodes = payload.sector_dictionary.map((entry) => entry.code)
  return (
    payload.sectors.length === n &&
    payload.totals.output_thousand_uzs.length === n &&
    payload.totals.total_resources_thousand_uzs.length === n &&
    payload.totals.final_demand_thousand_uzs.length === n &&
    payload.totals.imports_thousand_uzs.length === n &&
    payload.sectors.every((sector, index) => {
      const employmentAligned =
        sector.employment_total === undefined ||
        (Number.isFinite(sector.employment_total) &&
          sector.employment_formal !== undefined &&
          sector.employment_informal !== undefined)
      return (
        sector.id === index &&
        sector.code === dictionaryCodes[index] &&
        sector.code.length > 0 &&
        employmentAligned
      )
    })
  )
}

function hasValidNonNegativeFields(sectors: IoSector[], technicalCoefficients: number[][]): boolean {
  return (
    sectors.every(
      (sector) =>
        sector.output_thousand_uzs >= 0 &&
        sector.total_resources_thousand_uzs >= 0 &&
        sector.imports_thousand_uzs >= 0 &&
        sector.gva_thousand_uzs >= 0 &&
        sector.compensation_of_employees_thousand_uzs >= 0 &&
        sector.gross_operating_surplus_thousand_uzs >= 0 &&
        sector.output_multiplier >= 0 &&
        sector.value_added_multiplier >= 0 &&
        (sector.employment_total === undefined || sector.employment_total >= 0) &&
        (sector.employment_formal === undefined || sector.employment_formal >= 0) &&
        (sector.employment_informal === undefined || sector.employment_informal >= 0),
    ) &&
    technicalCoefficients.every((row) => row.every((value) => value >= 0))
  )
}

function baselineReconstructionCheck(payload: IoBridgePayload): IoAuditCheck {
  const reconstructed = multiplyMatrixVector(
    payload.matrices.leontief_inverse,
    payload.totals.final_demand_thousand_uzs,
  )
  const residuals = reconstructed.map(
    (value, index) => value - payload.totals.total_resources_thousand_uzs[index],
  )
  const maxResidual = maxAbs(residuals)
  const denominator = Math.max(1, maxAbs(payload.totals.total_resources_thousand_uzs))
  const relativeResidual = maxResidual / denominator
  const withinTolerance =
    maxResidual <= BASELINE_ABSOLUTE_TOLERANCE ||
    relativeResidual <= BASELINE_RELATIVE_TOLERANCE

  return {
    id: 'baseline-reconstruction',
    label: 'Baseline reconstruction',
    status: withinTolerance ? 'pass' : 'fail',
    detail: `L * final demand reconstructs total resources with max residual ${maxResidual.toFixed(
      3,
    )} source units and relative residual ${relativeResidual.toExponential(3)}.`,
  }
}

function inverseIdentityCheck(payload: IoBridgePayload): IoAuditCheck {
  const maxResidual = leontiefIdentityResidual(payload)
  const withinTolerance = maxResidual <= INVERSE_IDENTITY_TOLERANCE

  return {
    id: 'leontief-identity',
    label: 'Leontief identity check',
    status: withinTolerance ? 'pass' : 'fail',
    detail: `(I - A) * L approximates identity with max residual ${maxResidual.toExponential(3)}.`,
  }
}

export function auditIoBridgePayload(payload: IoBridgePayload): IoAuditReport {
  const checks: IoAuditCheck[] = []
  const n = payload.metadata.n_sectors
  const leontiefUsable = isUsableSquareMatrix(payload.matrices.leontief_inverse, n)
  const technicalCoefficientsUsable = isUsableSquareMatrix(payload.matrices.technical_coefficients, n)

  pushCheck(checks, {
    id: 'leontief-inverse',
    label: 'Leontief inverse exists',
    status: leontiefUsable ? 'pass' : 'fail',
    detail: leontiefUsable
      ? `Leontief inverse is a finite ${n} x ${n} matrix.`
      : 'Leontief inverse is missing, non-square, or contains non-finite values.',
  })

  pushCheck(checks, {
    id: 'sector-array-alignment',
    label: 'Sector arrays align',
    status: hasAlignedSectorArrays(payload) ? 'pass' : 'fail',
    detail:
      'Sector output, final demand, value added, import, employment, and dictionary arrays use the same sector order.',
  })

  pushCheck(checks, {
    id: 'non-negative-impossible-fields',
    label: 'Impossible negatives absent',
    status:
      technicalCoefficientsUsable &&
      hasValidNonNegativeFields(payload.sectors, payload.matrices.technical_coefficients)
        ? 'pass'
        : 'fail',
    detail:
      'Technical coefficients, output, imports, value added, multipliers, and employment fields are non-negative; inventory final demand may be negative.',
  })

  if (leontiefUsable && technicalCoefficientsUsable) {
    pushCheck(checks, inverseIdentityCheck(payload))
    pushCheck(checks, baselineReconstructionCheck(payload))
  }

  return {
    ok: checks.every((check) => check.status !== 'fail'),
    checks,
  }
}
