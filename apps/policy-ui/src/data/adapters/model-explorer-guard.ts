import type { RawModelExplorerPayload } from './model-explorer'

type ValidationSeverity = 'error' | 'warning'

export type ModelExplorerValidationIssue = {
  path: string
  message: string
  severity: ValidationSeverity
}

export type ModelExplorerValidationResult = {
  ok: boolean
  value: RawModelExplorerPayload
  issues: ModelExplorerValidationIssue[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asObjectArray<T>(
  value: unknown,
  issues: ModelExplorerValidationIssue[],
  path: string,
  map: (entry: Record<string, unknown>) => T,
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
      return map(entry)
    })
    .filter((entry): entry is T => entry !== null)
}

function asMetadataMap(
  value: unknown,
  issues: ModelExplorerValidationIssue[],
): RawModelExplorerPayload['metadataByModelId'] | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!isRecord(value)) {
    issues.push({
      path: 'metadataByModelId',
      message: 'Expected an object map keyed by model id.',
      severity: 'warning',
    })
    return undefined
  }

  const entries = Object.entries(value).map(([modelId, detail]) => {
    if (!isRecord(detail)) {
      issues.push({
        path: `metadataByModelId.${modelId}`,
        message: 'Model metadata entry is not an object and was ignored.',
        severity: 'warning',
      })
      return null
    }

    return [
      modelId,
      {
        modelId: asString(detail.modelId),
        overview: asString(detail.overview),
        assumptions: asObjectArray(detail.assumptions, issues, `metadataByModelId.${modelId}.assumptions`, (item) => ({
          id: asString(item.id),
          label: asString(item.label),
          value: asString(item.value),
          rationale: asString(item.rationale),
        })),
        equations: asObjectArray(detail.equations, issues, `metadataByModelId.${modelId}.equations`, (item) => ({
          id: asString(item.id),
          title: asString(item.title),
          expression: asString(item.expression),
          explanation: asString(item.explanation),
        })),
        caveats: asObjectArray(detail.caveats, issues, `metadataByModelId.${modelId}.caveats`, (item) => ({
          id: asString(item.id),
          severity: asString(item.severity),
          message: asString(item.message),
          implication: asString(item.implication),
        })),
        dataSources: asObjectArray(detail.dataSources, issues, `metadataByModelId.${modelId}.dataSources`, (item) => ({
          id: asString(item.id),
          name: asString(item.name),
          provider: asString(item.provider),
          frequency: asString(item.frequency),
          vintage: asString(item.vintage),
          note: asString(item.note),
        })),
      },
    ] as const
  })

  const metadataByModelId: NonNullable<RawModelExplorerPayload['metadataByModelId']> = {}
  for (const entry of entries) {
    if (entry !== null) {
      metadataByModelId[entry[0]] = entry[1]
    }
  }
  return metadataByModelId
}

export function validateRawModelExplorerPayload(input: unknown): ModelExplorerValidationResult {
  const issues: ModelExplorerValidationIssue[] = []
  if (!isRecord(input)) {
    return {
      ok: false,
      value: {},
      issues: [
        {
          path: '$',
          message: 'Model explorer payload must be an object.',
          severity: 'error',
        },
      ],
    }
  }

  const value: RawModelExplorerPayload = {
    workspaceId: asString(input.workspaceId),
    generatedAt: asString(input.generatedAt),
    defaultModelId: asString(input.defaultModelId),
    catalog: asObjectArray(input.catalog, issues, 'catalog', (entry) => ({
      id: asString(entry.id),
      name: asString(entry.name),
      type: asString(entry.type),
      frequency: asString(entry.frequency),
      status: asString(entry.status),
      summary: asString(entry.summary),
    })),
    metadataByModelId: asMetadataMap(input.metadataByModelId, issues),
  }

  return {
    ok: !issues.some((issue) => issue.severity === 'error'),
    value,
    issues,
  }
}
