import type { HeadlineMetric } from '../../contracts/data-contract.js'
import {
  formatOverviewDeltaWithUnit,
  formatOverviewMetricValueWithUnit,
} from '../../components/overview/metric-format.js'

type Translate = (key: string, options?: Record<string, unknown>) => string

export type OverviewMacroPulseToken = {
  id: 'gdp' | 'cpi' | 'trade_balance' | 'usd_uzs'
  label: string
  value: string
}

function metricById(metrics: HeadlineMetric[], metricId: string): HeadlineMetric | undefined {
  return metrics.find((metric) => metric.metric_id === metricId)
}

export function buildOverviewMacroPulseTokens(
  metrics: HeadlineMetric[],
  locale: string,
  t: Translate,
): OverviewMacroPulseToken[] {
  const tokens: OverviewMacroPulseToken[] = []
  const gdp = metricById(metrics, 'real_gdp_growth_quarter_yoy')
    ?? metricById(metrics, 'real_gdp_growth_annual_yoy')
  const cpiYoy = metricById(metrics, 'cpi_yoy')
  const cpiMom = metricById(metrics, 'cpi_mom')
  const tradeBalance = metricById(metrics, 'trade_balance')
  const usdUzs = metricById(metrics, 'usd_uzs_level')

  if (gdp) {
    tokens.push({
      id: 'gdp',
      label: t('overview.macroPulse.gdp'),
      value: formatOverviewMetricValueWithUnit(gdp, locale, t),
    })
  }

  if (cpiYoy || cpiMom) {
    const cpiParts = [
      cpiYoy
        ? `${formatOverviewMetricValueWithUnit(cpiYoy, locale, t)} ${t('overview.macroPulse.yoy')}`
        : null,
      cpiMom
        ? `${formatOverviewMetricValueWithUnit(cpiMom, locale, t)} ${t('overview.macroPulse.mom')}`
        : null,
    ].filter((part): part is string => part !== null)

    tokens.push({
      id: 'cpi',
      label: t('overview.macroPulse.cpi'),
      value: cpiParts.join(` ${t('overview.common.slash')} `),
    })
  }

  if (tradeBalance) {
    tokens.push({
      id: 'trade_balance',
      label: t('overview.macroPulse.tradeBalance'),
      value: formatOverviewMetricValueWithUnit(tradeBalance, locale, t),
    })
  }

  if (usdUzs) {
    const delta = formatOverviewDeltaWithUnit(usdUzs, locale, t)
    tokens.push({
      id: 'usd_uzs',
      label: t('overview.macroPulse.usdUzs'),
      value: [
        formatOverviewMetricValueWithUnit(usdUzs, locale, t),
        delta,
      ].filter((part): part is string => Boolean(part)).join(` ${t('overview.common.middleDot')} `),
    })
  }

  return tokens
}
