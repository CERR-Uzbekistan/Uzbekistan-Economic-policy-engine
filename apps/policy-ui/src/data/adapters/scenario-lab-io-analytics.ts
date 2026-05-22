import type {
  ScenarioLabIoAnalyticsWorkspace,
  ScenarioLabIoDemandBucket,
  ScenarioLabIoDistributionMode,
  ScenarioLabIoSectorEffect,
  ScenarioLabIoSensitivityCase,
  ScenarioLabIoSensitivityResult,
  ScenarioLabIoShockRequest,
  ScenarioLabIoShockResult,
} from '../../contracts/data-contract.js'
import { toIoAdapterOutput } from '../bridge/io-adapter.js'
import type { IoBridgePayload, IoSector } from '../bridge/io-types.js'
import { auditIoBridgePayload } from '../bridge/io-audit.js'

const TOP_EFFECT_COUNT = 10
const SOURCE_MONETARY_UNITS_PER_BLN_UZS = 1_000
const DEFAULT_EXCHANGE_RATE_UZS_PER_USD = 12_652.7
const EMPLOYMENT_SENSITIVITY_LOW = 0.85
const EMPLOYMENT_SENSITIVITY_HIGH = 1.15
const FX_SENSITIVITY_LOW = 0.95
const FX_SENSITIVITY_HIGH = 1.05

function round(value: number, digits = 3): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function toBlnUzS(valueSourceUnits: number): number {
  return valueSourceUnits / SOURCE_MONETARY_UNITS_PER_BLN_UZS
}

function toSourceMonetaryUnitsFromBlnUzS(valueBlnUzS: number): number {
  return valueBlnUzS * SOURCE_MONETARY_UNITS_PER_BLN_UZS
}

function positiveWeight(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function finalDemandWeight(sector: IoSector, demandBucket: ScenarioLabIoDemandBucket): number {
  if (demandBucket === 'consumption') {
    return positiveWeight(sector.final_demand.household) + positiveWeight(sector.final_demand.npish)
  }

  if (demandBucket === 'government') {
    return positiveWeight(sector.final_demand.government)
  }

  if (demandBucket === 'investment') {
    return positiveWeight(sector.final_demand.gfcf) + positiveWeight(sector.final_demand.inventories)
  }

  return positiveWeight(sector.final_demand.exports)
}

function weightsForDistribution(
  sectors: IoSector[],
  distribution: ScenarioLabIoDistributionMode,
  sectorCode: string | undefined,
  demandBucket: ScenarioLabIoDemandBucket,
): number[] {
  if (distribution === 'sector') {
    const selectedIndex = sectors.findIndex((sector) => sector.code === sectorCode)
    return sectors.map((_, index) => (index === selectedIndex ? 1 : 0))
  }

  if (distribution === 'final_demand') {
    return sectors.map((sector) => finalDemandWeight(sector, demandBucket))
  }

  if (distribution === 'equal') {
    return sectors.map(() => 1)
  }

  if (distribution === 'gva') {
    return sectors.map((sector) => positiveWeight(sector.gva_thousand_uzs))
  }

  return sectors.map((sector) => positiveWeight(sector.total_resources_thousand_uzs))
}

function normalizeWeights(weights: number[]): number[] {
  const total = weights.reduce((sum, value) => sum + value, 0)
  if (total <= 0) {
    return weights.map(() => 1 / weights.length)
  }
  return weights.map((value) => value / total)
}

function multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0))
}

function valueAddedCoefficient(sector: IoSector): number {
  if (sector.total_resources_thousand_uzs <= 0) {
    return 0
  }
  return sector.gva_thousand_uzs / sector.total_resources_thousand_uzs
}

function employmentCoefficient(sector: IoSector): number | null {
  if (sector.employment_total === undefined || sector.total_resources_thousand_uzs <= 0) {
    return null
  }
  return sector.employment_total / toBlnUzS(sector.total_resources_thousand_uzs)
}

function toBlnUzSShock(request: ScenarioLabIoShockRequest): number {
  if (request.currency === 'mln_usd') {
    const fx = request.exchange_rate_uzs_per_usd ?? DEFAULT_EXCHANGE_RATE_UZS_PER_USD
    return (request.amount * fx) / 1000
  }
  return request.amount
}

function compareSectorEffects(left: ScenarioLabIoSectorEffect, right: ScenarioLabIoSectorEffect): number {
  const magnitudeDifference =
    Math.abs(right.output_effect_bln_uzs) - Math.abs(left.output_effect_bln_uzs)
  if (magnitudeDifference !== 0) {
    return magnitudeDifference
  }
  return left.sector_code.localeCompare(right.sector_code, 'en')
}

function importLeakageShare(
  sectors: IoSector[],
  distribution: ScenarioLabIoDistributionMode,
  sectorCode: string | undefined,
  demandBucket: ScenarioLabIoDemandBucket,
): number {
  const weights = normalizeWeights(weightsForDistribution(sectors, distribution, sectorCode, demandBucket))
  return weights.reduce((sum, weight, index) => {
    const sector = sectors[index]
    const importShare =
      sector.total_resources_thousand_uzs > 0
        ? Math.min(1, Math.max(0, sector.imports_thousand_uzs / sector.total_resources_thousand_uzs))
        : 0
    return sum + weight * importShare
  }, 0)
}

function toSensitivityCase(
  id: string,
  label: string,
  assumption: string,
  result: ScenarioLabIoShockResult,
): ScenarioLabIoSensitivityCase {
  return {
    id,
    label,
    assumption,
    output_effect_bln_uzs: result.totals.output_effect_bln_uzs,
    value_added_effect_bln_uzs: result.totals.value_added_effect_bln_uzs,
    employment_effect_persons: result.totals.employment_effect_persons,
    aggregate_output_multiplier: result.totals.aggregate_output_multiplier,
  }
}

export function toScenarioLabIoAnalyticsWorkspace(
  payload: IoBridgePayload,
): ScenarioLabIoAnalyticsWorkspace {
  const audit = auditIoBridgePayload(payload)
  return {
    source_artifact: payload.metadata.source_artifact,
    data_vintage: payload.attribution.data_version,
    exported_at: payload.metadata.exported_at,
    framework: payload.metadata.framework.replace(/\bIO\b/g, 'I-O'),
    units: payload.metadata.units,
    base_year: payload.metadata.base_year,
    sector_count: payload.metadata.n_sectors,
    sectors: payload.sectors.map((sector) => ({
      code: sector.code,
      name: sector.name_ru,
    })),
    caveats: [
      ...payload.caveats.map((caveat) => caveat.message),
      payload.sectors.every((sector) => sector.employment_total !== undefined)
        ? 'Employment effects use sector employment arrays from the tracked I-O source and should be read as linear employment-intensity estimates.'
        : 'Employment effects are unavailable in the current public I-O bridge artifact.',
    ],
    audit: {
      ok: audit.ok,
      passed: audit.checks.filter((check) => check.status === 'pass').length,
      caveats: audit.checks.filter((check) => check.status === 'caveat').length,
      failed: audit.checks.filter((check) => check.status === 'fail').length,
      checks: audit.checks,
    },
  }
}

function runScenarioLabIoDemandShockCore(
  payload: IoBridgePayload,
  request: ScenarioLabIoShockRequest,
  options: {
    shockScale?: number
    employmentScale?: number
    fxScale?: number
  } = {},
): ScenarioLabIoShockResult {
  const adapterOutput = toIoAdapterOutput(payload)
  const weights = normalizeWeights(
    weightsForDistribution(
      payload.sectors,
      request.distribution,
      request.sector_code,
      request.demand_bucket,
    ),
  )
  const fxAdjustedRequest =
    request.currency === 'mln_usd' && options.fxScale !== undefined
      ? {
          ...request,
          exchange_rate_uzs_per_usd:
            (request.exchange_rate_uzs_per_usd ?? DEFAULT_EXCHANGE_RATE_UZS_PER_USD) * options.fxScale,
        }
      : request
  const shockBlnUzS = toBlnUzSShock(fxAdjustedRequest) * (options.shockScale ?? 1)
  const shockSourceUnits = toSourceMonetaryUnitsFromBlnUzS(shockBlnUzS)
  const demandShock = weights.map((weight) => weight * shockSourceUnits)
  const outputEffects = multiplyMatrixVector(payload.matrices.leontief_inverse, demandShock)
  const valueAddedEffects = outputEffects.map(
    (outputEffect, index) => outputEffect * valueAddedCoefficient(payload.sectors[index]),
  )
  const employmentEffects = outputEffects.map((outputEffect, index) => {
    const coefficient = employmentCoefficient(payload.sectors[index])
    return coefficient === null
      ? null
      : toBlnUzS(outputEffect) * coefficient * (options.employmentScale ?? 1)
  })
  const sectorEffects: ScenarioLabIoSectorEffect[] = payload.sectors.map((sector, index) => {
    const sectorSummary = adapterOutput.sectors[index]
    return {
      sector_code: sector.code,
      sector_name: sector.name_ru,
      output_effect_bln_uzs: round(toBlnUzS(outputEffects[index])),
      value_added_effect_bln_uzs: round(toBlnUzS(valueAddedEffects[index])),
      output_multiplier: round(sector.output_multiplier, 3),
      value_added_multiplier: round(sector.value_added_multiplier, 3),
      backward_linkage: round(sectorSummary.backward_linkage, 3),
      forward_linkage: round(sectorSummary.forward_linkage, 3),
      linkage_classification: sectorSummary.classification,
      employment_effect_persons:
        employmentEffects[index] === null ? null : Math.round(employmentEffects[index] as number),
    }
  })
  const totalOutputEffect = outputEffects.reduce((sum, value) => sum + value, 0)
  const totalValueAddedEffect = valueAddedEffects.reduce((sum, value) => sum + value, 0)
  const knownEmploymentEffects = employmentEffects.filter((value): value is number => value !== null)
  const totalEmploymentEffect =
    knownEmploymentEffects.length === employmentEffects.length
      ? Math.round(knownEmploymentEffects.reduce((sum, value) => sum + value, 0))
      : null
  const totalOutputBlnUzS = toBlnUzS(totalOutputEffect)
  const totalValueAddedBlnUzS = toBlnUzS(totalValueAddedEffect)

  return {
    request,
    totals: {
      input_shock: request.amount,
      input_currency: request.currency,
      demand_shock_bln_uzs: round(shockBlnUzS),
      output_effect_bln_uzs: round(totalOutputBlnUzS),
      value_added_effect_bln_uzs: round(totalValueAddedBlnUzS),
      gdp_accounting_contribution_bln_uzs: round(totalValueAddedBlnUzS),
      employment_effect_persons: totalEmploymentEffect,
      aggregate_output_multiplier: shockBlnUzS === 0 ? null : round(totalOutputBlnUzS / shockBlnUzS, 3),
    },
    top_sectors: sectorEffects
      .slice()
      .sort(compareSectorEffects)
      .slice(0, TOP_EFFECT_COUNT),
    sensitivity: {
      allocation_modes: [],
      parameter_ranges: [],
    },
    caveats: toScenarioLabIoAnalyticsWorkspace(payload).caveats,
  }
}

function buildSensitivity(
  payload: IoBridgePayload,
  request: ScenarioLabIoShockRequest,
  baseResult: ScenarioLabIoShockResult,
): ScenarioLabIoSensitivityResult {
  const selectedSectorCode = payload.sectors.some((sector) => sector.code === request.sector_code)
    ? request.sector_code
    : payload.sectors[0]?.code
  const allocationModes: ScenarioLabIoSensitivityCase[] = [
    toSensitivityCase(
      'allocation-final-demand',
      'Selected final-demand shares',
      'Uses the selected final-demand bucket as allocation weights.',
      runScenarioLabIoDemandShockCore(payload, {
        ...request,
        distribution: 'final_demand',
        sector_code: undefined,
      }),
    ),
    toSensitivityCase(
      'allocation-output',
      'Sector resource shares',
      'Allocates the same shock by baseline total-resource shares.',
      runScenarioLabIoDemandShockCore(payload, {
        ...request,
        distribution: 'output',
        sector_code: undefined,
      }),
    ),
    toSensitivityCase(
      'allocation-sector',
      'One selected sector',
      `Assigns the shock to ${selectedSectorCode ?? 'the first available sector'}.`,
      runScenarioLabIoDemandShockCore(payload, {
        ...request,
        distribution: 'sector',
        sector_code: selectedSectorCode,
      }),
    ),
  ]

  const leakageShare = importLeakageShare(
    payload.sectors,
    request.distribution,
    request.sector_code,
    request.demand_bucket,
  )
  const retainedDemandBase = Math.max(0, 1 - leakageShare)
  const retainedDemandLowLeakage = Math.max(0, 1 - leakageShare * 0.75)
  const retainedDemandHighLeakage = Math.max(0, 1 - leakageShare * 1.25)
  const fxActive = request.currency === 'mln_usd'
  const parameterRanges: ScenarioLabIoSensitivityCase[] = [
    toSensitivityCase(
      'employment-low',
      'Employment intensity low',
      '-15% fixed employment coefficient.',
      runScenarioLabIoDemandShockCore(payload, request, { employmentScale: EMPLOYMENT_SENSITIVITY_LOW }),
    ),
    toSensitivityCase(
      'employment-base',
      'Employment intensity base',
      'Source employment coefficient.',
      baseResult,
    ),
    toSensitivityCase(
      'employment-high',
      'Employment intensity high',
      '+15% fixed employment coefficient.',
      runScenarioLabIoDemandShockCore(payload, request, { employmentScale: EMPLOYMENT_SENSITIVITY_HIGH }),
    ),
    toSensitivityCase(
      'import-leakage-low',
      'Import leakage low',
      `Applies a lower additional import-leakage scaler; weighted import share is ${round(leakageShare * 100, 1)}%.`,
      runScenarioLabIoDemandShockCore(payload, request, { shockScale: retainedDemandLowLeakage }),
    ),
    toSensitivityCase(
      'import-leakage-base',
      'Import leakage base',
      'Applies the weighted import share as an additional domestic-demand scaler.',
      runScenarioLabIoDemandShockCore(payload, request, { shockScale: retainedDemandBase }),
    ),
    toSensitivityCase(
      'import-leakage-high',
      'Import leakage high',
      'Applies a higher additional import-leakage scaler.',
      runScenarioLabIoDemandShockCore(payload, request, { shockScale: retainedDemandHighLeakage }),
    ),
    toSensitivityCase(
      'fx-low',
      'FX conversion low',
      fxActive ? '-5% UZS/USD conversion assumption.' : 'Not active for UZS-denominated shocks.',
      runScenarioLabIoDemandShockCore(payload, request, { fxScale: fxActive ? FX_SENSITIVITY_LOW : 1 }),
    ),
    toSensitivityCase(
      'fx-base',
      'FX conversion base',
      fxActive ? 'Selected UZS/USD conversion assumption.' : 'Not active for UZS-denominated shocks.',
      baseResult,
    ),
    toSensitivityCase(
      'fx-high',
      'FX conversion high',
      fxActive ? '+5% UZS/USD conversion assumption.' : 'Not active for UZS-denominated shocks.',
      runScenarioLabIoDemandShockCore(payload, request, { fxScale: fxActive ? FX_SENSITIVITY_HIGH : 1 }),
    ),
  ]

  return {
    allocation_modes: allocationModes,
    parameter_ranges: parameterRanges,
  }
}

export function runScenarioLabIoDemandShock(
  payload: IoBridgePayload,
  request: ScenarioLabIoShockRequest,
): ScenarioLabIoShockResult {
  const result = runScenarioLabIoDemandShockCore(payload, request)
  return {
    ...result,
    sensitivity: buildSensitivity(payload, request, result),
  }
}
