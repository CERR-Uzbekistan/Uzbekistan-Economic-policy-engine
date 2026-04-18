import { toMacroSnapshot } from '../adapters/overview.js';
import { validateRawOverviewPayload } from '../adapters/overview-guard.js';
import { overviewV1Data } from '../mock/overview.js';
import { fetchOverviewLiveRawPayload, OverviewTransportError } from './live-client.js';
function resolveOverviewDataMode() {
    const envMode = import.meta.env
        ?.VITE_OVERVIEW_DATA_MODE;
    const processMode = globalThis.process
        ?.env?.VITE_OVERVIEW_DATA_MODE;
    return envMode === 'live' || processMode === 'live' ? 'live' : 'mock';
}
export function getOverviewDataMode() {
    return resolveOverviewDataMode();
}
function buildReadyState(mode, snapshot, warnings = []) {
    return {
        status: 'ready',
        mode,
        snapshot,
        error: null,
        canRetry: mode === 'live',
        warnings,
    };
}
function buildErrorState(mode, error, warnings = []) {
    return {
        status: 'error',
        mode,
        snapshot: null,
        error,
        canRetry: true,
        warnings,
    };
}
export function getInitialOverviewSourceState() {
    return {
        status: 'loading',
        mode: resolveOverviewDataMode(),
        snapshot: null,
        error: null,
        canRetry: false,
        warnings: [],
    };
}
async function getRawOverviewPayload() {
    return fetchOverviewLiveRawPayload();
}
function toTransportErrorMessage(error) {
    if (error.kind === 'http') {
        return `Overview API returned an unsuccessful response${error.status ? ` (${error.status}).` : '.'}`;
    }
    if (error.kind === 'timeout') {
        return 'Overview API request timed out. Please retry.';
    }
    return 'Overview API is unreachable. Please check your connection and retry.';
}
export async function loadOverviewSourceState() {
    const mode = resolveOverviewDataMode();
    if (mode === 'mock') {
        return buildReadyState(mode, overviewV1Data);
    }
    try {
        const rawPayload = await getRawOverviewPayload();
        const validation = validateRawOverviewPayload(rawPayload);
        if (!validation.ok) {
            const firstError = validation.issues.find((issue) => issue.severity === 'error');
            return buildErrorState(mode, firstError?.message ?? 'Invalid overview payload.', validation.issues);
        }
        const snapshot = toMacroSnapshot(validation.value);
        return buildReadyState(mode, snapshot, validation.issues);
    }
    catch (error) {
        if (error instanceof OverviewTransportError) {
            return buildErrorState(mode, toTransportErrorMessage(error));
        }
        const message = error instanceof Error ? error.message : 'Failed to load overview payload.';
        return buildErrorState(mode, message);
    }
}
export async function retryOverviewSourceState() {
    return loadOverviewSourceState();
}
