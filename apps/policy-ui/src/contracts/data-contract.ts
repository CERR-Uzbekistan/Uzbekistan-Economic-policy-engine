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
  // Overview artifact semantics. `delta_abs` is retained for legacy consumers;
  // Overview renderers should prefer these explicit fields when present.
  delta_value?: number | null
  delta_unit?: string | null
  delta_basis?: 'percentage_point' | 'percent_change' | 'absolute' | 'none'
  delta_pct: number | null
  direction: Direction
  confidence: Confidence | null
  last_updated: string
  model_attribution: ModelAttribution[]
  // Shot-1 additive fields for Overview KPI tiles (prompt §4.5, §3.4).
  // `context_note` carries prototype-style footnotes (e.g., "70% band · 5.2 – 6.4%");
  // the sentinel string "[SME content pending]" renders a warn chip until Shot 2 fills it.
  context_note?: string
  // `delta_label` is the full inline phrase (e.g., "+0.3 pp vs prior estimate"); when absent
  // the KPI tile composes a fallback from delta_abs + unit.
  delta_label?: string
  // Overview artifact foundation fields. These are optional so the current static
  // Overview remains a valid fallback until /data/overview.json exists.
  source_label?: string
  source_period?: string
  claim_type?: string
  claim_label_key?: string
  comparison_basis_key?: string
  comparison_period?: string | null
  validation_status?: 'valid' | 'warning' | 'failed'
  warnings?: string[]
  caveats?: string[]
  citation_label?: string
}

export type OverviewIndicatorGroup = {
  group_id: string
  title: string
  metrics: HeadlineMetric[]
}

// Shot-1 additive types for Overview state narrative (prompt §4.5 item 1).
// MacroSnapshot.summary widens to `string | NarrativeSegment[]`; structured form lets
// EconomicStateHeader wrap emphasized spans in <em> without HTML in translation values.
export type NarrativeSegment = {
  text: string
  emphasize?: boolean
}

// Shot-1 additive type for Overview named-reviewer provenance line (prompt §4.5 item 2).
export type StateProvenance = {
  drafted_from: string
  ai_assisted: boolean
  reviewed_at: string
  reviewer_name?: string
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

export type PolicyAction = {
  action_id: string
  title: string
  institution: string
  action_type: 'rate_decision' | 'regulation' | 'announcement' | 'other'
  occurred_at: string
  url?: string
}

export type DataRefresh = {
  refresh_id: string
  data_source: string
  model_id: string
  refreshed_at: string
  summary?: string
}

export type SavedScenarioActivity = {
  activity_id: string
  scenario_name: string
  scenario_id: string
  author: string
  saved_at: string
}

export type OverviewActivityFeed = {
  policy_actions: PolicyAction[]
  data_refreshes: DataRefresh[]
  saved_scenarios: SavedScenarioActivity[]
}

export type MacroSnapshot = {
  snapshot_id: string
  snapshot_name: string
  generated_at: string
  // Widened in Shot-1: structured segments let the Overview state-header emphasize
  // key numbers (<em>) without smuggling HTML through translation values.
  summary: string | NarrativeSegment[]
  model_ids: string[]
  headline_metrics: HeadlineMetric[]
  nowcast_forecast: ChartSpec
  top_risks: OverviewRisk[]
  analysis_actions: OverviewAnalysisAction[]
  output_action: OverviewOutputAction
  caveats: Caveat[]
  references: string[]
  activity_feed: OverviewActivityFeed
  // Additive Overview artifact fields. Static fallback snapshots can omit these.
  indicator_groups?: OverviewIndicatorGroup[]
  artifact_summary_metrics?: HeadlineMetric[]
  // Shot-1 additive: named-reviewer provenance line under the state narrative.
  provenance?: StateProvenance
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

// ───────────────────────────────────────────────────────────────
// Shot-1 additive Comparison-page types (prompt §4.3 + audit §3.4).
// The existing ComparisonWorkspace/ComparisonScenario/ComparisonMetricDefinition
// shapes are left untouched — QPM bridge (bridge/qpm-*.ts) and
// scenarioComparisonAdapter still consume them. The Shot-1 UI consumes
// ComparisonContent, which is composed from the existing workspace inside
// data/adapters/comparison.ts.
// ───────────────────────────────────────────────────────────────

export type ScenarioRole = 'baseline' | 'alternative' | 'downside' | 'upside'

export type ComparisonScenarioMeta = {
  id: string
  name: string
  role: ScenarioRole
  role_label: string
  author?: string
  author_date_label?: string
}

export type ComparisonMetricRow = {
  id: string
  label: string
  baseline_value: string
  values: Record<string, string>
  deltas: Record<string, string>
  highest_scenario?: string
  lowest_scenario?: string
}

export type ComparisonTradeoffMode = 'shell' | 'static' | 'empty'

export type TradeoffSummary = {
  mode: ComparisonTradeoffMode
  shell_id?: string
  rendered_text?: string
}

export type ComparisonContent = {
  scenarios: ComparisonScenarioMeta[]
  baseline_scenario_id: string
  horizon_label: string
  metrics: ComparisonMetricRow[]
  tradeoff: TradeoffSummary
}

export type ComparisonSectorEvidenceLinkageClass = 'key' | 'backward' | 'forward' | 'weak'

export type ComparisonSectorEvidenceLinkageCount = {
  classification: ComparisonSectorEvidenceLinkageClass
  value: number
}

export type ComparisonSectorEvidence = {
  source_artifact: string
  data_vintage: string
  exported_at: string
  sector_count: number
  framework: string
  units: string
  linkage_counts: ComparisonSectorEvidenceLinkageCount[]
  caveats: string[]
}

// `ModelExplorerTabId` is extended additively in Shot-1: the new 5-tab strip uses
// 'overview' | 'equations' | 'parameters' | 'caveats' | 'data_sources'. The legacy
// 'assumptions' value is retained for back-compat with the existing catalog code path.
export type ModelExplorerTabId =
  | 'overview'
  | 'assumptions'
  | 'parameters'
  | 'equations'
  | 'caveats'
  | 'data_sources'
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
  // Shot-1 additive: parallel catalog keyed by the same model_id, consumed by the
  // new Model Explorer UI. Existing details_by_model_id is preserved untouched.
  catalog_entries_by_model_id?: Record<string, ModelCatalogEntry>
  // Optional page-header meta strip values (prompt §4.2).
  meta?: ModelExplorerMeta
}

// ───────────────────────────────────────────────────────────────
// Shot-1 additive Model Explorer catalog types (prompt §4.2 + audit §3.3).
// ───────────────────────────────────────────────────────────────

export type ModelStatusSeverity = 'ok' | 'warn' | 'crit'

export type ModelStatusLabel = {
  label: string
  severity: ModelStatusSeverity
}

export type ModelEquation = {
  id: string
  label: string
}

export type ModelParameter = {
  symbol: string
  name: string
  value: string
  range: string
  inactive?: boolean
}

export type ModelCatalogCaveatSeverity = 'info' | 'warning' | 'critical'

export type ModelCaveat = {
  id: string
  number: string
  severity: ModelCatalogCaveatSeverity
  title: string
  body: string
  issue_refs?: string[]
  target_version?: string
}

export type ModelDataSource = {
  institution: string
  description: string
  vintage_label: string
}

export type ModelStat = {
  value: string
  label: string
}

export type ModelBridgeEvidenceMetric = {
  label: string
  value: string
}

export type ModelBridgeEvidence = {
  status_label: string
  source_artifact: string
  data_version: string
  exported_at: string
  solver_version: string
  sector_count: number
  framework: string
  units: string
  linkage_counts: ModelBridgeEvidenceMetric[]
  caveats: string[]
}

export type ModelCatalogEntry = {
  id: string
  title: string
  full_title: string
  lifecycle_label: string
  status: ModelStatusLabel
  model_type: string
  frequency: string
  methodology_signature: string
  description: string
  stats: ModelStat[]
  purpose: string
  equations: ModelEquation[]
  parameters: ModelParameter[]
  caveats: ModelCaveat[]
  data_sources: ModelDataSource[]
  validation_summary: string[]
  bridge_evidence?: ModelBridgeEvidence
}

export type ModelExplorerMeta = {
  models_total: number
  models_live: number
  last_calibration_audit_label: string
  open_methodology_issues: number
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

export type ScenarioLabInterpretationMetadata = {
  generation_mode: NarrativeGenerationMode
  reviewer_name?: string
  reviewed_at?: string
}

export type SuggestedNextScenarioRoute = '/scenario-lab' | '/comparison'

export type SuggestedNextScenario = {
  label: string
  target_route: SuggestedNextScenarioRoute
  target_preset?: string
}

export type ScenarioLabInterpretation = {
  what_changed: string[]
  why_it_changed: string[]
  key_risks: string[]
  policy_implications: string[]
  // Legacy field preserved for back-compat. New UI consumes `suggested_next` below.
  suggested_next_scenarios: string[]
  // Shot-1 additive: clickable anchors with route + optional preset target.
  suggested_next?: SuggestedNextScenario[]
  // Shot-1 additive: typed governance metadata for Scenario Lab interpretation rendering
  // and saved-run restore.
  metadata?: ScenarioLabInterpretationMetadata
}

export type ScenarioLabResultsBundle = {
  headline_metrics: HeadlineMetric[]
  charts_by_tab: Record<ScenarioLabResultTab, ChartSpec>
  interpretation: ScenarioLabInterpretation
  // Shot-1 additive: 3-series impulse-response chart (GDP gap, Inflation, Policy rate)
  // replaces the headline-impact horizontal-bar chart in the new Results panel.
  impulse_response_chart?: ChartSpec
}

export type ScenarioLabWorkspace = {
  workspace_id: string
  workspace_name: string
  generated_at: string
  assumptions: ScenarioLabAssumptionInput[]
  presets: ScenarioLabPreset[]
}

export type ScenarioLabIoDemandBucket = 'consumption' | 'government' | 'investment' | 'export'
export type ScenarioLabIoDistributionMode = 'output' | 'gva' | 'equal' | 'sector'
export type ScenarioLabIoShockCurrency = 'bln_uzs' | 'mln_usd'

export type ScenarioLabIoSectorOption = {
  code: string
  name: string
}

export type ScenarioLabIoAnalyticsWorkspace = {
  source_artifact: string
  data_vintage: string
  exported_at: string
  framework: string
  units: string
  base_year: number
  sector_count: number
  sectors: ScenarioLabIoSectorOption[]
  caveats: string[]
}

export type ScenarioLabIoShockRequest = {
  demand_bucket: ScenarioLabIoDemandBucket
  amount: number
  currency: ScenarioLabIoShockCurrency
  exchange_rate_uzs_per_usd?: number
  distribution: ScenarioLabIoDistributionMode
  sector_code?: string
}

export type ScenarioLabIoSectorEffect = {
  sector_code: string
  sector_name: string
  output_effect_bln_uzs: number
  value_added_effect_bln_uzs: number
  output_multiplier: number
  value_added_multiplier: number
  backward_linkage: number
  forward_linkage: number
  linkage_classification: ComparisonSectorEvidenceLinkageClass
  employment_effect_persons: number | null
}

export type ScenarioLabIoShockResult = {
  request: ScenarioLabIoShockRequest
  totals: {
    input_shock: number
    input_currency: ScenarioLabIoShockCurrency
    demand_shock_bln_uzs: number
    output_effect_bln_uzs: number
    value_added_effect_bln_uzs: number
    gdp_accounting_contribution_bln_uzs: number
    employment_effect_persons: number | null
    aggregate_output_multiplier: number | null
  }
  top_sectors: ScenarioLabIoSectorEffect[]
  caveats: string[]
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

// ───────────────────────────────────────────────────────────────
// Knowledge Hub Reform Tracker v1.
// The public surface separates accepted reform records from unreviewed
// source-extracted candidates. Research briefs and literature remain legacy
// pilot types only and are not rendered by the tracker route.
// ───────────────────────────────────────────────────────────────

export type ReformExtractionState = 'source_extracted' | 'manual_seed' | 'corrected'
export type ReformArtifactExtractionMode = 'fixture-demo' | 'configured-source-fetch'
export type ReformSourceUrlStatus = 'verified' | 'not_checked_fixture'
export type ReformReviewState =
  | 'candidate'
  | 'accepted_internal'
  | 'accepted_public'
  | 'rejected'
  | 'superseded'
  | 'retracted'
export type ReformReviewStatus = 'needs_review' | 'owner_reviewed' | 'public_cleared'
export type ReformStatus = 'adopted' | 'in_implementation' | 'planned' | 'superseded' | 'unknown'
export type ReformCitationPermission = 'internal_only' | 'external_allowed' | 'prohibited' | 'pending'
export type ReformLicenseClass =
  | 'public_open'
  | 'public_attribution_required'
  | 'public_link_only'
  | 'internal'
  | 'licensed'
  | 'restricted'
  | 'unknown'
export type ReformTranslationReviewState =
  | 'not_translated'
  | 'ai_drafted_unreviewed'
  | 'human_translated_unreviewed'
  | 'reviewed'
  | 'blocked'
  | 'not_applicable'

export type ResearchBriefByline = {
  author?: string
  date_label: string
  read_time_minutes?: number
  ai_drafted?: boolean
  reviewed_by?: string
}

export type ResearchBrief = {
  id: string
  byline: ResearchBriefByline
  title: string
  summary: string
  domain_tag?: string
  model_refs: string[]
}

export type ReformEvidenceType =
  | 'legal_text'
  | 'official_policy_announcement'
  | 'consultation_notice'
  | 'budget_tax_measure'
  | 'regulatory_parameter_change'
  | 'implementation_program'
  | 'international_agreement'
export type ReformCategory =
  | 'monetary_policy'
  | 'fiscal_tax'
  | 'budget_public_finance'
  | 'trade_customs'
  | 'energy_tariffs'
  | 'financial_sector'
  | 'soe_privatization'
  | 'social_protection'
  | 'business_environment'
  | 'agriculture'
  | 'digital_public_admin'
  | 'infrastructure_investment'
  | 'industrial_policy'
  | 'competition_regulation'
  | 'labor_market'
  | 'other_policy'

export type ReformTrackerRecordBase = {
  id: string
  extraction_state: ReformExtractionState
  review_state: ReformReviewState
  review_status: ReformReviewStatus
  title: string
  summary: string
  domain_tag: string
  domain_tags: string[]
  reform_category: ReformCategory
  evidence_types: ReformEvidenceType[]
  inclusion_reason: string
  matched_rules: string[]
  matched_include_rules?: string[]
  source_title: string
  source_institution: string
  source_owner: string
  source_url: string
  source_published_at?: string
  retrieved_at?: string
  extracted_at?: string
  as_of_date?: string
  status_authority?: string
  citation_permission: ReformCitationPermission
  license_class: ReformLicenseClass
  translation_review_state: ReformTranslationReviewState
  caveats: string[]
}

export type ReformTrackerItem = ReformTrackerRecordBase & {
  review_state: 'accepted_internal' | 'accepted_public'
  status: Exclude<ReformStatus, 'unknown'>
  reviewer_of_record: string
  review_date: string
  review_scope: string
  model_refs: string[]
}

export type ReformCandidateItem = ReformTrackerRecordBase & {
  extraction_state: 'source_extracted'
  extraction_mode: ReformArtifactExtractionMode
  review_state: 'candidate'
  review_status: 'needs_review'
  status: 'unknown'
  relevance_score: number
  source_url_status: ReformSourceUrlStatus
  source_url_verified_at?: string
}

export type KnowledgeHubMeta = {
  reforms_tracked: number
  research_briefs: number
  literature_items: number
  candidate_items?: number
  sources_configured?: number
}

export type KnowledgeHubSourceDiagnostic = {
  id: string
  institution: string
  url: string
  parser: string
  fetch_url: string
  ok: boolean
  candidate_count: number
  excluded_count: number
  link_invalid_count: number
  fetched_at?: string
  error?: string
}

export type KnowledgeHubContent = {
  reforms: ReformTrackerItem[]
  briefs: ResearchBrief[]
  candidates?: ReformCandidateItem[]
  source_diagnostics?: KnowledgeHubSourceDiagnostic[]
  caveats?: string[]
  generated_at?: string
  extraction_mode?: string
  extraction_mode_label?: string
  source_artifact?: string
  meta: KnowledgeHubMeta
}
