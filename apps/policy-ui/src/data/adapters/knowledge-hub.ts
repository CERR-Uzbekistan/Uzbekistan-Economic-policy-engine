import type {
  KnowledgeHubContent,
  KnowledgeHubSourceDiagnostic,
  ReformCandidateItem,
  ReformStatus,
  ReformTrackerItem,
  ResearchBrief,
} from '../../contracts/data-contract.js'
import type { KnowledgeHubArtifact } from '../knowledge-hub/artifact-types.js'

export type RawKnowledgeHubByline = {
  author?: string
  date_label?: string
  read_time_minutes?: number
  ai_drafted?: boolean
  reviewed_by?: string
}

export type RawKnowledgeHubReform = {
  id?: string
  date_label?: string
  date_iso?: string
  status?: string
  title?: string
  mechanism?: string
  summary?: string
  extraction_state?: string
  domain_tag?: string
  domain_tags?: unknown
  reform_category?: string
  evidence_types?: unknown
  review_state?: string
  review_status?: string
  source_title?: string
  source_institution?: string
  source_owner?: string
  source_url?: string
  source_published_at?: string
  retrieved_at?: string
  extracted_at?: string
  as_of_date?: string
  status_authority?: string
  inclusion_reason?: string
  matched_rules?: unknown
  caveats?: unknown
  reviewer_of_record?: string
  review_date?: string
  review_scope?: string
  citation_permission?: string
  license_class?: string
  translation_review_state?: string
  model_refs?: unknown
}

export type RawKnowledgeHubBrief = {
  id?: string
  byline?: RawKnowledgeHubByline
  title?: string
  summary?: string
  domain_tag?: string
  model_refs?: unknown
}

export type RawKnowledgeHubPayload = {
  meta?: {
    reforms_tracked?: number
    research_briefs?: number
    literature_items?: number
    candidate_items?: number
    sources_configured?: number
  }
  accepted_reforms?: RawKnowledgeHubReform[]
  reforms?: RawKnowledgeHubReform[]
  briefs?: RawKnowledgeHubBrief[]
  candidates?: ReformCandidateItem[]
  source_diagnostics?: KnowledgeHubSourceDiagnostic[]
  caveats?: string[]
  generated_at?: string
  extraction_mode?: string
  extraction_mode_label?: string
  source_artifact?: string
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((entry): entry is string => typeof entry === 'string')
}

function asReformStatus(
  value: unknown,
  fallback: Exclude<ReformStatus, 'unknown'> = 'planned',
): Exclude<ReformStatus, 'unknown'> {
  if (value === 'completed') return 'adopted'
  if (value === 'in_progress') return 'in_implementation'
  const status = value as ReformStatus
  if (status === 'adopted' || status === 'in_implementation' || status === 'planned' || status === 'superseded') {
    return status
  }
  return fallback
}

function adaptReform(raw: RawKnowledgeHubReform, index: number): ReformTrackerItem {
  const date = asString(raw.date_iso, asString(raw.date_label, ''))
  const category = asString(raw.reform_category, 'other_policy') as ReformTrackerItem['reform_category']
  const domainTag = asString(raw.domain_tag, 'Policy')
  return {
    id: asString(raw.id, `reform-${index}`),
    extraction_state: raw.extraction_state === 'source_extracted' || raw.extraction_state === 'corrected' ? raw.extraction_state : 'manual_seed',
    review_state: raw.review_state === 'accepted_public' ? 'accepted_public' : 'accepted_internal',
    review_status: raw.review_status === 'public_cleared' ? 'public_cleared' : 'owner_reviewed',
    status: asReformStatus(raw.status),
    title: asString(raw.title, 'Untitled reform'),
    summary: asString(raw.summary, asString(raw.mechanism, '')),
    domain_tag: domainTag,
    domain_tags: asStringArray(raw.domain_tags).length > 0 ? asStringArray(raw.domain_tags) : [domainTag],
    reform_category: category,
    evidence_types:
      asStringArray(raw.evidence_types).length > 0
        ? (asStringArray(raw.evidence_types) as ReformTrackerItem['evidence_types'])
        : ['official_policy_announcement'],
    inclusion_reason: asString(raw.inclusion_reason, 'Accepted reform record retained from static pilot content.'),
    matched_rules: asStringArray(raw.matched_rules).length > 0 ? asStringArray(raw.matched_rules) : ['manual-static-pilot'],
    source_title: asString(raw.source_title, asString(raw.title, 'Untitled source')),
    source_institution: asString(raw.source_institution, 'Source institution pending review'),
    source_owner: asString(raw.source_owner, asString(raw.source_institution, 'Source owner pending review')),
    source_url: asString(raw.source_url, '#'),
    source_published_at: typeof raw.source_published_at === 'string' ? raw.source_published_at : date || undefined,
    retrieved_at: typeof raw.retrieved_at === 'string' ? raw.retrieved_at : undefined,
    extracted_at: typeof raw.extracted_at === 'string' ? raw.extracted_at : undefined,
    as_of_date: typeof raw.as_of_date === 'string' ? raw.as_of_date : date || undefined,
    status_authority: asString(raw.status_authority, 'Static pilot status; authority pending source review'),
    reviewer_of_record: asString(raw.reviewer_of_record, 'Internal preview owner pending'),
    review_date: asString(raw.review_date, date || '2026-05-05'),
    review_scope: asString(raw.review_scope, 'Static pilot copy only; source/legal currentness not cleared.'),
    citation_permission:
      raw.citation_permission === 'external_allowed' ||
      raw.citation_permission === 'prohibited' ||
      raw.citation_permission === 'pending'
        ? raw.citation_permission
        : 'internal_only',
    license_class:
      raw.license_class === 'public_open' ||
      raw.license_class === 'public_attribution_required' ||
      raw.license_class === 'public_link_only' ||
      raw.license_class === 'internal' ||
      raw.license_class === 'licensed' ||
      raw.license_class === 'restricted'
        ? raw.license_class
        : 'unknown',
    translation_review_state:
      raw.translation_review_state === 'reviewed' ||
      raw.translation_review_state === 'ai_drafted_unreviewed' ||
      raw.translation_review_state === 'human_translated_unreviewed' ||
      raw.translation_review_state === 'blocked' ||
      raw.translation_review_state === 'not_applicable'
        ? raw.translation_review_state
        : 'not_translated',
    caveats:
      asStringArray(raw.caveats).length > 0
        ? asStringArray(raw.caveats)
        : ['Static pilot content. Do not treat this item as a live legal registry or current official notice.'],
    model_refs: asStringArray(raw.model_refs),
  }
}

function adaptBrief(raw: RawKnowledgeHubBrief, index: number): ResearchBrief {
  const byline = raw.byline ?? {}
  return {
    id: asString(raw.id, `brief-${index}`),
    byline: {
      author: typeof byline.author === 'string' ? byline.author : undefined,
      date_label: asString(byline.date_label, ''),
      read_time_minutes:
        typeof byline.read_time_minutes === 'number' && Number.isFinite(byline.read_time_minutes)
          ? byline.read_time_minutes
          : undefined,
      ai_drafted: byline.ai_drafted === true,
      reviewed_by: typeof byline.reviewed_by === 'string' ? byline.reviewed_by : undefined,
    },
    title: asString(raw.title, 'Untitled brief'),
    summary: asString(raw.summary, ''),
    domain_tag: typeof raw.domain_tag === 'string' ? raw.domain_tag : undefined,
    model_refs: asStringArray(raw.model_refs),
  }
}

export function toKnowledgeHubContent(raw: RawKnowledgeHubPayload): KnowledgeHubContent {
  const rawReforms = Array.isArray(raw.accepted_reforms) ? raw.accepted_reforms : raw.reforms
  const reforms = Array.isArray(rawReforms) ? rawReforms.map(adaptReform) : []
  const briefs = Array.isArray(raw.briefs) ? raw.briefs.map(adaptBrief) : []
  const candidates = Array.isArray(raw.candidates) ? raw.candidates : []
  const sourceDiagnostics = Array.isArray(raw.source_diagnostics) ? raw.source_diagnostics : []
  const meta = raw.meta ?? {}
  return {
    reforms,
    briefs,
    candidates,
    source_diagnostics: sourceDiagnostics,
    caveats: asStringArray(raw.caveats),
    generated_at: typeof raw.generated_at === 'string' ? raw.generated_at : undefined,
    extraction_mode: typeof raw.extraction_mode === 'string' ? raw.extraction_mode : undefined,
    extraction_mode_label: typeof raw.extraction_mode_label === 'string' ? raw.extraction_mode_label : undefined,
    source_artifact: typeof raw.source_artifact === 'string' ? raw.source_artifact : undefined,
    meta: {
      reforms_tracked: asNumber(meta.reforms_tracked, reforms.length),
      research_briefs: asNumber(meta.research_briefs, briefs.length),
      literature_items: asNumber(meta.literature_items, 0),
      candidate_items: asNumber(meta.candidate_items, candidates.length),
      sources_configured: asNumber(meta.sources_configured, 0),
    },
  }
}

export function knowledgeHubArtifactToContent(artifact: KnowledgeHubArtifact): KnowledgeHubContent {
  return toKnowledgeHubContent({
    generated_at: artifact.generated_at,
    extraction_mode: artifact.extraction_mode,
    extraction_mode_label: artifact.extraction_mode_label,
    source_artifact: '/data/knowledge-hub.json',
    accepted_reforms: artifact.accepted_reforms,
    candidates: artifact.candidates,
    source_diagnostics: artifact.source_diagnostics,
    caveats: artifact.caveats,
    meta: {
      candidate_items: artifact.candidates.length,
      sources_configured: artifact.sources.length,
      reforms_tracked: 0,
      research_briefs: 0,
      literature_items: 0,
    },
  })
}
