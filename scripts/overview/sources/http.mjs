const DEFAULT_USER_AGENT = 'Uzbekistan-Economic-Policy-Engine/overview-source-automation (+manual-review)'
const CBU_USD_PATH_PATTERN = /^\/en\/arkhiv-kursov-valyut\/json\/USD\/\d{4}-\d{2}-\d{2}\/$/
const SIAT_SDMX_DATA_PATH_PATTERN = /^\/media\/uploads\/sdmx\/sdmx_data_\d+\.json$/
const hostQueues = new Map()

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function withHostLimit(url, task) {
  const host = new URL(url).host
  const current = hostQueues.get(host) ?? Promise.resolve()
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  hostQueues.set(host, current.then(() => gate))

  await current
  try {
    return await task()
  } finally {
    release()
    if (hostQueues.get(host) === gate) hostQueues.delete(host)
  }
}

export function assertAllowedOverviewSourceUrl(url) {
  const parsed = new URL(url)
  const allowedCbuUrl = parsed.host === 'cbu.uz' && CBU_USD_PATH_PATTERN.test(parsed.pathname)
  const allowedSiatUrl = parsed.host === 'api.siat.stat.uz' && SIAT_SDMX_DATA_PATH_PATTERN.test(parsed.pathname)
  if (!allowedCbuUrl && !allowedSiatUrl) {
    throw new Error(`Refusing to request unsupported Overview source URL: ${url}`)
  }
}

export async function fetchJsonWithRetry(url, options = {}) {
  assertAllowedOverviewSourceUrl(url)
  const {
    fetchImpl = globalThis.fetch,
    retries = 2,
    timeoutMs = 10_000,
    userAgent = DEFAULT_USER_AGENT,
    backoffMs = 250,
  } = options

  if (typeof fetchImpl !== 'function') throw new Error('No fetch implementation is available.')

  return withHostLimit(url, async () => {
    let lastError
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await fetchImpl(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': userAgent,
          },
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`.trim())
        return await response.json()
      } catch (error) {
        lastError = error
        if (attempt === retries) break
        await sleep(backoffMs * 2 ** attempt)
      } finally {
        clearTimeout(timeout)
      }
    }

    throw new Error(`Failed to fetch ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
  })
}
