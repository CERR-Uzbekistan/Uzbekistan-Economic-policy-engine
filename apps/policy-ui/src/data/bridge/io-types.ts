import type { Caveat, ModelAttribution } from '../../contracts/data-contract.js'

export type IoLinkageClassification = 'key' | 'backward' | 'forward' | 'weak'

export type IoFinalDemand = {
  household: number
  government: number
  npish: number
  gfcf: number
  inventories: number
  exports: number
  total: number
}

export type IoSector = {
  id: number
  code: string
  name_ru: string
  output_thousand_uzs: number
  total_resources_thousand_uzs: number
  imports_thousand_uzs: number
  gva_thousand_uzs: number
  compensation_of_employees_thousand_uzs: number
  gross_operating_surplus_thousand_uzs: number
  employment_total?: number
  employment_formal?: number
  employment_informal?: number
  output_multiplier: number
  value_added_multiplier: number
  final_demand: IoFinalDemand
}

export type IoMatrices = {
  technical_coefficients: number[][]
  leontief_inverse: number[][]
}

export type IoTotals = {
  output_thousand_uzs: number[]
  total_resources_thousand_uzs: number[]
  final_demand_thousand_uzs: number[]
  imports_thousand_uzs: number[]
}

export type IoMetadata = {
  exported_at: string
  source_script_sha: string | null
  solver_version: string
  source_artifact: string
  source_artifact_generated: string
  source_title: string
  source: string
  framework: string
  units: string
  base_year: number
  n_sectors: number
}

export type IoBridgePayload = {
  attribution: ModelAttribution
  sectors: IoSector[]
  matrices: IoMatrices
  totals: IoTotals
  caveats: Caveat[]
  metadata: IoMetadata
}
