import { fetchCgeBridgePayload } from '../bridge/cge-client.js'
import type { CgeBridgePayload } from '../bridge/cge-types.js'

export type ScenarioLabCgeState =
  | { status: 'loading'; payload: null; error: null }
  | { status: 'ready'; payload: CgeBridgePayload; error: null }
  | { status: 'error'; payload: null; error: string }

export function getInitialScenarioLabCgeState(): ScenarioLabCgeState {
  return { status: 'loading', payload: null, error: null }
}

export async function loadScenarioLabCgeState(): Promise<ScenarioLabCgeState> {
  try {
    return { status: 'ready', payload: await fetchCgeBridgePayload(), error: null }
  } catch (error) {
    return {
      status: 'error',
      payload: null,
      error: error instanceof Error ? error.message : 'CGE reference data is unavailable.',
    }
  }
}
