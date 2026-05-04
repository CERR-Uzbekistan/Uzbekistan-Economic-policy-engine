import type {
  CaveatSeverity,
  ModelCatalogEntry,
  ModelExplorerWorkspace,
  ModelRunStatus,
} from '../../contracts/data-contract'

type RawModelCatalogEntry = {
  id?: string
  name?: string
  type?: string
  frequency?: string
  status?: string
  summary?: string
}

type RawModelAssumption = {
  id?: string
  label?: string
  value?: string
  rationale?: string
}

type RawModelEquation = {
  id?: string
  title?: string
  expression?: string
  explanation?: string
}

type RawModelCaveat = {
  id?: string
  severity?: string
  message?: string
  implication?: string
}

type RawModelDataSource = {
  id?: string
  name?: string
  provider?: string
  frequency?: string
  vintage?: string
  note?: string
}

type RawModelMetadata = {
  modelId?: string
  overview?: string
  assumptions?: RawModelAssumption[]
  equations?: RawModelEquation[]
  caveats?: RawModelCaveat[]
  dataSources?: RawModelDataSource[]
}

export type RawModelExplorerPayload = {
  workspaceId?: string
  generatedAt?: string
  defaultModelId?: string
  catalog?: RawModelCatalogEntry[]
  metadataByModelId?: Record<string, RawModelMetadata>
}

function toIsoOrFallback(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function toModelStatus(value: string | undefined): ModelRunStatus {
  if (value === 'active' || value === 'staging' || value === 'paused') {
    return value
  }
  return 'staging'
}

function toCaveatSeverity(value: string | undefined): CaveatSeverity {
  if (value === 'info' || value === 'warning' || value === 'critical') {
    return value
  }
  return 'warning'
}

function toCatalogStatus(status: ModelRunStatus): ModelCatalogEntry['status'] {
  if (status === 'active') {
    return { label: 'Active', severity: 'ok' }
  }
  if (status === 'paused') {
    return { label: 'Paused', severity: 'warn' }
  }
  return { label: 'Staging', severity: 'warn' }
}

function toCatalogEntryFromLegacyModel(
  model: ModelExplorerWorkspace['models'][number],
  detail: ModelExplorerWorkspace['details_by_model_id'][string],
): ModelCatalogEntry {
  return {
    id: model.model_id,
    title: model.model_name,
    full_title: model.model_name,
    lifecycle_label: `${model.model_type} - ${model.status}`,
    status: toCatalogStatus(model.status),
    model_type: model.model_type,
    frequency: model.frequency,
    methodology_signature: `${model.model_type} - ${model.frequency}`,
    description: model.summary,
    stats: [
      { value: String(detail.equations.length), label: 'Equations' },
      { value: String(detail.assumptions.length), label: 'Params' },
      { value: model.frequency.slice(0, 1).toUpperCase(), label: 'Freq.' },
    ],
    purpose: detail.overview,
    equations: detail.equations.map((equation) => ({
      id: equation.equation_id,
      label: equation.title,
    })),
    parameters: detail.assumptions.map((assumption) => ({
      symbol: assumption.assumption_id,
      name: assumption.label,
      value: assumption.value,
      range: 'Not specified',
    })),
    caveats: detail.caveats.map((caveat, index) => ({
      id: caveat.caveat_id,
      number: String(index + 1).padStart(2, '0'),
      severity: caveat.severity,
      title: caveat.message,
      body: caveat.implication,
    })),
    data_sources: detail.data_sources.map((source) => ({
      institution: source.provider,
      description: source.name,
      vintage_label: source.vintage,
    })),
    validation_summary: ['[SME content pending]'],
  }
}

export function toModelExplorerWorkspace(raw: RawModelExplorerPayload): ModelExplorerWorkspace {
  const fallbackGeneratedAt = new Date().toISOString()
  const generatedAt = toIsoOrFallback(raw.generatedAt, fallbackGeneratedAt)
  const catalog = raw.catalog ?? []
  const models = catalog.map((entry, index) => ({
    model_id: entry.id ?? `model-${index + 1}`,
    model_name: entry.name ?? `Model ${index + 1}`,
    model_type: entry.type ?? 'Unknown type',
    frequency: entry.frequency ?? 'Not specified',
    status: toModelStatus(entry.status),
    summary: entry.summary ?? 'No model summary is available.',
  }))

  const detailsByModelId: ModelExplorerWorkspace['details_by_model_id'] = {}
  for (const model of models) {
    const rawDetail = raw.metadataByModelId?.[model.model_id]
    detailsByModelId[model.model_id] = {
      model_id: model.model_id,
      overview: rawDetail?.overview ?? 'No model overview is available.',
      assumptions: (rawDetail?.assumptions ?? []).map((item, index) => ({
        assumption_id: item.id ?? `${model.model_id}-assumption-${index + 1}`,
        label: item.label ?? `Assumption ${index + 1}`,
        value: item.value ?? 'Not specified',
        rationale: item.rationale ?? 'No rationale provided.',
      })),
      equations: (rawDetail?.equations ?? []).map((item, index) => ({
        equation_id: item.id ?? `${model.model_id}-equation-${index + 1}`,
        title: item.title ?? `Equation ${index + 1}`,
        expression: item.expression ?? 'No expression provided.',
        explanation: item.explanation ?? 'No explanation provided.',
      })),
      caveats: (rawDetail?.caveats ?? []).map((item, index) => ({
        caveat_id: item.id ?? `${model.model_id}-caveat-${index + 1}`,
        severity: toCaveatSeverity(item.severity),
        message: item.message ?? 'No caveat details provided.',
        implication: item.implication ?? 'No implication provided.',
      })),
      data_sources: (rawDetail?.dataSources ?? []).map((item, index) => ({
        source_id: item.id ?? `${model.model_id}-source-${index + 1}`,
        name: item.name ?? `Source ${index + 1}`,
        provider: item.provider ?? 'Unknown provider',
        frequency: item.frequency ?? 'Not specified',
        vintage: item.vintage ?? 'Not specified',
        note: item.note ?? 'No source note provided.',
      })),
    }
  }

  const defaultModelId =
    raw.defaultModelId && detailsByModelId[raw.defaultModelId] ? raw.defaultModelId : models[0]?.model_id ?? ''

  const workspace: ModelExplorerWorkspace = {
    workspace_id: raw.workspaceId ?? 'model-explorer-workspace',
    generated_at: generatedAt,
    models,
    default_model_id: defaultModelId,
    details_by_model_id: detailsByModelId,
  }

  workspace.catalog_entries_by_model_id = Object.fromEntries(
    models.map((model) => [
      model.model_id,
      toCatalogEntryFromLegacyModel(model, detailsByModelId[model.model_id]),
    ]),
  )
  workspace.meta = {
    models_total: models.length,
    models_live: models.filter((model) => model.status === 'active').length,
    last_calibration_audit_label: new Intl.DateTimeFormat('en', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(generatedAt)),
    open_methodology_issues: models.reduce(
      (count, model) => count + detailsByModelId[model.model_id].caveats.length,
      0,
    ),
  }

  return workspace
}
