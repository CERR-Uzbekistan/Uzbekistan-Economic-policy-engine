import type { RawComparisonPayload } from './comparison'

type ValidationSeverity = 'error' | 'warning'

export type ComparisonValidationIssue = {
  path: string
  message: string
  severity: ValidationSeverity
}

export type ComparisonValidationResult = {
  ok: boolean
  value: RawComparisonPayload
  issues: ComparisonValidationIssue[]
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

function asStringArray(value: unknown, issues: ComparisonValidationIssue[], path: string): string[] | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value)) {
    issues.push({ path, message: 'Expected an array of strings.', severity: 'warning' })
    return undefined
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function asNumberMap(
  value: unknown,
  issues: ComparisonValidationIssue[],
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
  issues: ComparisonValidationIssue[],
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

export function validateRawComparisonPayload(input: unknown): ComparisonValidationResult {
  const issues: ComparisonValidationIssue[] = []

  if (!isRecord(input)) {
    return {
      ok: false,
      value: {},
      issues: [
        {
          path: '$',
          message: 'Comparison payload must be an object.',
          severity: 'error',
        },
      ],
    }
  }

  const value: RawComparisonPayload = {
    workspaceId: asString(input.workspaceId),
    generatedAt: asString(input.generatedAt),
    metricDefinitions: asObjectArray(input.metricDefinitions, issues, 'metricDefinitions', (metric) => ({
      metricId: asString(metric.metricId),
      label: asString(metric.label),
      unit: asString(metric.unit),
    })),
    scenarios: asObjectArray(input.scenarios, issues, 'scenarios', (scenario) => ({
      scenarioId: asString(scenario.scenarioId),
      scenarioName: asString(scenario.scenarioName),
      scenarioType: asString(scenario.scenarioType),
      summary: asString(scenario.summary),
      initialTag: asString(scenario.initialTag),
      values: asNumberMap(scenario.values, issues, 'scenarios[].values'),
      riskIndex: asNumber(scenario.riskIndex),
      normalizedOutput: isRecord(scenario.normalizedOutput)
        ? {
            headlineMetrics: asObjectArray(
              scenario.normalizedOutput.headlineMetrics,
              issues,
              'scenarios[].normalizedOutput.headlineMetrics',
              (metric) => ({
                metricId: asString(metric.metricId),
                label: asString(metric.label),
                unit: asString(metric.unit),
                value: asNumber(metric.value),
              }),
            ),
            chartsByTab: isRecord(scenario.normalizedOutput.chartsByTab)
              ? {
                  headline_impact: isRecord(scenario.normalizedOutput.chartsByTab.headline_impact)
                    ? {
                        x: isRecord(scenario.normalizedOutput.chartsByTab.headline_impact.x)
                          ? {
                              values: Array.isArray(
                                scenario.normalizedOutput.chartsByTab.headline_impact.x.values,
                              )
                                ? scenario.normalizedOutput.chartsByTab.headline_impact.x.values.filter(
                                    (entry): entry is string | number =>
                                      typeof entry === 'string' ||
                                      (typeof entry === 'number' && Number.isFinite(entry)),
                                  )
                                : undefined,
                            }
                          : undefined,
                        y: isRecord(scenario.normalizedOutput.chartsByTab.headline_impact.y)
                          ? {
                              values: Array.isArray(
                                scenario.normalizedOutput.chartsByTab.headline_impact.y.values,
                              )
                                ? scenario.normalizedOutput.chartsByTab.headline_impact.y.values.filter(
                                    (entry): entry is number =>
                                      typeof entry === 'number' && Number.isFinite(entry),
                                  )
                                : undefined,
                            }
                          : undefined,
                        series: asObjectArray(
                          scenario.normalizedOutput.chartsByTab.headline_impact.series,
                          issues,
                          'scenarios[].normalizedOutput.chartsByTab.headline_impact.series',
                          (series) => ({
                            seriesId: asString(series.seriesId),
                            metricId: asString(series.metricId),
                            label: asString(series.label),
                            values: Array.isArray(series.values)
                              ? series.values.filter(
                                  (entry): entry is number =>
                                    typeof entry === 'number' && Number.isFinite(entry),
                                )
                              : undefined,
                          }),
                        ),
                      }
                    : undefined,
                }
              : undefined,
          }
        : undefined,
    })),
    defaultBaselineId: asString(input.defaultBaselineId),
    defaultSelectedIds: asStringArray(input.defaultSelectedIds, issues, 'defaultSelectedIds'),
  }

  return {
    ok: !issues.some((issue) => issue.severity === 'error'),
    value,
    issues,
  }
}
