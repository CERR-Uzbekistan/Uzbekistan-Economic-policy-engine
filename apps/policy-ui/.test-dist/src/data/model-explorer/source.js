import { toModelExplorerWorkspace } from '../adapters/model-explorer.js';
import { validateRawModelExplorerPayload, } from '../adapters/model-explorer-guard.js';
import { modelExplorerWorkspaceMock } from '../mock/model-explorer.js';
import { fetchModelExplorerLiveRawPayload, ModelExplorerTransportError, } from './live-client.js';
function resolveModelExplorerDataMode() {
    const envMode = import.meta.env
        ?.VITE_MODEL_EXPLORER_DATA_MODE;
    const processMode = globalThis.process
        ?.env?.VITE_MODEL_EXPLORER_DATA_MODE;
    return envMode === 'live' || processMode === 'live' ? 'live' : 'mock';
}
function buildReadyState(mode, workspace, warnings = []) {
    return {
        status: 'ready',
        mode,
        workspace,
        error: null,
        canRetry: mode === 'live',
        warnings,
    };
}
function buildErrorState(mode, error, warnings = []) {
    return {
        status: 'error',
        mode,
        workspace: null,
        error,
        canRetry: true,
        warnings,
    };
}
export function getInitialModelExplorerSourceState() {
    return {
        status: 'loading',
        mode: resolveModelExplorerDataMode(),
        workspace: null,
        error: null,
        canRetry: false,
        warnings: [],
    };
}
function toTransportErrorMessage(error) {
    if (error.kind === 'http') {
        return `Model Explorer API returned an unsuccessful response${error.status ? ` (${error.status}).` : '.'}`;
    }
    if (error.kind === 'timeout') {
        return 'Model Explorer API request timed out. Please retry.';
    }
    return 'Model Explorer API is unreachable. Please check your connection and retry.';
}
export async function loadModelExplorerSourceState() {
    const mode = resolveModelExplorerDataMode();
    if (mode === 'mock') {
        return buildReadyState(mode, modelExplorerWorkspaceMock);
    }
    try {
        const rawPayload = await fetchModelExplorerLiveRawPayload();
        const validation = validateRawModelExplorerPayload(rawPayload);
        if (!validation.ok) {
            const firstError = validation.issues.find((issue) => issue.severity === 'error');
            return buildErrorState(mode, firstError?.message ?? 'Invalid model explorer payload.', validation.issues);
        }
        const workspace = toModelExplorerWorkspace(validation.value);
        return buildReadyState(mode, workspace, validation.issues);
    }
    catch (error) {
        if (error instanceof ModelExplorerTransportError) {
            return buildErrorState(mode, toTransportErrorMessage(error));
        }
        const message = error instanceof Error ? error.message : 'Failed to load model explorer payload.';
        return buildErrorState(mode, message);
    }
}
export async function retryModelExplorerSourceState() {
    return loadModelExplorerSourceState();
}
