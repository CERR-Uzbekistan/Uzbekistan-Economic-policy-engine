import { type QpmValidationIssue, validateQpmBridgePayload } from './qpm-guard.js'
import type { QpmBridgePayload } from './qpm-types.js'

const DEFAULT_QPM_TIMEOUT_MS = 10_000
const DEFAULT_QPM_DATA_URL = '/data/qpm.json'

export type QpmTransportErrorKind = 'http' | 'timeout' | 'network'

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

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function readImportMetaEnv(): {
  dataUrl?: string
  timeoutMs?: string
} {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return {
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
  return metaEnv.dataUrl ?? processEnv.dataUrl ?? DEFAULT_QPM_DATA_URL
}

export function resolveQpmTimeoutMs(): number {
  const metaEnv = readImportMetaEnv()
  const processEnv = readProcessEnv()
  const rawTimeout = metaEnv.timeoutMs ?? processEnv.timeoutMs
  const parsed = Number(rawTimeout)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_QPM_TIMEOUT_MS
  }
  return parsed
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }
  return error instanceof Error && error.name === 'AbortError'
}

export async function fetchQpmBridgePayload(fetchImpl: FetchLike = fetch): Promise<QpmBridgePayload> {
  const controller = new AbortController()
  const timeoutMs = resolveQpmTimeoutMs()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(resolveQpmDataUrl(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new QpmTransportError('http', `QPM bridge request failed with HTTP ${response.status}.`, {
        status: response.status,
      })
    }

    const rawPayload = await response.json()
    const validation = validateQpmBridgePayload(rawPayload)
    if (!validation.ok || !validation.value) {
      throw new QpmValidationError(validation.issues)
    }
    return validation.value
  } catch (error) {
    if (error instanceof QpmTransportError || error instanceof QpmValidationError) {
      throw error
    }

    if (isAbortError(error)) {
      throw new QpmTransportError('timeout', `QPM bridge request timed out after ${timeoutMs}ms.`, {
        cause: error,
      })
    }

    throw new QpmTransportError('network', 'QPM bridge request failed due to a network error.', {
      cause: error,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
