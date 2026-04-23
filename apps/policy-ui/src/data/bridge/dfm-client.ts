import { type DfmValidationIssue, validateDfmBridgePayload } from './dfm-guard.js'
import type { DfmBridgePayload } from './dfm-types.js'

const DEFAULT_DFM_TIMEOUT_MS = 10_000
const DEFAULT_DFM_DATA_URL = '/data/dfm.json'

export type DfmTransportErrorKind = 'http' | 'timeout' | 'network'

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

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function readImportMetaEnv(): {
  dataUrl?: string
  timeoutMs?: string
} {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return {
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
  return metaEnv.dataUrl ?? processEnv.dataUrl ?? DEFAULT_DFM_DATA_URL
}

export function resolveDfmTimeoutMs(): number {
  const metaEnv = readImportMetaEnv()
  const processEnv = readProcessEnv()
  const rawTimeout = metaEnv.timeoutMs ?? processEnv.timeoutMs
  const parsed = Number(rawTimeout)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_DFM_TIMEOUT_MS
  }
  return parsed
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }
  return error instanceof Error && error.name === 'AbortError'
}

export async function fetchDfmBridgePayload(fetchImpl: FetchLike = fetch): Promise<DfmBridgePayload> {
  const controller = new AbortController()
  const timeoutMs = resolveDfmTimeoutMs()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(resolveDfmDataUrl(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new DfmTransportError('http', `DFM bridge request failed with HTTP ${response.status}.`, {
        status: response.status,
      })
    }

    const rawPayload = await response.json()
    const validation = validateDfmBridgePayload(rawPayload)
    if (!validation.ok || !validation.value) {
      throw new DfmValidationError(validation.issues)
    }
    return validation.value
  } catch (error) {
    if (error instanceof DfmTransportError || error instanceof DfmValidationError) {
      throw error
    }

    if (isAbortError(error)) {
      throw new DfmTransportError('timeout', `DFM bridge request timed out after ${timeoutMs}ms.`, {
        cause: error,
      })
    }

    throw new DfmTransportError('network', 'DFM bridge request failed due to a network error.', {
      cause: error,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
