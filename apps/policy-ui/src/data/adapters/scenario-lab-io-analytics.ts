import type {
  ScenarioLabIoAnalyticsWorkspace,
  ScenarioLabIoDistributionMode,
  ScenarioLabIoSectorEffect,
  ScenarioLabIoShockRequest,
  ScenarioLabIoShockResult,
} from '../../contracts/data-contract.js'
import { toIoAdapterOutput } from '../bridge/io-adapter.js'
import type { IoBridgePayload, IoSector } from '../bridge/io-types.js'

const TOP_EFFECT_COUNT = 10
const THOUSAND_UZS_PER_BLN_UZS = 1_000_000
const MCP_OUTPUT_RAW_PER_BLN_UZS = 1_000
const DEFAULT_EXCHANGE_RATE_UZS_PER_USD = 12_652.7

function round(value: number, digits = 3): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function toBlnUzS(valueThousandUzS: number): number {
  return valueThousandUzS / THOUSAND_UZS_PER_BLN_UZS
}

function positiveWeight(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function weightsForDistribution(
  sectors: IoSector[],
  distribution: ScenarioLabIoDistributionMode,
  sectorCode: string | undefined,
): number[] {
  if (distribution === 'sector') {
    const selectedIndex = sectors.findIndex((sector) => sector.code === sectorCode)
    return sectors.map((_, index) => (index === selectedIndex ? 1 : 0))
  }

  if (distribution === 'equal') {
    return sectors.map(() => 1)
  }

  if (distribution === 'gva') {
    return sectors.map((sector) => positiveWeight(sector.gva_thousand_uzs))
  }

  return sectors.map((sector) => positiveWeight(sector.output_thousand_uzs))
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
  if (sector.output_thousand_uzs <= 0) {
    return 0
  }
  return sector.gva_thousand_uzs / sector.output_thousand_uzs
}

function employmentCoefficient(sector: IoSector): number | null {
  if (sector.employment_total === undefined || sector.output_thousand_uzs <= 0) {
    return null
  }
  // Employment arrays come from the MCP I-O source, where sector output is
  // interpreted as million UZS. Keep monetary UI outputs on the existing public
  // bridge scale, but compute employment intensity with the MCP model scale.
  return sector.employment_total / (sector.output_thousand_uzs / MCP_OUTPUT_RAW_PER_BLN_UZS)
}

function toBlnUzSShock(request: ScenarioLabIoShockRequest): number {
  if (request.currency === 'mln_usd') {
    const fx = request.exchange_rate_uzs_per_usd ?? DEFAULT_EXCHANGE_RATE_UZS_PER_USD
    return (request.amount * fx) / 1000
  }
  return request.amount
}

export function toScenarioLabIoAnalyticsWorkspace(
  payload: IoBridgePayload,
): ScenarioLabIoAnalyticsWorkspace {
  return {
    source_artifact: payload.metadata.source_artifact,
    data_vintage: payload.attribution.data_version,
    exported_at: payload.metadata.exported_at,
    framework: payload.metadata.framework,
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
        ? 'Employment effects use sector employment arrays from the MCP-converted I-O source and should be read as linear employment-intensity estimates.'
        : 'Employment effects are unavailable in the current public I-O bridge artifact.',
    ],
  }
}

export function runScenarioLabIoDemandShock(
  payload: IoBridgePayload,
  request: ScenarioLabIoShockRequest,
): ScenarioLabIoShockResult {
  const adapterOutput = toIoAdapterOutput(payload)
  const weights = normalizeWeights(
    weightsForDistribution(payload.sectors, request.distribution, request.sector_code),
  )
  const shockBlnUzS = toBlnUzSShock(request)
  const shockThousandUzS = shockBlnUzS * THOUSAND_UZS_PER_BLN_UZS
  const demandShock = weights.map((weight) => weight * shockThousandUzS)
  const outputEffects = multiplyMatrixVector(payload.matrices.leontief_inverse, demandShock)
  const valueAddedEffects = outputEffects.map(
    (outputEffect, index) => outputEffect * valueAddedCoefficient(payload.sectors[index]),
  )
  const employmentEffects = outputEffects.map((outputEffect, index) => {
    const coefficient = employmentCoefficient(payload.sectors[index])
    return coefficient === null ? null : toBlnUzS(outputEffect) * coefficient
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
      .sort((left, right) => Math.abs(right.output_effect_bln_uzs) - Math.abs(left.output_effect_bln_uzs))
      .slice(0, TOP_EFFECT_COUNT),
    caveats: toScenarioLabIoAnalyticsWorkspace(payload).caveats,
  }
}
