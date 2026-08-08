import type { KnowledgeHubContent } from '../../contracts/data-contract.js'
import {
  createErrorSourceCore,
  createLoadingSourceCore,
  createReadySourceCore,
  type IntegrationSourceCore,
  type IntegrationValidationIssue,
} from '../source-state.js'
import { knowledgeHubArtifactToContent } from '../adapters/knowledge-hub.js'
import {
  fetchKnowledgeHubArtifact,
  KnowledgeHubArtifactTransportError,
  KnowledgeHubArtifactValidationError,
} from './artifact-client.js'

export type KnowledgeHubDataMode = 'artifact'

export type KnowledgeHubSourceState = IntegrationSourceCore<
  KnowledgeHubDataMode,
  IntegrationValidationIssue
> & {
  content: KnowledgeHubContent | null
}

function resolveKnowledgeHubDataMode(): KnowledgeHubDataMode {
  return 'artifact'
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
  try {
    const artifact = await fetchKnowledgeHubArtifact()
    return {
      ...createReadySourceCore<KnowledgeHubDataMode, IntegrationValidationIssue>(mode),
      content: knowledgeHubArtifactToContent(artifact),
    }
  } catch (error) {
    if (error instanceof KnowledgeHubArtifactValidationError) {
      return {
        ...createErrorSourceCore<KnowledgeHubDataMode, IntegrationValidationIssue>(
          mode,
          'Knowledge Hub reform tracker artifact failed frontend validation.',
          error.issues,
        ),
        content: null,
      }
    }

    if (error instanceof KnowledgeHubArtifactTransportError) {
      return {
        ...createErrorSourceCore<KnowledgeHubDataMode, IntegrationValidationIssue>(
          mode,
          `Knowledge Hub reform tracker artifact could not be loaded (${error.kind}${error.status ? ` ${error.status}` : ''}).`,
        ),
        content: null,
      }
    }

    return {
      ...createErrorSourceCore<KnowledgeHubDataMode, IntegrationValidationIssue>(
        mode,
        'Knowledge Hub reform tracker artifact could not be loaded.',
      ),
      content: null,
    }
  }
}
