import type { OverviewClaimType, OverviewMetricId } from '../../data/overview/artifact-types.js'

export type OverviewDeltaDisplayMode = 'percentage_point' | 'percent_change' | 'absolute' | 'none'
export type OverviewComparisonPeriodStrategy =
  | 'previous_month'
  | 'previous_year'
  | 'same_quarter_previous_year'
  | 'none'
export type OverviewSignInterpretation = 'usd_uzs' | 'trade_balance'

export type OverviewMetricSemantics = {
  delta_display_mode: OverviewDeltaDisplayMode
  comparison_basis_key: string
  comparison_period_strategy: OverviewComparisonPeriodStrategy
  display_unit: string
  delta_unit: string | null
  sign_interpretation?: OverviewSignInterpretation
  claim_label_key?: string
}

export const OVERVIEW_METRIC_SEMANTICS: Readonly<Record<OverviewMetricId, OverviewMetricSemantics>> = {
  real_gdp_growth_annual_yoy: {
    delta_display_mode: 'percentage_point',
    comparison_basis_key: 'overview.comparisonBasis.real_gdp_growth_annual_yoy',
    comparison_period_strategy: 'previous_year',
    display_unit: '%',
    delta_unit: 'pp',
  },
  real_gdp_growth_quarter_yoy: {
    delta_display_mode: 'percentage_point',
    comparison_basis_key: 'overview.comparisonBasis.real_gdp_growth_quarter_yoy',
    comparison_period_strategy: 'same_quarter_previous_year',
    display_unit: '%',
    delta_unit: 'pp',
  },
  gdp_nowcast_current_quarter: {
    delta_display_mode: 'percentage_point',
    comparison_basis_key: 'overview.comparisonBasis.gdp_nowcast_current_quarter',
    comparison_period_strategy: 'none',
    display_unit: '%',
    delta_unit: 'pp',
  },
  cpi_yoy: {
    delta_display_mode: 'percentage_point',
    comparison_basis_key: 'overview.comparisonBasis.cpi_yoy',
    comparison_period_strategy: 'previous_month',
    display_unit: '%',
    delta_unit: 'pp',
  },
  cpi_mom: {
    delta_display_mode: 'percentage_point',
    comparison_basis_key: 'overview.comparisonBasis.cpi_mom',
    comparison_period_strategy: 'previous_month',
    display_unit: '%',
    delta_unit: 'pp',
  },
  food_cpi_yoy: {
    delta_display_mode: 'percentage_point',
    comparison_basis_key: 'overview.comparisonBasis.food_cpi_yoy',
    comparison_period_strategy: 'previous_month',
    display_unit: '%',
    delta_unit: 'pp',
  },
  exports_yoy: {
    delta_display_mode: 'percentage_point',
    comparison_basis_key: 'overview.comparisonBasis.exports_yoy',
    comparison_period_strategy: 'none',
    display_unit: '%',
    delta_unit: 'pp',
  },
  imports_yoy: {
    delta_display_mode: 'percentage_point',
    comparison_basis_key: 'overview.comparisonBasis.imports_yoy',
    comparison_period_strategy: 'none',
    display_unit: '%',
    delta_unit: 'pp',
  },
  trade_balance: {
    delta_display_mode: 'absolute',
    comparison_basis_key: 'overview.comparisonBasis.trade_balance',
    comparison_period_strategy: 'none',
    display_unit: 'USD bn',
    delta_unit: 'USD bn',
    sign_interpretation: 'trade_balance',
    claim_label_key: 'overview.claimLabels.calculated',
  },
  policy_rate: {
    delta_display_mode: 'percentage_point',
    comparison_basis_key: 'overview.comparisonBasis.policy_rate',
    comparison_period_strategy: 'none',
    display_unit: '%',
    delta_unit: 'pp',
  },
  usd_uzs_level: {
    delta_display_mode: 'percent_change',
    comparison_basis_key: 'overview.comparisonBasis.usd_uzs_level',
    comparison_period_strategy: 'none',
    display_unit: 'UZS/USD',
    delta_unit: '%',
    sign_interpretation: 'usd_uzs',
  },
  usd_uzs_mom_change: {
    delta_display_mode: 'percentage_point',
    comparison_basis_key: 'overview.comparisonBasis.usd_uzs_mom_change',
    comparison_period_strategy: 'previous_month',
    display_unit: '%',
    delta_unit: 'pp',
    sign_interpretation: 'usd_uzs',
  },
  usd_uzs_yoy_change: {
    delta_display_mode: 'percentage_point',
    comparison_basis_key: 'overview.comparisonBasis.usd_uzs_yoy_change',
    comparison_period_strategy: 'previous_month',
    display_unit: '%',
    delta_unit: 'pp',
    sign_interpretation: 'usd_uzs',
  },
  reer_level: {
    delta_display_mode: 'absolute',
    comparison_basis_key: 'overview.comparisonBasis.reer_level',
    comparison_period_strategy: 'none',
    display_unit: 'index',
    delta_unit: 'index',
  },
  gold_price_level: {
    delta_display_mode: 'absolute',
    comparison_basis_key: 'overview.comparisonBasis.gold_price_level',
    comparison_period_strategy: 'none',
    display_unit: 'USD/oz',
    delta_unit: 'USD/oz',
  },
  gold_price_change: {
    delta_display_mode: 'percentage_point',
    comparison_basis_key: 'overview.comparisonBasis.gold_price_change',
    comparison_period_strategy: 'previous_month',
    display_unit: '%',
    delta_unit: 'pp',
  },
  gold_price_forecast: {
    delta_display_mode: 'absolute',
    comparison_basis_key: 'overview.comparisonBasis.gold_price_forecast',
    comparison_period_strategy: 'none',
    display_unit: 'USD/oz',
    delta_unit: 'USD/oz',
  },
}

export const OVERVIEW_SEMANTIC_METRIC_IDS = Object.freeze(
  Object.keys(OVERVIEW_METRIC_SEMANTICS) as OverviewMetricId[],
)

export const OVERVIEW_CLAIM_LABEL_KEY_BY_TYPE: Readonly<Record<OverviewClaimType, string>> = {
  observed: 'overview.claimLabels.observed',
  observed_policy_setting: 'overview.claimLabels.observed',
  observed_market_price: 'overview.claimLabels.observed',
  calculated_identity: 'overview.claimLabels.calculated',
  nowcast: 'overview.claimLabels.nowcast',
  reference: 'overview.claimLabels.reference',
  reference_forecast: 'overview.claimLabels.forecast',
}

export function getMetricSemantics(metricId: string): OverviewMetricSemantics | null {
  return OVERVIEW_METRIC_SEMANTICS[metricId as OverviewMetricId] ?? null
}

export function getComparisonBasisKey(metricId: string): string | null {
  return getMetricSemantics(metricId)?.comparison_basis_key ?? null
}

export function getClaimLabelKey(claimType: string | undefined): string | null {
  if (!claimType) return null
  return OVERVIEW_CLAIM_LABEL_KEY_BY_TYPE[claimType as OverviewClaimType] ?? null
}
