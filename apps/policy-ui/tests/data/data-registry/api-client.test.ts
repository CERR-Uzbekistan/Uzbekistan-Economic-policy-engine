import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { resolveRegistryApiUrl } from '../../../src/data/data-registry/api-client.js'

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

  it('falls back to the same-origin registry path when no API URL is configured', () => {
    delete process.env.VITE_REGISTRY_API_URL

    assert.equal(resolveRegistryApiUrl(), '/api/v1/registry/artifacts')
  })
})
