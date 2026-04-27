import type { MacroSnapshot } from '../../contracts/data-contract'
import {
  createErrorSourceCore,
  createLoadingSourceCore,
  createReadySourceCore,
  mapTransportErrorToUserMessage,
  reportGuardWarningsDevOnly,
  type IntegrationSourceCore,
} from '../source-state.js'
import { toMacroSnapshot } from '../adapters/overview.js'
import { validateRawOverviewPayload, type OverviewValidationIssue } from '../adapters/overview-guard.js'
import { overviewV1Data } from '../mock/overview.js'
import { fetchOverviewLiveRawPayload, OverviewTransportError } from './live-client.js'
import { overviewArtifactToMacroSnapshot } from './artifact-adapter.js'
import {
  fetchOverviewArtifact,
  OverviewArtifactTransportError,
  OverviewArtifactValidationError,
} from './artifact-client.js'
import type { OverviewArtifactValidationIssue } from './artifact-guard.js'

export type OverviewDataMode = 'mock' | 'live' | 'artifact'
export type OverviewSourceKind = 'static-fallback' | 'legacy-live-api' | 'overview-artifact'

export type OverviewSourceIssue = OverviewValidationIssue | OverviewArtifactValidationIssue

export type OverviewSourceState = IntegrationSourceCore<OverviewDataMode, OverviewSourceIssue> & {
  snapshot: MacroSnapshot | null
  sourceKind: OverviewSourceKind
  fallbackReason: 'missing' | 'invalid' | null
}

function resolveOverviewDataMode(): OverviewDataMode {
  const envMode = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_OVERVIEW_DATA_MODE
  const processMode = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env?.VITE_OVERVIEW_DATA_MODE
  const mode = envMode ?? processMode
  if (mode === 'live') return 'live'
  if (mode === 'mock') return 'mock'
  return 'artifact'
}

function buildReadyState(
  mode: OverviewDataMode,
  snapshot: MacroSnapshot,
  warnings: OverviewSourceIssue[] = [],
  sourceKind: OverviewSourceKind,
  fallbackReason: OverviewSourceState['fallbackReason'] = null,
): OverviewSourceState {
  return {
    ...createReadySourceCore<OverviewDataMode, OverviewSourceIssue>(mode, warnings),
    snapshot,
    sourceKind,
    fallbackReason,
  }
}

function buildErrorState(
  mode: OverviewDataMode,
  error: string,
  warnings: OverviewSourceIssue[] = [],
): OverviewSourceState {
  return {
    ...createErrorSourceCore<OverviewDataMode, OverviewSourceIssue>(mode, error, warnings),
    snapshot: null,
    sourceKind: mode === 'live' ? 'legacy-live-api' : 'static-fallback',
    fallbackReason: null,
  }
}

export function getInitialOverviewSourceState(): OverviewSourceState {
  const mode = resolveOverviewDataMode()
  return {
    ...createLoadingSourceCore<OverviewDataMode, OverviewSourceIssue>(mode),
    snapshot: null,
    sourceKind: mode === 'live' ? 'legacy-live-api' : 'overview-artifact',
    fallbackReason: null,
  }
}

async function getRawOverviewPayload(): Promise<unknown> {
  return fetchOverviewLiveRawPayload()
}

export async function loadOverviewSourceState(): Promise<OverviewSourceState> {
  const mode = resolveOverviewDataMode()
  if (mode === 'mock') {
    return buildReadyState(mode, overviewV1Data, [], 'static-fallback')
  }

  if (mode === 'artifact') {
    try {
      const artifact = await fetchOverviewArtifact()
      const snapshot = overviewArtifactToMacroSnapshot(artifact)
      return buildReadyState(mode, snapshot, [], 'overview-artifact')
    } catch (error) {
      if (error instanceof OverviewArtifactTransportError) {
        const fallbackReason = error.kind === 'http' && error.status === 404 ? 'missing' : 'invalid'
        return buildReadyState(mode, overviewV1Data, [], 'static-fallback', fallbackReason)
      }

      if (error instanceof OverviewArtifactValidationError) {
        return buildReadyState(mode, overviewV1Data, error.issues, 'static-fallback', 'invalid')
      }

      return buildReadyState(mode, overviewV1Data, [], 'static-fallback', 'invalid')
    }
  }

  try {
    const rawPayload = await getRawOverviewPayload()
    const validation = validateRawOverviewPayload(rawPayload)
    reportGuardWarningsDevOnly('Overview', validation.issues)
    if (!validation.ok) {
      const firstError = validation.issues.find((issue) => issue.severity === 'error')
      return buildErrorState(mode, firstError?.message ?? 'Invalid overview payload.', validation.issues)
    }

    const snapshot = toMacroSnapshot(validation.value)
    return buildReadyState(mode, snapshot, validation.issues, 'legacy-live-api')
  } catch (error) {
    if (error instanceof OverviewTransportError) {
      return buildErrorState(mode, mapTransportErrorToUserMessage('Overview', error))
    }

    const message = error instanceof Error ? error.message : 'Failed to load overview payload.'
    return buildErrorState(mode, message)
  }
}
