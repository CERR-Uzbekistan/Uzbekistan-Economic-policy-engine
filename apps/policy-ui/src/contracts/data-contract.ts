export type ScenarioType = 'baseline' | 'alternative' | 'stress'
export type AssumptionCategory = 'macro' | 'external' | 'fiscal' | 'trade' | 'advanced'
export type Direction = 'up' | 'down' | 'flat'
export type Confidence = 'high' | 'medium' | 'low'
export type ChartType = 'line' | 'bar' | 'area' | 'combo'
export type ChartViewMode = 'level' | 'delta' | 'risk'
export type ChartSemanticRole = 'baseline' | 'alternative' | 'downside' | 'upside' | 'other'
export type NarrativeGenerationMode = 'template' | 'assisted'
export type CaveatSeverity = 'info' | 'warning' | 'critical'
export type ApiErrorSeverity = 'info' | 'warning' | 'error'

export type Assumption = {
  key: string
  label: string
  value: number | string | boolean
  unit: string
  category: AssumptionCategory
  technical_variable: string | null
}

export type Scenario = {
  scenario_id: string
  scenario_name: string
  scenario_type: ScenarioType
  tags: string[]
  description: string
  created_at: string
  updated_at: string
  created_by: string
  assumptions: Assumption[]
  model_ids: string[]
}

export type ModelAttribution = {
  model_id: string
  model_name: string
  module: string
  version: string
  run_id: string
  data_version: string
  timestamp: string
}

export type HeadlineMetric = {
  metric_id: string
  label: string
  value: number
  unit: string
  period: string
  baseline_value: number | null
  delta_abs: number | null
  delta_pct: number | null
  direction: Direction
  confidence: Confidence | null
  last_updated: string
  model_attribution: ModelAttribution[]
}

export type ChartAxis = {
  label: string
  unit: string
  values: Array<string | number>
}

export type ChartSeries = {
  series_id: string
  label: string
  semantic_role: ChartSemanticRole
  values: number[]
}

export type UncertaintyBand = {
  series_id: string
  lower: number[]
  upper: number[]
  confidence_level: number
  methodology_label: string
  is_illustrative: boolean
}

export type ChartSpec = {
  chart_id: string
  title: string
  subtitle: string
  chart_type: ChartType
  x: ChartAxis
  y: ChartAxis
  series: ChartSeries[]
  view_mode: ChartViewMode | null
  uncertainty: UncertaintyBand[]
  takeaway: string
  model_attribution: ModelAttribution[]
}

export type NarrativeBlock = {
  summary: string
  key_findings: string[]
  risks: string[]
  policy_implications: string[]
  recommendations: string[]
  uncertainty_note: string
  generated_at: string
  generation_mode: NarrativeGenerationMode
}

export type Caveat = {
  caveat_id: string
  severity: CaveatSeverity
  message: string
  affected_metrics: string[]
  affected_models: string[]
}

export type ScenarioResult = {
  scenario: Scenario
  headline_metrics: HeadlineMetric[]
  charts: ChartSpec[]
  tables: Record<string, unknown>[]
  narrative: NarrativeBlock
  caveats: Caveat[]
  references: string[]
}

export type ApiError = {
  error_code: string
  message: string
  severity: ApiErrorSeverity
  recoverable: boolean
  affected_module: string
  suggested_action: string | null
}
