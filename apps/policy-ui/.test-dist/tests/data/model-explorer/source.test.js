import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { loadModelExplorerSourceState } from '../../../src/data/model-explorer/source.js';
import { modelExplorerLiveRawMock } from '../../../src/data/raw/model-explorer-live.js';
const originalFetch = globalThis.fetch;
const originalMode = process.env.VITE_MODEL_EXPLORER_DATA_MODE;
afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalMode === undefined) {
        delete process.env.VITE_MODEL_EXPLORER_DATA_MODE;
    }
    else {
        process.env.VITE_MODEL_EXPLORER_DATA_MODE = originalMode;
    }
});
describe('model explorer source live integration flow', () => {
    it('maps transport and payload outcomes into UI-safe source states', async () => {
        process.env.VITE_MODEL_EXPLORER_DATA_MODE = 'live';
        const calls = [];
        const queuedResponses = [
            () => Promise.resolve(new Response(JSON.stringify(modelExplorerLiveRawMock), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })),
            () => Promise.resolve(new Response('', { status: 503 })),
            () => Promise.reject(new TypeError('Failed to fetch')),
            () => Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
        ];
        globalThis.fetch = ((input) => {
            calls.push(String(input));
            const next = queuedResponses.shift();
            if (!next) {
                return Promise.reject(new Error('No queued fetch response'));
            }
            return next();
        });
        const readyState = await loadModelExplorerSourceState();
        assert.equal(readyState.status, 'ready');
        assert.equal(readyState.mode, 'live');
        assert.equal(readyState.workspace?.workspace_id, modelExplorerLiveRawMock.workspaceId);
        const httpErrorState = await loadModelExplorerSourceState();
        assert.equal(httpErrorState.status, 'error');
        assert.equal(httpErrorState.canRetry, true);
        assert.equal(httpErrorState.error, 'Model Explorer API returned an unsuccessful response (503).');
        const networkErrorState = await loadModelExplorerSourceState();
        assert.equal(networkErrorState.status, 'error');
        assert.equal(networkErrorState.error, 'Model Explorer API is unreachable. Please check your connection and retry.');
        const timeoutState = await loadModelExplorerSourceState();
        assert.equal(timeoutState.status, 'error');
        assert.equal(timeoutState.error, 'Model Explorer API request timed out. Please retry.');
        assert.equal(calls.length, 4);
    });
});
