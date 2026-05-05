import type { ReformCandidateItem } from '../../contracts/data-contract.js'

export const KNOWLEDGE_HUB_ARTIFACT_SCHEMA_VERSION = 'knowledge-hub-reform-candidates.v2'

export type KnowledgeHubArtifactSource = {
  id: string
  institution: string
  url: string
}

export type KnowledgeHubRulebook = {
  version: string
  actual_reform_definition?: string
  include_rules: Array<Record<string, unknown>>
  exclude_rules: Array<Record<string, unknown>>
  evidence_types: string[]
  reform_categories: string[]
  relevance_scoring: Record<string, unknown>
  exclusion_reasons: Array<Record<string, unknown>>
}

export type KnowledgeHubArtifact = {
  schema_version: typeof KNOWLEDGE_HUB_ARTIFACT_SCHEMA_VERSION
  generated_at: string
  generated_by?: string
  extraction_mode: 'fixture-demo' | 'configured-source-fetch'
  extraction_mode_label: string
  rulebook: KnowledgeHubRulebook
  sources: KnowledgeHubArtifactSource[]
  candidates: ReformCandidateItem[]
  caveats: string[]
}
