import {
  BridgeFetchError,
  fetchBridgeJson,
  resolveBridgeTimeoutMs,
  type BridgeTransportErrorKind,
  type FetchLike,
} from './bridge-fetch.js'
import { type PeValidationIssue, validatePeBridgePayload } from './pe-guard.js'
import type { PeBridgePayload } from './pe-types.js'

const DEFAULT_PE_TIMEOUT_MS = 10_000
const DEFAULT_PE_DATA_PATH = 'data/pe.json'

export type PeTransportErrorKind = BridgeTransportErrorKind

export class PeTransportError extends Error {
  kind: PeTransportErrorKind
  status: number | null

  constructor(
    kind: PeTransportErrorKind,
    message: string,
    options?: {
      status?: number | null
      cause?: unknown
    },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'PeTransportError'
    this.kind = kind
    this.status = options?.status ?? null
  }
}

export class PeValidationError extends Error {
  issues: PeValidationIssue[]

  constructor(issues: PeValidationIssue[]) {
    super('PE bridge payload failed schema validation.')
    this.name = 'PeValidationError'
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
    dataUrl: env?.VITE_PE_DATA_URL,
    timeoutMs: env?.VITE_PE_TIMEOUT_MS,
  }
}

function readProcessEnv(): {
  dataUrl?: string
  timeoutMs?: string
} {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return {
    dataUrl: env?.VITE_PE_DATA_URL,
    timeoutMs: env?.VITE_PE_TIMEOUT_MS,
  }
}

export function resolvePeDefaultDataUrl(baseUrl: string | undefined): string {
  const normalizedBase = baseUrl && baseUrl.trim() ? baseUrl : '/'
  return `${normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`}${DEFAULT_PE_DATA_PATH}`
}

export function resolvePeDataUrl(): string {
  const metaEnv = readImportMetaEnv()
  const processEnv = readProcessEnv()
  return metaEnv.dataUrl ?? processEnv.dataUrl ?? resolvePeDefaultDataUrl(metaEnv.baseUrl)
}

export function resolvePeTimeoutMs(): number {
  const metaEnv = readImportMetaEnv()
  const processEnv = readProcessEnv()
  const rawTimeout = metaEnv.timeoutMs ?? processEnv.timeoutMs
  return resolveBridgeTimeoutMs(rawTimeout, DEFAULT_PE_TIMEOUT_MS)
}

export async function fetchPeBridgePayload(fetchImpl: FetchLike = fetch): Promise<PeBridgePayload> {
  const timeoutMs = resolvePeTimeoutMs()

  try {
    const rawPayload = await fetchBridgeJson({
      dataUrl: resolvePeDataUrl(),
      timeoutMs,
      bridgeLabel: 'PE',
      fetchImpl,
    })
    const validation = validatePeBridgePayload(rawPayload)
    if (!validation.ok || !validation.value) {
      throw new PeValidationError(validation.issues)
    }
    return validation.value
  } catch (error) {
    if (error instanceof PeTransportError || error instanceof PeValidationError) throw error

    if (error instanceof BridgeFetchError) {
      throw new PeTransportError(error.kind, error.message, {
        status: error.status,
        cause: error,
      })
    }

    throw new PeTransportError('network', 'PE bridge request failed due to a network error.', {
      cause: error,
    })
  }
}
