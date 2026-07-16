import {
  BridgeFetchError,
  fetchBridgeJson,
  resolveBridgeTimeoutMs,
  type FetchLike,
} from './bridge-fetch.js'
import { validateCgeBridgePayload, type CgeValidationIssue } from './cge-guard.js'
import type { CgeBridgePayload } from './cge-types.js'

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_DATA_PATH = 'data/cge.json'

export class CgeValidationError extends Error {
  issues: CgeValidationIssue[]
  constructor(issues: CgeValidationIssue[]) {
    super('CGE reference artifact failed validation.')
    this.name = 'CgeValidationError'
    this.issues = issues
  }
}

export function resolveCgeDefaultDataUrl(baseUrl: string | undefined): string {
  const base = baseUrl?.trim() || '/'
  return `${base.endsWith('/') ? base : `${base}/`}${DEFAULT_DATA_PATH}`
}

function env() {
  const meta = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return {
    baseUrl: meta?.BASE_URL,
    dataUrl: meta?.VITE_CGE_DATA_URL ?? processEnv?.VITE_CGE_DATA_URL,
    timeout: meta?.VITE_CGE_TIMEOUT_MS ?? processEnv?.VITE_CGE_TIMEOUT_MS,
  }
}

export async function fetchCgeBridgePayload(fetchImpl: FetchLike = fetch): Promise<CgeBridgePayload> {
  const settings = env()
  try {
    const raw = await fetchBridgeJson({
      dataUrl: settings.dataUrl ?? resolveCgeDefaultDataUrl(settings.baseUrl),
      timeoutMs: resolveBridgeTimeoutMs(settings.timeout, DEFAULT_TIMEOUT_MS),
      bridgeLabel: 'CGE',
      fetchImpl,
    })
    const validation = validateCgeBridgePayload(raw)
    if (!validation.ok || !validation.value) throw new CgeValidationError(validation.issues)
    return validation.value
  } catch (error) {
    if (error instanceof CgeValidationError || error instanceof BridgeFetchError) throw error
    throw new Error('CGE reference artifact request failed.', { cause: error })
  }
}
