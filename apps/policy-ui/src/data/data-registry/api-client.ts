import {
  BridgeFetchError,
  fetchBridgeJson,
  resolveBridgeTimeoutMs,
  type FetchLike,
} from '../bridge/bridge-fetch.js'
import type { ImplementedModelId, RegistryStatus } from './source.js'

const DEFAULT_REGISTRY_API_TIMEOUT_MS = 3_000

export type RegistryApiCaveat = {
  id: string | null
  severity: string
  message: string | null
  source: string | null
}

export type RegistryApiArtifact = {
  id: Exclude<ImplementedModelId, 'overview'>
  model_family: string
  artifact_path: string
  source_artifact: string | null
  source_vintage: string | null
  data_vintage: string | null
  exported_at: string | null
  generated_at: string | null
  checksum: string
  guard_status: Extract<RegistryStatus, 'valid' | 'warning' | 'failed'>
  guard_checks: string[]
  caveats: RegistryApiCaveat[]
  warnings: RegistryApiCaveat[]
}

export type RegistryApiResponse = {
  api_version: 'v1'
  source: 'frontend_public_artifacts'
  artifacts: RegistryApiArtifact[]
}

export class RegistryApiError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause })
    this.name = 'RegistryApiError'
  }
}

function readImportMetaEnv(): {
  apiUrl?: string
  timeoutMs?: string
} {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return {
    apiUrl: env?.VITE_REGISTRY_API_URL,
    timeoutMs: env?.VITE_REGISTRY_API_TIMEOUT_MS,
  }
}

function readProcessEnv(): {
  apiUrl?: string
  timeoutMs?: string
} {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return {
    apiUrl: env?.VITE_REGISTRY_API_URL,
    timeoutMs: env?.VITE_REGISTRY_API_TIMEOUT_MS,
  }
}

export function resolveRegistryApiUrl(): string | null {
  const metaEnv = readImportMetaEnv()
  const processEnv = readProcessEnv()
  const configuredUrl = metaEnv.apiUrl ?? processEnv.apiUrl
  return configuredUrl && configuredUrl.trim() !== '' ? configuredUrl : null
}

export function isRegistryApiEnabled(): boolean {
  return resolveRegistryApiUrl() !== null
}

export function resolveRegistryApiTimeoutMs(): number {
  const metaEnv = readImportMetaEnv()
  const processEnv = readProcessEnv()
  return resolveBridgeTimeoutMs(
    metaEnv.timeoutMs ?? processEnv.timeoutMs,
    DEFAULT_REGISTRY_API_TIMEOUT_MS,
  )
}

export async function fetchRegistryApiMetadata(
  fetchImpl: FetchLike = fetch,
): Promise<RegistryApiResponse> {
  const registryApiUrl = resolveRegistryApiUrl()
  if (registryApiUrl === null) {
    throw new RegistryApiError('Registry API mode is not enabled.')
  }

  try {
    const rawPayload = await fetchBridgeJson({
      dataUrl: registryApiUrl,
      timeoutMs: resolveRegistryApiTimeoutMs(),
      bridgeLabel: 'Registry API',
      fetchImpl,
    })
    return validateRegistryApiResponse(rawPayload)
  } catch (error) {
    if (error instanceof RegistryApiError) throw error
    if (error instanceof BridgeFetchError) {
      throw new RegistryApiError(error.message, { cause: error })
    }
    throw new RegistryApiError('Registry API metadata could not be loaded.', { cause: error })
  }
}

export function validateRegistryApiResponse(payload: unknown): RegistryApiResponse {
  if (!isRecord(payload)) {
    throw new RegistryApiError('Registry API response must be an object.')
  }

  if (payload.api_version !== 'v1' || payload.source !== 'frontend_public_artifacts') {
    throw new RegistryApiError('Registry API response has an unsupported version or source.')
  }

  if (!Array.isArray(payload.artifacts)) {
    throw new RegistryApiError('Registry API response must include an artifacts array.')
  }

  const artifacts = payload.artifacts.map(validateArtifact)
  const ids = new Set(artifacts.map((artifact) => artifact.id))
  for (const requiredId of ['qpm', 'dfm', 'io'] as const) {
    if (!ids.has(requiredId)) {
      throw new RegistryApiError(`Registry API response is missing ${requiredId} metadata.`)
    }
  }

  return {
    api_version: 'v1',
    source: 'frontend_public_artifacts',
    artifacts,
  }
}

function validateArtifact(value: unknown): RegistryApiArtifact {
  if (!isRecord(value)) {
    throw new RegistryApiError('Registry API artifact must be an object.')
  }

  const id = value.id
  if (id !== 'qpm' && id !== 'dfm' && id !== 'io') {
    throw new RegistryApiError('Registry API artifact has an unsupported id.')
  }

  const guardStatus = value.guard_status
  if (guardStatus !== 'valid' && guardStatus !== 'warning' && guardStatus !== 'failed') {
    throw new RegistryApiError(`Registry API artifact ${id} has an unsupported guard status.`)
  }

  return {
    id,
    model_family: requireString(value.model_family, `${id}.model_family`),
    artifact_path: requireString(value.artifact_path, `${id}.artifact_path`),
    source_artifact: optionalString(value.source_artifact, `${id}.source_artifact`),
    source_vintage: optionalString(value.source_vintage, `${id}.source_vintage`),
    data_vintage: optionalString(value.data_vintage, `${id}.data_vintage`),
    exported_at: optionalString(value.exported_at, `${id}.exported_at`),
    generated_at: optionalString(value.generated_at, `${id}.generated_at`),
    checksum: requireString(value.checksum, `${id}.checksum`),
    guard_status: guardStatus,
    guard_checks: requireStringArray(value.guard_checks, `${id}.guard_checks`),
    caveats: requireCaveats(value.caveats, `${id}.caveats`),
    warnings: requireCaveats(value.warnings, `${id}.warnings`),
  }
}

function requireCaveats(value: unknown, path: string): RegistryApiCaveat[] {
  if (!Array.isArray(value)) {
    throw new RegistryApiError(`Registry API ${path} must be an array.`)
  }
  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new RegistryApiError(`Registry API ${path}[${index}] must be an object.`)
    }
    return {
      id: optionalString(item.id, `${path}[${index}].id`),
      severity: requireString(item.severity, `${path}[${index}].severity`),
      message: optionalString(item.message, `${path}[${index}].message`),
      source: optionalString(item.source, `${path}[${index}].source`),
    }
  })
}

function requireStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new RegistryApiError(`Registry API ${path} must be a string array.`)
  }
  return value
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RegistryApiError(`Registry API ${path} must be a non-empty string.`)
  }
  return value
}

function optionalString(value: unknown, path: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') {
    throw new RegistryApiError(`Registry API ${path} must be a string or null.`)
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
