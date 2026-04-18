const DEFAULT_OVERVIEW_TIMEOUT_MS = 8_000
const DEFAULT_OVERVIEW_API_URL = '/api/overview'

export type OverviewTransportErrorKind = 'http' | 'timeout' | 'network'

export class OverviewTransportError extends Error {
  kind: OverviewTransportErrorKind
  status: number | null
  constructor(
    kind: OverviewTransportErrorKind,
    message: string,
    options?: {
      status?: number | null
      cause?: unknown
    },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'OverviewTransportError'
    this.kind = kind
    this.status = options?.status ?? null
  }
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function readImportMetaOverviewEnv(): {
  mode?: string
  apiUrl?: string
  timeoutMs?: string
} {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return {
    mode: env?.VITE_OVERVIEW_DATA_MODE,
    apiUrl: env?.VITE_OVERVIEW_API_URL,
    timeoutMs: env?.VITE_OVERVIEW_TIMEOUT_MS,
  }
}

function readProcessOverviewEnv(): {
  mode?: string
  apiUrl?: string
  timeoutMs?: string
} {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return {
    mode: env?.VITE_OVERVIEW_DATA_MODE,
    apiUrl: env?.VITE_OVERVIEW_API_URL,
    timeoutMs: env?.VITE_OVERVIEW_TIMEOUT_MS,
  }
}

export function resolveOverviewApiUrl(): string {
  const metaEnv = readImportMetaOverviewEnv()
  const processEnv = readProcessOverviewEnv()
  return metaEnv.apiUrl ?? processEnv.apiUrl ?? DEFAULT_OVERVIEW_API_URL
}

export function resolveOverviewTimeoutMs(): number {
  const metaEnv = readImportMetaOverviewEnv()
  const processEnv = readProcessOverviewEnv()
  const rawTimeout = metaEnv.timeoutMs ?? processEnv.timeoutMs
  const parsed = Number(rawTimeout)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_OVERVIEW_TIMEOUT_MS
  }
  return parsed
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }
  return error instanceof Error && error.name === 'AbortError'
}

export async function fetchOverviewLiveRawPayload(fetchImpl: FetchLike = fetch): Promise<unknown> {
  const controller = new AbortController()
  const timeoutMs = resolveOverviewTimeoutMs()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(resolveOverviewApiUrl(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new OverviewTransportError(
        'http',
        `Overview request failed with HTTP ${response.status}.`,
        { status: response.status },
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof OverviewTransportError) {
      throw error
    }

    if (isAbortError(error)) {
      throw new OverviewTransportError('timeout', `Overview request timed out after ${timeoutMs}ms.`, {
        cause: error,
      })
    }

    throw new OverviewTransportError('network', 'Overview request failed due to a network error.', {
      cause: error,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
