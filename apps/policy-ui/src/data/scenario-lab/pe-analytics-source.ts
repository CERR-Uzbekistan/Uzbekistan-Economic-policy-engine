import type { ScenarioLabPeAnalyticsWorkspace } from '../../contracts/data-contract.js'
import {
  runScenarioLabPeTradeShock,
  toScenarioLabPeAnalyticsWorkspace,
} from '../bridge/pe-adapter.js'
import { fetchPeBridgePayload } from '../bridge/pe-client.js'
import type { PeBridgePayload } from '../bridge/pe-types.js'

export type ScenarioLabPeAnalyticsState =
  | {
      status: 'loading'
      payload: null
      workspace: null
      error: null
    }
  | {
      status: 'ready'
      payload: PeBridgePayload
      workspace: ScenarioLabPeAnalyticsWorkspace
      error: null
    }
  | {
      status: 'error'
      payload: null
      workspace: null
      error: string
    }

export function getInitialScenarioLabPeAnalyticsState(): ScenarioLabPeAnalyticsState {
  return {
    status: 'loading',
    payload: null,
    workspace: null,
    error: null,
  }
}

export async function loadScenarioLabPeAnalyticsState(): Promise<ScenarioLabPeAnalyticsState> {
  try {
    const payload = await fetchPeBridgePayload()
    return {
      status: 'ready',
      payload,
      workspace: toScenarioLabPeAnalyticsWorkspace(payload),
      error: null,
    }
  } catch (error) {
    return {
      status: 'error',
      payload: null,
      workspace: null,
      error: error instanceof Error ? error.message : 'PE trade analytics data is unavailable.',
    }
  }
}

export { runScenarioLabPeTradeShock }
