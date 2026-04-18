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
