export type BridgeTransportErrorKind = 'http' | 'timeout' | 'network'

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export class BridgeFetchError extends Error {
  kind: BridgeTransportErrorKind
  status: number | null

  constructor(
    kind: BridgeTransportErrorKind,
    message: string,
    options?: {
      status?: number | null
      cause?: unknown
    },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'BridgeFetchError'
    this.kind = kind
    this.status = options?.status ?? null
  }
}

export function resolveBridgeTimeoutMs(rawTimeout: string | undefined, defaultTimeoutMs: number): number {
  const parsed = Number(rawTimeout)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultTimeoutMs
  }
  return parsed
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true
  return error instanceof Error && error.name === 'AbortError'
}

export async function fetchBridgeJson(options: {
  dataUrl: string
  timeoutMs: number
  bridgeLabel: string
  fetchImpl?: FetchLike
}): Promise<unknown> {
  const { dataUrl, timeoutMs, bridgeLabel, fetchImpl = fetch } = options
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(dataUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new BridgeFetchError('http', `${bridgeLabel} bridge request failed with HTTP ${response.status}.`, {
        status: response.status,
      })
    }

    return await response.json()
  } catch (error) {
    if (error instanceof BridgeFetchError) throw error

    if (isAbortError(error)) {
      throw new BridgeFetchError('timeout', `${bridgeLabel} bridge request timed out after ${timeoutMs}ms.`, {
        cause: error,
      })
    }

    throw new BridgeFetchError('network', `${bridgeLabel} bridge request failed due to a network error.`, {
      cause: error,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
