export type IntegrationSourceStatus = 'loading' | 'ready' | 'error'

export type IntegrationSourceCore<TMode extends string, TWarning> = {
  status: IntegrationSourceStatus
  mode: TMode
  error: string | null
  canRetry: boolean
  warnings: TWarning[]
}

export type IntegrationTransportErrorLike = {
  kind: 'http' | 'timeout' | 'network'
  status: number | null
}

export type IntegrationValidationIssue = {
  path: string
  message: string
  severity: 'error' | 'warning'
}

// Pre-integration policy: keep guard warnings internal (dev-only) until a shared UX surface is needed.
const GUARD_WARNING_SURFACE = 'dev-only' as const

export function resolveSourceRetryCapability(
  status: IntegrationSourceStatus,
  mode: 'mock' | 'live',
): boolean {
  if (status === 'loading') {
    return false
  }
  if (status === 'ready') {
    return mode === 'live'
  }
  return true
}

export function createLoadingSourceCore<TMode extends 'mock' | 'live', TWarning>(
  mode: TMode,
): IntegrationSourceCore<TMode, TWarning> {
  return {
    status: 'loading',
    mode,
    error: null,
    canRetry: resolveSourceRetryCapability('loading', mode),
    warnings: [],
  }
}

export function createReadySourceCore<TMode extends 'mock' | 'live', TWarning>(
  mode: TMode,
  warnings: TWarning[] = [],
): IntegrationSourceCore<TMode, TWarning> {
  return {
    status: 'ready',
    mode,
    error: null,
    canRetry: resolveSourceRetryCapability('ready', mode),
    warnings,
  }
}

export function createErrorSourceCore<TMode extends 'mock' | 'live', TWarning>(
  mode: TMode,
  error: string,
  warnings: TWarning[] = [],
): IntegrationSourceCore<TMode, TWarning> {
  return {
    status: 'error',
    mode,
    error,
    canRetry: resolveSourceRetryCapability('error', mode),
    warnings,
  }
}

export function beginRetry<TState extends { status: IntegrationSourceStatus; error: string | null }>(
  previousState: TState,
): TState {
  return { ...previousState, status: 'loading', error: null }
}

export function mapTransportErrorToUserMessage(
  sourceLabel: string,
  error: IntegrationTransportErrorLike,
): string {
  if (error.kind === 'http') {
    return `${sourceLabel} API returned an unsuccessful response${error.status ? ` (${error.status}).` : '.'}`
  }
  if (error.kind === 'timeout') {
    return `${sourceLabel} API request timed out. Please retry.`
  }
  return `${sourceLabel} API is unreachable. Please check your connection and retry.`
}

function isDevelopmentEnvironment(): boolean {
  const importMetaEnv = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env
  if (typeof importMetaEnv?.DEV === 'boolean') {
    return importMetaEnv.DEV
  }

  const processEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
  return processEnv?.NODE_ENV !== 'production'
}

export function reportGuardWarningsDevOnly(
  sourceLabel: string,
  issues: IntegrationValidationIssue[],
): void {
  if (GUARD_WARNING_SURFACE !== 'dev-only') {
    return
  }

  if (!isDevelopmentEnvironment()) {
    return
  }

  const warningIssues = issues.filter((issue) => issue.severity === 'warning')
  if (warningIssues.length === 0) {
    return
  }

  const warningSummary = warningIssues
    .map((issue) => `${issue.path}: ${issue.message}`)
    .join(' | ')

  console.warn(`[${sourceLabel}] Guard warnings (${warningIssues.length}): ${warningSummary}`)
}
