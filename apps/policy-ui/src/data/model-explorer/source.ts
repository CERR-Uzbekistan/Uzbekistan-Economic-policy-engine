import type { ModelExplorerWorkspace } from '../../contracts/data-contract'
import {
  mapTransportErrorToUserMessage,
  reportGuardWarningsDevOnly,
  resolveSourceRetryCapability,
  type IntegrationSourceCore,
  type IntegrationSourceStatus,
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
export type ModelExplorerSourceStatus = IntegrationSourceStatus

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
    status: 'ready',
    mode,
    workspace,
    error: null,
    canRetry: resolveSourceRetryCapability('ready', mode),
    warnings,
  }
}

function buildErrorState(
  mode: ModelExplorerDataMode,
  error: string,
  warnings: ModelExplorerValidationIssue[] = [],
): ModelExplorerSourceState {
  return {
    status: 'error',
    mode,
    workspace: null,
    error,
    canRetry: resolveSourceRetryCapability('error', mode),
    warnings,
  }
}

export function getInitialModelExplorerSourceState(): ModelExplorerSourceState {
  const mode = resolveModelExplorerDataMode()
  return {
    status: 'loading',
    mode,
    workspace: null,
    error: null,
    canRetry: resolveSourceRetryCapability('loading', mode),
    warnings: [],
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

export async function retryModelExplorerSourceState(): Promise<ModelExplorerSourceState> {
  return loadModelExplorerSourceState()
}
