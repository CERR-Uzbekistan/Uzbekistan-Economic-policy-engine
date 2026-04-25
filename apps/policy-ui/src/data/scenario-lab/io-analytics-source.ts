import type { ScenarioLabIoAnalyticsWorkspace } from '../../contracts/data-contract.js'
import {
  runScenarioLabIoDemandShock,
  toScenarioLabIoAnalyticsWorkspace,
} from '../adapters/scenario-lab-io-analytics.js'
import type { IoBridgePayload } from '../bridge/io-types.js'
import { fetchIoBridgePayload } from '../bridge/io-client.js'

export type ScenarioLabIoAnalyticsState =
  | {
      status: 'loading'
      payload: null
      workspace: null
      error: null
    }
  | {
      status: 'ready'
      payload: IoBridgePayload
      workspace: ScenarioLabIoAnalyticsWorkspace
      error: null
    }
  | {
      status: 'error'
      payload: null
      workspace: null
      error: string
    }

export function getInitialScenarioLabIoAnalyticsState(): ScenarioLabIoAnalyticsState {
  return {
    status: 'loading',
    payload: null,
    workspace: null,
    error: null,
  }
}

export async function loadScenarioLabIoAnalyticsState(): Promise<ScenarioLabIoAnalyticsState> {
  try {
    const payload = await fetchIoBridgePayload()
    return {
      status: 'ready',
      payload,
      workspace: toScenarioLabIoAnalyticsWorkspace(payload),
      error: null,
    }
  } catch (error) {
    return {
      status: 'error',
      payload: null,
      workspace: null,
      error: error instanceof Error ? error.message : 'I-O analytics data is unavailable.',
    }
  }
}

export { runScenarioLabIoDemandShock }
