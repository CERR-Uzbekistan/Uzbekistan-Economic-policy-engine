# Frontend Replatform Shared Data Contract (MVP Draft)

## Contract Principles

- One normalized UI contract across all model adapters.
- Versioned schema from day one.
- Explicit uncertainty, caveats, and source metadata.
- Backward compatibility for saved scenarios.

## Schema Version

- `schema_version`: string (example: `1.0.0`)

## Core Objects

## `Scenario`

- `scenario_id`: string
- `scenario_name`: string
- `scenario_type`: enum (`baseline` | `alternative` | `stress`)
- `tags`: string[]
- `description`: string
- `created_at`: ISO datetime string
- `updated_at`: ISO datetime string
- `created_by`: string
- `assumptions`: `Assumption[]`
- `model_ids`: string[]

## `Assumption`

- `key`: string
- `label`: string
- `value`: number | string | boolean
- `unit`: string
- `category`: enum (`macro` | `external` | `fiscal` | `trade` | `advanced`)
- `technical_variable`: string | null

## `HeadlineMetric`

- `metric_id`: string
- `label`: string
- `value`: number
- `unit`: string
- `period`: string
- `baseline_value`: number | null
- `delta_abs`: number | null
- `delta_pct`: number | null
- `direction`: enum (`up` | `down` | `flat`)
- `confidence`: enum (`high` | `medium` | `low`) | null
- `last_updated`: ISO datetime string
- `model_attribution`: `ModelAttribution[]`

## `ChartSpec`

- `chart_id`: string
- `title`: string
- `subtitle`: string
- `chart_type`: enum (`line` | `bar` | `area` | `combo`)
- `x`: `ChartAxis`
- `y`: `ChartAxis`
- `series`: `ChartSeries[]`
- `view_mode`: enum (`level` | `delta` | `risk`) | null
- `uncertainty`: `UncertaintyBand[]`
- `takeaway`: string
- `model_attribution`: `ModelAttribution[]`

## `ChartAxis`

- `label`: string
- `unit`: string
- `values`: (string | number)[]

## `ChartSeries`

- `series_id`: string
- `label`: string
- `semantic_role`: enum (`baseline` | `alternative` | `downside` | `upside` | `other`)
- `values`: number[]

## `UncertaintyBand`

- `series_id`: string
- `lower`: number[]
- `upper`: number[]
- `confidence_level`: number
- `methodology_label`: string
- `is_illustrative`: boolean

## `NarrativeBlock`

- `summary`: string
- `key_findings`: string[]
- `risks`: string[]
- `policy_implications`: string[]
- `recommendations`: string[]
- `uncertainty_note`: string
- `generated_at`: ISO datetime string
- `generation_mode`: enum (`template` | `assisted`)

## `Caveat`

- `caveat_id`: string
- `severity`: enum (`info` | `warning` | `critical`)
- `message`: string
- `affected_metrics`: string[]
- `affected_models`: string[]

## `ModelAttribution`

- `model_id`: string
- `model_name`: string
- `module`: string
- `version`: string
- `run_id`: string
- `data_version`: string
- `timestamp`: ISO datetime string

## Envelope Shapes

## `ScenarioResult`

- `scenario`: `Scenario`
- `headline_metrics`: `HeadlineMetric[]`
- `charts`: `ChartSpec[]`
- `tables`: object[]
- `narrative`: `NarrativeBlock`
- `caveats`: `Caveat[]`
- `references`: string[]

## Overview-Specific Shape (`MacroSnapshot`)

Use this shape for `Overview` page data instead of `ScenarioResult` to keep monitoring and scenario workflows separated.

- `snapshot_id`: string
- `snapshot_name`: string
- `generated_at`: ISO datetime string
- `summary`: string
- `model_ids`: string[]
- `headline_metrics`: `HeadlineMetric[]`
- `nowcast_forecast`: `ChartSpec`
- `top_risks`: `OverviewRisk[]`
- `analysis_actions`: `OverviewAnalysisAction[]`
- `output_action`: `OverviewOutputAction`
- `caveats`: `Caveat[]`
- `references`: string[]

## `OverviewRisk`

- `risk_id`: string
- `title`: string
- `why_it_matters`: string
- `impact_channel`: string
- `suggested_scenario`: string

## `OverviewAnalysisAction`

- `action_id`: string
- `title`: string
- `summary`: string
- `scenario_query`: string

## `OverviewOutputAction`

- `action_id`: string
- `title`: string
- `summary`: string
- `target_href`: string

## Scenario Lab-Specific Shape (`ScenarioLabWorkspace`)

Use this shape for Scenario Lab workflows so analysis work stays separate from monitoring (`MacroSnapshot`) and downstream comparison pages.

- `workspace_id`: string
- `workspace_name`: string
- `generated_at`: ISO datetime string
- `assumptions`: `ScenarioLabAssumptionInput[]`
- `presets`: `ScenarioLabPreset[]`
- `baseline_results`: `ScenarioLabResultsBundle`

## `ScenarioLabAssumptionState`

- `Record<string, number>` keyed by assumption `key`

## `ScenarioLabResultTab`

- enum: `headline_impact` | `macro_path` | `external_balance` | `fiscal_effects`

## `ScenarioLabAssumptionInput`

- `key`: string
- `label`: string
- `description`: string
- `category`: enum (`macro` | `external` | `fiscal` | `trade` | `advanced`)
- `unit`: string
- `technical_variable`: string | null
- `min`: number
- `max`: number
- `step`: number
- `default_value`: number

## `ScenarioLabPreset`

- `preset_id`: string
- `title`: string
- `summary`: string
- `assumption_overrides`: `Record<string, number>`

## `ScenarioLabResultsBundle`

- `headline_metrics`: `HeadlineMetric[]`
- `charts_by_tab`: `Record<ScenarioLabResultTab, ChartSpec>`
- `interpretation`: `ScenarioLabInterpretation`

## `ScenarioLabInterpretation`

- `what_changed`: string[]
- `why_it_changed`: string[]
- `key_risks`: string[]
- `policy_implications`: string[]
- `suggested_next_scenarios`: string[]

## Comparison-Specific Shape (`ComparisonWorkspace`)

Use this shape for the `Comparison` page so side-by-side decision analysis remains separate from monitoring (`MacroSnapshot`) and scenario construction (`ScenarioLabWorkspace`).

- `workspace_id`: string
- `generated_at`: ISO datetime string
- `metric_definitions`: `ComparisonMetricDefinition[]`
- `scenarios`: `ComparisonScenario[]`
- `default_baseline_id`: string
- `default_selected_ids`: string[] (2-4 scenario ids)

## `ComparisonViewMode`

- enum: `level` | `delta` | `risk`

## `ComparisonScenarioTag`

- enum: `preferred` | `balanced` | `aggressive` | `downside_stress`

## `ComparisonMetricDefinition`

- `metric_id`: string
- `label`: string
- `unit`: string

## `ComparisonScenario`

- `scenario_id`: string
- `scenario_name`: string
- `scenario_type`: enum (`baseline` | `alternative` | `stress`)
- `summary`: string
- `initial_tag`: `ComparisonScenarioTag`
- `values`: `Record<string, number>`
- `macro_path`: number[]
- `risk_index`: number

## Model Explorer Basic Shape (`ModelExplorerWorkspace`)

Use this shape for the `Model Explorer` basic page with typed mock metadata only.

- `workspace_id`: string
- `generated_at`: ISO datetime string
- `models`: `ModelExplorerModelEntry[]`
- `default_model_id`: string
- `details_by_model_id`: `Record<string, ModelExplorerModelDetail>`

## `ModelRunStatus`

- enum: `active` | `staging` | `paused`

## `ModelExplorerTabId`

- enum: `assumptions` | `equations` | `caveats` | `data_sources`

## `ModelExplorerModelEntry`

- `model_id`: string
- `model_name`: string
- `model_type`: string
- `frequency`: string
- `status`: `ModelRunStatus`
- `summary`: string

## `ModelExplorerModelDetail`

- `model_id`: string
- `overview`: string
- `assumptions`: `ModelExplorerAssumption[]`
- `equations`: `ModelExplorerEquation[]`
- `caveats`: `ModelExplorerCaveat[]`
- `data_sources`: `ModelExplorerDataSource[]`

## `ModelExplorerAssumption`

- `assumption_id`: string
- `label`: string
- `value`: string
- `rationale`: string

## `ModelExplorerEquation`

- `equation_id`: string
- `title`: string
- `expression`: string
- `explanation`: string

## `ModelExplorerCaveat`

- `caveat_id`: string
- `severity`: enum (`info` | `warning` | `critical`)
- `message`: string
- `implication`: string

## `ModelExplorerDataSource`

- `source_id`: string
- `name`: string
- `provider`: string
- `frequency`: string
- `vintage`: string
- `note`: string

## `ApiError`

- `error_code`: string
- `message`: string
- `severity`: enum (`info` | `warning` | `error`)
- `recoverable`: boolean
- `affected_module`: string
- `suggested_action`: string | null

## Compatibility Rules

- Breaking changes require schema version increment and migration note.
- Saved scenario payloads from older versions must be migratable.
- Unknown fields should be safely ignored by UI readers when possible.
