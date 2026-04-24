import type {
  KnowledgeHubContent,
  ReformStatus,
  ReformTrackerItem,
  ResearchBrief,
} from '../../contracts/data-contract.js'

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
  domain_tag?: string
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
  }
  reforms?: RawKnowledgeHubReform[]
  briefs?: RawKnowledgeHubBrief[]
}

const REFORM_STATUS_VALUES: ReformStatus[] = ['completed', 'in_progress', 'planned']

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

function asReformStatus(value: unknown, fallback: ReformStatus = 'planned'): ReformStatus {
  return REFORM_STATUS_VALUES.includes(value as ReformStatus) ? (value as ReformStatus) : fallback
}

function adaptReform(raw: RawKnowledgeHubReform, index: number): ReformTrackerItem {
  return {
    id: asString(raw.id, `reform-${index}`),
    date_label: asString(raw.date_label, ''),
    date_iso: typeof raw.date_iso === 'string' ? raw.date_iso : undefined,
    status: asReformStatus(raw.status),
    title: asString(raw.title, 'Untitled reform'),
    mechanism: asString(raw.mechanism, ''),
    domain_tag: asString(raw.domain_tag, 'Other'),
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
  const reforms = Array.isArray(raw.reforms) ? raw.reforms.map(adaptReform) : []
  const briefs = Array.isArray(raw.briefs) ? raw.briefs.map(adaptBrief) : []
  const meta = raw.meta ?? {}
  return {
    reforms,
    briefs,
    meta: {
      reforms_tracked: asNumber(meta.reforms_tracked, reforms.length),
      research_briefs: asNumber(meta.research_briefs, briefs.length),
      literature_items: asNumber(meta.literature_items, 0),
    },
  }
}
