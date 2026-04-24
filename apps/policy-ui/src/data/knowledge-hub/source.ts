import type { KnowledgeHubContent } from '../../contracts/data-contract.js'
import {
  createLoadingSourceCore,
  createReadySourceCore,
  type IntegrationSourceCore,
  type IntegrationValidationIssue,
} from '../source-state.js'
import { knowledgeHubContentMock } from '../mock/knowledge-hub.js'

export type KnowledgeHubDataMode = 'mock' | 'live'

export type KnowledgeHubSourceState = IntegrationSourceCore<
  KnowledgeHubDataMode,
  IntegrationValidationIssue
> & {
  content: KnowledgeHubContent | null
}

// Shot-1 ships mock-only; live wiring lands in Shot 2 when CERR reform/research
// feeds exist behind an API. The source state is kept in the same shape as the
// other pages so the live mode slot is pre-reserved.
function resolveKnowledgeHubDataMode(): KnowledgeHubDataMode {
  return 'mock'
}

export function getInitialKnowledgeHubSourceState(): KnowledgeHubSourceState {
  const mode = resolveKnowledgeHubDataMode()
  return {
    ...createLoadingSourceCore<KnowledgeHubDataMode, IntegrationValidationIssue>(mode),
    content: null,
  }
}

export async function loadKnowledgeHubSourceState(): Promise<KnowledgeHubSourceState> {
  const mode = resolveKnowledgeHubDataMode()
  return {
    ...createReadySourceCore<KnowledgeHubDataMode, IntegrationValidationIssue>(mode),
    content: knowledgeHubContentMock,
  }
}
