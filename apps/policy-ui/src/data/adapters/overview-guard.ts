import type { RawOverviewPayload } from './overview'

type ValidationSeverity = 'error' | 'warning'

export type OverviewValidationIssue = {
  path: string
  message: string
  severity: ValidationSeverity
}

export type OverviewValidationResult = {
  ok: boolean
  value: RawOverviewPayload
  issues: OverviewValidationIssue[]
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

function asStringArray(value: unknown, issues: OverviewValidationIssue[], path: string): string[] | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!Array.isArray(value)) {
    issues.push({
      path,
      message: 'Expected an array of strings.',
      severity: 'warning',
    })
    return undefined
  }
  return value.filter((item): item is string => typeof item === 'string')
}

function asObjectArray<T>(
  value: unknown,
  issues: OverviewValidationIssue[],
  path: string,
  map: (entry: Record<string, unknown>, index: number) => T,
): T[] | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!Array.isArray(value)) {
    issues.push({
      path,
      message: 'Expected an array of objects.',
      severity: 'warning',
    })
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

export function validateRawOverviewPayload(input: unknown): OverviewValidationResult {
  const issues: OverviewValidationIssue[] = []
  if (!isRecord(input)) {
    return {
      ok: false,
      value: {},
      issues: [
        {
          path: '$',
          message: 'Overview payload must be an object.',
          severity: 'error',
        },
      ],
    }
  }

  const headline = asObjectArray(input.headline, issues, 'headline', (entry) => ({
    id: asString(entry.id),
    name: asString(entry.name),
    current: asNumber(entry.current),
    unit: asString(entry.unit),
    period: asString(entry.period),
    previous: asNullableNumber(entry.previous),
    confidence: asString(entry.confidence) ?? null,
    lastUpdated: asString(entry.lastUpdated),
    attribution: asObjectArray(entry.attribution, issues, 'headline[].attribution', (item) => ({
      id: asString(item.id),
      name: asString(item.name),
      module: asString(item.module),
      version: asString(item.version),
      runId: asString(item.runId),
      dataVersion: asString(item.dataVersion),
      timestamp: asString(item.timestamp),
    })),
  }))

  const nowcast = isRecord(input.nowcast)
    ? {
        id: asString(input.nowcast.id),
        title: asString(input.nowcast.title),
        subtitle: asString(input.nowcast.subtitle),
        yLabel: asString(input.nowcast.yLabel),
        yUnit: asString(input.nowcast.yUnit),
        points: asObjectArray(input.nowcast.points, issues, 'nowcast.points', (point) => ({
          period: asString(point.period),
          latest: asNumber(point.latest),
          prior: asNumber(point.prior),
        })),
        takeaway: asString(input.nowcast.takeaway),
        attribution: asObjectArray(input.nowcast.attribution, issues, 'nowcast.attribution', (item) => ({
          id: asString(item.id),
          name: asString(item.name),
          module: asString(item.module),
          version: asString(item.version),
          runId: asString(item.runId),
          dataVersion: asString(item.dataVersion),
          timestamp: asString(item.timestamp),
        })),
      }
    : undefined

  if (input.nowcast !== undefined && !isRecord(input.nowcast)) {
    issues.push({
      path: 'nowcast',
      message: 'Expected an object.',
      severity: 'warning',
    })
  }

  const output = isRecord(input.output)
    ? {
        id: asString(input.output.id),
        title: asString(input.output.title),
        summary: asString(input.output.summary),
        targetHref: asString(input.output.targetHref),
      }
    : undefined

  if (input.output !== undefined && !isRecord(input.output)) {
    issues.push({
      path: 'output',
      message: 'Expected an object.',
      severity: 'warning',
    })
  }

  const value: RawOverviewPayload = {
    id: asString(input.id),
    name: asString(input.name),
    generatedAt: asString(input.generatedAt),
    summary: asString(input.summary),
    models: asStringArray(input.models, issues, 'models'),
    headline,
    nowcast,
    risks: asObjectArray(input.risks, issues, 'risks', (risk) => ({
      id: asString(risk.id),
      title: asString(risk.title),
      why: asString(risk.why),
      channel: asString(risk.channel),
      suggestedScenario: asString(risk.suggestedScenario),
      scenarioQuery: asString(risk.scenarioQuery),
    })),
    actions: asObjectArray(input.actions, issues, 'actions', (action) => ({
      id: asString(action.id),
      title: asString(action.title),
      summary: asString(action.summary),
      scenarioQuery: asString(action.scenarioQuery),
    })),
    output,
    caveats: asObjectArray(input.caveats, issues, 'caveats', (caveat) => ({
      id: asString(caveat.id),
      severity: asString(caveat.severity),
      message: asString(caveat.message),
      affectedMetrics: asStringArray(caveat.affectedMetrics, issues, 'caveats[].affectedMetrics'),
      affectedModels: asStringArray(caveat.affectedModels, issues, 'caveats[].affectedModels'),
    })),
    references: asStringArray(input.references, issues, 'references'),
  }

  const hasErrors = issues.some((issue) => issue.severity === 'error')
  return {
    ok: !hasErrors,
    value,
    issues,
  }
}

