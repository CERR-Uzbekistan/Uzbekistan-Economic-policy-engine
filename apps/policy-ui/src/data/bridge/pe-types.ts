import type { Caveat, ModelAttribution } from '../../contracts/data-contract.js'

export type PeBaselineEffect = {
  trade_creation_usd: number
  trade_diversion_usd: number
  trade_effect_usd: number
  welfare_usd: number
  revenue_change_usd: number
}

export type PeSection = {
  id: string
  name: string
  import_usd: number
  avg_mfn_rate: number
  avg_applied_rate: number
  chapters: number[]
  elasticity: number
  baseline_20pct: PeBaselineEffect
}

export type PeChapter = {
  chapter: number
  section_id: string
  import_usd: number
  avg_mfn_rate: number
  avg_applied_rate: number
  elasticity: number
  baseline_20pct: PeBaselineEffect
}

export type PePartner = {
  name: string
  regime: string
  import_usd: number
  import_share: number
}

export type PeHighTariffProduct = {
  hs6: string
  chapter: number
  country: string
  mfn_rate: number
  applied_rate: number
  import_usd: number
  trade_creation_usd: number
}

export type PeTopTradeEffectSection = PeBaselineEffect & {
  section_id: string
  name: string
  elasticity: number
}

export type PeMetadata = {
  exported_at: string
  source_script_sha: string | null
  source_data_sha: string
  solver_version: string
  source_artifact: string
  source_artifact_generated: string
  source_title: string
  source: string
  framework: string
  units: string
  base_year: number
  hs_sections: number
  hs_chapters: number
  partners: number
  default_tariff_cut_pct: number
  base_elasticity: number
  elasticity_source: string
}

export type PeBridgePayload = {
  attribution: ModelAttribution
  metadata: PeMetadata
  totals: {
    import_usd: number
    subject_import_usd: number
    baseline_20pct: PeBaselineEffect
  }
  elasticities: Record<string, number>
  sections: PeSection[]
  chapters: Record<string, PeChapter>
  partners: PePartner[]
  regimes: string[]
  high_tariff_products: PeHighTariffProduct[]
  top_trade_effect_sections: PeTopTradeEffectSection[]
  caveats: Caveat[]
}
