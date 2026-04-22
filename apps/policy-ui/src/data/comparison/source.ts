import type { ComparisonWorkspace } from '../../contracts/data-contract'
import { toComparisonWorkspaceFromQpm } from '../bridge/qpm-adapter.js'
import {
  fetchQpmBridgePayload,
  QpmTransportError,
  QpmValidationError,
} from '../bridge/qpm-client.js'
import type { QpmValidationIssue } from '../bridge/qpm-guard.js'
import type { QpmBridgePayload } from '../bridge/qpm-types.js'
import { comparisonWorkspaceMock } from '../mock/comparison.js'
import {
  createLoadingSourceCore,
  createReadySourceCore,
  type IntegrationSourceCore,
} from '../source-state.js'

export type ComparisonDataMode = 'mock' | 'live'

export type ComparisonSourceState = IntegrationSourceCore<ComparisonDataMode, QpmValidationIssue> & {
  workspace: ComparisonWorkspace | null
  qpmPayload: QpmBridgePayload | null
}

function resolveComparisonDataMode(): ComparisonDataMode {
  const envMode = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_COMPARISON_DATA_MODE
  const processMode = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env?.VITE_COMPARISON_DATA_MODE
  if (envMode === 'mock' || processMode === 'mock') {
    return 'mock'
  }
  return 'live'
}

function buildReadyState(
  mode: ComparisonDataMode,
  workspace: ComparisonWorkspace,
  qpmPayload: QpmBridgePayload | null = null,
  warnings: QpmValidationIssue[] = [],
): ComparisonSourceState {
  return {
    ...createReadySourceCore<ComparisonDataMode, QpmValidationIssue>(mode, warnings),
    workspace,
    qpmPayload,
  }
}

export function getInitialComparisonSourceState(): ComparisonSourceState {
  const mode = resolveComparisonDataMode()
  return {
    ...createLoadingSourceCore<ComparisonDataMode, QpmValidationIssue>(mode),
    workspace: null,
    qpmPayload: null,
  }
}

export async function loadComparisonSourceState(): Promise<ComparisonSourceState> {
  const mode = resolveComparisonDataMode()
  if (mode === 'mock') {
    return buildReadyState(mode, comparisonWorkspaceMock, null)
  }

  try {
    const qpmPayload = await fetchQpmBridgePayload()
    const workspace = toComparisonWorkspaceFromQpm(qpmPayload)
    return buildReadyState('live', workspace, qpmPayload, [])
  } catch (error) {
    if (error instanceof QpmValidationError) {
      console.warn('[Comparison] QPM bridge failed guard validation; using mock fallback.', error.issues)
      return buildReadyState('mock', comparisonWorkspaceMock, null, error.issues)
    }

    if (error instanceof QpmTransportError) {
      console.warn('[Comparison] QPM bridge request failed; using mock fallback.', {
        kind: error.kind,
        status: error.status,
        message: error.message,
      })
      return buildReadyState('mock', comparisonWorkspaceMock, null)
    }

    console.warn('[Comparison] QPM bridge failed unexpectedly; using mock fallback.', error)
    return buildReadyState('mock', comparisonWorkspaceMock, null)
  }
}
