import type { OverviewArtifact, OverviewArtifactMetric } from '../../../src/data/overview/artifact-types.js'
import {
  OVERVIEW_ARTIFACT_SCHEMA_VERSION,
  OVERVIEW_LOCKED_METRICS,
  OVERVIEW_TOP_CARD_METRIC_IDS,
} from '../../../src/data/overview/artifact-types.js'

const OVERVIEW_TOP_CARD_METRIC_ID_SET: ReadonlySet<string> = new Set(OVERVIEW_TOP_CARD_METRIC_IDS)

const VALUE_BY_ID: Record<string, number> = {
  real_gdp_growth_annual_yoy: 6.0,
  real_gdp_growth_quarter_yoy: 5.7,
  gdp_nowcast_current_quarter: 5.9,
  cpi_yoy: 8.1,
  cpi_mom: 0.7,
  food_cpi_yoy: 9.4,
  exports_yoy: 7.2,
  imports_yoy: 5.1,
  trade_balance: -1.2,
  policy_rate: 13.5,
  usd_uzs_level: 12680,
  usd_uzs_mom_change: 0.8,
  usd_uzs_yoy_change: 4.3,
  reer_level: 102.4,
  gold_price_level: 2350,
  gold_price_change: 3.2,
  gold_price_forecast: 2400,
}

export function buildValidOverviewArtifact(): OverviewArtifact {
  const exportedAt = '2026-04-26T08:00:00Z'
  const topCardOrder: ReadonlyMap<string, number> = new Map(
    OVERVIEW_TOP_CARD_METRIC_IDS.map((id, index) => [id, index + 1]),
  )
  const metrics: OverviewArtifactMetric[] = OVERVIEW_LOCKED_METRICS.map((definition) => ({
    id: definition.id,
    label: definition.label,
    block: definition.block,
    claim_type: definition.claim_type,
    unit: definition.unit,
    frequency: definition.frequency,
    value: VALUE_BY_ID[definition.id] ?? 1,
    previous_value: definition.id === 'usd_uzs_level' ? 12500 : (VALUE_BY_ID[definition.id] ?? 1) - 0.2,
    source_label: definition.citation_label,
    source_period: definition.frequency.includes('quarter') ? '2026 Q1' : 'March 2026',
    exported_at: exportedAt,
    validation_status: 'valid',
    caveats: [],
    warnings: [],
    top_card: OVERVIEW_TOP_CARD_METRIC_ID_SET.has(definition.id),
    top_card_order: topCardOrder.get(definition.id),
  }))

  return {
    schema_version: OVERVIEW_ARTIFACT_SCHEMA_VERSION,
    exported_at: exportedAt,
    validation_status: 'valid',
    metrics,
    caveats: [],
    warnings: [],
    panel_groups: [
      {
        id: 'growth',
        title: 'Growth',
        metric_ids: ['real_gdp_growth_annual_yoy', 'real_gdp_growth_quarter_yoy', 'gdp_nowcast_current_quarter'],
      },
    ],
  }
}
