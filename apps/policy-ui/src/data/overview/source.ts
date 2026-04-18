import type { MacroSnapshot } from '../../contracts/data-contract'
import {
  mapTransportErrorToUserMessage,
  reportGuardWarningsDevOnly,
  resolveSourceRetryCapability,
  type IntegrationSourceCore,
  type IntegrationSourceStatus,
} from '../source-state.js'
import { toMacroSnapshot } from '../adapters/overview.js'
import { validateRawOverviewPayload, type OverviewValidationIssue } from '../adapters/overview-guard.js'
import { overviewV1Data } from '../mock/overview.js'
import { fetchOverviewLiveRawPayload, OverviewTransportError } from './live-client.js'

export type OverviewDataMode = 'mock' | 'live'
export type OverviewSourceStatus = IntegrationSourceStatus

export type OverviewSourceState = IntegrationSourceCore<OverviewDataMode, OverviewValidationIssue> & {
  snapshot: MacroSnapshot | null
}

function resolveOverviewDataMode(): OverviewDataMode {
  const envMode = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_OVERVIEW_DATA_MODE
  const processMode = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env?.VITE_OVERVIEW_DATA_MODE
  return envMode === 'live' || processMode === 'live' ? 'live' : 'mock'
}

export function getOverviewDataMode(): OverviewDataMode {
  return resolveOverviewDataMode()
}

function buildReadyState(
  mode: OverviewDataMode,
  snapshot: MacroSnapshot,
  warnings: OverviewValidationIssue[] = [],
): OverviewSourceState {
  return {
    status: 'ready',
    mode,
    snapshot,
    error: null,
    canRetry: resolveSourceRetryCapability('ready', mode),
    warnings,
  }
}

function buildErrorState(
  mode: OverviewDataMode,
  error: string,
  warnings: OverviewValidationIssue[] = [],
): OverviewSourceState {
  return {
    status: 'error',
    mode,
    snapshot: null,
    error,
    canRetry: resolveSourceRetryCapability('error', mode),
    warnings,
  }
}

export function getInitialOverviewSourceState(): OverviewSourceState {
  const mode = resolveOverviewDataMode()
  return {
    status: 'loading',
    mode,
    snapshot: null,
    error: null,
    canRetry: resolveSourceRetryCapability('loading', mode),
    warnings: [],
  }
}

async function getRawOverviewPayload(): Promise<unknown> {
  return fetchOverviewLiveRawPayload()
}

export async function loadOverviewSourceState(): Promise<OverviewSourceState> {
  const mode = resolveOverviewDataMode()
  if (mode === 'mock') {
    return buildReadyState(mode, overviewV1Data)
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
    return buildReadyState(mode, snapshot, validation.issues)
  } catch (error) {
    if (error instanceof OverviewTransportError) {
      return buildErrorState(mode, mapTransportErrorToUserMessage('Overview', error))
    }

    const message = error instanceof Error ? error.message : 'Failed to load overview payload.'
    return buildErrorState(mode, message)
  }
}

export async function retryOverviewSourceState(): Promise<OverviewSourceState> {
  return loadOverviewSourceState()
}
