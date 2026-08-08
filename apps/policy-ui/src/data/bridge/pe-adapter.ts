import type {
  ScenarioLabPeAnalyticsWorkspace,
  ScenarioLabPeSectionEffect,
  ScenarioLabPeSensitivityCase,
  ScenarioLabPeShockRequest,
  ScenarioLabPeShockResult,
} from '../../contracts/data-contract.js'
import type { PeBridgePayload, PeSection } from './pe-types.js'

const TOP_SECTION_COUNT = 10
const ELASTICITY_SENSITIVITY_CASES: Array<Pick<ScenarioLabPeSensitivityCase, 'id' | 'elasticity_multiplier'>> = [
  { id: 'low', elasticity_multiplier: 0.75 },
  { id: 'base', elasticity_multiplier: 1 },
  { id: 'high', elasticity_multiplier: 1.25 },
]

function round(value: number, digits = 3): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeRegime(value: string): string {
  return value.trim().toLowerCase()
}

function selectedSections(payload: PeBridgePayload, sectionId: string): PeSection[] {
  if (sectionId === 'all') return payload.sections
  return payload.sections.filter((section) => section.id === sectionId)
}

function importShareForFilter(payload: PeBridgePayload, request: ScenarioLabPeShockRequest): number {
  if (request.partner_name && request.partner_name !== 'all') {
    return payload.partners.find((partner) => partner.name === request.partner_name)?.import_share ?? 0
  }
  if (request.regime && request.regime !== 'all') {
    const targetRegime = normalizeRegime(request.regime)
    return payload.partners
      .filter((partner) => normalizeRegime(partner.regime) === targetRegime)
      .reduce((sum, partner) => sum + partner.import_share, 0)
  }
  return 1
}

function toSectionEffect(section: PeSection, tariffScale: number, importShare: number): ScenarioLabPeSectionEffect {
  const effect = section.baseline_20pct
  const tradeCreation = effect.trade_creation_usd * tariffScale * importShare
  const tradeDiversion = effect.trade_diversion_usd * tariffScale * importShare
  const welfare = effect.welfare_usd * tariffScale * importShare
  const revenueChange = effect.revenue_change_usd * tariffScale * importShare
  return {
    section_id: section.id,
    section_name: section.name,
    import_usd: round(section.import_usd * importShare, 2),
    avg_mfn_rate: round(section.avg_mfn_rate, 3),
    elasticity: section.elasticity,
    trade_creation_usd: round(tradeCreation, 2),
    trade_diversion_usd: round(tradeDiversion, 2),
    trade_effect_usd: round(tradeCreation + tradeDiversion, 2),
    welfare_usd: round(welfare, 2),
    revenue_change_usd: round(revenueChange, 2),
  }
}

function toSensitivityCases(totals: {
  trade_effect_usd: number
  welfare_usd: number
}): ScenarioLabPeSensitivityCase[] {
  return ELASTICITY_SENSITIVITY_CASES.map((sensitivityCase) => ({
    ...sensitivityCase,
    trade_effect_usd: round(totals.trade_effect_usd * sensitivityCase.elasticity_multiplier, 2),
    welfare_usd: round(totals.welfare_usd * sensitivityCase.elasticity_multiplier, 2),
  }))
}

export function toScenarioLabPeAnalyticsWorkspace(
  payload: PeBridgePayload,
): ScenarioLabPeAnalyticsWorkspace {
  return {
    source_artifact: payload.metadata.source_artifact,
    data_vintage: payload.attribution.data_version,
    exported_at: payload.metadata.exported_at,
    framework: payload.metadata.framework,
    units: payload.metadata.units,
    base_year: payload.metadata.base_year,
    default_tariff_cut_pct: payload.metadata.default_tariff_cut_pct,
    section_count: payload.metadata.hs_sections,
    chapter_count: payload.metadata.hs_chapters,
    partner_count: payload.metadata.partners,
    sections: payload.sections.map((section) => ({
      id: section.id,
      name: section.name,
      avg_mfn_rate: section.avg_mfn_rate,
      elasticity: section.elasticity,
    })),
    partners: payload.partners.map((partner) => ({
      name: partner.name,
      regime: partner.regime,
      import_share: partner.import_share,
    })),
    regimes: Array.from(new Set(['all', ...payload.partners.map((partner) => partner.regime)])),
    caveats: payload.caveats.map((caveat) => caveat.message),
  }
}

export function runScenarioLabPeTradeShock(
  payload: PeBridgePayload,
  request: ScenarioLabPeShockRequest,
): ScenarioLabPeShockResult {
  const tariffChangePct = clamp(request.tariff_cut_pct, -100, 100)
  const tariffScale = tariffChangePct / payload.metadata.default_tariff_cut_pct
  const importShare = importShareForFilter(payload, request)
  const effects = selectedSections(payload, request.section_id)
    .map((section) => toSectionEffect(section, tariffScale, importShare))
    .sort((left, right) => Math.abs(right.trade_effect_usd) - Math.abs(left.trade_effect_usd))
  const topSections = effects.slice(0, TOP_SECTION_COUNT)
  const totals = effects.reduce(
    (acc, section) => {
      acc.import_base_usd += section.import_usd
      acc.trade_creation_usd += section.trade_creation_usd
      acc.trade_diversion_usd += section.trade_diversion_usd
      acc.trade_effect_usd += section.trade_effect_usd
      acc.welfare_usd += section.welfare_usd
      acc.revenue_change_usd += section.revenue_change_usd
      return acc
    },
    {
      import_base_usd: 0,
      trade_creation_usd: 0,
      trade_diversion_usd: 0,
      trade_effect_usd: 0,
      welfare_usd: 0,
      revenue_change_usd: 0,
    },
  )
  const impactPct = totals.import_base_usd > 0 ? (totals.trade_effect_usd / totals.import_base_usd) * 100 : 0

  return {
    request: {
      ...request,
      tariff_cut_pct: tariffChangePct,
    },
    totals: {
      import_base_usd: round(totals.import_base_usd, 2),
      trade_creation_usd: round(totals.trade_creation_usd, 2),
      trade_diversion_usd: round(totals.trade_diversion_usd, 2),
      trade_effect_usd: round(totals.trade_effect_usd, 2),
      welfare_usd: round(totals.welfare_usd, 2),
      revenue_change_usd: round(totals.revenue_change_usd, 2),
      impact_pct: round(impactPct, 3),
      partner_import_share: round(importShare, 6),
    },
    top_sections: topSections,
    sensitivity: toSensitivityCases(totals),
    caveats: toScenarioLabPeAnalyticsWorkspace(payload).caveats,
  }
}
