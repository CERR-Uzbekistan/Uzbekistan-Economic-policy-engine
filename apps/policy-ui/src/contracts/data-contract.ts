export type ScenarioType = 'baseline' | 'alternative' | 'stress'
export type AssumptionCategory = 'macro' | 'external' | 'fiscal' | 'trade' | 'advanced'
export type Direction = 'up' | 'down' | 'flat'
export type Confidence = 'high' | 'medium' | 'low'
export type ChartType = 'line' | 'bar' | 'area' | 'combo'
export type ChartViewMode = 'level' | 'delta' | 'risk'
export type ChartSemanticRole = 'baseline' | 'alternative' | 'downside' | 'upside' | 'other'
export type NarrativeGenerationMode = 'template' | 'assisted' | 'reviewed'
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
  reviewer_name?: string
  reviewed_at?: string
}

export type Caveat = {
  caveat_id: string
  severity: CaveatSeverity
  message: string
  affected_metrics: string[]
  affected_models: string[]
}

export type OverviewRisk = {
  risk_id: string
  title: string
  why_it_matters: string
  impact_channel: string
  suggested_scenario: string
  scenario_query?: string
}

export type OverviewAnalysisAction = {
  action_id: string
  title: string
  summary: string
  scenario_query: string
}

export type OverviewOutputAction = {
  action_id: string
  title: string
  summary: string
  target_href: string
}

export type MacroSnapshot = {
  snapshot_id: string
  snapshot_name: string
  generated_at: string
  summary: string
  model_ids: string[]
  headline_metrics: HeadlineMetric[]
  nowcast_forecast: ChartSpec
  top_risks: OverviewRisk[]
  analysis_actions: OverviewAnalysisAction[]
  output_action: OverviewOutputAction
  caveats: Caveat[]
  references: string[]
}

export type ComparisonScenarioTag = 'preferred' | 'balanced' | 'aggressive' | 'downside_stress'
export type ComparisonViewMode = ChartViewMode

export type ComparisonMetricDefinition = {
  metric_id: string
  label: string
  unit: string
}

export type ComparisonScenario = {
  scenario_id: string
  scenario_name: string
  scenario_type: ScenarioType
  summary: string
  initial_tag: ComparisonScenarioTag
  values: Record<string, number>
  risk_index: number
}

export type ComparisonWorkspace = {
  workspace_id: string
  generated_at: string
  metric_definitions: ComparisonMetricDefinition[]
  scenarios: ComparisonScenario[]
  default_baseline_id: string
  default_selected_ids: string[]
}

export type ModelExplorerTabId = 'assumptions' | 'equations' | 'caveats' | 'data_sources'
export type ModelRunStatus = 'active' | 'staging' | 'paused'

export type ModelExplorerModelEntry = {
  model_id: string
  model_name: string
  model_type: string
  frequency: string
  status: ModelRunStatus
  summary: string
}

export type ModelExplorerAssumption = {
  assumption_id: string
  label: string
  value: string
  rationale: string
}

export type ModelExplorerEquation = {
  equation_id: string
  title: string
  expression: string
  explanation: string
}

export type ModelExplorerCaveat = {
  caveat_id: string
  severity: CaveatSeverity
  message: string
  implication: string
}

export type ModelExplorerDataSource = {
  source_id: string
  name: string
  provider: string
  frequency: string
  vintage: string
  note: string
}

export type ModelExplorerModelDetail = {
  model_id: string
  overview: string
  assumptions: ModelExplorerAssumption[]
  equations: ModelExplorerEquation[]
  caveats: ModelExplorerCaveat[]
  data_sources: ModelExplorerDataSource[]
}

export type ModelExplorerWorkspace = {
  workspace_id: string
  generated_at: string
  models: ModelExplorerModelEntry[]
  default_model_id: string
  details_by_model_id: Record<string, ModelExplorerModelDetail>
}

export type ScenarioLabResultTab =
  | 'headline_impact'
  | 'macro_path'
  | 'external_balance'
  | 'fiscal_effects'

export type ScenarioLabAssumptionState = Record<string, number>

export type ScenarioLabAssumptionInput = {
  key: string
  label: string
  description: string
  category: AssumptionCategory
  unit: string
  technical_variable: string | null
  min: number
  max: number
  step: number
  default_value: number
}

export type ScenarioLabPreset = {
  preset_id: string
  title: string
  summary: string
  assumption_overrides: Record<string, number>
}

export type ScenarioLabInterpretation = {
  what_changed: string[]
  why_it_changed: string[]
  key_risks: string[]
  policy_implications: string[]
  suggested_next_scenarios: string[]
}

export type ScenarioLabResultsBundle = {
  headline_metrics: HeadlineMetric[]
  charts_by_tab: Record<ScenarioLabResultTab, ChartSpec>
  interpretation: ScenarioLabInterpretation
}

export type ScenarioLabWorkspace = {
  workspace_id: string
  workspace_name: string
  generated_at: string
  assumptions: ScenarioLabAssumptionInput[]
  presets: ScenarioLabPreset[]
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
