import type { ChartSpec } from '../../contracts/data-contract.js'

export type YAxisScale = {
  domain: ['auto', 'auto'] | [number, number]
  ticks?: number[]
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function shouldUseZeroBaseline(spec: ChartSpec): boolean {
  if (spec.chart_type === 'bar') {
    return true
  }
  return spec.chart_id === 'artifact_nowcast_bridge'
}

function collectValues(spec: ChartSpec): number[] {
  const seriesValues = spec.series.flatMap((series) => series.values.filter(isFiniteNumber))
  const uncertaintyBounds = spec.uncertainty.flatMap((band) => [
    ...band.lower.filter(isFiniteNumber),
    ...band.upper.filter(isFiniteNumber),
  ])
  return [...seriesValues, ...uncertaintyBounds]
}

function roundTick(value: number): number {
  return Number(value.toFixed(6))
}

function niceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1
  }

  const exponent = Math.floor(Math.log10(rawStep))
  const scale = 10 ** exponent
  const normalized = rawStep / scale
  const nice =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 2.5
          ? 2.5
          : normalized <= 5
            ? 5
            : 10

  return nice * scale
}

function minimumLinePadding(spec: ChartSpec, range: number, maxAbs: number): number {
  if (range > 0) {
    if (spec.y.unit === '%' || spec.y.unit === '% GDP' || spec.y.unit === 'pp') {
      return Math.max(range * 0.18, 0.05)
    }
    return Math.max(range * 0.15, maxAbs < 10 ? 0.1 : 0.5)
  }

  if (spec.y.unit === '%' || spec.y.unit === '% GDP' || spec.y.unit === 'pp') {
    return Math.max(maxAbs * 0.035, 0.2)
  }
  return Math.max(maxAbs * 0.035, 0.5)
}

function toNiceLineScale(spec: ChartSpec, minValue: number, maxValue: number): YAxisScale {
  const range = maxValue - minValue
  const maxAbs = Math.max(Math.abs(minValue), Math.abs(maxValue), 0)
  const padding = minimumLinePadding(spec, range, maxAbs)
  const paddedMin = minValue - padding
  const paddedMax = maxValue + padding
  const step = niceStep((paddedMax - paddedMin) / 4)
  const niceMin = roundTick(Math.floor(paddedMin / step) * step)
  const niceMax = roundTick(Math.ceil(paddedMax / step) * step)
  const ticks: number[] = []

  for (let value = niceMin; value <= niceMax + step / 2; value += step) {
    ticks.push(roundTick(value))
  }

  return {
    domain: [ticks[0] ?? niceMin, ticks[ticks.length - 1] ?? niceMax],
    ticks,
  }
}

export function toYAxisScale(spec: ChartSpec): YAxisScale {
  const values = collectValues(spec)

  if (values.length === 0) {
    return { domain: ['auto', 'auto'] }
  }

  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = maxValue - minValue
  const padding = Math.max(range * 0.15, 0.5)

  if (shouldUseZeroBaseline(spec)) {
    if (minValue >= 0) {
      return { domain: [0, maxValue + padding] }
    }
    if (maxValue <= 0) {
      return { domain: [minValue - padding, 0] }
    }
  }

  if (spec.chart_type === 'line') {
    return toNiceLineScale(spec, minValue, maxValue)
  }

  return { domain: [minValue - padding, maxValue + padding] }
}

export function toYAxisDomain(spec: ChartSpec): ['auto', 'auto'] | [number, number] {
  return toYAxisScale(spec).domain
}
