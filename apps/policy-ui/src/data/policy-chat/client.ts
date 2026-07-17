import type { PolicyChatProposal, PolicyChatRun } from '../../contracts/policy-chat.js'

const DEFAULT_API_URL = 'http://127.0.0.1:8001/api/v1/policy-chat'
const DEFAULT_TIMEOUT_MS = 15_000

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export class PolicyChatApiError extends Error {
  code: string
  status: number | null

  constructor(message: string, code = 'request_failed', status: number | null = null) {
    super(message)
    this.name = 'PolicyChatApiError'
    this.code = code
    this.status = status
  }
}

function readEnv(): (ImportMetaEnv & { PROD?: boolean }) | undefined {
  return (import.meta as ImportMeta & { env?: ImportMetaEnv & { PROD?: boolean } }).env
}

function envValue(key: keyof ImportMetaEnv): string | undefined {
  return readEnv()?.[key]
}

export function isPolicyChatEnabled(): boolean {
  const configured = envValue('VITE_POLICY_CHAT_ENABLED')
  if (configured === 'true') return true
  if (configured === 'false') return false
  return !(readEnv()?.PROD ?? false)
}

export function resolvePolicyChatApiUrl(): string {
  return envValue('VITE_POLICY_CHAT_API_URL') ?? DEFAULT_API_URL
}

function resolveTimeout(): number {
  const parsed = Number(envValue('VITE_POLICY_CHAT_TIMEOUT_MS'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS
}

function developmentIdentityHeader(): Record<string, string> {
  if (readEnv()?.PROD) return {}
  return {
    'X-Policy-Chat-User': envValue('VITE_POLICY_CHAT_DEV_USER') ?? 'local-analyst',
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  fetchImpl: FetchLike = fetch,
): Promise<T> {
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), resolveTimeout())
  try {
    const response = await fetchImpl(`${resolvePolicyChatApiUrl()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...developmentIdentityHeader(),
        ...init.headers,
      },
      signal: controller.signal,
    })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { detail?: { code?: string; message?: string } }
        | null
      throw new PolicyChatApiError(
        payload?.detail?.message ?? `Policy Chat request failed with HTTP ${response.status}.`,
        payload?.detail?.code ?? 'request_failed',
        response.status,
      )
    }
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof PolicyChatApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new PolicyChatApiError('The model request timed out.', 'timeout')
    }
    throw new PolicyChatApiError('The Policy Chat service could not be reached.', 'network')
  } finally {
    globalThis.clearTimeout(timeout)
  }
}

export function proposePolicyChatRun(message: string, locale: string): Promise<PolicyChatProposal> {
  const supportedLocale = locale.startsWith('ru') ? 'ru' : locale.startsWith('uz') ? 'uz' : 'en'
  return requestJson('/proposals', {
    method: 'POST',
    body: JSON.stringify({
      message,
      locale: supportedLocale,
      client_turn_id: globalThis.crypto.randomUUID(),
    }),
  })
}

export function editPolicyChatProposal(
  proposalId: string,
  values: Record<string, number>,
): Promise<PolicyChatProposal> {
  return requestJson(`/proposals/${proposalId}`, {
    method: 'PATCH',
    body: JSON.stringify({ values }),
  })
}

export function executePolicyChatProposal(proposal: PolicyChatProposal): Promise<PolicyChatRun> {
  return requestJson(`/proposals/${proposal.proposal_id}/execute`, {
    method: 'POST',
    body: JSON.stringify({
      proposal_hash: proposal.proposal_hash,
      confirmation: true,
      client_request_id: `run-${proposal.proposal_id}-${proposal.proposal_hash.slice(-16)}`,
    }),
  })
}
