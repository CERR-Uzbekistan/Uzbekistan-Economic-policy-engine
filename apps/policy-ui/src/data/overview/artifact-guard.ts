import type {
  OverviewArtifact,
  OverviewArtifactMetric,
  OverviewArtifactPanelGroup,
  OverviewArtifactValidationStatus,
  OverviewClaimType,
  OverviewMetricBlock,
  OverviewMetricId,
} from './artifact-types.js'
import {
  OVERVIEW_ARTIFACT_SCHEMA_VERSION,
  OVERVIEW_LOCKED_METRIC_BY_ID,
  OVERVIEW_LOCKED_METRICS,
} from './artifact-types.js'

export type OverviewArtifactValidationIssue = {
  path: string
  message: string
  severity: 'error' | 'warning'
}

export type OverviewArtifactValidationResult =
  | { ok: true; value: OverviewArtifact; issues: OverviewArtifactValidationIssue[] }
  | { ok: false; value: null; issues: OverviewArtifactValidationIssue[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function optionalNumberValue(value: unknown): number | null {
  return value === undefined || value === null ? null : numberValue(value)
}

function stringArray(value: unknown, path: string, issues: OverviewArtifactValidationIssue[]): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    issues.push({ path, message: 'Expected an array of strings.', severity: 'error' })
    return []
  }
  const output: string[] = []
  value.forEach((entry, index) => {
    if (typeof entry === 'string') {
      output.push(entry)
    } else {
      issues.push({ path: `${path}[${index}]`, message: 'Expected a string.', severity: 'error' })
    }
  })
  return output
}

function isValidationStatus(value: unknown): value is OverviewArtifactValidationStatus {
  return value === 'valid' || value === 'warning' || value === 'failed'
}

function isIsoLike(value: string | null): value is string {
  if (!value) return false
  return Number.isFinite(Date.parse(value))
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: OverviewArtifactValidationIssue[],
): string {
  const value = stringValue(record[key])
  if (!value) {
    issues.push({ path: `${path}.${key}`, message: 'Expected a non-empty string.', severity: 'error' })
    return ''
  }
  return value
}

function validateMetric(
  value: unknown,
  path: string,
  exportedAt: string,
  issues: OverviewArtifactValidationIssue[],
): OverviewArtifactMetric | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Metric entry must be an object.', severity: 'error' })
    return null
  }

  const id = stringValue(value.id)
  const definition = id ? OVERVIEW_LOCKED_METRIC_BY_ID.get(id) : undefined
  if (!id || !definition) {
    issues.push({ path: `${path}.id`, message: 'Metric id is not in the locked Overview metric set.', severity: 'error' })
    return null
  }

  const claimType = requireString(value, 'claim_type', path, issues) as OverviewClaimType
  const block = requireString(value, 'block', path, issues) as OverviewMetricBlock
  const unit = requireString(value, 'unit', path, issues)
  const frequency = requireString(value, 'frequency', path, issues)
  if (claimType !== definition.claim_type) {
    issues.push({ path: `${path}.claim_type`, message: `Expected locked claim type ${definition.claim_type}.`, severity: 'error' })
  }
  if (block !== definition.block) {
    issues.push({ path: `${path}.block`, message: `Expected locked block ${definition.block}.`, severity: 'error' })
  }
  if (unit !== definition.unit) {
    issues.push({ path: `${path}.unit`, message: `Expected locked unit ${definition.unit}.`, severity: 'error' })
  }
  if (frequency !== definition.frequency) {
    issues.push({ path: `${path}.frequency`, message: `Expected locked frequency ${definition.frequency}.`, severity: 'error' })
  }

  const valueNumber = numberValue(value.value)
  if (valueNumber === null) {
    issues.push({ path: `${path}.value`, message: 'Expected a finite number.', severity: 'error' })
  }

  const validationStatus = value.validation_status
  if (!isValidationStatus(validationStatus)) {
    issues.push({ path: `${path}.validation_status`, message: 'Expected valid, warning, or failed.', severity: 'error' })
  }

  const metricExportedAt = stringValue(value.exported_at) ?? exportedAt
  if (!isIsoLike(metricExportedAt)) {
    issues.push({ path: `${path}.exported_at`, message: 'Expected an ISO-like timestamp.', severity: 'error' })
  }

  const topCard = value.top_card
  if (topCard !== undefined && typeof topCard !== 'boolean') {
    issues.push({ path: `${path}.top_card`, message: 'Expected a boolean.', severity: 'error' })
  }

  const topCardOrder = value.top_card_order
  if (topCardOrder !== undefined && numberValue(topCardOrder) === null) {
    issues.push({ path: `${path}.top_card_order`, message: 'Expected a finite number.', severity: 'error' })
  }

  return {
    id: id as OverviewMetricId,
    label: stringValue(value.label) ?? definition.label,
    block,
    claim_type: claimType,
    unit,
    frequency,
    value: valueNumber ?? 0,
    previous_value: optionalNumberValue(value.previous_value),
    source_label: requireString(value, 'source_label', path, issues),
    source_period: requireString(value, 'source_period', path, issues),
    exported_at: metricExportedAt,
    validation_status: isValidationStatus(validationStatus) ? validationStatus : 'failed',
    caveats: stringArray(value.caveats, `${path}.caveats`, issues),
    warnings: stringArray(value.warnings, `${path}.warnings`, issues),
    top_card: typeof topCard === 'boolean' ? topCard : undefined,
    top_card_order: typeof topCardOrder === 'number' && Number.isFinite(topCardOrder) ? topCardOrder : undefined,
  }
}

function validatePanelGroups(
  value: unknown,
  issues: OverviewArtifactValidationIssue[],
): OverviewArtifactPanelGroup[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    issues.push({ path: 'panel_groups', message: 'Expected an array of panel groups.', severity: 'error' })
    return []
  }

  return value
    .map((entry, index) => {
      const path = `panel_groups[${index}]`
      if (!isRecord(entry)) {
        issues.push({ path, message: 'Panel group must be an object.', severity: 'error' })
        return null
      }
      const id = requireString(entry, 'id', path, issues) as OverviewMetricBlock
      const title = requireString(entry, 'title', path, issues)
      const metricIds = stringArray(entry.metric_ids, `${path}.metric_ids`, issues)
      metricIds.forEach((metricId) => {
        if (!OVERVIEW_LOCKED_METRIC_BY_ID.has(metricId)) {
          issues.push({ path: `${path}.metric_ids`, message: `Unknown metric id ${metricId}.`, severity: 'error' })
        }
      })
      return {
        id,
        title,
        metric_ids: metricIds as OverviewMetricId[],
      }
    })
    .filter((entry): entry is OverviewArtifactPanelGroup => entry !== null)
}

export function validateOverviewArtifact(input: unknown): OverviewArtifactValidationResult {
  const issues: OverviewArtifactValidationIssue[] = []
  if (!isRecord(input)) {
    return {
      ok: false,
      value: null,
      issues: [{ path: '$', message: 'Overview artifact must be an object.', severity: 'error' }],
    }
  }

  if (input.schema_version !== OVERVIEW_ARTIFACT_SCHEMA_VERSION) {
    issues.push({
      path: 'schema_version',
      message: `Expected ${OVERVIEW_ARTIFACT_SCHEMA_VERSION}.`,
      severity: 'error',
    })
  }

  const exportedAt = stringValue(input.exported_at)
  if (!isIsoLike(exportedAt)) {
    issues.push({ path: 'exported_at', message: 'Expected an ISO-like timestamp.', severity: 'error' })
  }

  const validationStatus = input.validation_status
  if (!isValidationStatus(validationStatus)) {
    issues.push({ path: 'validation_status', message: 'Expected valid, warning, or failed.', severity: 'error' })
  } else if (validationStatus === 'failed') {
    issues.push({ path: 'validation_status', message: 'Artifact declares failed validation status.', severity: 'error' })
  }

  if (!Array.isArray(input.metrics)) {
    issues.push({ path: 'metrics', message: 'Expected a metrics array.', severity: 'error' })
  }

  const metrics = Array.isArray(input.metrics)
    ? input.metrics
        .map((entry, index) => validateMetric(entry, `metrics[${index}]`, exportedAt ?? '', issues))
        .filter((entry): entry is OverviewArtifactMetric => entry !== null)
    : []

  const seen = new Set<string>()
  for (const metric of metrics) {
    if (seen.has(metric.id)) {
      issues.push({ path: 'metrics', message: `Duplicate metric id ${metric.id}.`, severity: 'error' })
    }
    seen.add(metric.id)
  }
  for (const definition of OVERVIEW_LOCKED_METRICS) {
    if (!seen.has(definition.id)) {
      issues.push({ path: 'metrics', message: `Missing locked metric id ${definition.id}.`, severity: 'error' })
    }
  }

  const panelGroups = validatePanelGroups(input.panel_groups, issues)
  const caveats = stringArray(input.caveats, 'caveats', issues)
  const warnings = stringArray(input.warnings, 'warnings', issues)
  const fallback = isRecord(input.fallback)
    ? {
        static_snapshot_id: stringValue(input.fallback.static_snapshot_id) ?? undefined,
        note: stringValue(input.fallback.note) ?? undefined,
      }
    : undefined

  const hasErrors = issues.some((issue) => issue.severity === 'error')
  if (hasErrors) {
    return { ok: false, value: null, issues }
  }

  const validatedExportedAt = exportedAt ?? ''
  const validatedStatus = validationStatus as OverviewArtifactValidationStatus
  const generatedBy = stringValue(input.generated_by)

  return {
    ok: true,
    value: {
      schema_version: OVERVIEW_ARTIFACT_SCHEMA_VERSION,
      exported_at: validatedExportedAt,
      generated_by: generatedBy ?? undefined,
      validation_status: validatedStatus,
      metrics,
      caveats,
      warnings,
      panel_groups: panelGroups,
      fallback,
    },
    issues,
  }
}
