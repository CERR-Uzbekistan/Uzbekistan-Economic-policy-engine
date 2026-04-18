import type { ModelExplorerWorkspace } from '../../contracts/data-contract'
import {
  createErrorSourceCore,
  createLoadingSourceCore,
  createReadySourceCore,
  mapTransportErrorToUserMessage,
  reportGuardWarningsDevOnly,
  type IntegrationSourceCore,
} from '../source-state.js'
import { toModelExplorerWorkspace } from '../adapters/model-explorer.js'
import {
  validateRawModelExplorerPayload,
  type ModelExplorerValidationIssue,
} from '../adapters/model-explorer-guard.js'
import { modelExplorerWorkspaceMock } from '../mock/model-explorer.js'
import {
  fetchModelExplorerLiveRawPayload,
  ModelExplorerTransportError,
} from './live-client.js'

export type ModelExplorerDataMode = 'mock' | 'live'

export type ModelExplorerSourceState = IntegrationSourceCore<
  ModelExplorerDataMode,
  ModelExplorerValidationIssue
> & {
  workspace: ModelExplorerWorkspace | null
}

function resolveModelExplorerDataMode(): ModelExplorerDataMode {
  const envMode = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_MODEL_EXPLORER_DATA_MODE
  const processMode = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env?.VITE_MODEL_EXPLORER_DATA_MODE
  return envMode === 'live' || processMode === 'live' ? 'live' : 'mock'
}

function buildReadyState(
  mode: ModelExplorerDataMode,
  workspace: ModelExplorerWorkspace,
  warnings: ModelExplorerValidationIssue[] = [],
): ModelExplorerSourceState {
  return {
    ...createReadySourceCore<ModelExplorerDataMode, ModelExplorerValidationIssue>(mode, warnings),
    workspace,
  }
}

function buildErrorState(
  mode: ModelExplorerDataMode,
  error: string,
  warnings: ModelExplorerValidationIssue[] = [],
): ModelExplorerSourceState {
  return {
    ...createErrorSourceCore<ModelExplorerDataMode, ModelExplorerValidationIssue>(mode, error, warnings),
    workspace: null,
  }
}

export function getInitialModelExplorerSourceState(): ModelExplorerSourceState {
  const mode = resolveModelExplorerDataMode()
  return {
    ...createLoadingSourceCore<ModelExplorerDataMode, ModelExplorerValidationIssue>(mode),
    workspace: null,
  }
}

export async function loadModelExplorerSourceState(): Promise<ModelExplorerSourceState> {
  const mode = resolveModelExplorerDataMode()
  if (mode === 'mock') {
    return buildReadyState(mode, modelExplorerWorkspaceMock)
  }

  try {
    const rawPayload = await fetchModelExplorerLiveRawPayload()
    const validation = validateRawModelExplorerPayload(rawPayload)
    reportGuardWarningsDevOnly('Model Explorer', validation.issues)
    if (!validation.ok) {
      const firstError = validation.issues.find((issue) => issue.severity === 'error')
      return buildErrorState(
        mode,
        firstError?.message ?? 'Invalid model explorer payload.',
        validation.issues,
      )
    }

    const workspace = toModelExplorerWorkspace(validation.value)
    return buildReadyState(mode, workspace, validation.issues)
  } catch (error) {
    if (error instanceof ModelExplorerTransportError) {
      return buildErrorState(mode, mapTransportErrorToUserMessage('Model Explorer', error))
    }

    const message = error instanceof Error ? error.message : 'Failed to load model explorer payload.'
    return buildErrorState(mode, message)
  }
}
