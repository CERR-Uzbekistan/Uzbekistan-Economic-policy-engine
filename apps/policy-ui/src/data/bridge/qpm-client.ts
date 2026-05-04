import { type QpmValidationIssue, validateQpmBridgePayload } from './qpm-guard.js'
import type { QpmBridgePayload } from './qpm-types.js'
import {
  BridgeFetchError,
  fetchBridgeJson,
  resolveBridgeTimeoutMs,
  type BridgeTransportErrorKind,
  type FetchLike,
} from './bridge-fetch.js'

const DEFAULT_QPM_TIMEOUT_MS = 10_000
const DEFAULT_QPM_DATA_PATH = 'data/qpm.json'

export type QpmTransportErrorKind = BridgeTransportErrorKind

export class QpmTransportError extends Error {
  kind: QpmTransportErrorKind
  status: number | null
  constructor(
    kind: QpmTransportErrorKind,
    message: string,
    options?: {
      status?: number | null
      cause?: unknown
    },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'QpmTransportError'
    this.kind = kind
    this.status = options?.status ?? null
  }
}

export class QpmValidationError extends Error {
  issues: QpmValidationIssue[]
  constructor(issues: QpmValidationIssue[]) {
    super('QPM bridge payload failed schema validation.')
    this.name = 'QpmValidationError'
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
    dataUrl: env?.VITE_QPM_DATA_URL,
    timeoutMs: env?.VITE_QPM_TIMEOUT_MS,
  }
}

function readProcessEnv(): {
  dataUrl?: string
  timeoutMs?: string
} {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return {
    dataUrl: env?.VITE_QPM_DATA_URL,
    timeoutMs: env?.VITE_QPM_TIMEOUT_MS,
  }
}

export function resolveQpmDataUrl(): string {
  const metaEnv = readImportMetaEnv()
  const processEnv = readProcessEnv()
  return metaEnv.dataUrl ?? processEnv.dataUrl ?? resolveQpmDefaultDataUrl(metaEnv.baseUrl)
}

export function resolveQpmDefaultDataUrl(baseUrl: string | undefined): string {
  const normalizedBase = baseUrl && baseUrl.trim() ? baseUrl : '/'
  return `${normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`}${DEFAULT_QPM_DATA_PATH}`
}

export function resolveQpmTimeoutMs(): number {
  const metaEnv = readImportMetaEnv()
  const processEnv = readProcessEnv()
  const rawTimeout = metaEnv.timeoutMs ?? processEnv.timeoutMs
  return resolveBridgeTimeoutMs(rawTimeout, DEFAULT_QPM_TIMEOUT_MS)
}

export async function fetchQpmBridgePayload(fetchImpl: FetchLike = fetch): Promise<QpmBridgePayload> {
  const timeoutMs = resolveQpmTimeoutMs()

  try {
    const rawPayload = await fetchBridgeJson({
      dataUrl: resolveQpmDataUrl(),
      timeoutMs,
      bridgeLabel: 'QPM',
      fetchImpl,
    })
    const validation = validateQpmBridgePayload(rawPayload)
    if (!validation.ok || !validation.value) {
      throw new QpmValidationError(validation.issues)
    }
    return validation.value
  } catch (error) {
    if (error instanceof QpmTransportError || error instanceof QpmValidationError) {
      throw error
    }

    if (error instanceof BridgeFetchError) {
      throw new QpmTransportError(error.kind, error.message, {
        status: error.status,
        cause: error,
      })
    }

    throw new QpmTransportError('network', 'QPM bridge request failed due to a network error.', {
      cause: error,
    })
  }
}
