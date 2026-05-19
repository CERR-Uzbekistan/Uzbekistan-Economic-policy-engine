import type {
  ModelBridgeEvidence,
  ModelCatalogEntry,
  ModelExplorerWorkspace,
} from '../../contracts/data-contract.js'
import type { PeBridgePayload } from '../bridge/pe-types.js'

const PE_MODEL_ID = 'pe-model'

const PE_CAVEAT_TITLES: Record<string, string> = {
  'pe-direct-effects-only': 'Direct partial-equilibrium channel only',
  'pe-elasticity-correction': 'Section-specific elasticity correction',
  'pe-partner-filter-share': 'Partner and regime filters use import shares',
}

function toIsoDateLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value)
}

function publicCaveatMessage(message: string): string {
  return message.replace(/\bbridge payload\b/gi, 'published data file')
}

export function toModelExplorerPeBridgeEvidence(payload: PeBridgePayload): ModelBridgeEvidence {
  return {
    status_label: 'Validated',
    source_artifact: payload.metadata.source_artifact,
    data_version: payload.attribution.data_version,
    exported_at: toIsoDateLabel(payload.metadata.exported_at),
    solver_version: payload.metadata.solver_version,
    sector_count: payload.metadata.hs_sections,
    framework: payload.metadata.framework,
    units: payload.metadata.units,
    linkage_counts: [
      { label: 'HS sections', value: String(payload.metadata.hs_sections) },
      { label: 'HS chapters', value: String(payload.metadata.hs_chapters) },
      { label: 'Partners', value: String(payload.metadata.partners) },
      { label: 'Default cut', value: `${payload.metadata.default_tariff_cut_pct}%` },
    ],
    caveats: payload.caveats.map((caveat) => caveat.message),
  }
}

function withBridgeEvidence(entry: ModelCatalogEntry, payload: PeBridgePayload): ModelCatalogEntry {
  const evidence = toModelExplorerPeBridgeEvidence(payload)
  const topSection = payload.top_trade_effect_sections[0]
  const topTariffProduct = payload.high_tariff_products[0]

  return {
    ...entry,
    lifecycle_label: 'Partial Equilibrium · Active',
    status: { label: 'Active', severity: 'ok' },
    description:
      'Direct tariff-incidence lane using the public PE trade-flow artifact and section-specific elasticities.',
    stats: [
      { value: String(payload.metadata.hs_sections), label: 'HS sections' },
      { value: String(payload.metadata.base_year), label: 'Base year' },
      { value: String(payload.metadata.partners), label: 'Partners' },
    ],
    purpose:
      'WITS-SMART-style partial-equilibrium lane for direct tariff-cut incidence. It estimates trade creation, trade diversion, welfare, and tariff-revenue changes by HS section; it does not model macro feedback, I-O propagation, or general-equilibrium reallocation.',
    equations: [
      { id: 'pe_trade_creation', label: 'Trade creation · import demand elasticity' },
      { id: 'pe_trade_diversion', label: 'Trade diversion · partner substitution approximation' },
      { id: 'pe_welfare', label: 'Welfare triangle · direct consumer surplus' },
    ],
    parameters: [
      {
        symbol: 'Δt',
        name: 'Tariff reduction',
        value: `${payload.metadata.default_tariff_cut_pct}%`,
        range: '0-100%',
      },
      {
        symbol: 'ε_s',
        name: 'Section-specific import demand elasticity',
        value: payload.metadata.elasticity_source,
        range: `base reference ${payload.metadata.base_elasticity}`,
      },
      {
        symbol: 'S',
        name: 'HS sections',
        value: String(payload.metadata.hs_sections),
        range: `${payload.metadata.hs_chapters} chapters`,
      },
      {
        symbol: 'Top effect',
        name: topSection?.section_id ?? 'Top HS section',
        value: topSection ? formatNumber(topSection.trade_effect_usd, 0) : 'n/a',
        range: topSection?.name ?? 'not available',
      },
      {
        symbol: 'High tariff',
        name: topTariffProduct?.hs6 ?? 'Highest listed HS6',
        value: topTariffProduct ? `${formatNumber(topTariffProduct.mfn_rate, 1)}% MFN` : 'n/a',
        range: topTariffProduct?.country ?? 'not available',
      },
    ],
    caveats: payload.caveats.map((caveat, index) => ({
      id: caveat.caveat_id,
      number: String(index + 1).padStart(2, '0'),
      severity: caveat.severity,
      title:
        PE_CAVEAT_TITLES[caveat.caveat_id] ??
        caveat.caveat_id.replace(/^pe-/, '').replace(/-/g, ' '),
      body: publicCaveatMessage(caveat.message),
    })),
    data_sources: [
      {
        institution: payload.metadata.source,
        description: payload.metadata.source_title,
        vintage_label: String(payload.metadata.base_year),
      },
      {
        institution: 'PE public bridge artifact',
        description: `${payload.metadata.hs_sections} sections, ${payload.metadata.partners} partners, section elasticities, baseline effects, and caveats`,
        vintage_label: payload.attribution.data_version,
      },
      {
        institution: 'PE source artifact',
        description: payload.metadata.source_artifact,
        vintage_label: toIsoDateLabel(payload.metadata.exported_at),
      },
    ],
    validation_summary: [
      `Public pe.json validates against the PE bridge schema and exposes ${payload.metadata.hs_sections} HS sections, ${payload.metadata.hs_chapters} chapters, and ${payload.metadata.partners} partner rows.`,
      `Direct effects are scaled from the ${payload.metadata.default_tariff_cut_pct}% baseline scenario using section-specific elasticities from ${payload.metadata.elasticity_source}.`,
      'Frontend validation checks artifact shape, metadata counts, section elasticities, effect fields, partner rows, and caveats; it does not claim macro, I-O, or CGE effects.',
    ],
    bridge_evidence: evidence,
  }
}

export function enrichModelExplorerWorkspaceWithPeBridge(
  workspace: ModelExplorerWorkspace,
  payload: PeBridgePayload,
): ModelExplorerWorkspace {
  const catalogEntries = workspace.catalog_entries_by_model_id
  const peEntry = catalogEntries?.[PE_MODEL_ID]
  const meta = workspace.meta
  if (!catalogEntries || !peEntry || !meta) return workspace

  return {
    ...workspace,
    meta: {
      ...meta,
      models_live: Math.max(meta.models_live, 4),
      open_methodology_issues: Math.max(0, meta.open_methodology_issues - 3),
    },
    catalog_entries_by_model_id: {
      ...catalogEntries,
      [PE_MODEL_ID]: withBridgeEvidence(peEntry, payload),
    },
  }
}
