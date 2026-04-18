const DEFAULT_OVERVIEW_TIMEOUT_MS = 8_000;
const DEFAULT_OVERVIEW_API_URL = '/api/overview';
export class OverviewTransportError extends Error {
    kind;
    status;
    constructor(kind, message, options) {
        super(message, { cause: options?.cause });
        this.name = 'OverviewTransportError';
        this.kind = kind;
        this.status = options?.status ?? null;
    }
}
function readImportMetaOverviewEnv() {
    const env = import.meta.env;
    return {
        mode: env?.VITE_OVERVIEW_DATA_MODE,
        apiUrl: env?.VITE_OVERVIEW_API_URL,
        timeoutMs: env?.VITE_OVERVIEW_TIMEOUT_MS,
    };
}
function readProcessOverviewEnv() {
    const env = globalThis.process?.env;
    return {
        mode: env?.VITE_OVERVIEW_DATA_MODE,
        apiUrl: env?.VITE_OVERVIEW_API_URL,
        timeoutMs: env?.VITE_OVERVIEW_TIMEOUT_MS,
    };
}
export function resolveOverviewApiUrl() {
    const metaEnv = readImportMetaOverviewEnv();
    const processEnv = readProcessOverviewEnv();
    return metaEnv.apiUrl ?? processEnv.apiUrl ?? DEFAULT_OVERVIEW_API_URL;
}
export function resolveOverviewTimeoutMs() {
    const metaEnv = readImportMetaOverviewEnv();
    const processEnv = readProcessOverviewEnv();
    const rawTimeout = metaEnv.timeoutMs ?? processEnv.timeoutMs;
    const parsed = Number(rawTimeout);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_OVERVIEW_TIMEOUT_MS;
    }
    return parsed;
}
function isAbortError(error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
        return true;
    }
    return error instanceof Error && error.name === 'AbortError';
}
export async function fetchOverviewLiveRawPayload(fetchImpl = fetch) {
    const controller = new AbortController();
    const timeoutMs = resolveOverviewTimeoutMs();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchImpl(resolveOverviewApiUrl(), {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new OverviewTransportError('http', `Overview request failed with HTTP ${response.status}.`, { status: response.status });
        }
        return await response.json();
    }
    catch (error) {
        if (error instanceof OverviewTransportError) {
            throw error;
        }
        if (isAbortError(error)) {
            throw new OverviewTransportError('timeout', `Overview request timed out after ${timeoutMs}ms.`, {
                cause: error,
            });
        }
        throw new OverviewTransportError('network', 'Overview request failed due to a network error.', {
            cause: error,
        });
    }
    finally {
        clearTimeout(timeoutId);
    }
}
