import type { HeadlineMetric } from '../../contracts/data-contract'

export const DIRECTION_GLYPH: Record<HeadlineMetric['direction'], string> = {
  up: '↑',
  down: '↓',
  flat: '→',
}

function valuePrecision(metric: HeadlineMetric): number {
  if (metric.unit === 'UZS/USD' || metric.unit === 'USD/oz') return 0
  return 1
}

export function formatOverviewMetricValue(metric: HeadlineMetric, locale: string): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: valuePrecision(metric),
  }).format(metric.value)
}

export function formatOverviewDelta(metric: HeadlineMetric, locale: string): string | null {
  if (metric.delta_abs === null) {
    return null
  }
  const sign = metric.delta_abs > 0 ? '+' : metric.delta_abs < 0 ? '−' : ''
  const magnitude = Math.abs(metric.delta_abs)
  const precision = valuePrecision(metric)
  return `${sign}${new Intl.NumberFormat(locale, {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  }).format(magnitude)}`
}

export function formatOverviewDeltaWithUnit(metric: HeadlineMetric, locale: string): string | null {
  const delta = formatOverviewDelta(metric, locale)
  if (!delta) return null
  const unit = metric.unit === 'UZS/USD' ? 'UZS' : metric.unit
  return `${delta} ${unit}`.trim()
}
