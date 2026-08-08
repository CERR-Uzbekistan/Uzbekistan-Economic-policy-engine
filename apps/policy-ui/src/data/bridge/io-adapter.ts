import type { ModelAttribution } from '../../contracts/data-contract.js'
import type { IoBridgePayload, IoLinkageClassification, IoSector } from './io-types.js'

export type IoSectorSummary = {
  sector_id: number
  code: string
  name_ru: string
  output_multiplier: number
  value_added_multiplier: number
  backward_linkage: number
  forward_linkage: number
  classification: IoLinkageClassification
}

export type IoAdapterOutput = {
  attribution: ModelAttribution
  metadata: {
    base_year: number
    n_sectors: number
    units: string
    framework: string
  }
  type_counts: Record<IoLinkageClassification, number>
  sectors: IoSectorSummary[]
  top_output_multipliers: IoSectorSummary[]
  top_value_added_multipliers: IoSectorSummary[]
}

const TOP_SECTOR_COUNT = 10

function classifyLinkage(backwardLinkage: number, forwardLinkage: number): IoLinkageClassification {
  if (backwardLinkage > 1 && forwardLinkage > 1) return 'key'
  if (backwardLinkage > 1) return 'backward'
  if (forwardLinkage > 1) return 'forward'
  return 'weak'
}

function round(value: number, digits = 6): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function buildLinkages(leontiefInverse: number[][]): Array<{
  backward_linkage: number
  forward_linkage: number
}> {
  const n = leontiefInverse.length
  const columnSums = new Array<number>(n).fill(0)
  const rowSums = new Array<number>(n).fill(0)
  let total = 0

  for (let rowIndex = 0; rowIndex < n; rowIndex += 1) {
    const row = leontiefInverse[rowIndex]
    for (let columnIndex = 0; columnIndex < n; columnIndex += 1) {
      const value = row[columnIndex]
      rowSums[rowIndex] += value
      columnSums[columnIndex] += value
      total += value
    }
  }

  return columnSums.map((columnSum, index) => ({
    backward_linkage: round((n * columnSum) / total),
    forward_linkage: round((n * rowSums[index]) / total),
  }))
}

function toSectorSummary(sector: IoSector, linkages: ReturnType<typeof buildLinkages>[number]): IoSectorSummary {
  return {
    sector_id: sector.id,
    code: sector.code,
    name_ru: sector.name_ru,
    output_multiplier: sector.output_multiplier,
    value_added_multiplier: sector.value_added_multiplier,
    backward_linkage: linkages.backward_linkage,
    forward_linkage: linkages.forward_linkage,
    classification: classifyLinkage(linkages.backward_linkage, linkages.forward_linkage),
  }
}

function countTypes(sectors: IoSectorSummary[]): Record<IoLinkageClassification, number> {
  const counts: Record<IoLinkageClassification, number> = { key: 0, backward: 0, forward: 0, weak: 0 }
  for (const sector of sectors) counts[sector.classification] += 1
  return counts
}

export function toIoAdapterOutput(payload: IoBridgePayload): IoAdapterOutput {
  const linkages = buildLinkages(payload.matrices.leontief_inverse)
  const sectors = payload.sectors.map((sector, index) => toSectorSummary(sector, linkages[index]))

  return {
    attribution: payload.attribution,
    metadata: {
      base_year: payload.metadata.base_year,
      n_sectors: payload.metadata.n_sectors,
      units: payload.metadata.units,
      framework: payload.metadata.framework,
    },
    type_counts: countTypes(sectors),
    sectors,
    top_output_multipliers: sectors
      .slice()
      .sort((left, right) => right.output_multiplier - left.output_multiplier)
      .slice(0, TOP_SECTOR_COUNT),
    top_value_added_multipliers: sectors
      .slice()
      .sort((left, right) => right.value_added_multiplier - left.value_added_multiplier)
      .slice(0, TOP_SECTOR_COUNT),
  }
}
