import type { ScenarioLabAssumptionState } from '../../contracts/data-contract'

const DEFAULT_SCENARIO_LAB_TIMEOUT_MS = 12_000
const DEFAULT_SCENARIO_LAB_API_URL = '/api/scenario-lab/run'

export type ScenarioLabTransportErrorKind = 'http' | 'timeout' | 'network'

export class ScenarioLabTransportError extends Error {
  kind: ScenarioLabTransportErrorKind
  status: number | null
  constructor(
    kind: ScenarioLabTransportErrorKind,
    message: string,
    options?: {
      status?: number | null
      cause?: unknown
    },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'ScenarioLabTransportError'
    this.kind = kind
    this.status = options?.status ?? null
  }
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type ScenarioLabRunRequest = {
  scenarioName: string
  selectedPresetId: string
  assumptions: ScenarioLabAssumptionState
}

function readImportMetaScenarioLabEnv(): {
  apiUrl?: string
  timeoutMs?: string
} {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return {
    apiUrl: env?.VITE_SCENARIO_LAB_API_URL,
    timeoutMs: env?.VITE_SCENARIO_LAB_TIMEOUT_MS,
  }
}

function readProcessScenarioLabEnv(): {
  apiUrl?: string
  timeoutMs?: string
} {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return {
    apiUrl: env?.VITE_SCENARIO_LAB_API_URL,
    timeoutMs: env?.VITE_SCENARIO_LAB_TIMEOUT_MS,
  }
}

export function resolveScenarioLabApiUrl(): string {
  const metaEnv = readImportMetaScenarioLabEnv()
  const processEnv = readProcessScenarioLabEnv()
  return metaEnv.apiUrl ?? processEnv.apiUrl ?? DEFAULT_SCENARIO_LAB_API_URL
}

export function resolveScenarioLabTimeoutMs(): number {
  const metaEnv = readImportMetaScenarioLabEnv()
  const processEnv = readProcessScenarioLabEnv()
  const rawTimeout = metaEnv.timeoutMs ?? processEnv.timeoutMs
  const parsed = Number(rawTimeout)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SCENARIO_LAB_TIMEOUT_MS
  }
  return parsed
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }
  return error instanceof Error && error.name === 'AbortError'
}

export async function fetchScenarioLabLiveRawPayload(
  request: ScenarioLabRunRequest,
  fetchImpl: FetchLike = fetch,
): Promise<unknown> {
  const controller = new AbortController()
  const timeoutMs = resolveScenarioLabTimeoutMs()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(resolveScenarioLabApiUrl(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new ScenarioLabTransportError(
        'http',
        `Scenario Lab request failed with HTTP ${response.status}.`,
        { status: response.status },
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ScenarioLabTransportError) {
      throw error
    }

    if (isAbortError(error)) {
      throw new ScenarioLabTransportError(
        'timeout',
        `Scenario Lab request timed out after ${timeoutMs}ms.`,
        { cause: error },
      )
    }

    throw new ScenarioLabTransportError('network', 'Scenario Lab request failed due to a network error.', {
      cause: error,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
