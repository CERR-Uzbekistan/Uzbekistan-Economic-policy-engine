import type {
  ReformCandidateItem,
  ReformCategory,
  ReformCitationPermission,
  ReformEvidenceType,
  ReformArtifactExtractionMode,
  KnowledgeHubActiveModelLensId,
  KnowledgeHubContentLanguage,
  KnowledgeHubGatedModelLensId,
  KnowledgeHubLiteratureItem,
  KnowledgeHubModelImpactMap,
  KnowledgeHubModelImpactPackageLink,
  KnowledgeHubPolicyBrief,
  KnowledgeHubResearchUpdate,
  ReformPackageDigest,
  ReformLicenseClass,
  ReformMilestoneEventType,
  ReformPackage,
  ReformPackageMeasureTrack,
  ReformPackageMilestone,
  ReformPackageSourceEvent,
  ReformReviewState,
  ReformSourceUrlStatus,
  ReformSourceConfidence,
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

const KNOWLEDGE_HUB_CONTENT_LANGUAGE_VALUES: KnowledgeHubContentLanguage[] = ['en', 'ru', 'uz']

function validateLocalizedText(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): Partial<Record<KnowledgeHubContentLanguage, string>> | undefined {
  if (typeof value === 'undefined') return undefined
  if (!isRecord(value)) {
    issues.push({ path, message: 'Expected a localized text object.', severity: 'error' })
    return undefined
  }

  const localized: Partial<Record<KnowledgeHubContentLanguage, string>> = {}
  for (const language of KNOWLEDGE_HUB_CONTENT_LANGUAGE_VALUES) {
    const entry = value[language]
    if (typeof entry === 'undefined') continue
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      issues.push({ path: `${path}.${language}`, message: 'Expected a non-empty localized string.', severity: 'error' })
      continue
    }
    localized[language] = entry
  }

  return Object.keys(localized).length > 0 ? localized : undefined
}

function validateLocalizedList(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): Partial<Record<KnowledgeHubContentLanguage, string[]>> | undefined {
  if (typeof value === 'undefined') return undefined
  if (!isRecord(value)) {
    issues.push({ path, message: 'Expected a localized string-list object.', severity: 'error' })
    return undefined
  }

  const localized: Partial<Record<KnowledgeHubContentLanguage, string[]>> = {}
  for (const language of KNOWLEDGE_HUB_CONTENT_LANGUAGE_VALUES) {
    const entry = value[language]
    if (typeof entry === 'undefined') continue
    localized[language] = stringArray(entry, `${path}.${language}`, issues)
  }

  return Object.keys(localized).length > 0 ? localized : undefined
}

function validateLocalizedStatusMap(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): Partial<Record<KnowledgeHubContentLanguage, 'verified' | 'not_checked_fixture'>> | undefined {
  if (typeof value === 'undefined') return undefined
  if (!isRecord(value)) {
    issues.push({ path, message: 'Expected a localized source URL status object.', severity: 'error' })
    return undefined
  }

  const statuses: Partial<Record<KnowledgeHubContentLanguage, 'verified' | 'not_checked_fixture'>> = {}
  for (const language of KNOWLEDGE_HUB_CONTENT_LANGUAGE_VALUES) {
    const entry = value[language]
    if (typeof entry === 'undefined') continue
    if (entry !== 'verified' && entry !== 'not_checked_fixture') {
      issues.push({ path: `${path}.${language}`, message: 'Expected verified or not_checked_fixture.', severity: 'error' })
      continue
    }
    statuses[language] = entry
  }

  return Object.keys(statuses).length > 0 ? statuses : undefined
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

const REFORM_MILESTONE_EVENT_TYPE_VALUES: ReformMilestoneEventType[] = [
  'instructions_issued',
  'consultation',
  'approved',
  'effective_date',
  'implementation_milestone',
  'financing_allocated',
  'monitoring_update',
  'target_deadline',
  'amended',
  'completed',
  'superseded',
]

const REFORM_SOURCE_CONFIDENCE_VALUES: ReformSourceConfidence[] = ['high', 'medium', 'low']

const KNOWLEDGE_HUB_ACTIVE_MODEL_LENS_VALUES: KnowledgeHubActiveModelLensId[] = ['QPM', 'DFM', 'I-O', 'PE']
const KNOWLEDGE_HUB_GATED_MODEL_LENS_VALUES: KnowledgeHubGatedModelLensId[] = [
  'CGE',
  'FPP',
  'HFI',
  'Synthesis',
]

const REFORM_DATE_PRECISION_VALUES: NonNullable<ReformPackageMilestone['date_precision']>[] = [
  'day',
  'month',
  'quarter',
  'year',
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

function validateProductionSourceUrl(
  value: string,
  status: ReformPackageSourceEvent['source_url_status'],
  extractionMode: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): void {
  validateUrl(value, path, issues)
  try {
    const host = new URL(value).hostname
    if (/\.test$/i.test(host) || /^(?:example|localhost|127\.0\.0\.1)(?:\.|$)/i.test(host)) {
      issues.push({ path, message: 'Production package source events cannot use synthetic or local links.', severity: 'error' })
    }
  } catch {
    return
  }

  if (extractionMode === 'configured-source-fetch' && status !== 'verified') {
    issues.push({ path, message: 'Configured-source package source events require verified links.', severity: 'error' })
  }
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

function validateMeasureTrack(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): ReformPackageMeasureTrack | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Measure track entry must be an object.', severity: 'error' })
    return null
  }

  return {
    id: requireString(value, 'id', path, issues),
    label: requireString(value, 'label', path, issues),
    status: stringValue(value.status) ?? undefined,
  }
}

function validatePackageMilestone(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): ReformPackageMilestone | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Package milestone entry must be an object.', severity: 'error' })
    return null
  }

  const milestone: ReformPackageMilestone = {
    id: requireString(value, 'id', path, issues),
    label: requireString(value, 'label', path, issues),
    date: requireString(value, 'date', path, issues),
    date_precision: stringValue(value.date_precision) as ReformPackageMilestone['date_precision'],
    event_type: requireEnum(value, 'event_type', path, REFORM_MILESTONE_EVENT_TYPE_VALUES, issues),
    responsible_institutions: stringArray(value.responsible_institutions, `${path}.responsible_institutions`, issues),
    evidence_type: requireEnum(value, 'evidence_type', path, REFORM_EVIDENCE_TYPE_VALUES, issues),
    source_event_ids: stringArray(value.source_event_ids, `${path}.source_event_ids`, issues),
    confidence: requireEnum(value, 'confidence', path, REFORM_SOURCE_CONFIDENCE_VALUES, issues),
    related_next_milestone_ids: Array.isArray(value.related_next_milestone_ids)
      ? stringArray(value.related_next_milestone_ids, `${path}.related_next_milestone_ids`, issues)
      : undefined,
  }

  if (milestone.date && !isIsoLike(milestone.date)) {
    issues.push({ path: `${path}.date`, message: 'Expected an ISO-like milestone date.', severity: 'error' })
  }
  if (milestone.date_precision && !REFORM_DATE_PRECISION_VALUES.includes(milestone.date_precision)) {
    issues.push({ path: `${path}.date_precision`, message: 'Expected day, month, quarter, or year.', severity: 'error' })
  }
  if (milestone.responsible_institutions.length === 0) {
    issues.push({ path: `${path}.responsible_institutions`, message: 'Expected at least one responsible institution.', severity: 'error' })
  }
  if (milestone.source_event_ids.length === 0) {
    issues.push({ path: `${path}.source_event_ids`, message: 'Expected at least one source event id.', severity: 'error' })
  }

  return milestone
}

function validatePackageSourceEvent(
  value: unknown,
  path: string,
  extractionMode: unknown,
  issues: KnowledgeHubArtifactValidationIssue[],
): ReformPackageSourceEvent | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Package source event entry must be an object.', severity: 'error' })
    return null
  }

  const event: ReformPackageSourceEvent = {
    id: requireString(value, 'id', path, issues),
    title: requireString(value, 'title', path, issues),
    source_institution: requireString(value, 'source_institution', path, issues),
    source_url: requireString(value, 'source_url', path, issues),
    source_published_at: requireString(value, 'source_published_at', path, issues),
    evidence_type: requireEnum(value, 'evidence_type', path, REFORM_EVIDENCE_TYPE_VALUES, issues),
    event_type: requireEnum(value, 'event_type', path, REFORM_MILESTONE_EVENT_TYPE_VALUES, issues),
    summary: requireString(value, 'summary', path, issues),
    source_url_status: requireEnum(value, 'source_url_status', path, REFORM_SOURCE_URL_STATUS_VALUES, issues),
    extracted_at: stringValue(value.extracted_at) ?? undefined,
    localized: validatePackageSourceEventLocalized(value.localized, `${path}.localized`, extractionMode, issues),
  }

  validateProductionSourceUrl(event.source_url, event.source_url_status, extractionMode, `${path}.source_url`, issues)
  if (event.source_published_at && !isIsoLike(event.source_published_at)) {
    issues.push({ path: `${path}.source_published_at`, message: 'Expected an ISO-like source date.', severity: 'error' })
  }
  if (event.extracted_at && !isIsoLike(event.extracted_at)) {
    issues.push({ path: `${path}.extracted_at`, message: 'Expected an ISO-like extracted timestamp.', severity: 'error' })
  }

  return event
}

function validatePackageSourceEventLocalized(
  value: unknown,
  path: string,
  extractionMode: unknown,
  issues: KnowledgeHubArtifactValidationIssue[],
): ReformPackageSourceEvent['localized'] | undefined {
  if (typeof value === 'undefined') return undefined
  if (!isRecord(value)) {
    issues.push({ path, message: 'Expected a localized source-event object.', severity: 'error' })
    return undefined
  }

  const localized = {
    title: validateLocalizedText(value.title, `${path}.title`, issues),
    summary: validateLocalizedText(value.summary, `${path}.summary`, issues),
    source_url: validateLocalizedText(value.source_url, `${path}.source_url`, issues),
    source_url_status: validateLocalizedStatusMap(value.source_url_status, `${path}.source_url_status`, issues),
  }

  for (const [language, url] of Object.entries(localized.source_url ?? {})) {
    validateProductionSourceUrl(
      url,
      localized.source_url_status?.[language as KnowledgeHubContentLanguage] ?? 'verified',
      extractionMode,
      `${path}.source_url.${language}`,
      issues,
    )
  }

  return Object.values(localized).some(Boolean) ? localized : undefined
}

function validatePackageDigest(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): ReformPackageDigest | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Package digest must be an object.', severity: 'error' })
    return null
  }

  const digest = {
    changed: requireString(value, 'changed', path, issues),
    applies_to: requireString(value, 'applies_to', path, issues),
    effective_status: requireString(value, 'effective_status', path, issues),
    document: requireString(value, 'document', path, issues),
  }
  const forbidden = /Source event date|Evidence type|No future implementation deadline|Tracks one verified official source event|Official detail page did not expose/i
  for (const [key, fieldValue] of Object.entries(digest)) {
    if (forbidden.test(fieldValue)) {
      issues.push({
        path: `${path}.${key}`,
        message: 'Public digest cannot expose extraction metadata or generic source-event wording.',
        severity: 'error',
      })
    }
  }
  return digest
}

function validateLocalizedDigest(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): Partial<Record<KnowledgeHubContentLanguage, Partial<ReformPackageDigest>>> | undefined {
  if (typeof value === 'undefined') return undefined
  if (!isRecord(value)) {
    issues.push({ path, message: 'Expected a localized package digest object.', severity: 'error' })
    return undefined
  }

  const localizedDigest: Partial<Record<KnowledgeHubContentLanguage, Partial<ReformPackageDigest>>> = {}
  for (const language of KNOWLEDGE_HUB_CONTENT_LANGUAGE_VALUES) {
    const entry = value[language]
    if (typeof entry === 'undefined') continue
    if (!isRecord(entry)) {
      issues.push({ path: `${path}.${language}`, message: 'Expected a digest object for this language.', severity: 'error' })
      continue
    }
    localizedDigest[language] = {
      changed: stringValue(entry.changed) ?? undefined,
      applies_to: stringValue(entry.applies_to) ?? undefined,
      effective_status: stringValue(entry.effective_status) ?? undefined,
      document: stringValue(entry.document) ?? undefined,
    }
  }

  return Object.keys(localizedDigest).length > 0 ? localizedDigest : undefined
}

function validatePackageLocalized(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): ReformPackage['localized'] | undefined {
  if (typeof value === 'undefined') return undefined
  if (!isRecord(value)) {
    issues.push({ path, message: 'Expected a localized package object.', severity: 'error' })
    return undefined
  }

  const localized: ReformPackage['localized'] = {
    title: validateLocalizedText(value.title, `${path}.title`, issues),
    short_summary: validateLocalizedText(value.short_summary, `${path}.short_summary`, issues),
    policy_area: validateLocalizedText(value.policy_area, `${path}.policy_area`, issues),
    current_stage: validateLocalizedText(value.current_stage, `${path}.current_stage`, issues),
    next_milestone: validateLocalizedText(value.next_milestone, `${path}.next_milestone`, issues),
    legal_basis: validateLocalizedText(value.legal_basis, `${path}.legal_basis`, issues),
    official_basis: validateLocalizedText(value.official_basis, `${path}.official_basis`, issues),
    financing_or_incentive: validateLocalizedText(value.financing_or_incentive, `${path}.financing_or_incentive`, issues),
    why_tracked: validateLocalizedText(value.why_tracked, `${path}.why_tracked`, issues),
    parameters_or_amounts: validateLocalizedList(value.parameters_or_amounts, `${path}.parameters_or_amounts`, issues),
    digest: validateLocalizedDigest(value.digest, `${path}.digest`, issues),
  }

  return Object.values(localized).some(Boolean) ? localized : undefined
}

function validateReformPackage(
  value: unknown,
  path: string,
  extractionMode: unknown,
  issues: KnowledgeHubArtifactValidationIssue[],
): ReformPackage | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Reform package entry must be an object.', severity: 'error' })
    return null
  }

  const measureTracks = Array.isArray(value.measure_tracks)
    ? value.measure_tracks
        .map((entry, index) => validateMeasureTrack(entry, `${path}.measure_tracks[${index}]`, issues))
        .filter((entry): entry is ReformPackageMeasureTrack => entry !== null)
    : []
  if (!Array.isArray(value.measure_tracks)) {
    issues.push({ path: `${path}.measure_tracks`, message: 'Expected a measure track array.', severity: 'error' })
  }

  const milestones = Array.isArray(value.implementation_milestones)
    ? value.implementation_milestones
        .map((entry, index) => validatePackageMilestone(entry, `${path}.implementation_milestones[${index}]`, issues))
        .filter((entry): entry is ReformPackageMilestone => entry !== null)
    : []
  if (!Array.isArray(value.implementation_milestones)) {
    issues.push({ path: `${path}.implementation_milestones`, message: 'Expected a milestone array.', severity: 'error' })
  }

  const sourceEvents = Array.isArray(value.official_source_events)
    ? value.official_source_events
        .map((entry, index) => validatePackageSourceEvent(entry, `${path}.official_source_events[${index}]`, extractionMode, issues))
        .filter((entry): entry is ReformPackageSourceEvent => entry !== null)
    : []
  if (!Array.isArray(value.official_source_events)) {
    issues.push({ path: `${path}.official_source_events`, message: 'Expected a source event array.', severity: 'error' })
  }

  const sourceEventIds = new Set(sourceEvents.map((event) => event.id))
  for (const milestone of milestones) {
    for (const sourceEventId of milestone.source_event_ids) {
      if (!sourceEventIds.has(sourceEventId)) {
        issues.push({
          path: `${path}.implementation_milestones.${milestone.id}.source_event_ids`,
          message: `Unknown source event id ${sourceEventId}.`,
          severity: 'error',
        })
      }
    }
  }

  const reformPackage: ReformPackage = {
    package_id: requireString(value, 'package_id', path, issues),
    title: requireString(value, 'title', path, issues),
    digest: validatePackageDigest(value.digest, `${path}.digest`, issues) ?? {
      changed: '',
      applies_to: '',
      effective_status: '',
      document: '',
    },
    short_summary: stringValue(value.short_summary) ?? undefined,
    policy_area: requireString(value, 'policy_area', path, issues),
    reform_category: requireEnum(value, 'reform_category', path, REFORM_CATEGORY_VALUES, issues),
    current_stage: requireString(value, 'current_stage', path, issues),
    current_stage_date: requireString(value, 'current_stage_date', path, issues),
    next_milestone: requireString(value, 'next_milestone', path, issues),
    next_milestone_date: requireString(value, 'next_milestone_date', path, issues),
    responsible_institutions: stringArray(value.responsible_institutions, `${path}.responsible_institutions`, issues),
    legal_basis: requireString(value, 'legal_basis', path, issues),
    official_basis: requireString(value, 'official_basis', path, issues),
    financing_or_incentive: stringValue(value.financing_or_incentive) ?? undefined,
    source_confidence: requireEnum(value, 'source_confidence', path, REFORM_SOURCE_CONFIDENCE_VALUES, issues),
    why_tracked: requireString(value, 'why_tracked', path, issues),
    model_relevance: stringArray(value.model_relevance, `${path}.model_relevance`, issues),
    policy_channels: Array.isArray(value.policy_channels)
      ? stringArray(value.policy_channels, `${path}.policy_channels`, issues)
      : undefined,
    parameters_or_amounts: Array.isArray(value.parameters_or_amounts)
      ? stringArray(value.parameters_or_amounts, `${path}.parameters_or_amounts`, issues)
      : undefined,
    measure_tracks: measureTracks,
    implementation_milestones: milestones,
    official_source_events: sourceEvents,
    caveat: requireString(value, 'caveat', path, issues),
    localized: validatePackageLocalized(value.localized, `${path}.localized`, issues),
  }

  if (!isIsoLike(reformPackage.current_stage_date)) {
    issues.push({ path: `${path}.current_stage_date`, message: 'Expected an ISO-like current stage date.', severity: 'error' })
  }
  if (!isIsoLike(reformPackage.next_milestone_date)) {
    issues.push({ path: `${path}.next_milestone_date`, message: 'Expected an ISO-like next milestone date.', severity: 'error' })
  }
  if (reformPackage.responsible_institutions.length === 0) {
    issues.push({ path: `${path}.responsible_institutions`, message: 'Expected at least one responsible institution.', severity: 'error' })
  }
  if (reformPackage.model_relevance.length === 0) {
    issues.push({ path: `${path}.model_relevance`, message: 'Expected at least one model relevance chip.', severity: 'error' })
  }
  if (reformPackage.measure_tracks.length === 0) {
    issues.push({ path: `${path}.measure_tracks`, message: 'Expected at least one measure track.', severity: 'error' })
  }
  if (reformPackage.implementation_milestones.length === 0) {
    issues.push({ path: `${path}.implementation_milestones`, message: 'Expected at least one implementation milestone.', severity: 'error' })
  }
  if (reformPackage.official_source_events.length === 0) {
    issues.push({ path: `${path}.official_source_events`, message: 'Expected at least one official source event.', severity: 'error' })
  }

  return reformPackage
}

function validatePolicyBrief(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): KnowledgeHubPolicyBrief | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Policy brief entry must be an object.', severity: 'error' })
    return null
  }

  const packageIds = stringArray(value.package_ids, `${path}.package_ids`, issues)
  const sourceEventIds = stringArray(value.source_event_ids, `${path}.source_event_ids`, issues)
  const possibleLenses = stringArray(value.possible_lenses, `${path}.possible_lenses`, issues)
  const brief: KnowledgeHubPolicyBrief = {
    id: requireString(value, 'id', path, issues),
    title: requireString(value, 'title', path, issues),
    summary: requireString(value, 'summary', path, issues),
    package_ids: packageIds,
    policy_channels: stringArray(value.policy_channels, `${path}.policy_channels`, issues),
    possible_lenses: possibleLenses.filter((lens): lens is KnowledgeHubActiveModelLensId =>
      KNOWLEDGE_HUB_ACTIVE_MODEL_LENS_VALUES.includes(lens as KnowledgeHubActiveModelLensId),
    ),
    source_event_ids: sourceEventIds,
    as_of_date: requireString(value, 'as_of_date', path, issues),
    publication_state: requireEnum(value, 'publication_state', path, ['internal_preview'], issues),
    citation_permission: requireEnum(value, 'citation_permission', path, ['internal_only'], issues),
    citable: false,
    caveats: stringArray(value.caveats, `${path}.caveats`, issues),
  }

  if (value.citable !== false) {
    issues.push({ path: `${path}.citable`, message: 'Internal preview policy briefs must be non-citable.', severity: 'error' })
  }
  if (brief.as_of_date && !isIsoLike(brief.as_of_date)) {
    issues.push({ path: `${path}.as_of_date`, message: 'Expected an ISO-like as-of date.', severity: 'error' })
  }
  if (brief.package_ids.length === 0) {
    issues.push({ path: `${path}.package_ids`, message: 'Expected at least one source package id.', severity: 'error' })
  }
  if (brief.source_event_ids.length === 0) {
    issues.push({ path: `${path}.source_event_ids`, message: 'Expected at least one source event id.', severity: 'error' })
  }
  if (brief.policy_channels.length === 0) {
    issues.push({ path: `${path}.policy_channels`, message: 'Expected at least one policy channel.', severity: 'error' })
  }
  for (const lens of possibleLenses) {
    if (!KNOWLEDGE_HUB_ACTIVE_MODEL_LENS_VALUES.includes(lens as KnowledgeHubActiveModelLensId)) {
      issues.push({
        path: `${path}.possible_lenses`,
        message: `Policy briefs may reference only active analytical lenses: ${KNOWLEDGE_HUB_ACTIVE_MODEL_LENS_VALUES.join(', ')}.`,
        severity: 'error',
      })
    }
  }
  if (brief.possible_lenses.length === 0) {
    issues.push({ path: `${path}.possible_lenses`, message: 'Expected at least one active analytical lens.', severity: 'error' })
  }
  if (brief.caveats.length === 0) {
    issues.push({ path: `${path}.caveats`, message: 'Expected at least one internal-preview caveat.', severity: 'error' })
  }

  return brief
}

function validateResearchUpdate(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): KnowledgeHubResearchUpdate | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Research update entry must be an object.', severity: 'error' })
    return null
  }

  const modelIds = stringArray(value.model_ids, `${path}.model_ids`, issues)
  const update: KnowledgeHubResearchUpdate = {
    id: requireString(value, 'id', path, issues),
    title: requireString(value, 'title', path, issues),
    topic: requireString(value, 'topic', path, issues),
    summary: requireString(value, 'summary', path, issues),
    model_ids: modelIds.filter((modelId): modelId is KnowledgeHubResearchUpdate['model_ids'][number] =>
      [...KNOWLEDGE_HUB_ACTIVE_MODEL_LENS_VALUES, ...KNOWLEDGE_HUB_GATED_MODEL_LENS_VALUES].includes(
        modelId as KnowledgeHubResearchUpdate['model_ids'][number],
      ),
    ),
    methods: stringArray(value.methods, `${path}.methods`, issues),
    source_title: requireString(value, 'source_title', path, issues),
    source_institution: requireString(value, 'source_institution', path, issues),
    source_url: requireString(value, 'source_url', path, issues),
    published_at: stringValue(value.published_at) ?? undefined,
    as_of_date: stringValue(value.as_of_date) ?? undefined,
    geography: stringValue(value.geography) ?? undefined,
    why_relevant: requireString(value, 'why_relevant', path, issues),
  }

  validateUrl(update.source_url, `${path}.source_url`, issues)
  if (!update.published_at && !update.as_of_date) {
    issues.push({ path, message: 'Research updates require published_at or as_of_date.', severity: 'error' })
  }
  if (update.published_at && !isIsoLike(update.published_at)) {
    issues.push({ path: `${path}.published_at`, message: 'Expected an ISO-like publication date.', severity: 'error' })
  }
  if (update.as_of_date && !isIsoLike(update.as_of_date)) {
    issues.push({ path: `${path}.as_of_date`, message: 'Expected an ISO-like as-of date.', severity: 'error' })
  }
  if (update.model_ids.length === 0) {
    issues.push({ path: `${path}.model_ids`, message: 'Expected at least one model id.', severity: 'error' })
  }
  if (update.methods.length === 0) {
    issues.push({ path: `${path}.methods`, message: 'Expected at least one method.', severity: 'error' })
  }
  for (const modelId of modelIds) {
    if (
      ![...KNOWLEDGE_HUB_ACTIVE_MODEL_LENS_VALUES, ...KNOWLEDGE_HUB_GATED_MODEL_LENS_VALUES].includes(
        modelId as KnowledgeHubResearchUpdate['model_ids'][number],
      )
    ) {
      issues.push({ path: `${path}.model_ids`, message: `Unknown Knowledge Hub model id ${modelId}.`, severity: 'error' })
    }
  }

  return update
}

function validateLiteratureItem(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): KnowledgeHubLiteratureItem | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Literature item entry must be an object.', severity: 'error' })
    return null
  }

  const modelIds = stringArray(value.model_ids, `${path}.model_ids`, issues)
  const item: KnowledgeHubLiteratureItem = {
    id: requireString(value, 'id', path, issues),
    title: requireString(value, 'title', path, issues),
    authors: stringValue(value.authors) ?? undefined,
    year: requireString(value, 'year', path, issues),
    source: requireString(value, 'source', path, issues),
    url: requireString(value, 'url', path, issues),
    model_ids: modelIds.filter((modelId): modelId is KnowledgeHubLiteratureItem['model_ids'][number] =>
      [...KNOWLEDGE_HUB_ACTIVE_MODEL_LENS_VALUES, ...KNOWLEDGE_HUB_GATED_MODEL_LENS_VALUES].includes(
        modelId as KnowledgeHubLiteratureItem['model_ids'][number],
      ),
    ),
    methods: stringArray(value.methods, `${path}.methods`, issues),
    note: requireString(value, 'note', path, issues),
  }

  validateUrl(item.url, `${path}.url`, issues)
  if (!/^\d{4}$/.test(item.year)) {
    issues.push({ path: `${path}.year`, message: 'Expected a four-digit year.', severity: 'error' })
  }
  if (item.model_ids.length === 0) {
    issues.push({ path: `${path}.model_ids`, message: 'Expected at least one model id.', severity: 'error' })
  }
  if (item.methods.length === 0) {
    issues.push({ path: `${path}.methods`, message: 'Expected at least one method.', severity: 'error' })
  }
  for (const modelId of modelIds) {
    if (
      ![...KNOWLEDGE_HUB_ACTIVE_MODEL_LENS_VALUES, ...KNOWLEDGE_HUB_GATED_MODEL_LENS_VALUES].includes(
        modelId as KnowledgeHubLiteratureItem['model_ids'][number],
      )
    ) {
      issues.push({ path: `${path}.model_ids`, message: `Unknown Knowledge Hub model id ${modelId}.`, severity: 'error' })
    }
  }

  return item
}

function validateActiveModelImpactLink(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): KnowledgeHubModelImpactPackageLink['active_lenses'][number] | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Active model impact link must be an object.', severity: 'error' })
    return null
  }

  return {
    model_id: requireEnum(value, 'model_id', path, KNOWLEDGE_HUB_ACTIVE_MODEL_LENS_VALUES, issues),
    channel: requireString(value, 'channel', path, issues),
    caveat: requireString(value, 'caveat', path, issues),
  }
}

function validateGatedModelImpactLink(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): KnowledgeHubModelImpactPackageLink['gated_lenses'][number] | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Gated model impact link must be an object.', severity: 'error' })
    return null
  }

  return {
    model_id: requireEnum(value, 'model_id', path, KNOWLEDGE_HUB_GATED_MODEL_LENS_VALUES, issues),
    status: requireEnum(value, 'status', path, ['planned_gated'], issues),
    caveat: requireString(value, 'caveat', path, issues),
  }
}

function validateModelLens(
  value: unknown,
  path: string,
  kind: 'active' | 'gated',
  issues: KnowledgeHubArtifactValidationIssue[],
): KnowledgeHubModelImpactMap['active_lenses'][number] | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Model lens entry must be an object.', severity: 'error' })
    return null
  }

  const allowed = kind === 'active' ? KNOWLEDGE_HUB_ACTIVE_MODEL_LENS_VALUES : KNOWLEDGE_HUB_GATED_MODEL_LENS_VALUES
  const expectedStatus = kind === 'active' ? 'possible_lens' : 'planned_gated'
  return {
    id: requireEnum(value, 'id', path, allowed, issues),
    label: requireString(value, 'label', path, issues),
    status: requireEnum(value, 'status', path, [expectedStatus], issues),
    caveat: requireString(value, 'caveat', path, issues),
  }
}

function validateModelImpactPackageLink(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): KnowledgeHubModelImpactPackageLink | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Model impact package link must be an object.', severity: 'error' })
    return null
  }

  const activeLenses = Array.isArray(value.active_lenses)
    ? value.active_lenses
        .map((entry, index) => validateActiveModelImpactLink(entry, `${path}.active_lenses[${index}]`, issues))
        .filter((entry): entry is KnowledgeHubModelImpactPackageLink['active_lenses'][number] => entry !== null)
    : []
  if (!Array.isArray(value.active_lenses)) {
    issues.push({ path: `${path}.active_lenses`, message: 'Expected an active lens array.', severity: 'error' })
  }

  const gatedLenses = Array.isArray(value.gated_lenses)
    ? value.gated_lenses
        .map((entry, index) => validateGatedModelImpactLink(entry, `${path}.gated_lenses[${index}]`, issues))
        .filter((entry): entry is KnowledgeHubModelImpactPackageLink['gated_lenses'][number] => entry !== null)
    : []
  if (!Array.isArray(value.gated_lenses)) {
    issues.push({ path: `${path}.gated_lenses`, message: 'Expected a gated lens array.', severity: 'error' })
  }
  if (activeLenses.length === 0) {
    issues.push({ path: `${path}.active_lenses`, message: 'Expected at least one possible active analytical lens.', severity: 'error' })
  }

  return {
    package_id: requireString(value, 'package_id', path, issues),
    active_lenses: activeLenses,
    gated_lenses: gatedLenses,
  }
}

function validateModelImpactMap(
  value: unknown,
  path: string,
  issues: KnowledgeHubArtifactValidationIssue[],
): KnowledgeHubModelImpactMap | null {
  if (!isRecord(value)) {
    issues.push({ path, message: 'Model impact map must be an object.', severity: 'error' })
    return null
  }

  const activeLenses = Array.isArray(value.active_lenses)
    ? value.active_lenses
        .map((entry, index) => validateModelLens(entry, `${path}.active_lenses[${index}]`, 'active', issues))
        .filter((entry): entry is KnowledgeHubModelImpactMap['active_lenses'][number] => entry !== null)
    : []
  if (!Array.isArray(value.active_lenses)) {
    issues.push({ path: `${path}.active_lenses`, message: 'Expected an active model lens array.', severity: 'error' })
  }

  const gatedLenses = Array.isArray(value.gated_lenses)
    ? value.gated_lenses
        .map((entry, index) => validateModelLens(entry, `${path}.gated_lenses[${index}]`, 'gated', issues))
        .filter((entry): entry is KnowledgeHubModelImpactMap['gated_lenses'][number] => entry !== null)
    : []
  if (!Array.isArray(value.gated_lenses)) {
    issues.push({ path: `${path}.gated_lenses`, message: 'Expected a gated model lens array.', severity: 'error' })
  }

  const packageLinks = Array.isArray(value.package_links)
    ? value.package_links
        .map((entry, index) => validateModelImpactPackageLink(entry, `${path}.package_links[${index}]`, issues))
        .filter((entry): entry is KnowledgeHubModelImpactPackageLink => entry !== null)
    : []
  if (!Array.isArray(value.package_links)) {
    issues.push({ path: `${path}.package_links`, message: 'Expected a package link array.', severity: 'error' })
  }

  const activeIds = activeLenses.map((lens) => lens.id)
  const gatedIds = gatedLenses.map((lens) => lens.id)
  if (activeIds.length !== KNOWLEDGE_HUB_ACTIVE_MODEL_LENS_VALUES.length) {
    issues.push({ path: `${path}.active_lenses`, message: 'Expected QPM, DFM, PE, and I-O as the only active analytical lenses.', severity: 'error' })
  }
  for (const expected of KNOWLEDGE_HUB_ACTIVE_MODEL_LENS_VALUES) {
    if (!activeIds.includes(expected)) {
      issues.push({ path: `${path}.active_lenses`, message: `Missing active analytical lens ${expected}.`, severity: 'error' })
    }
  }
  for (const expected of KNOWLEDGE_HUB_GATED_MODEL_LENS_VALUES) {
    if (!gatedIds.includes(expected)) {
      issues.push({ path: `${path}.gated_lenses`, message: `Missing planned/gated model lane ${expected}.`, severity: 'error' })
    }
  }

  return {
    active_lenses: activeLenses,
    gated_lenses: gatedLenses,
    package_links: packageLinks,
    caveats: stringArray(value.caveats, `${path}.caveats`, issues),
  }
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

  const reformPackages = Array.isArray(input.reform_packages)
    ? input.reform_packages
        .map((entry, index) => validateReformPackage(entry, `reform_packages[${index}]`, input.extraction_mode, issues))
        .filter((entry): entry is ReformPackage => entry !== null)
    : []
  if (!Array.isArray(input.reform_packages)) {
    issues.push({ path: 'reform_packages', message: 'Expected a reform package array.', severity: 'error' })
  }

  const policyBriefs = Array.isArray(input.policy_briefs)
    ? input.policy_briefs
        .map((entry, index) => validatePolicyBrief(entry, `policy_briefs[${index}]`, issues))
        .filter((entry): entry is KnowledgeHubPolicyBrief => entry !== null)
    : []
  if (!Array.isArray(input.policy_briefs)) {
    issues.push({ path: 'policy_briefs', message: 'Expected a policy brief array.', severity: 'error' })
  }

  const researchUpdates = Array.isArray(input.research_updates)
    ? input.research_updates
        .map((entry, index) => validateResearchUpdate(entry, `research_updates[${index}]`, issues))
        .filter((entry): entry is KnowledgeHubResearchUpdate => entry !== null)
    : []
  if (!Array.isArray(input.research_updates)) {
    issues.push({ path: 'research_updates', message: 'Expected a research update array.', severity: 'error' })
  }

  const literatureItems = Array.isArray(input.literature_items)
    ? input.literature_items
        .map((entry, index) => validateLiteratureItem(entry, `literature_items[${index}]`, issues))
        .filter((entry): entry is KnowledgeHubLiteratureItem => entry !== null)
    : []
  if (!Array.isArray(input.literature_items)) {
    issues.push({ path: 'literature_items', message: 'Expected a literature item array.', severity: 'error' })
  }

  const modelImpactMap = validateModelImpactMap(input.model_impact_map, 'model_impact_map', issues)

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
  if (input.extraction_mode === 'configured-source-fetch' && candidates.length > 0) {
    issues.push({
      path: 'candidates',
      message: 'Public configured-source Knowledge Hub artifacts must be package-only and cannot expose candidate records.',
      severity: 'error',
    })
  }
  if (input.extraction_mode === 'configured-source-fetch' && acceptedReforms.length > 0) {
    issues.push({
      path: 'accepted_reforms',
      message: 'Public configured-source Knowledge Hub artifacts must be package-only and cannot expose review records.',
      severity: 'error',
    })
  }

  const ids = new Set<string>()
  const packageIds = new Set<string>()
  const sourceEventIds = new Set<string>()
  for (const reformPackage of reformPackages) {
    if (ids.has(reformPackage.package_id)) {
      issues.push({ path: 'reform_packages', message: `Duplicate package id ${reformPackage.package_id}.`, severity: 'error' })
    }
    ids.add(reformPackage.package_id)
    packageIds.add(reformPackage.package_id)
    for (const sourceEvent of reformPackage.official_source_events) {
      sourceEventIds.add(sourceEvent.id)
    }
  }
  for (const brief of policyBriefs) {
    if (ids.has(brief.id)) {
      issues.push({ path: 'policy_briefs', message: `Duplicate policy brief id ${brief.id}.`, severity: 'error' })
    }
    ids.add(brief.id)
    for (const packageId of brief.package_ids) {
      if (!packageIds.has(packageId)) {
        issues.push({ path: `policy_briefs.${brief.id}.package_ids`, message: `Unknown source package id ${packageId}.`, severity: 'error' })
      }
    }
    for (const sourceEventId of brief.source_event_ids) {
      if (!sourceEventIds.has(sourceEventId)) {
        issues.push({ path: `policy_briefs.${brief.id}.source_event_ids`, message: `Unknown source event id ${sourceEventId}.`, severity: 'error' })
      }
    }
  }
  for (const update of researchUpdates) {
    if (ids.has(update.id)) {
      issues.push({ path: 'research_updates', message: `Duplicate research update id ${update.id}.`, severity: 'error' })
    }
    ids.add(update.id)
  }
  for (const item of literatureItems) {
    if (ids.has(item.id)) {
      issues.push({ path: 'literature_items', message: `Duplicate literature item id ${item.id}.`, severity: 'error' })
    }
    ids.add(item.id)
  }
  for (const packageLink of modelImpactMap?.package_links ?? []) {
    if (!packageIds.has(packageLink.package_id)) {
      issues.push({ path: `model_impact_map.package_links.${packageLink.package_id}`, message: `Unknown source package id ${packageLink.package_id}.`, severity: 'error' })
    }
  }
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
      reform_packages: reformPackages,
      policy_briefs: policyBriefs,
      research_updates: researchUpdates,
      literature_items: literatureItems,
      model_impact_map: modelImpactMap ?? {
        active_lenses: [],
        gated_lenses: [],
        package_links: [],
        caveats: [],
      },
      accepted_reforms: acceptedReforms,
      candidates,
      caveats,
    },
    issues,
  }
}
