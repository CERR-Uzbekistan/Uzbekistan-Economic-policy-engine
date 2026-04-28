const COMPARISON_BASIS_KEY_BY_METRIC_ID: Readonly<Record<string, string>> = {
  real_gdp_growth_annual_yoy: 'overview.comparisonBasis.real_gdp_growth_annual_yoy',
  real_gdp_growth_quarter_yoy: 'overview.comparisonBasis.real_gdp_growth_quarter_yoy',
  gdp_nowcast_current_quarter: 'overview.comparisonBasis.gdp_nowcast_current_quarter',
  cpi_yoy: 'overview.comparisonBasis.cpi_yoy',
  cpi_mom: 'overview.comparisonBasis.cpi_mom',
  food_cpi_yoy: 'overview.comparisonBasis.food_cpi_yoy',
  exports_yoy: 'overview.comparisonBasis.exports_yoy',
  imports_yoy: 'overview.comparisonBasis.imports_yoy',
  trade_balance: 'overview.comparisonBasis.trade_balance',
  policy_rate: 'overview.comparisonBasis.policy_rate',
  usd_uzs_level: 'overview.comparisonBasis.usd_uzs_level',
  usd_uzs_mom_change: 'overview.comparisonBasis.usd_uzs_mom_change',
  usd_uzs_yoy_change: 'overview.comparisonBasis.usd_uzs_yoy_change',
  reer_level: 'overview.comparisonBasis.reer_level',
  gold_price_level: 'overview.comparisonBasis.gold_price_level',
  gold_price_change: 'overview.comparisonBasis.gold_price_change',
  gold_price_forecast: 'overview.comparisonBasis.gold_price_forecast',
}

export function getComparisonBasisKey(metricId: string): string | null {
  return COMPARISON_BASIS_KEY_BY_METRIC_ID[metricId] ?? null
}

export const OVERVIEW_COMPARISON_BASIS_METRIC_IDS = Object.freeze(
  Object.keys(COMPARISON_BASIS_KEY_BY_METRIC_ID),
)
