import type { ChartSpec } from '../../contracts/data-contract.js'

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function shouldUseZeroBaseline(spec: ChartSpec): boolean {
  if (spec.chart_type === 'bar') {
    return true
  }
  return spec.chart_id === 'artifact_nowcast_bridge'
}

export function toYAxisDomain(spec: ChartSpec): ['auto', 'auto'] | [number, number] {
  const seriesValues = spec.series.flatMap((series) => series.values.filter(isFiniteNumber))
  const uncertaintyBounds = spec.uncertainty.flatMap((band) => [
    ...band.lower.filter(isFiniteNumber),
    ...band.upper.filter(isFiniteNumber),
  ])
  const values = [...seriesValues, ...uncertaintyBounds]

  if (values.length === 0) {
    return ['auto', 'auto']
  }

  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = maxValue - minValue
  const padding = Math.max(range * 0.15, 0.5)
  if (shouldUseZeroBaseline(spec)) {
    if (minValue >= 0) {
      return [0, maxValue + padding]
    }
    if (maxValue <= 0) {
      return [minValue - padding, 0]
    }
  }
  return [minValue - padding, maxValue + padding]
}
