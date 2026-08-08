import type { ChartSpec, UncertaintyBand } from '../../contracts/data-contract.js'
import { prettyPrintMethodologyLabel } from './chart-label-utils.js'

export type BandMeta = {
  band: UncertaintyBand
  lowerKey: string
  upperKey: string
  name: string
  patternId: string
}

export function toBandMeta(spec: ChartSpec): BandMeta[] {
  return spec.uncertainty.map((band) => {
    const prettyLabel = prettyPrintMethodologyLabel(band.methodology_label)
    return {
      band,
      lowerKey: `band__${band.series_id}__${band.confidence_level}__lower`,
      upperKey: `band__${band.series_id}__${band.confidence_level}__upper`,
      name: band.is_illustrative
        ? `(illustrative) ${band.confidence_level}% ${prettyLabel}`
        : `${band.confidence_level}% ${prettyLabel}`,
      patternId: `band__${spec.chart_id}__${band.series_id}__illustrative`,
    }
  })
}
