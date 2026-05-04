import { type DfmValidationIssue, validateDfmBridgePayload } from './dfm-guard.js'
import type { DfmBridgePayload } from './dfm-types.js'
import {
  BridgeFetchError,
  fetchBridgeJson,
  resolveBridgeTimeoutMs,
  type BridgeTransportErrorKind,
  type FetchLike,
} from './bridge-fetch.js'

const DEFAULT_DFM_TIMEOUT_MS = 10_000
const DEFAULT_DFM_DATA_PATH = 'data/dfm.json'

export type DfmTransportErrorKind = BridgeTransportErrorKind

export class DfmTransportError extends Error {
  kind: DfmTransportErrorKind
  status: number | null
  constructor(
    kind: DfmTransportErrorKind,
    message: string,
    options?: {
      status?: number | null
      cause?: unknown
    },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'DfmTransportError'
    this.kind = kind
    this.status = options?.status ?? null
  }
}

export class DfmValidationError extends Error {
  issues: DfmValidationIssue[]
  constructor(issues: DfmValidationIssue[]) {
    super('DFM bridge payload failed schema validation.')
    this.name = 'DfmValidationError'
    this.issues = issues
  }
}

function readImportMetaEnv(): {
  baseUrl?: string
  dataUrl?: string
  timeoutMs?: string
} {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return {
    baseUrl: env?.BASE_URL,
    dataUrl: env?.VITE_DFM_DATA_URL,
    timeoutMs: env?.VITE_DFM_TIMEOUT_MS,
  }
}

function readProcessEnv(): {
  dataUrl?: string
  timeoutMs?: string
} {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return {
    dataUrl: env?.VITE_DFM_DATA_URL,
    timeoutMs: env?.VITE_DFM_TIMEOUT_MS,
  }
}

export function resolveDfmDataUrl(): string {
  const metaEnv = readImportMetaEnv()
  const processEnv = readProcessEnv()
  return metaEnv.dataUrl ?? processEnv.dataUrl ?? resolveDfmDefaultDataUrl(metaEnv.baseUrl)
}

export function resolveDfmDefaultDataUrl(baseUrl: string | undefined): string {
  const normalizedBase = baseUrl && baseUrl.trim() ? baseUrl : '/'
  return `${normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`}${DEFAULT_DFM_DATA_PATH}`
}

export function resolveDfmTimeoutMs(): number {
  const metaEnv = readImportMetaEnv()
  const processEnv = readProcessEnv()
  const rawTimeout = metaEnv.timeoutMs ?? processEnv.timeoutMs
  return resolveBridgeTimeoutMs(rawTimeout, DEFAULT_DFM_TIMEOUT_MS)
}

export async function fetchDfmBridgePayload(fetchImpl: FetchLike = fetch): Promise<DfmBridgePayload> {
  const timeoutMs = resolveDfmTimeoutMs()

  try {
    const rawPayload = await fetchBridgeJson({
      dataUrl: resolveDfmDataUrl(),
      timeoutMs,
      bridgeLabel: 'DFM',
      fetchImpl,
    })
    const validation = validateDfmBridgePayload(rawPayload)
    if (!validation.ok || !validation.value) {
      throw new DfmValidationError(validation.issues)
    }
    return validation.value
  } catch (error) {
    if (error instanceof DfmTransportError || error instanceof DfmValidationError) {
      throw error
    }

    if (error instanceof BridgeFetchError) {
      throw new DfmTransportError(error.kind, error.message, {
        status: error.status,
        cause: error,
      })
    }

    throw new DfmTransportError('network', 'DFM bridge request failed due to a network error.', {
      cause: error,
    })
  }
}
