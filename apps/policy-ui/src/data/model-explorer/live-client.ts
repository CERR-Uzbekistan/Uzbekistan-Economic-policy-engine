const DEFAULT_MODEL_EXPLORER_TIMEOUT_MS = 8_000
const DEFAULT_MODEL_EXPLORER_API_URL = '/api/model-explorer'

export type ModelExplorerTransportErrorKind = 'http' | 'timeout' | 'network'

export class ModelExplorerTransportError extends Error {
  kind: ModelExplorerTransportErrorKind
  status: number | null
  constructor(
    kind: ModelExplorerTransportErrorKind,
    message: string,
    options?: {
      status?: number | null
      cause?: unknown
    },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'ModelExplorerTransportError'
    this.kind = kind
    this.status = options?.status ?? null
  }
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function readImportMetaModelExplorerEnv(): {
  apiUrl?: string
  timeoutMs?: string
} {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return {
    apiUrl: env?.VITE_MODEL_EXPLORER_API_URL,
    timeoutMs: env?.VITE_MODEL_EXPLORER_TIMEOUT_MS,
  }
}

function readProcessModelExplorerEnv(): {
  apiUrl?: string
  timeoutMs?: string
} {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return {
    apiUrl: env?.VITE_MODEL_EXPLORER_API_URL,
    timeoutMs: env?.VITE_MODEL_EXPLORER_TIMEOUT_MS,
  }
}

export function resolveModelExplorerApiUrl(): string {
  const metaEnv = readImportMetaModelExplorerEnv()
  const processEnv = readProcessModelExplorerEnv()
  return metaEnv.apiUrl ?? processEnv.apiUrl ?? DEFAULT_MODEL_EXPLORER_API_URL
}

export function resolveModelExplorerTimeoutMs(): number {
  const metaEnv = readImportMetaModelExplorerEnv()
  const processEnv = readProcessModelExplorerEnv()
  const rawTimeout = metaEnv.timeoutMs ?? processEnv.timeoutMs
  const parsed = Number(rawTimeout)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MODEL_EXPLORER_TIMEOUT_MS
  }
  return parsed
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }
  return error instanceof Error && error.name === 'AbortError'
}

export async function fetchModelExplorerLiveRawPayload(fetchImpl: FetchLike = fetch): Promise<unknown> {
  const controller = new AbortController()
  const timeoutMs = resolveModelExplorerTimeoutMs()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(resolveModelExplorerApiUrl(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new ModelExplorerTransportError(
        'http',
        `Model Explorer request failed with HTTP ${response.status}.`,
        { status: response.status },
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ModelExplorerTransportError) {
      throw error
    }

    if (isAbortError(error)) {
      throw new ModelExplorerTransportError(
        'timeout',
        `Model Explorer request timed out after ${timeoutMs}ms.`,
        { cause: error },
      )
    }

    throw new ModelExplorerTransportError('network', 'Model Explorer request failed due to a network error.', {
      cause: error,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
