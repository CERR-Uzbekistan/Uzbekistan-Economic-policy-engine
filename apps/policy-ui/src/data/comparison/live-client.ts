const DEFAULT_COMPARISON_TIMEOUT_MS = 10_000
const DEFAULT_COMPARISON_API_URL = '/api/comparison'

export type ComparisonTransportErrorKind = 'http' | 'timeout' | 'network'

export class ComparisonTransportError extends Error {
  kind: ComparisonTransportErrorKind
  status: number | null
  constructor(
    kind: ComparisonTransportErrorKind,
    message: string,
    options?: {
      status?: number | null
      cause?: unknown
    },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'ComparisonTransportError'
    this.kind = kind
    this.status = options?.status ?? null
  }
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function readImportMetaComparisonEnv(): {
  apiUrl?: string
  timeoutMs?: string
} {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return {
    apiUrl: env?.VITE_COMPARISON_API_URL,
    timeoutMs: env?.VITE_COMPARISON_TIMEOUT_MS,
  }
}

function readProcessComparisonEnv(): {
  apiUrl?: string
  timeoutMs?: string
} {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return {
    apiUrl: env?.VITE_COMPARISON_API_URL,
    timeoutMs: env?.VITE_COMPARISON_TIMEOUT_MS,
  }
}

export function resolveComparisonApiUrl(): string {
  const metaEnv = readImportMetaComparisonEnv()
  const processEnv = readProcessComparisonEnv()
  return metaEnv.apiUrl ?? processEnv.apiUrl ?? DEFAULT_COMPARISON_API_URL
}

export function resolveComparisonTimeoutMs(): number {
  const metaEnv = readImportMetaComparisonEnv()
  const processEnv = readProcessComparisonEnv()
  const rawTimeout = metaEnv.timeoutMs ?? processEnv.timeoutMs
  const parsed = Number(rawTimeout)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_COMPARISON_TIMEOUT_MS
  }
  return parsed
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }
  return error instanceof Error && error.name === 'AbortError'
}

export async function fetchComparisonLiveRawPayload(fetchImpl: FetchLike = fetch): Promise<unknown> {
  const controller = new AbortController()
  const timeoutMs = resolveComparisonTimeoutMs()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(resolveComparisonApiUrl(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new ComparisonTransportError(
        'http',
        `Comparison request failed with HTTP ${response.status}.`,
        { status: response.status },
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ComparisonTransportError) {
      throw error
    }

    if (isAbortError(error)) {
      throw new ComparisonTransportError('timeout', `Comparison request timed out after ${timeoutMs}ms.`, {
        cause: error,
      })
    }

    throw new ComparisonTransportError('network', 'Comparison request failed due to a network error.', {
      cause: error,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
