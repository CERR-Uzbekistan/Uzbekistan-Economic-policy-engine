import {
  BridgeFetchError,
  resolveBridgeTimeoutMs,
  type BridgeTransportErrorKind,
  type FetchLike,
} from '../bridge/bridge-fetch.js'
import { validateOverviewArtifact, type OverviewArtifactValidationIssue } from './artifact-guard.js'
import type { OverviewArtifact } from './artifact-types.js'

const DEFAULT_OVERVIEW_ARTIFACT_TIMEOUT_MS = 8_000
const DEFAULT_OVERVIEW_ARTIFACT_PATH = 'data/overview.json'

export type OverviewArtifactTransportErrorKind = BridgeTransportErrorKind

export class OverviewArtifactTransportError extends Error {
  kind: OverviewArtifactTransportErrorKind
  status: number | null

  constructor(
    kind: OverviewArtifactTransportErrorKind,
    message: string,
    options?: { status?: number | null; cause?: unknown },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'OverviewArtifactTransportError'
    this.kind = kind
    this.status = options?.status ?? null
  }
}

export class OverviewArtifactValidationError extends Error {
  issues: OverviewArtifactValidationIssue[]

  constructor(issues: OverviewArtifactValidationIssue[]) {
    super('Overview artifact failed schema validation.')
    this.name = 'OverviewArtifactValidationError'
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
    dataUrl: env?.VITE_OVERVIEW_ARTIFACT_URL,
    timeoutMs: env?.VITE_OVERVIEW_ARTIFACT_TIMEOUT_MS,
  }
}

function readProcessEnv(): {
  dataUrl?: string
  timeoutMs?: string
} {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return {
    dataUrl: env?.VITE_OVERVIEW_ARTIFACT_URL,
    timeoutMs: env?.VITE_OVERVIEW_ARTIFACT_TIMEOUT_MS,
  }
}

export function resolveOverviewArtifactDefaultDataUrl(baseUrl: string | undefined): string {
  const normalizedBase = baseUrl && baseUrl.trim() ? baseUrl : '/'
  return `${normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`}${DEFAULT_OVERVIEW_ARTIFACT_PATH}`
}

export function resolveOverviewArtifactDataUrl(): string {
  const metaEnv = readImportMetaEnv()
  const processEnv = readProcessEnv()
  return metaEnv.dataUrl ?? processEnv.dataUrl ?? resolveOverviewArtifactDefaultDataUrl(metaEnv.baseUrl)
}

export function resolveOverviewArtifactTimeoutMs(): number {
  const metaEnv = readImportMetaEnv()
  const processEnv = readProcessEnv()
  return resolveBridgeTimeoutMs(
    metaEnv.timeoutMs ?? processEnv.timeoutMs,
    DEFAULT_OVERVIEW_ARTIFACT_TIMEOUT_MS,
  )
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true
  return error instanceof Error && error.name === 'AbortError'
}

async function fetchOverviewArtifactJson(fetchImpl: FetchLike): Promise<unknown> {
  const timeoutMs = resolveOverviewArtifactTimeoutMs()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(resolveOverviewArtifactDataUrl(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new OverviewArtifactTransportError(
        'http',
        `Overview artifact request failed with HTTP ${response.status}.`,
        { status: response.status },
      )
    }

    const contentType = response.headers.get('Content-Type') ?? ''
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new OverviewArtifactTransportError(
        'http',
        'Overview artifact was not found as JSON.',
        { status: 404 },
      )
    }

    try {
      return await response.json()
    } catch {
      throw new OverviewArtifactValidationError([
        {
          path: '$',
          message: 'Overview artifact response is not valid JSON.',
          severity: 'error',
        },
      ])
    }
  } catch (error) {
    if (
      error instanceof OverviewArtifactTransportError ||
      error instanceof OverviewArtifactValidationError
    ) {
      throw error
    }

    if (isAbortError(error)) {
      throw new OverviewArtifactTransportError(
        'timeout',
        `Overview artifact request timed out after ${timeoutMs}ms.`,
        { cause: error },
      )
    }

    throw new OverviewArtifactTransportError(
      'network',
      'Overview artifact request failed due to a network error.',
      { cause: error },
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function fetchOverviewArtifact(fetchImpl: FetchLike = fetch): Promise<OverviewArtifact> {
  try {
    const rawPayload = await fetchOverviewArtifactJson(fetchImpl)
    const validation = validateOverviewArtifact(rawPayload)
    if (!validation.ok) {
      throw new OverviewArtifactValidationError(validation.issues)
    }
    return validation.value
  } catch (error) {
    if (
      error instanceof OverviewArtifactTransportError ||
      error instanceof OverviewArtifactValidationError
    ) {
      throw error
    }

    if (error instanceof BridgeFetchError) {
      throw new OverviewArtifactTransportError(error.kind, error.message, {
        status: error.status,
        cause: error,
      })
    }

    throw new OverviewArtifactTransportError(
      'network',
      'Overview artifact request failed due to a network error.',
      { cause: error },
    )
  }
}
