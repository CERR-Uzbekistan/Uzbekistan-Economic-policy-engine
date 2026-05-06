import type {
  ReformCandidateItem,
  ReformCategory,
  ReformCitationPermission,
  ReformEvidenceType,
  ReformArtifactExtractionMode,
  ReformLicenseClass,
  ReformReviewState,
  ReformSourceUrlStatus,
  ReformStatus,
  ReformTrackerItem,
  ReformTranslationReviewState,
  KnowledgeHubSourceDiagnostic,
} from '../../contracts/data-contract.js'
import {
  KNOWLEDGE_HUB_ARTIFACT_SCHEMA_VERSION,
  type KnowledgeHubArtifact,
  type KnowledgeHubRulebook,
  type KnowledgeHubArtifactSource,
} from './artifact-types.js'

export type KnowledgeHubArtifactValidationIssue = {
  path: string
  message: string
  severity: 'error' | 'warning'
}

export type KnowledgeHubArtifactValidationResult =
  | { ok: true; value: KnowledgeHubArtifact; issues: KnowledgeHubArtifactValidationIssue[] }
  | { ok: false; value: null; issues: KnowledgeHubArtifactValidationIssue[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function stringArray(value: unknown, path: string, issues: KnowledgeHubArtifactValidationIssue[]): string[] {
  if (!Array.isArray(value)) {
    issues.push({ path, message: 'Expected an array of strings.', severity: 'error' })
    return []
  }

  return value.flatMap((entry, index) => {
    if (typeof entry === 'string') return [entry]
    issues.push({ path: `${path}[${index}]`, message: 'Expected a string.', severity: 'error' })
    return []
  })
}

const REFORM_EVIDENCE_TYPE_VALUES: ReformEvidenceType[] = [
  'legal_text',
  'official_policy_announcement',
  'consultation_notice',
  'budget_tax_measure',
  'regulatory_parameter_change',
  'implementation_program',
  'international_agreement',
]

const REFORM_CATEGORY_VALUES: ReformCategory[] = [
  'monetary_policy',
  'fiscal_tax',
  'budget_public_finance',
  'trade_customs',
  'energy_tariffs',
  'financial_sector',
  'soe_privatization',
  'social_protection',
  'business_environment',
  'agriculture',
  'digital_public_admin',
  'infrastructure_investment',
  'industrial_policy',
  'competition_regulation',
  'labor_market',
  'other_policy',
]

const REFORM_STATUS_VALUES: ReformStatus[] = [
  'adopted',
  'in_implementation',
  'planned',
  'superseded',
  'unknown',
]

const REFORM_REVIEW_STATE_VALUES: ReformReviewState[] = [
  'candidate',
  'accepted_internal',
  'accepted_public',
  'rejected',
  'superseded',
  'retracted',
]

const REFORM_CITATION_PERMISSION_VALUES: ReformCitationPermission[] = [
  'internal_only',
  'external_allowed',
  'prohibited',
  'pending',
]

const REFORM_LICENSE_CLASS_VALUES: ReformLicenseClass[] = [
  'public_open',
  'public_attribution_required',
  'public_link_only',
  'internal',
  'licensed',
  'restricted',
  'unknown',
]

const REFORM_TRANSLATION_REVIEW_STATE_VALUES: ReformTranslationReviewState[] = [
  'not_translated',
  'ai_drafted_unreviewed',
  'human_translated_unreviewed',
  'reviewed',
  'blocked',
  'not_applicable',
]

const REFORM_ARTIFACT_EXTRACTION_MODE_VALUES: ReformArtifactExtractionMode[] = [
  'fixture-demo',
  'configured-source-fetch',
]

const REFORM_SOURCE_URL_STATUS_VALUES: ReformSourceUrlStatus[] = [
  'verified',
  'not_checked_fixture',
]

function requireNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): number {
  const value = record[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  issues.push({ path: `${path}.${key}`, message: 'Expected a finite number.', severity: 'error' })
  return 0
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): string {
  const value = stringValue(record[key])
  if (!value) {
    issues.push({ path: `${path}.${key}`, message: 'Expected a non-empty string.', severity: 'error' })
    return ''
  }
  return value
}

function isIsoLike(value: string): boolean {
  return Number.isFinite(Date.parse(value))
}

function validateUrl(value: string, path: string, issues: KnowledgeHubArtifactValidationIssue[]): void {
  try {
    const parsed = new URL(value)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return
  } catch {
    // handled below
  }
  issues.push({ path, message: 'Expected an absolute HTTP(S) URL.', severity: 'error' })
}

function validateSource(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): KnowledgeHubArtifactSource | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Source entry must be an object.', severity: 'error' })
    return null
  }

  const source = {
    id: requireString(value, 'id', path, issues),
    institution: requireString(value, 'institution', path, issues),
    url: requireString(value, 'url', path, issues),
  }
  validateUrl(source.url, `${path}.url`, issues)
  return source
}

function validateRuleObjects(value: unknown, path: string, issues: KnowledgeHubArtifactValidationIssue[]): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    issues.push({ path, message: 'Expected an array of rule objects.', severity: 'error' })
    return []
  }

  return value.flatMap((entry, index) => {
    if (!isRecord(entry)) {
      issues.push({ path: `${path}[${index}]`, message: 'Expected a rule object.', severity: 'error' })
      return []
    }
    if (!stringValue(entry.id)) {
      issues.push({ path: `${path}[${index}].id`, message: 'Expected a non-empty rule id.', severity: 'error' })
    }
    if (!stringValue(entry.description)) {
      issues.push({ path: `${path}[${index}].description`, message: 'Expected a non-empty rule description.', severity: 'error' })
    }
    return [entry]
  })
}

function validateRulebook(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): KnowledgeHubRulebook | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Expected a rulebook object.', severity: 'error' })
    return null
  }

  const evidenceTypes = stringArray(value.evidence_types, `${path}.evidence_types`, issues)
  const reformCategories = stringArray(value.reform_categories, `${path}.reform_categories`, issues)
  for (const evidenceType of evidenceTypes) {
    if (!REFORM_EVIDENCE_TYPE_VALUES.includes(evidenceType as ReformEvidenceType)) {
      issues.push({ path: `${path}.evidence_types`, message: `Unknown evidence type ${evidenceType}.`, severity: 'error' })
    }
  }
  for (const category of reformCategories) {
    if (!REFORM_CATEGORY_VALUES.includes(category as ReformCategory)) {
      issues.push({ path: `${path}.reform_categories`, message: `Unknown reform category ${category}.`, severity: 'error' })
    }
  }

  if (!isRecord(value.relevance_scoring)) {
    issues.push({ path: `${path}.relevance_scoring`, message: 'Expected a relevance scoring object.', severity: 'error' })
  }

  return {
    version: requireString(value, 'version', path, issues),
    actual_reform_definition: stringValue(value.actual_reform_definition) ?? undefined,
    include_rules: validateRuleObjects(value.include_rules, `${path}.include_rules`, issues),
    exclude_rules: validateRuleObjects(value.exclude_rules, `${path}.exclude_rules`, issues),
    evidence_types: evidenceTypes,
    reform_categories: reformCategories,
    relevance_scoring: isRecord(value.relevance_scoring) ? value.relevance_scoring : {},
    exclusion_reasons: validateRuleObjects(value.exclusion_reasons, `${path}.exclusion_reasons`, issues),
  }
}

function requireEnum<T extends string>(
  record: Record<string, unknown>,
  key: string,
  path: string,
  allowed: readonly T[],
  issues: KnowledgeHubArtifactValidationIssue[],
): T {
  const value = record[key]
  if (typeof value === 'string' && allowed.includes(value as T)) {
    return value as T
  }
  issues.push({ path: `${path}.${key}`, message: `Expected one of: ${allowed.join(', ')}.`, severity: 'error' })
  return allowed[0]
}

function validateSourceDiagnostic(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): KnowledgeHubSourceDiagnostic | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Source diagnostic entry must be an object.', severity: 'error' })
    return null
  }

  const diagnostic: KnowledgeHubSourceDiagnostic = {
    id: requireString(value, 'id', path, issues),
    institution: requireString(value, 'institution', path, issues),
    url: requireString(value, 'url', path, issues),
    parser: requireString(value, 'parser', path, issues),
    fetch_url: requireString(value, 'fetch_url', path, issues),
    ok: value.ok === true,
    candidate_count: requireNumber(value, 'candidate_count', path, issues),
    excluded_count: requireNumber(value, 'excluded_count', path, issues),
    link_invalid_count: requireNumber(value, 'link_invalid_count', path, issues),
    fetched_at: stringValue(value.fetched_at) ?? undefined,
    error: stringValue(value.error) ?? undefined,
  }

  if (typeof value.ok !== 'boolean') {
    issues.push({ path: `${path}.ok`, message: 'Expected a boolean.', severity: 'error' })
  }
  validateUrl(diagnostic.url, `${path}.url`, issues)
  validateUrl(diagnostic.fetch_url, `${path}.fetch_url`, issues)
  if (diagnostic.candidate_count < 0) {
    issues.push({ path: `${path}.candidate_count`, message: 'Expected a non-negative count.', severity: 'error' })
  }
  if (diagnostic.excluded_count < 0) {
    issues.push({ path: `${path}.excluded_count`, message: 'Expected a non-negative count.', severity: 'error' })
  }
  if (diagnostic.link_invalid_count < 0) {
    issues.push({ path: `${path}.link_invalid_count`, message: 'Expected a non-negative count.', severity: 'error' })
  }
  if (diagnostic.fetched_at && !isIsoLike(diagnostic.fetched_at)) {
    issues.push({ path: `${path}.fetched_at`, message: 'Expected an ISO-like timestamp.', severity: 'error' })
  }
  if (!diagnostic.ok && !diagnostic.error) {
    issues.push({ path: `${path}.error`, message: 'Failed sources require an error message.', severity: 'error' })
  }

  return diagnostic
}

function validateTrackerCommon(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): Omit<
  ReformCandidateItem,
  | 'extraction_state'
  | 'extraction_mode'
  | 'review_state'
  | 'review_status'
  | 'status'
  | 'relevance_score'
  | 'source_url_status'
  | 'source_url_verified_at'
> | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Tracker entry must be an object.', severity: 'error' })
    return null
  }

  const record = {
    id: requireString(value, 'id', path, issues),
    title: requireString(value, 'title', path, issues),
    summary: requireString(value, 'summary', path, issues),
    domain_tag: requireString(value, 'domain_tag', path, issues),
    domain_tags: stringArray(value.domain_tags, `${path}.domain_tags`, issues),
    reform_category: requireString(value, 'reform_category', path, issues) as ReformCategory,
    evidence_types: stringArray(value.evidence_types, `${path}.evidence_types`, issues) as ReformEvidenceType[],
    inclusion_reason: requireString(value, 'inclusion_reason', path, issues),
    matched_rules: stringArray(value.matched_rules, `${path}.matched_rules`, issues),
    matched_include_rules: Array.isArray(value.matched_include_rules)
      ? stringArray(value.matched_include_rules, `${path}.matched_include_rules`, issues)
      : undefined,
    source_title: requireString(value, 'source_title', path, issues),
    source_institution: requireString(value, 'source_institution', path, issues),
    source_owner: requireString(value, 'source_owner', path, issues),
    source_url: requireString(value, 'source_url', path, issues),
    source_published_at: stringValue(value.source_published_at) ?? undefined,
    retrieved_at: stringValue(value.retrieved_at) ?? undefined,
    extracted_at: stringValue(value.extracted_at) ?? undefined,
    as_of_date: stringValue(value.as_of_date) ?? undefined,
    status_authority: stringValue(value.status_authority) ?? undefined,
    citation_permission: requireEnum(value, 'citation_permission', path, REFORM_CITATION_PERMISSION_VALUES, issues),
    license_class: requireEnum(value, 'license_class', path, REFORM_LICENSE_CLASS_VALUES, issues),
    translation_review_state: requireEnum(
      value,
      'translation_review_state',
      path,
      REFORM_TRANSLATION_REVIEW_STATE_VALUES,
      issues,
    ),
    caveats: stringArray(value.caveats, `${path}.caveats`, issues),
  }

  if (!REFORM_CATEGORY_VALUES.includes(record.reform_category)) {
    issues.push({ path: `${path}.reform_category`, message: 'Unknown reform category.', severity: 'error' })
  }
  for (const evidenceType of record.evidence_types) {
    if (!REFORM_EVIDENCE_TYPE_VALUES.includes(evidenceType)) {
      issues.push({ path: `${path}.evidence_types`, message: `Unknown evidence type ${evidenceType}.`, severity: 'error' })
    }
  }
  if (record.evidence_types.length === 0) {
    issues.push({ path: `${path}.evidence_types`, message: 'Expected at least one evidence type.', severity: 'error' })
  }
  if (record.matched_rules.length === 0) {
    issues.push({ path: `${path}.matched_rules`, message: 'Expected at least one matched rule.', severity: 'error' })
  }
  if (record.domain_tags.length === 0) {
    issues.push({ path: `${path}.domain_tags`, message: 'Expected at least one domain tag.', severity: 'error' })
  }
  if (record.caveats.length === 0) {
    issues.push({ path: `${path}.caveats`, message: 'Expected at least one item-level caveat.', severity: 'error' })
  }
  validateUrl(record.source_url, `${path}.source_url`, issues)
  if (record.extracted_at && !isIsoLike(record.extracted_at)) {
    issues.push({ path: `${path}.extracted_at`, message: 'Expected an ISO-like timestamp.', severity: 'error' })
  }
  if (record.retrieved_at && !isIsoLike(record.retrieved_at)) {
    issues.push({ path: `${path}.retrieved_at`, message: 'Expected an ISO-like timestamp.', severity: 'error' })
  }
  if (record.source_published_at && !isIsoLike(record.source_published_at)) {
    issues.push({ path: `${path}.source_published_at`, message: 'Expected an ISO-like source date.', severity: 'warning' })
  }
  if (record.as_of_date && !isIsoLike(record.as_of_date)) {
    issues.push({ path: `${path}.as_of_date`, message: 'Expected an ISO-like as-of date.', severity: 'warning' })
  }

  return record
}

function validateCandidate(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): ReformCandidateItem | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Candidate entry must be an object.', severity: 'error' })
    return null
  }
  const common = validateTrackerCommon(value, path, issues)
  if (!common) return null
  const candidate: ReformCandidateItem = {
    ...common,
    extraction_state: requireEnum(value, 'extraction_state', path, ['source_extracted'], issues),
    extraction_mode: requireEnum(value, 'extraction_mode', path, REFORM_ARTIFACT_EXTRACTION_MODE_VALUES, issues),
    review_state: requireEnum(value, 'review_state', path, ['candidate'], issues),
    review_status: requireEnum(value, 'review_status', path, ['needs_review'], issues),
    status: requireEnum(value, 'status', path, ['unknown'], issues),
    relevance_score: requireNumber(value, 'relevance_score', path, issues),
    source_url_status: requireEnum(value, 'source_url_status', path, REFORM_SOURCE_URL_STATUS_VALUES, issues),
    source_url_verified_at: stringValue(value.source_url_verified_at) ?? undefined,
  }

  if (candidate.relevance_score < 0 || candidate.relevance_score > 100) {
    issues.push({ path: `${path}.relevance_score`, message: 'Expected a score from 0 to 100.', severity: 'error' })
  }
  if (candidate.extraction_mode === 'configured-source-fetch' && candidate.source_url_status !== 'verified') {
    issues.push({
      path: `${path}.source_url_status`,
      message: 'Configured-source candidates require a verified source URL.',
      severity: 'error',
    })
  }
  if (candidate.source_url_verified_at && !isIsoLike(candidate.source_url_verified_at)) {
    issues.push({ path: `${path}.source_url_verified_at`, message: 'Expected an ISO-like timestamp.', severity: 'error' })
  }

  return candidate
}

function validateAcceptedReform(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): ReformTrackerItem | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Accepted reform entry must be an object.', severity: 'error' })
    return null
  }
  const common = validateTrackerCommon(value, path, issues)
  if (!common) return null
  const reviewState = requireEnum(value, 'review_state', path, REFORM_REVIEW_STATE_VALUES, issues)
  const status = requireEnum(value, 'status', path, REFORM_STATUS_VALUES, issues)

  if (reviewState !== 'accepted_internal' && reviewState !== 'accepted_public') {
    issues.push({
      path: `${path}.review_state`,
      message: 'Accepted reforms must be accepted_internal or accepted_public.',
      severity: 'error',
    })
  }
  if (status === 'unknown') {
    issues.push({ path: `${path}.status`, message: 'Accepted reforms cannot use unknown status.', severity: 'error' })
  }

  const accepted: ReformTrackerItem = {
    ...common,
    extraction_state: requireEnum(value, 'extraction_state', path, ['source_extracted', 'manual_seed', 'corrected'], issues),
    review_state: reviewState === 'accepted_public' ? 'accepted_public' : 'accepted_internal',
    review_status: requireEnum(value, 'review_status', path, ['owner_reviewed', 'public_cleared'], issues),
    status: status === 'unknown' ? 'planned' : status,
    reviewer_of_record: requireString(value, 'reviewer_of_record', path, issues),
    review_date: requireString(value, 'review_date', path, issues),
    review_scope: requireString(value, 'review_scope', path, issues),
    model_refs: stringArray(value.model_refs, `${path}.model_refs`, issues),
  }

  if (!accepted.as_of_date) {
    issues.push({ path: `${path}.as_of_date`, message: 'Accepted reforms require as_of_date.', severity: 'error' })
  }
  if (!accepted.status_authority) {
    issues.push({ path: `${path}.status_authority`, message: 'Accepted reforms require status authority.', severity: 'error' })
  }
  if (!isIsoLike(accepted.review_date)) {
    issues.push({ path: `${path}.review_date`, message: 'Expected an ISO-like review date.', severity: 'error' })
  }

  return accepted
}

export function validateKnowledgeHubArtifact(input: unknown): KnowledgeHubArtifactValidationResult {
  const issues: KnowledgeHubArtifactValidationIssue[] = []
  if (!isRecord(input)) {
    return {
      ok: false,
      value: null,
      issues: [{ path: '$', message: 'Knowledge Hub artifact must be an object.', severity: 'error' }],
    }
  }

  if (input.schema_version !== KNOWLEDGE_HUB_ARTIFACT_SCHEMA_VERSION) {
    issues.push({
      path: 'schema_version',
      message: `Expected ${KNOWLEDGE_HUB_ARTIFACT_SCHEMA_VERSION}.`,
      severity: 'error',
    })
  }

  const generatedAt = requireString(input, 'generated_at', '$', issues)
  if (generatedAt && !isIsoLike(generatedAt)) {
    issues.push({ path: 'generated_at', message: 'Expected an ISO-like timestamp.', severity: 'error' })
  }

  if (input.extraction_mode !== 'fixture-demo' && input.extraction_mode !== 'configured-source-fetch') {
    issues.push({
      path: 'extraction_mode',
      message: 'Expected fixture-demo or configured-source-fetch.',
      severity: 'error',
    })
  }
  const extractionModeLabel = requireString(input, 'extraction_mode_label', '$', issues)
  const rulebook = validateRulebook(input.rulebook, 'rulebook', issues)

  const sources = Array.isArray(input.sources)
    ? input.sources
        .map((entry, index) => validateSource(entry, `sources[${index}]`, issues))
        .filter((entry): entry is KnowledgeHubArtifactSource => entry !== null)
    : []
  if (!Array.isArray(input.sources)) {
    issues.push({ path: 'sources', message: 'Expected a source array.', severity: 'error' })
  }

  const sourceDiagnostics = Array.isArray(input.source_diagnostics)
    ? input.source_diagnostics
        .map((entry, index) => validateSourceDiagnostic(entry, `source_diagnostics[${index}]`, issues))
        .filter((entry): entry is KnowledgeHubSourceDiagnostic => entry !== null)
    : []
  if (!Array.isArray(input.source_diagnostics)) {
    issues.push({ path: 'source_diagnostics', message: 'Expected a source diagnostics array.', severity: 'error' })
  }

  const acceptedReforms = Array.isArray(input.accepted_reforms)
    ? input.accepted_reforms
        .map((entry, index) => validateAcceptedReform(entry, `accepted_reforms[${index}]`, issues))
        .filter((entry): entry is ReformTrackerItem => entry !== null)
    : []
  if (!Array.isArray(input.accepted_reforms)) {
    issues.push({ path: 'accepted_reforms', message: 'Expected an accepted reform array.', severity: 'error' })
  }

  const candidates = Array.isArray(input.candidates)
    ? input.candidates
        .map((entry, index) => validateCandidate(entry, `candidates[${index}]`, issues))
        .filter((entry): entry is ReformCandidateItem => entry !== null)
    : []
  if (!Array.isArray(input.candidates)) {
    issues.push({ path: 'candidates', message: 'Expected a candidate array.', severity: 'error' })
  }

  const ids = new Set<string>()
  for (const reform of acceptedReforms) {
    if (ids.has(reform.id)) {
      issues.push({ path: 'accepted_reforms', message: `Duplicate tracker id ${reform.id}.`, severity: 'error' })
    }
    ids.add(reform.id)
  }
  for (const candidate of candidates) {
    if (ids.has(candidate.id)) {
      issues.push({ path: 'candidates', message: `Duplicate tracker id ${candidate.id}.`, severity: 'error' })
    }
    ids.add(candidate.id)
  }

  const caveats = stringArray(input.caveats, 'caveats', issues)
  const hasErrors = issues.some((issue) => issue.severity === 'error')
  if (hasErrors) return { ok: false, value: null, issues }

  return {
    ok: true,
    value: {
      schema_version: KNOWLEDGE_HUB_ARTIFACT_SCHEMA_VERSION,
      generated_at: generatedAt,
      generated_by: stringValue(input.generated_by) ?? undefined,
      extraction_mode: input.extraction_mode as KnowledgeHubArtifact['extraction_mode'],
      extraction_mode_label: extractionModeLabel,
      rulebook: rulebook ?? {
        version: '',
        actual_reform_definition: undefined,
        include_rules: [],
        exclude_rules: [],
        evidence_types: [],
        reform_categories: [],
        relevance_scoring: {},
        exclusion_reasons: [],
      },
      sources,
      source_diagnostics: sourceDiagnostics,
      accepted_reforms: acceptedReforms,
      candidates,
      caveats,
    },
    issues,
  }
}
