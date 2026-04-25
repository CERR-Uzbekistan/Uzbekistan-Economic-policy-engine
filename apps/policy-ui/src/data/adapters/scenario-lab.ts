import type {
  ChartSpec,
  ChartType,
  HeadlineMetric,
  ScenarioLabInterpretation,
  ScenarioLabResultTab,
  ScenarioLabResultsBundle,
  ScenarioLabWorkspace,
} from '../../contracts/data-contract'
import {
  buildScenarioLabResults,
  getDefaultAssumptionState,
  scenarioLabWorkspaceMock,
} from '../mock/scenario-lab.js'

type RawScenarioLabAssumption = {
  key?: string
  label?: string
  description?: string
  category?: string
  unit?: string
  technicalVariable?: string | null
  min?: number
  max?: number
  step?: number
  defaultValue?: number
}

type RawScenarioLabPreset = {
  presetId?: string
  title?: string
  summary?: string
  assumptionOverrides?: Record<string, number>
}

type RawScenarioLabMetric = {
  metricId?: string
  label?: string
  value?: number
  unit?: string
  period?: string
  baselineValue?: number | null
  deltaAbs?: number | null
  deltaPct?: number | null
  direction?: string
  confidence?: string | null
  lastUpdated?: string
}

type RawScenarioLabChart = {
  chartId?: string
  title?: string
  subtitle?: string
  chartType?: string
  x?: {
    label?: string
    unit?: string
    values?: Array<string | number>
  }
  y?: {
    label?: string
    unit?: string
    values?: number[]
  }
  series?: Array<{
    seriesId?: string
    label?: string
    semanticRole?: string
    values?: number[]
  }>
  viewMode?: string | null
  takeaway?: string
}

type RawScenarioLabInterpretation = {
  whatChanged?: string[]
  whyItChanged?: string[]
  keyRisks?: string[]
  policyImplications?: string[]
  suggestedNextScenarios?: string[]
  generationMode?: string
  reviewerName?: string
  reviewedAt?: string
}

export type RawScenarioLabRunPayload = {
  workspace?: {
    workspaceId?: string
    workspaceName?: string
    generatedAt?: string
    assumptions?: RawScenarioLabAssumption[]
    presets?: RawScenarioLabPreset[]
  }
  run?: {
    generatedAt?: string
    headlineMetrics?: RawScenarioLabMetric[]
    chartsByTab?: Partial<Record<ScenarioLabResultTab, RawScenarioLabChart>>
    interpretation?: RawScenarioLabInterpretation
  }
}

export type ScenarioLabAdaptedData = {
  workspace: ScenarioLabWorkspace
  results: ScenarioLabResultsBundle
}

const RESULT_TABS: ScenarioLabResultTab[] = [
  'headline_impact',
  'macro_path',
  'external_balance',
  'fiscal_effects',
]

function toIsoOrFallback(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function isAllowedChartType(value: string | undefined): value is ChartType {
  return value === 'line' || value === 'bar' || value === 'area' || value === 'combo'
}

function hasNonEmptyAxisValues(values: Array<string | number> | undefined): values is Array<string | number> {
  return Array.isArray(values) && values.length > 0
}

function hasNonEmptyNumericValues(values: number[] | undefined): values is number[] {
  return Array.isArray(values) && values.length > 0
}

function toChart(rawChart: RawScenarioLabChart | undefined, fallback: ChartSpec): ChartSpec {
  if (!rawChart) {
    return fallback
  }

  const mergedSeries =
    rawChart.series && rawChart.series.length > 0
      ? rawChart.series.map((series, index) => ({
          series_id: series.seriesId ?? fallback.series[index]?.series_id ?? `series-${index + 1}`,
          label: series.label ?? fallback.series[index]?.label ?? `Series ${index + 1}`,
          semantic_role:
            series.semanticRole === 'baseline' ||
            series.semanticRole === 'alternative' ||
            series.semanticRole === 'downside' ||
            series.semanticRole === 'upside' ||
            series.semanticRole === 'other'
              ? series.semanticRole
              : fallback.series[index]?.semantic_role ?? 'other',
          values: hasNonEmptyNumericValues(series.values)
            ? series.values
            : fallback.series[index]?.values ?? [],
        }))
      : fallback.series

  const yValuesFromSeries = mergedSeries[0]?.values

  return {
    chart_id: rawChart.chartId ?? fallback.chart_id,
    title: rawChart.title ?? fallback.title,
    subtitle: rawChart.subtitle ?? fallback.subtitle,
    chart_type: isAllowedChartType(rawChart.chartType) ? rawChart.chartType : fallback.chart_type,
    x: {
      label: rawChart.x?.label ?? fallback.x.label,
      unit: rawChart.x?.unit ?? fallback.x.unit,
      values: hasNonEmptyAxisValues(rawChart.x?.values) ? rawChart.x.values : fallback.x.values,
    },
    y: {
      label: rawChart.y?.label ?? fallback.y.label,
      unit: rawChart.y?.unit ?? fallback.y.unit,
      values: hasNonEmptyAxisValues(rawChart.y?.values)
        ? rawChart.y.values
        : hasNonEmptyNumericValues(yValuesFromSeries)
          ? yValuesFromSeries
          : fallback.y.values,
    },
    series: mergedSeries,
    view_mode:
      rawChart.viewMode === 'level' || rawChart.viewMode === 'delta' || rawChart.viewMode === 'risk'
        ? rawChart.viewMode
        : fallback.view_mode,
    uncertainty: fallback.uncertainty,
    takeaway: rawChart.takeaway ?? fallback.takeaway,
    model_attribution: fallback.model_attribution,
  }
}

function toHeadlineMetrics(
  input: RawScenarioLabMetric[] | undefined,
  fallback: HeadlineMetric[],
  generatedAt: string,
): HeadlineMetric[] {
  if (!input || input.length === 0) {
    return fallback
  }

  return input.map((metric, index) => {
    const fallbackMetric = fallback[index] ?? fallback[0]
    const value = metric.value ?? fallbackMetric?.value ?? 0
    const baselineValue = metric.baselineValue ?? fallbackMetric?.baseline_value ?? null
    const deltaAbs = metric.deltaAbs ?? (baselineValue === null ? null : value - baselineValue)
    const deltaPct =
      metric.deltaPct ??
      (deltaAbs === null || baselineValue === null || baselineValue === 0
        ? null
        : (deltaAbs / baselineValue) * 100)

    return {
      metric_id: metric.metricId ?? fallbackMetric?.metric_id ?? `metric-${index + 1}`,
      label: metric.label ?? fallbackMetric?.label ?? `Metric ${index + 1}`,
      value,
      unit: metric.unit ?? fallbackMetric?.unit ?? '',
      period: metric.period ?? fallbackMetric?.period ?? 'n/a',
      baseline_value: baselineValue,
      delta_abs: deltaAbs,
      delta_pct: deltaPct,
      direction:
        metric.direction === 'up' || metric.direction === 'down' || metric.direction === 'flat'
          ? metric.direction
          : deltaAbs === null
            ? 'flat'
            : deltaAbs > 0
              ? 'up'
              : deltaAbs < 0
                ? 'down'
                : 'flat',
      confidence:
        metric.confidence === 'high' || metric.confidence === 'medium' || metric.confidence === 'low'
          ? metric.confidence
          : null,
      last_updated: toIsoOrFallback(metric.lastUpdated, generatedAt),
      model_attribution: fallbackMetric?.model_attribution ?? [],
    }
  })
}

function isGenerationMode(
  value: string | undefined,
): value is NonNullable<ScenarioLabInterpretation['metadata']>['generation_mode'] {
  return value === 'template' || value === 'assisted' || value === 'reviewed'
}

function toInterpretationMetadata(
  rawInterpretation: RawScenarioLabInterpretation | undefined,
  fallback: NonNullable<ScenarioLabInterpretation['metadata']>,
): NonNullable<ScenarioLabInterpretation['metadata']> {
  return {
    generation_mode: isGenerationMode(rawInterpretation?.generationMode)
      ? rawInterpretation.generationMode
      : fallback.generation_mode,
    ...(typeof rawInterpretation?.reviewerName === 'string'
      ? { reviewer_name: rawInterpretation.reviewerName }
      : fallback.reviewer_name
        ? { reviewer_name: fallback.reviewer_name }
        : {}),
    ...(typeof rawInterpretation?.reviewedAt === 'string'
      ? { reviewed_at: rawInterpretation.reviewedAt }
      : fallback.reviewed_at
        ? { reviewed_at: fallback.reviewed_at }
        : {}),
  }
}

function toWorkspace(raw: RawScenarioLabRunPayload['workspace'] | undefined): ScenarioLabWorkspace {
  const fallback = scenarioLabWorkspaceMock
  return {
    workspace_id: raw?.workspaceId ?? fallback.workspace_id,
    workspace_name: raw?.workspaceName ?? fallback.workspace_name,
    generated_at: toIsoOrFallback(raw?.generatedAt, fallback.generated_at),
    assumptions:
      raw?.assumptions?.map((assumption, index) => {
        const fallbackAssumption = fallback.assumptions[index]
        return {
          key: assumption.key ?? fallbackAssumption?.key ?? `assumption-${index + 1}`,
          label: assumption.label ?? fallbackAssumption?.label ?? `Assumption ${index + 1}`,
          description: assumption.description ?? fallbackAssumption?.description ?? 'No description provided.',
          category:
            assumption.category === 'macro' ||
            assumption.category === 'external' ||
            assumption.category === 'fiscal' ||
            assumption.category === 'trade' ||
            assumption.category === 'advanced'
              ? assumption.category
              : fallbackAssumption?.category ?? 'macro',
          unit: assumption.unit ?? fallbackAssumption?.unit ?? '',
          technical_variable:
            assumption.technicalVariable ?? fallbackAssumption?.technical_variable ?? null,
          min: assumption.min ?? fallbackAssumption?.min ?? -100,
          max: assumption.max ?? fallbackAssumption?.max ?? 100,
          step: assumption.step ?? fallbackAssumption?.step ?? 1,
          default_value: assumption.defaultValue ?? fallbackAssumption?.default_value ?? 0,
        }
      }) ?? fallback.assumptions,
    presets:
      raw?.presets?.map((preset, index) => {
        const fallbackPreset = fallback.presets[index]
        return {
          preset_id: preset.presetId ?? fallbackPreset?.preset_id ?? `preset-${index + 1}`,
          title: preset.title ?? fallbackPreset?.title ?? `Preset ${index + 1}`,
          summary: preset.summary ?? fallbackPreset?.summary ?? 'No summary provided.',
          assumption_overrides: preset.assumptionOverrides ?? fallbackPreset?.assumption_overrides ?? {},
        }
      }) ?? fallback.presets,
  }
}

export function toScenarioLabData(raw: RawScenarioLabRunPayload): ScenarioLabAdaptedData {
  const fallbackResults = buildScenarioLabResults(getDefaultAssumptionState())
  const generatedAt = toIsoOrFallback(raw.run?.generatedAt, new Date().toISOString())
  const rawInterpretation = raw.run?.interpretation
  const fallbackInterpretationMetadata = fallbackResults.interpretation.metadata ?? {
    generation_mode: 'template',
  }

  return {
    workspace: toWorkspace(raw.workspace),
    results: {
      headline_metrics: toHeadlineMetrics(raw.run?.headlineMetrics, fallbackResults.headline_metrics, generatedAt),
      charts_by_tab: RESULT_TABS.reduce<ScenarioLabResultsBundle['charts_by_tab']>((acc, tab) => {
        acc[tab] = toChart(raw.run?.chartsByTab?.[tab], fallbackResults.charts_by_tab[tab])
        return acc
      }, {} as ScenarioLabResultsBundle['charts_by_tab']),
      interpretation: {
        what_changed: raw.run?.interpretation?.whatChanged ?? fallbackResults.interpretation.what_changed,
        why_it_changed: raw.run?.interpretation?.whyItChanged ?? fallbackResults.interpretation.why_it_changed,
        key_risks: raw.run?.interpretation?.keyRisks ?? fallbackResults.interpretation.key_risks,
        policy_implications:
          raw.run?.interpretation?.policyImplications ??
          fallbackResults.interpretation.policy_implications,
        suggested_next_scenarios:
          raw.run?.interpretation?.suggestedNextScenarios ??
          fallbackResults.interpretation.suggested_next_scenarios,
        metadata: toInterpretationMetadata(rawInterpretation, fallbackInterpretationMetadata),
      } as ScenarioLabResultsBundle['interpretation'],
    },
  }
}
