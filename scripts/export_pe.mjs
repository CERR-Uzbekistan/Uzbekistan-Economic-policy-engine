import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const SOURCE_PATH = resolve(REPO_ROOT, 'mcp_server/data/pe_data.json')
const OUTPUT_PATH = resolve(REPO_ROOT, 'apps/policy-ui/public/data/pe.json')

const DEFAULT_TARIFF_CUT_PCT = 20
const BASE_ELASTICITY = 1.27

export const SECTION_ELASTICITIES = {
  I: 0.38,
  II: 0.5,
  III: 0.55,
  IV: 0.7,
  V: 0.45,
  VI: 1.1,
  VII: 1.3,
  VIII: 1.4,
  IX: 1.2,
  X: 1.15,
  XI: 1.6,
  XII: 1.8,
  XIII: 1.25,
  XIV: 0.8,
  XV: 1.35,
  XVI: 2.5,
  XVII: 2.8,
  XVIII: 2.2,
  XIX: 0.6,
  XX: 1.7,
  XXI: 0.5,
}

function round(value, digits = 2) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function elasticityFactor(sectionId) {
  return (SECTION_ELASTICITIES[sectionId] ?? BASE_ELASTICITY) / BASE_ELASTICITY
}

function scaleEffect(value, sectionId) {
  return round(value * elasticityFactor(sectionId))
}

function effectFromRaw(raw, sectionId) {
  const tradeCreation = scaleEffect(raw.tc ?? 0, sectionId)
  const tradeDiversion = scaleEffect(raw.td ?? 0, sectionId)
  const welfare = scaleEffect(raw.welfare ?? 0, sectionId)
  const revenueChange = scaleEffect(raw.taxChg ?? 0, sectionId)
  return {
    trade_creation_usd: tradeCreation,
    trade_diversion_usd: tradeDiversion,
    trade_effect_usd: round(tradeCreation + tradeDiversion),
    welfare_usd: welfare,
    revenue_change_usd: revenueChange,
  }
}

function buildSection(rawSection, chapters) {
  const effect = rawSection.chapters.reduce(
    (acc, chapterId) => {
      const chapter = chapters[String(chapterId)]
      if (!chapter) return acc
      const chapterEffect = effectFromRaw(chapter, rawSection.id)
      acc.trade_creation_usd += chapterEffect.trade_creation_usd
      acc.trade_diversion_usd += chapterEffect.trade_diversion_usd
      acc.trade_effect_usd += chapterEffect.trade_effect_usd
      acc.welfare_usd += chapterEffect.welfare_usd
      acc.revenue_change_usd += chapterEffect.revenue_change_usd
      return acc
    },
    {
      trade_creation_usd: 0,
      trade_diversion_usd: 0,
      trade_effect_usd: 0,
      welfare_usd: 0,
      revenue_change_usd: 0,
    },
  )

  return {
    id: rawSection.id,
    name: rawSection.name,
    import_usd: round(rawSection.imp),
    avg_mfn_rate: round(rawSection.avgMfn, 3),
    avg_applied_rate: round(rawSection.avgApp, 3),
    chapters: rawSection.chapters,
    elasticity: SECTION_ELASTICITIES[rawSection.id] ?? BASE_ELASTICITY,
    baseline_20pct: {
      trade_creation_usd: round(effect.trade_creation_usd),
      trade_diversion_usd: round(effect.trade_diversion_usd),
      trade_effect_usd: round(effect.trade_effect_usd),
      welfare_usd: round(effect.welfare_usd),
      revenue_change_usd: round(effect.revenue_change_usd),
    },
  }
}

function buildChapter(chapterId, rawChapter) {
  const sectionId = rawChapter.sec
  return {
    chapter: Number(chapterId),
    section_id: sectionId,
    import_usd: round(rawChapter.imp),
    avg_mfn_rate: round(rawChapter.avgMfn, 3),
    avg_applied_rate: round(rawChapter.avgApp, 3),
    elasticity: SECTION_ELASTICITIES[sectionId] ?? BASE_ELASTICITY,
    baseline_20pct: effectFromRaw(rawChapter, sectionId),
  }
}

function buildPartner(rawCountry, totalImport) {
  return {
    name: rawCountry.name,
    regime: String(rawCountry.regime ?? 'unknown').toLowerCase(),
    import_usd: round(rawCountry.imp),
    import_share: totalImport > 0 ? round(rawCountry.imp / totalImport, 8) : 0,
  }
}

function buildArtifact(raw) {
  const sourceText = readFileSync(SOURCE_PATH, 'utf8')
  const exportedAt = process.env.PE_EXPORTED_AT ?? new Date().toISOString()
  const sections = raw.sections.map((section) => buildSection(section, raw.chapters))
  const chapters = Object.fromEntries(
    Object.entries(raw.chapters).map(([chapterId, chapter]) => [
      chapterId,
      buildChapter(chapterId, chapter),
    ]),
  )
  const partners = (raw.countries ?? []).map((country) => buildPartner(country, raw.meta.totalImport))
  const topTradeEffectSections = sections
    .slice()
    .sort((left, right) => right.baseline_20pct.trade_effect_usd - left.baseline_20pct.trade_effect_usd)
    .slice(0, 8)
    .map((section) => ({
      section_id: section.id,
      name: section.name,
      trade_effect_usd: section.baseline_20pct.trade_effect_usd,
      trade_creation_usd: section.baseline_20pct.trade_creation_usd,
      trade_diversion_usd: section.baseline_20pct.trade_diversion_usd,
      welfare_usd: section.baseline_20pct.welfare_usd,
      revenue_change_usd: section.baseline_20pct.revenue_change_usd,
      elasticity: section.elasticity,
    }))
  const totals = sections.reduce(
    (acc, section) => {
      acc.trade_creation_usd += section.baseline_20pct.trade_creation_usd
      acc.trade_diversion_usd += section.baseline_20pct.trade_diversion_usd
      acc.trade_effect_usd += section.baseline_20pct.trade_effect_usd
      acc.welfare_usd += section.baseline_20pct.welfare_usd
      acc.revenue_change_usd += section.baseline_20pct.revenue_change_usd
      return acc
    },
    {
      trade_creation_usd: 0,
      trade_diversion_usd: 0,
      trade_effect_usd: 0,
      welfare_usd: 0,
      revenue_change_usd: 0,
    },
  )

  return {
    attribution: {
      model_id: 'pe-trade-shock',
      model_name: 'Partial Equilibrium Trade Model',
      module: 'pe_trade',
      version: '1.0.0',
      run_id: `pe-export-${exportedAt.slice(0, 10)}`,
      data_version: String(raw.meta.baseYear),
      timestamp: exportedAt,
    },
    metadata: {
      exported_at: exportedAt,
      source_script_sha: sha256(readFileSync(fileURLToPath(import.meta.url), 'utf8')),
      source_data_sha: sha256(sourceText),
      solver_version: 'pe-wits-smart-public-bridge-v1',
      source_artifact: 'mcp_server/data/pe_data.json',
      source_artifact_generated: '2026-04-16T15:23:37+05:00',
      source_title: 'WITS-SMART tariff-cut baseline trade effects',
      source: 'WITS / UN Comtrade trade and tariff source extract',
      framework: 'Partial equilibrium / WITS-SMART',
      units: 'USD thousand',
      base_year: raw.meta.baseYear,
      hs_sections: sections.length,
      hs_chapters: Object.keys(chapters).length,
      partners: partners.length,
      default_tariff_cut_pct: DEFAULT_TARIFF_CUT_PCT,
      base_elasticity: BASE_ELASTICITY,
      elasticity_source:
        'Legacy PE methodology note: WITS SMART weighted section elasticities from Kee, Nicita & Olarreaga (2008), applied as a correction to the precomputed uniform-elasticity baseline.',
    },
    totals: {
      import_usd: round(raw.meta.totalImport),
      subject_import_usd: round(raw.meta.totalSubjectImport),
      baseline_20pct: {
        trade_creation_usd: round(totals.trade_creation_usd),
        trade_diversion_usd: round(totals.trade_diversion_usd),
        trade_effect_usd: round(totals.trade_effect_usd),
        welfare_usd: round(totals.welfare_usd),
        revenue_change_usd: round(totals.revenue_change_usd),
      },
    },
    elasticities: SECTION_ELASTICITIES,
    sections,
    chapters,
    partners,
    regimes: Array.from(new Set(partners.map((partner) => partner.regime))).sort(),
    high_tariff_products: (raw.highTariff ?? []).map((product) => ({
      hs6: product.hs6,
      chapter: product.ch,
      country: product.country,
      mfn_rate: round(product.mfn, 3),
      applied_rate: round(product.applied, 3),
      import_usd: round(product.imp),
      trade_creation_usd: round(product.tc),
    })),
    top_trade_effect_sections: topTradeEffectSections,
    caveats: [
      {
        caveat_id: 'pe-direct-effects-only',
        severity: 'warning',
        message:
          'PE estimates direct import trade effects from tariff changes. It does not estimate GDP, inflation, employment, fiscal path, exchange-rate, I-O, CGE, or FPP effects.',
        affected_metrics: ['trade_effect_usd', 'welfare_usd', 'revenue_change_usd'],
        affected_models: ['pe-trade-shock'],
      },
      {
        caveat_id: 'pe-elasticity-correction',
        severity: 'warning',
        message:
          'The source PE data precomputes baseline effects at uniform elasticity 1.27; this public artifact applies documented HS-section elasticity correction factors.',
        affected_metrics: ['trade_creation_usd', 'trade_diversion_usd', 'welfare_usd'],
        affected_models: ['pe-trade-shock'],
      },
      {
        caveat_id: 'pe-partner-filter-share',
        severity: 'info',
        message:
          'Partner and regime filters use import-share scaling because the public artifact does not carry a full product-partner elasticity matrix.',
        affected_metrics: ['partner_filtered_trade_effect'],
        affected_models: ['pe-trade-shock'],
      },
    ],
  }
}

const raw = JSON.parse(readFileSync(SOURCE_PATH, 'utf8'))
const artifact = buildArtifact(raw)
writeFileSync(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')
console.log(`Wrote ${OUTPUT_PATH}`)
console.log(
  `PE artifact: ${artifact.sections.length} sections, ${Object.keys(artifact.chapters).length} chapters, ${artifact.partners.length} partners`,
)
