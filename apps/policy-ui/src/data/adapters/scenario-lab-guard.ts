import type { RawScenarioLabRunPayload } from './scenario-lab'

type ValidationSeverity = 'error' | 'warning'

export type ScenarioLabValidationIssue = {
  path: string
  message: string
  severity: ValidationSeverity
}

export type ScenarioLabValidationResult = {
  ok: boolean
  value: RawScenarioLabRunPayload
  issues: ScenarioLabValidationIssue[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asNullableNumber(value: unknown): number | null | undefined {
  if (value === null) {
    return null
  }
  return asNumber(value)
}

function asStringOrNull(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }
  return asString(value)
}

function asStringArray(
  value: unknown,
  issues: ScenarioLabValidationIssue[],
  path: string,
): string[] | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value)) {
    issues.push({ path, message: 'Expected an array of strings.', severity: 'warning' })
    return undefined
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function asStringOrNumberArray(
  value: unknown,
  issues: ScenarioLabValidationIssue[],
  path: string,
): Array<string | number> | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value)) {
    issues.push({ path, message: 'Expected an array of strings or numbers.', severity: 'warning' })
    return undefined
  }

  return value.filter((entry): entry is string | number => {
    if (typeof entry === 'string') {
      return true
    }
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      return true
    }
    return false
  })
}

function asFiniteNumberArray(
  value: unknown,
  issues: ScenarioLabValidationIssue[],
  path: string,
): number[] | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value)) {
    issues.push({ path, message: 'Expected an array of numbers.', severity: 'warning' })
    return undefined
  }

  return value.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
}

function asNumberMap(
  value: unknown,
  issues: ScenarioLabValidationIssue[],
  path: string,
): Record<string, number> | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!isRecord(value)) {
    issues.push({ path, message: 'Expected an object map with numeric values.', severity: 'warning' })
    return undefined
  }

  const output: Record<string, number> = {}
  for (const [key, entry] of Object.entries(value)) {
    const numeric = asNumber(entry)
    if (numeric === undefined) {
      issues.push({
        path: `${path}.${key}`,
        message: 'Map entry is not numeric and was ignored.',
        severity: 'warning',
      })
      continue
    }
    output[key] = numeric
  }

  return output
}

function asObjectArray<T>(
  value: unknown,
  issues: ScenarioLabValidationIssue[],
  path: string,
  map: (entry: Record<string, unknown>, index: number) => T,
): T[] | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value)) {
    issues.push({ path, message: 'Expected an array of objects.', severity: 'warning' })
    return undefined
  }

  return value
    .map((entry, index) => {
      if (!isRecord(entry)) {
        issues.push({
          path: `${path}[${index}]`,
          message: 'Array entry is not an object and was ignored.',
          severity: 'warning',
        })
        return null
      }
      return map(entry, index)
    })
    .filter((entry): entry is T => entry !== null)
}

function asWorkspace(
  value: unknown,
  issues: ScenarioLabValidationIssue[],
): RawScenarioLabRunPayload['workspace'] | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!isRecord(value)) {
    issues.push({ path: 'workspace', message: 'Expected an object.', severity: 'warning' })
    return undefined
  }

  return {
    workspaceId: asString(value.workspaceId),
    workspaceName: asString(value.workspaceName),
    generatedAt: asString(value.generatedAt),
    assumptions: asObjectArray(value.assumptions, issues, 'workspace.assumptions', (assumption) => ({
      key: asString(assumption.key),
      label: asString(assumption.label),
      description: asString(assumption.description),
      category: asString(assumption.category),
      unit: asString(assumption.unit),
      technicalVariable: asStringOrNull(assumption.technicalVariable),
      min: asNumber(assumption.min),
      max: asNumber(assumption.max),
      step: asNumber(assumption.step),
      defaultValue: asNumber(assumption.defaultValue),
    })),
    presets: asObjectArray(value.presets, issues, 'workspace.presets', (preset) => ({
      presetId: asString(preset.presetId),
      title: asString(preset.title),
      summary: asString(preset.summary),
      assumptionOverrides: asNumberMap(
        preset.assumptionOverrides,
        issues,
        'workspace.presets[].assumptionOverrides',
      ),
    })),
  }
}

function asRun(value: unknown, issues: ScenarioLabValidationIssue[]): RawScenarioLabRunPayload['run'] | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!isRecord(value)) {
    issues.push({ path: 'run', message: 'Expected an object.', severity: 'warning' })
    return undefined
  }

  const RESULT_TAB_KEYS = ['headline_impact', 'macro_path', 'external_balance', 'fiscal_effects'] as const
  const toRawChart = (raw: unknown, tab: (typeof RESULT_TAB_KEYS)[number]) => {
    if (!isRecord(raw)) {
      if (raw !== undefined) {
        issues.push({
          path: `run.chartsByTab.${tab}`,
          message: 'Expected an object for chart payload.',
          severity: 'warning',
        })
      }
      return undefined
    }
    return {
      chartId: asString(raw.chartId),
      title: asString(raw.title),
      subtitle: asString(raw.subtitle),
      chartType: asString(raw.chartType),
      x: isRecord(raw.x)
        ? {
            label: asString(raw.x.label),
            unit: asString(raw.x.unit),
            values: asStringOrNumberArray(raw.x.values, issues, `run.chartsByTab.${tab}.x.values`),
          }
        : undefined,
      y: isRecord(raw.y)
        ? {
            label: asString(raw.y.label),
            unit: asString(raw.y.unit),
            values: asFiniteNumberArray(raw.y.values, issues, `run.chartsByTab.${tab}.y.values`),
          }
        : undefined,
      series: asObjectArray(raw.series, issues, `run.chartsByTab.${tab}.series`, (series) => ({
        seriesId: asString(series.seriesId),
        label: asString(series.label),
        semanticRole: asString(series.semanticRole),
        values: asFiniteNumberArray(series.values, issues, `run.chartsByTab.${tab}.series[].values`),
      })),
      viewMode: asStringOrNull(raw.viewMode),
      takeaway: asString(raw.takeaway),
    }
  }
  const chartsByTab = isRecord(value.chartsByTab)
    ? RESULT_TAB_KEYS.reduce<NonNullable<NonNullable<RawScenarioLabRunPayload['run']>['chartsByTab']>>(
        (acc, tab) => {
          acc[tab] = toRawChart((value.chartsByTab as Record<string, unknown>)[tab], tab)
          return acc
        },
        {},
      )
    : undefined

  if (value.chartsByTab !== undefined && !isRecord(value.chartsByTab)) {
    issues.push({
      path: 'run.chartsByTab',
      message: 'Expected an object keyed by result tab id.',
      severity: 'warning',
    })
  }

  if (isRecord(value.chartsByTab)) {
    for (const tab of RESULT_TAB_KEYS) {
      const rawTab = (value.chartsByTab as Record<string, unknown>)[tab]
      if (!isRecord(rawTab)) {
        continue
      }
      if (rawTab.x !== undefined && !isRecord(rawTab.x)) {
        issues.push({
          path: `run.chartsByTab.${tab}.x`,
          message: 'Expected an object.',
          severity: 'warning',
        })
      }
      if (rawTab.y !== undefined && !isRecord(rawTab.y)) {
        issues.push({
          path: `run.chartsByTab.${tab}.y`,
          message: 'Expected an object.',
          severity: 'warning',
        })
      }
    }
  }

  const interpretation = isRecord(value.interpretation)
    ? {
        whatChanged: asStringArray(value.interpretation.whatChanged, issues, 'run.interpretation.whatChanged'),
        whyItChanged: asStringArray(value.interpretation.whyItChanged, issues, 'run.interpretation.whyItChanged'),
        keyRisks: asStringArray(value.interpretation.keyRisks, issues, 'run.interpretation.keyRisks'),
        policyImplications: asStringArray(
          value.interpretation.policyImplications,
          issues,
          'run.interpretation.policyImplications',
        ),
        suggestedNextScenarios: asStringArray(
          value.interpretation.suggestedNextScenarios,
          issues,
          'run.interpretation.suggestedNextScenarios',
        ),
        generationMode: asString(value.interpretation.generationMode),
        reviewerName: asString(value.interpretation.reviewerName),
        reviewedAt: asString(value.interpretation.reviewedAt),
      }
    : undefined

  if (value.interpretation !== undefined && !isRecord(value.interpretation)) {
    issues.push({
      path: 'run.interpretation',
      message: 'Expected an object.',
      severity: 'warning',
    })
  }

  return {
    generatedAt: asString(value.generatedAt),
    headlineMetrics: asObjectArray(value.headlineMetrics, issues, 'run.headlineMetrics', (metric) => ({
      metricId: asString(metric.metricId),
      label: asString(metric.label),
      value: asNumber(metric.value),
      unit: asString(metric.unit),
      period: asString(metric.period),
      baselineValue: asNullableNumber(metric.baselineValue),
      deltaAbs: asNullableNumber(metric.deltaAbs),
      deltaPct: asNullableNumber(metric.deltaPct),
      direction: asString(metric.direction),
      confidence: asStringOrNull(metric.confidence),
      lastUpdated: asString(metric.lastUpdated),
    })),
    chartsByTab,
    interpretation,
  }
}

export function validateRawScenarioLabPayload(input: unknown): ScenarioLabValidationResult {
  const issues: ScenarioLabValidationIssue[] = []
  if (!isRecord(input)) {
    return {
      ok: false,
      value: {},
      issues: [
        {
          path: '$',
          message: 'Scenario Lab payload must be an object.',
          severity: 'error',
        },
      ],
    }
  }

  const value: RawScenarioLabRunPayload = {
    workspace: asWorkspace(input.workspace, issues),
    run: asRun(input.run, issues),
  }

  return {
    ok: !issues.some((issue) => issue.severity === 'error'),
    value,
    issues,
  }
}
