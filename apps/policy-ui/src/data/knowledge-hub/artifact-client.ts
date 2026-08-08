import {
  BridgeFetchError,
  resolveBridgeTimeoutMs,
  type BridgeTransportErrorKind,
  type FetchLike,
} from '../bridge/bridge-fetch.js'
import {
  validateKnowledgeHubArtifact,
  type KnowledgeHubArtifactValidationIssue,
} from './artifact-guard.js'
import {
  KNOWLEDGE_HUB_ARTIFACT_SCHEMA_VERSION,
  type KnowledgeHubArtifact,
} from './artifact-types.js'

const DEFAULT_KNOWLEDGE_HUB_ARTIFACT_TIMEOUT_MS = 8_000
const DEFAULT_KNOWLEDGE_HUB_ARTIFACT_PATH = 'data/knowledge-hub.json'

export type KnowledgeHubArtifactTransportErrorKind = BridgeTransportErrorKind

export class KnowledgeHubArtifactTransportError extends Error {
  kind: KnowledgeHubArtifactTransportErrorKind
  status: number | null

  constructor(
    kind: KnowledgeHubArtifactTransportErrorKind,
    message: string,
    options?: { status?: number | null; cause?: unknown },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'KnowledgeHubArtifactTransportError'
    this.kind = kind
    this.status = options?.status ?? null
  }
}

export class KnowledgeHubArtifactValidationError extends Error {
  issues: KnowledgeHubArtifactValidationIssue[]

  constructor(issues: KnowledgeHubArtifactValidationIssue[]) {
    super('Knowledge Hub artifact failed schema validation.')
    this.name = 'KnowledgeHubArtifactValidationError'
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
    dataUrl: env?.VITE_KNOWLEDGE_HUB_ARTIFACT_URL,
    timeoutMs: env?.VITE_KNOWLEDGE_HUB_ARTIFACT_TIMEOUT_MS,
  }
}

function readProcessEnv(): {
  dataUrl?: string
  timeoutMs?: string
} {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return {
    dataUrl: env?.VITE_KNOWLEDGE_HUB_ARTIFACT_URL,
    timeoutMs: env?.VITE_KNOWLEDGE_HUB_ARTIFACT_TIMEOUT_MS,
  }
}

export function resolveKnowledgeHubArtifactDefaultDataUrl(baseUrl: string | undefined): string {
  const normalizedBase = baseUrl && baseUrl.trim() ? baseUrl : '/'
  return `${normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`}${DEFAULT_KNOWLEDGE_HUB_ARTIFACT_PATH}`
}

export function resolveKnowledgeHubArtifactDataUrl(): string {
  const metaEnv = readImportMetaEnv()
  const processEnv = readProcessEnv()
  return metaEnv.dataUrl ?? processEnv.dataUrl ?? resolveKnowledgeHubArtifactDefaultDataUrl(metaEnv.baseUrl)
}

export function withKnowledgeHubArtifactCacheKey(dataUrl: string): string {
  const [baseAndQuery, hash] = dataUrl.split('#', 2)
  const separator = baseAndQuery.includes('?') ? '&' : '?'
  const schemaParam = `schema=${encodeURIComponent(KNOWLEDGE_HUB_ARTIFACT_SCHEMA_VERSION)}`
  return `${baseAndQuery}${separator}${schemaParam}${hash ? `#${hash}` : ''}`
}

export function resolveKnowledgeHubArtifactTimeoutMs(): number {
  const metaEnv = readImportMetaEnv()
  const processEnv = readProcessEnv()
  return resolveBridgeTimeoutMs(
    metaEnv.timeoutMs ?? processEnv.timeoutMs,
    DEFAULT_KNOWLEDGE_HUB_ARTIFACT_TIMEOUT_MS,
  )
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true
  return error instanceof Error && error.name === 'AbortError'
}

async function fetchKnowledgeHubArtifactJson(fetchImpl: FetchLike): Promise<unknown> {
  const timeoutMs = resolveKnowledgeHubArtifactTimeoutMs()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(withKnowledgeHubArtifactCacheKey(resolveKnowledgeHubArtifactDataUrl()), {
      method: 'GET',
      cache: 'no-cache',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new KnowledgeHubArtifactTransportError(
        'http',
        `Knowledge Hub artifact request failed with HTTP ${response.status}.`,
        { status: response.status },
      )
    }

    const contentType = response.headers.get('Content-Type') ?? ''
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new KnowledgeHubArtifactTransportError(
        'http',
        'Knowledge Hub artifact was not found as JSON.',
        { status: 404 },
      )
    }

    try {
      return await response.json()
    } catch {
      throw new KnowledgeHubArtifactValidationError([
        {
          path: '$',
          message: 'Knowledge Hub artifact response is not valid JSON.',
          severity: 'error',
        },
      ])
    }
  } catch (error) {
    if (
      error instanceof KnowledgeHubArtifactTransportError ||
      error instanceof KnowledgeHubArtifactValidationError
    ) {
      throw error
    }

    if (isAbortError(error)) {
      throw new KnowledgeHubArtifactTransportError(
        'timeout',
        `Knowledge Hub artifact request timed out after ${timeoutMs}ms.`,
        { cause: error },
      )
    }

    throw new KnowledgeHubArtifactTransportError(
      'network',
      'Knowledge Hub artifact request failed due to a network error.',
      { cause: error },
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function fetchKnowledgeHubArtifact(fetchImpl: FetchLike = fetch): Promise<KnowledgeHubArtifact> {
  try {
    const rawPayload = await fetchKnowledgeHubArtifactJson(fetchImpl)
    const validation = validateKnowledgeHubArtifact(rawPayload)
    if (!validation.ok) {
      throw new KnowledgeHubArtifactValidationError(validation.issues)
    }
    return validation.value
  } catch (error) {
    if (
      error instanceof KnowledgeHubArtifactTransportError ||
      error instanceof KnowledgeHubArtifactValidationError
    ) {
      throw error
    }

    if (error instanceof BridgeFetchError) {
      throw new KnowledgeHubArtifactTransportError(error.kind, error.message, {
        status: error.status,
        cause: error,
      })
    }

    throw new KnowledgeHubArtifactTransportError(
      'network',
      'Knowledge Hub artifact request failed due to a network error.',
      { cause: error },
    )
  }
}
