import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  fetchRegistryApiMetadata,
  isRegistryApiEnabled,
  RegistryApiError,
  resolveRegistryApiUrl,
} from '../../../src/data/data-registry/api-client.js'

const ORIGINAL_REGISTRY_API_URL = process.env.VITE_REGISTRY_API_URL

afterEach(() => {
  if (ORIGINAL_REGISTRY_API_URL === undefined) {
    delete process.env.VITE_REGISTRY_API_URL
  } else {
    process.env.VITE_REGISTRY_API_URL = ORIGINAL_REGISTRY_API_URL
  }
})

describe('registry API client', () => {
  it('uses VITE_REGISTRY_API_URL when set', () => {
    process.env.VITE_REGISTRY_API_URL = 'http://127.0.0.1:8000/api/v1/registry/artifacts'

    assert.equal(
      resolveRegistryApiUrl(),
      'http://127.0.0.1:8000/api/v1/registry/artifacts',
    )
  })

  it('returns null when no API URL is configured', () => {
    delete process.env.VITE_REGISTRY_API_URL

    assert.equal(resolveRegistryApiUrl(), null)
  })

  it('treats empty API URL values as disabled', () => {
    process.env.VITE_REGISTRY_API_URL = '   '

    assert.equal(resolveRegistryApiUrl(), null)
    assert.equal(isRegistryApiEnabled(), false)
  })

  it('reports API mode disabled without invoking fetch', async () => {
    delete process.env.VITE_REGISTRY_API_URL
    const calls: Array<RequestInfo | URL> = []
    const fetchImpl = ((input: RequestInfo | URL) => {
      calls.push(input)
      return Promise.resolve(new Response('{}'))
    }) as typeof fetch

    await assert.rejects(
      fetchRegistryApiMetadata(fetchImpl),
      (error: unknown) =>
        error instanceof RegistryApiError &&
        error.message === 'Registry API mode is not enabled.',
    )

    assert.equal(isRegistryApiEnabled(), false)
    assert.deepEqual(calls, [])
  })
})
