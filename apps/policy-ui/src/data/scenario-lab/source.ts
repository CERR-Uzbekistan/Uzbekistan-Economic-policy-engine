import type {
  ScenarioLabAssumptionState,
  ScenarioLabResultsBundle,
  ScenarioLabWorkspace,
} from '../../contracts/data-contract'
import {
  toScenarioLabData,
} from '../adapters/scenario-lab.js'
import {
  validateRawScenarioLabPayload,
  type ScenarioLabValidationIssue,
} from '../adapters/scenario-lab-guard.js'
import {
  buildScenarioLabResults,
  scenarioLabWorkspaceMock,
} from '../mock/scenario-lab.js'
import {
  createErrorSourceCore,
  createLoadingSourceCore,
  createReadySourceCore,
  mapTransportErrorToUserMessage,
  reportGuardWarningsDevOnly,
  type IntegrationSourceCore,
} from '../source-state.js'
import {
  fetchScenarioLabLiveRawPayload,
  ScenarioLabTransportError,
  type ScenarioLabRunRequest,
} from './live-client.js'

export type ScenarioLabDataMode = 'mock' | 'live'

export type ScenarioLabSourceState = IntegrationSourceCore<ScenarioLabDataMode, ScenarioLabValidationIssue> & {
  workspace: ScenarioLabWorkspace | null
  results: ScenarioLabResultsBundle | null
}

function resolveScenarioLabDataMode(): ScenarioLabDataMode {
  const envMode = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_SCENARIO_LAB_DATA_MODE
  const processMode = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env?.VITE_SCENARIO_LAB_DATA_MODE
  return envMode === 'live' || processMode === 'live' ? 'live' : 'mock'
}

function buildReadyState(
  mode: ScenarioLabDataMode,
  workspace: ScenarioLabWorkspace,
  results: ScenarioLabResultsBundle,
  warnings: ScenarioLabValidationIssue[] = [],
): ScenarioLabSourceState {
  return {
    ...createReadySourceCore<ScenarioLabDataMode, ScenarioLabValidationIssue>(mode, warnings),
    workspace,
    results,
  }
}

function buildErrorState(
  mode: ScenarioLabDataMode,
  error: string,
  warnings: ScenarioLabValidationIssue[] = [],
): ScenarioLabSourceState {
  return {
    ...createErrorSourceCore<ScenarioLabDataMode, ScenarioLabValidationIssue>(mode, error, warnings),
    workspace: null,
    results: null,
  }
}

export function getInitialScenarioLabSourceState(): ScenarioLabSourceState {
  const mode = resolveScenarioLabDataMode()
  return {
    ...createLoadingSourceCore<ScenarioLabDataMode, ScenarioLabValidationIssue>(mode),
    workspace: null,
    results: null,
  }
}

function toRunRequest(
  assumptions: ScenarioLabAssumptionState,
  selectedPresetId: string,
  scenarioName: string,
): ScenarioLabRunRequest {
  return {
    assumptions,
    selectedPresetId,
    scenarioName,
  }
}

export async function loadScenarioLabSourceState(params: {
  assumptions: ScenarioLabAssumptionState
  selectedPresetId: string
  scenarioName: string
}): Promise<ScenarioLabSourceState> {
  const mode = resolveScenarioLabDataMode()

  if (mode === 'mock') {
    return buildReadyState(mode, scenarioLabWorkspaceMock, buildScenarioLabResults(params.assumptions))
  }

  try {
    const rawPayload = await fetchScenarioLabLiveRawPayload(
      toRunRequest(params.assumptions, params.selectedPresetId, params.scenarioName),
    )
    const validation = validateRawScenarioLabPayload(rawPayload)
    reportGuardWarningsDevOnly('Scenario Lab', validation.issues)
    if (!validation.ok) {
      const firstError = validation.issues.find((issue) => issue.severity === 'error')
      return buildErrorState(mode, firstError?.message ?? 'Invalid Scenario Lab payload.', validation.issues)
    }

    const adapted = toScenarioLabData(validation.value)
    return buildReadyState(mode, adapted.workspace, adapted.results, validation.issues)
  } catch (error) {
    if (error instanceof ScenarioLabTransportError) {
      return buildErrorState(mode, mapTransportErrorToUserMessage('Scenario Lab', error))
    }

    const message = error instanceof Error ? error.message : 'Failed to run Scenario Lab payload.'
    return buildErrorState(mode, message)
  }
}
