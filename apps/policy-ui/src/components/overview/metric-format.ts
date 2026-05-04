import type { HeadlineMetric } from '../../contracts/data-contract'
import { getMetricSemantics } from './metric-semantics.js'

export const DIRECTION_GLYPH: Record<HeadlineMetric['direction'], string> = {
  up: '↑',
  down: '↓',
  flat: '→',
}

type Translate = (key: string, options?: Record<string, unknown>) => string

function valuePrecision(metric: HeadlineMetric): number {
  if (metric.metric_id === 'trade_balance') return 2
  if (metric.unit === 'UZS/USD' || metric.unit === 'USD/oz') return 0
  return 1
}

export function formatOverviewMetricValue(metric: HeadlineMetric, locale: string): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: valuePrecision(metric),
  }).format(metric.value)
}

function formatNumber(value: number, locale: string, precision: number): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  }).format(value)
}

function formatSignedNumber(value: number, locale: string, precision: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatNumber(Math.abs(value), locale, precision)}`
}

function formatNumberWithUnit(value: number, unit: string | null | undefined, locale: string, precision: number): string {
  const compactUnit = unit === '%' ? '%' : unit ? ` ${unit}` : ''
  return `${formatSignedNumber(value, locale, precision)}${compactUnit}`
}

export function formatOverviewMetricValueWithUnit(
  metric: HeadlineMetric,
  locale: string,
  t: Translate,
): string {
  if (metric.metric_id === 'trade_balance') {
    if (metric.value === 0) {
      return t('overview.tradeBalance.balanced')
    }
    const positionKey = metric.value < 0 ? 'deficit' : 'surplus'
    return t('overview.tradeBalance.usdBnPattern', {
      value: formatNumber(Math.abs(metric.value), locale, 2),
      position: t(`overview.tradeBalance.${positionKey}`),
    })
  }

  return `${formatOverviewMetricValue(metric, locale)} ${metric.unit}`.trim()
}

export function formatOverviewDelta(metric: HeadlineMetric, locale: string): string | null {
  const deltaValue = metric.delta_value ?? metric.delta_abs
  if (deltaValue === null || deltaValue === undefined) {
    return null
  }
  const precision = valuePrecision(metric)
  return formatSignedNumber(deltaValue, locale, precision)
}

function formatFxDelta(metric: HeadlineMetric, locale: string, t: Translate): string | null {
  const deltaValue = metric.delta_value ?? metric.delta_abs
  if (deltaValue === null || deltaValue === undefined) return null
  if (deltaValue === 0) return t('overview.fx.unchanged')

  const directionKey = deltaValue < 0 ? 'stronger' : 'weaker'
  const precision = metric.delta_unit === '%' ? 1 : valuePrecision(metric)
  const unit = metric.delta_unit ?? (metric.unit === 'UZS/USD' ? 'UZS' : metric.unit)
  return `${t(`overview.fx.${directionKey}`)} ${formatNumberWithUnit(
    Math.abs(deltaValue),
    unit,
    locale,
    precision,
  ).replace(/^\+/, '')}`
}

export function formatOverviewDeltaWithUnit(
  metric: HeadlineMetric,
  locale: string,
  t?: Translate,
): string | null {
  const semantics = getMetricSemantics(metric.metric_id)
  if (semantics?.sign_interpretation === 'usd_uzs' && t) {
    return formatFxDelta(metric, locale, t)
  }

  const deltaValue = metric.delta_value ?? metric.delta_abs
  if (deltaValue === null || deltaValue === undefined) return null
  const unit = metric.delta_unit ?? (metric.unit === 'UZS/USD' ? 'UZS' : metric.unit)
  return formatNumberWithUnit(deltaValue, unit, locale, valuePrecision(metric)).trim()
}

export function formatOverviewDeltaComparison(metric: HeadlineMetric, t: Translate): string | null {
  if (metric.baseline_value === null) return null
  const basis = metric.comparison_basis_key ? t(metric.comparison_basis_key) : null
  if (metric.comparison_period && basis) {
    return t('overview.delta.vsPeriodBasis', {
      period: metric.comparison_period,
      basis,
    })
  }
  return basis
}
