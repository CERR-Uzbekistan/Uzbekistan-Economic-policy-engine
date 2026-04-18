import type { ComparisonWorkspace } from '../../contracts/data-contract'
import { toComparisonWorkspace } from '../adapters/comparison.js'
import {
  validateRawComparisonPayload,
  type ComparisonValidationIssue,
} from '../adapters/comparison-guard.js'
import { comparisonWorkspaceMock } from '../mock/comparison.js'
import {
  createErrorSourceCore,
  createLoadingSourceCore,
  createReadySourceCore,
  mapTransportErrorToUserMessage,
  reportGuardWarningsDevOnly,
  type IntegrationSourceCore,
} from '../source-state.js'
import {
  ComparisonTransportError,
  fetchComparisonLiveRawPayload,
} from './live-client.js'

export type ComparisonDataMode = 'mock' | 'live'

export type ComparisonSourceState = IntegrationSourceCore<ComparisonDataMode, ComparisonValidationIssue> & {
  workspace: ComparisonWorkspace | null
}

function resolveComparisonDataMode(): ComparisonDataMode {
  const envMode = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_COMPARISON_DATA_MODE
  const processMode = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env?.VITE_COMPARISON_DATA_MODE
  return envMode === 'live' || processMode === 'live' ? 'live' : 'mock'
}

function buildReadyState(
  mode: ComparisonDataMode,
  workspace: ComparisonWorkspace,
  warnings: ComparisonValidationIssue[] = [],
): ComparisonSourceState {
  return {
    ...createReadySourceCore<ComparisonDataMode, ComparisonValidationIssue>(mode, warnings),
    workspace,
  }
}

function buildErrorState(
  mode: ComparisonDataMode,
  error: string,
  warnings: ComparisonValidationIssue[] = [],
): ComparisonSourceState {
  return {
    ...createErrorSourceCore<ComparisonDataMode, ComparisonValidationIssue>(mode, error, warnings),
    workspace: null,
  }
}

export function getInitialComparisonSourceState(): ComparisonSourceState {
  const mode = resolveComparisonDataMode()
  return {
    ...createLoadingSourceCore<ComparisonDataMode, ComparisonValidationIssue>(mode),
    workspace: null,
  }
}

export async function loadComparisonSourceState(): Promise<ComparisonSourceState> {
  const mode = resolveComparisonDataMode()
  if (mode === 'mock') {
    return buildReadyState(mode, comparisonWorkspaceMock)
  }

  try {
    const rawPayload = await fetchComparisonLiveRawPayload()
    const validation = validateRawComparisonPayload(rawPayload)
    reportGuardWarningsDevOnly('Comparison', validation.issues)
    if (!validation.ok) {
      const firstError = validation.issues.find((issue) => issue.severity === 'error')
      return buildErrorState(mode, firstError?.message ?? 'Invalid comparison payload.', validation.issues)
    }

    const workspace = toComparisonWorkspace(validation.value)
    if (!workspace) {
      return buildErrorState(
        mode,
        'Comparison payload contained fewer than two usable scenarios.',
        validation.issues,
      )
    }
    return buildReadyState(mode, workspace, validation.issues)
  } catch (error) {
    if (error instanceof ComparisonTransportError) {
      return buildErrorState(mode, mapTransportErrorToUserMessage('Comparison', error))
    }

    const message = error instanceof Error ? error.message : 'Failed to load comparison payload.'
    return buildErrorState(mode, message)
  }
}
