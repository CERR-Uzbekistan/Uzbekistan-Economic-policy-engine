export const OVERVIEW_ARTIFACT_SCHEMA_VERSION = 'overview.v1' as const

export const OVERVIEW_VALIDATION_STATUSES = ['valid', 'warning', 'failed'] as const

export type OverviewArtifactValidationStatus = (typeof OVERVIEW_VALIDATION_STATUSES)[number]

export type OverviewMetricBlock = 'growth' | 'inflation' | 'trade' | 'monetary_fx' | 'gold'

export type OverviewClaimType =
  | 'observed'
  | 'nowcast'
  | 'observed_policy_setting'
  | 'calculated_identity'
  | 'reference'
  | 'observed_market_price'
  | 'reference_forecast'

export type OverviewLockedMetricDefinition = {
  id: string
  label: string
  block: OverviewMetricBlock
  claim_type: OverviewClaimType
  unit: string
  frequency: string
  citation_label: string
  source_unavailable_caveat: string
}

export const OVERVIEW_LOCKED_METRICS = [
  {
    id: 'real_gdp_growth_annual_yoy',
    label: 'Real GDP growth, latest year',
    block: 'growth',
    claim_type: 'observed',
    unit: 'percent YoY',
    frequency: 'annual',
    citation_label: 'Statistics Agency national accounts',
    source_unavailable_caveat: 'Use fallback only as reference; do not label as official annual actual.',
  },
  {
    id: 'real_gdp_growth_quarter_yoy',
    label: 'Real GDP growth, latest quarter',
    block: 'growth',
    claim_type: 'observed',
    unit: 'percent YoY',
    frequency: 'quarterly',
    citation_label: 'Statistics Agency quarterly GDP',
    source_unavailable_caveat: 'If unavailable, show no official quarterly actual rather than substituting a forecast.',
  },
  {
    id: 'gdp_nowcast_current_quarter',
    label: 'GDP nowcast, current quarter',
    block: 'growth',
    claim_type: 'nowcast',
    unit: 'percent YoY',
    frequency: 'quarterly / model update cadence',
    citation_label: 'DFM bridge nowcast',
    source_unavailable_caveat: 'Not an official GDP release; model nowcast only.',
  },
  {
    id: 'cpi_yoy',
    label: 'CPI inflation, YoY',
    block: 'inflation',
    claim_type: 'observed',
    unit: 'percent YoY',
    frequency: 'monthly',
    citation_label: 'Statistics Agency CPI',
    source_unavailable_caveat: 'If fallback is used, mark as republished official CPI.',
  },
  {
    id: 'cpi_mom',
    label: 'CPI inflation, monthly',
    block: 'inflation',
    claim_type: 'observed',
    unit: 'percent MoM',
    frequency: 'monthly',
    citation_label: 'Statistics Agency CPI',
    source_unavailable_caveat: 'Monthly inflation can be volatile; do not present as trend alone.',
  },
  {
    id: 'food_cpi_yoy',
    label: 'Food inflation, YoY',
    block: 'inflation',
    claim_type: 'observed',
    unit: 'percent YoY',
    frequency: 'monthly',
    citation_label: 'Statistics Agency food CPI',
    source_unavailable_caveat: 'Category definitions must be stable before comparing over time.',
  },
  {
    id: 'exports_yoy',
    label: 'Exports growth, YoY',
    block: 'trade',
    claim_type: 'observed',
    unit: 'percent YoY',
    frequency: 'monthly or quarterly',
    citation_label: 'Statistics Agency foreign trade',
    source_unavailable_caveat: 'Trade values can be revised; show latest-vintage status.',
  },
  {
    id: 'imports_yoy',
    label: 'Imports growth, YoY',
    block: 'trade',
    claim_type: 'observed',
    unit: 'percent YoY',
    frequency: 'monthly or quarterly',
    citation_label: 'Statistics Agency foreign trade',
    source_unavailable_caveat: 'Trade values can be revised; show latest-vintage status.',
  },
  {
    id: 'trade_balance',
    label: 'Trade balance',
    block: 'trade',
    claim_type: 'observed',
    unit: 'USD million or USD billion',
    frequency: 'monthly or quarterly',
    citation_label: 'Statistics Agency foreign trade',
    source_unavailable_caveat: 'Label goods trade balance if services are excluded.',
  },
  {
    id: 'policy_rate',
    label: 'CBU policy rate',
    block: 'monetary_fx',
    claim_type: 'observed_policy_setting',
    unit: 'percent',
    frequency: 'event-based',
    citation_label: 'Central Bank of Uzbekistan policy rate',
    source_unavailable_caveat: 'Event-based setting; do not infer policy stance without inflation context.',
  },
  {
    id: 'usd_uzs_level',
    label: 'USD/UZS exchange rate',
    block: 'monetary_fx',
    claim_type: 'observed',
    unit: 'UZS per USD',
    frequency: 'daily',
    citation_label: 'Central Bank of Uzbekistan exchange rate',
    source_unavailable_caveat: 'Specify official/reference rate, not transaction-weighted market average unless sourced.',
  },
  {
    id: 'usd_uzs_mom_change',
    label: 'USD/UZS monthly change',
    block: 'monetary_fx',
    claim_type: 'calculated_identity',
    unit: 'percent MoM',
    frequency: 'monthly from daily observations',
    citation_label: 'CBU exchange rate, calculated',
    source_unavailable_caveat: 'Positive/negative direction must be labeled consistently as UZS depreciation/appreciation.',
  },
  {
    id: 'usd_uzs_yoy_change',
    label: 'USD/UZS annual change',
    block: 'monetary_fx',
    claim_type: 'calculated_identity',
    unit: 'percent YoY',
    frequency: 'monthly from daily observations',
    citation_label: 'CBU exchange rate, calculated',
    source_unavailable_caveat: 'Positive/negative direction must be labeled consistently as UZS depreciation/appreciation.',
  },
  {
    id: 'reer_level',
    label: 'REER level',
    block: 'monetary_fx',
    claim_type: 'reference',
    unit: 'index',
    frequency: 'monthly or quarterly',
    citation_label: 'REER source to be confirmed',
    source_unavailable_caveat: 'Base year and methodology must be shown before citing.',
  },
  {
    id: 'gold_price_level',
    label: 'Gold price',
    block: 'gold',
    claim_type: 'observed_market_price',
    unit: 'USD per troy ounce',
    frequency: 'daily or monthly',
    citation_label: 'Gold price source to be confirmed',
    source_unavailable_caveat: 'External market price; not a CERR forecast.',
  },
  {
    id: 'gold_price_change',
    label: 'Gold price change',
    block: 'gold',
    claim_type: 'calculated_identity',
    unit: 'percent MoM or YoY',
    frequency: 'monthly',
    citation_label: 'Gold price source, calculated',
    source_unavailable_caveat: 'Show comparison basis: MoM or YoY.',
  },
  {
    id: 'gold_price_forecast',
    label: 'Gold price forecast',
    block: 'gold',
    claim_type: 'reference_forecast',
    unit: 'USD per troy ounce',
    frequency: 'semiannual / forecast release cadence',
    citation_label: 'External gold price forecast',
    source_unavailable_caveat: 'External reference assumption, not a CERR forecast or policy recommendation.',
  },
] as const satisfies readonly OverviewLockedMetricDefinition[]

export type OverviewMetricId = (typeof OVERVIEW_LOCKED_METRICS)[number]['id']

export const OVERVIEW_TOP_CARD_METRIC_IDS = [
  'real_gdp_growth_quarter_yoy',
  'gdp_nowcast_current_quarter',
  'cpi_yoy',
  'food_cpi_yoy',
  'exports_yoy',
  'imports_yoy',
  'policy_rate',
  'usd_uzs_level',
] as const satisfies readonly OverviewMetricId[]

export const OVERVIEW_LOCKED_METRIC_BY_ID: ReadonlyMap<string, OverviewLockedMetricDefinition> = new Map(
  OVERVIEW_LOCKED_METRICS.map((metric) => [metric.id, metric]),
)

export type OverviewArtifactMetric = {
  id: OverviewMetricId
  label: string
  block: OverviewMetricBlock
  claim_type: OverviewClaimType
  unit: string
  frequency: string
  value: number
  previous_value: number | null
  source_label: string
  source_period: string
  exported_at: string
  validation_status: OverviewArtifactValidationStatus
  caveats: string[]
  warnings: string[]
  top_card?: boolean
  top_card_order?: number
}

export type OverviewArtifactPanelGroup = {
  id: OverviewMetricBlock
  title: string
  metric_ids: OverviewMetricId[]
}

export type OverviewArtifact = {
  schema_version: typeof OVERVIEW_ARTIFACT_SCHEMA_VERSION
  exported_at: string
  generated_by?: string
  validation_status: OverviewArtifactValidationStatus
  metrics: OverviewArtifactMetric[]
  caveats: string[]
  warnings: string[]
  panel_groups: OverviewArtifactPanelGroup[]
  fallback?: {
    static_snapshot_id?: string
    note?: string
  }
}
