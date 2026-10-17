const USER_AGENT = 'Uzbekistan-Economic-Policy-Engine/overview-source-automation (+manual-review)'

function assertAllowedUrl(url) {
  const parsed = new URL(url)
  const allowed = parsed.protocol === 'https:' && !parsed.username && !parsed.password &&
    !parsed.port && !parsed.search && !parsed.hash && (
      (parsed.hostname === 'stat.uz' && /^\/img\/news\/[^/]+\.pdf$/.test(parsed.pathname)) ||
      (parsed.hostname === 'cbu.uz' && /^\/en\/press_center\/releases\/\d+\/$/.test(parsed.pathname))
    )
  if (!allowed) throw new Error(`Unsupported reviewed official source URL: ${url}`)
}

/** Keep the deadline active until the complete source body has arrived. */
export async function fetchReviewedSource(url, {
  fetchImpl = globalThis.fetch,
  timeoutMs = 45_000,
  retries = 2,
  backoffMs = 1_000,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
} = {}) {
  assertAllowedUrl(url)
  if (!Number.isInteger(retries) || retries < 0 || retries > 2 ||
      !Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 45_000 ||
      !Number.isFinite(backoffMs) || backoffMs < 0 || backoffMs > 1_000) {
    throw new Error('Invalid bounded reviewed-source retry configuration')
  }
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    const controller = new AbortController()
    let timer
    try {
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(`Reviewed source download exceeded ${timeoutMs}ms`)
          error.name = 'TimeoutError'
          controller.abort(error)
          reject(error)
        }, timeoutMs)
      })
      const download = (async () => {
        const response = await fetchImpl(url, {
          headers: { Accept: 'application/pdf,text/html', 'User-Agent': USER_AGENT, 'Cache-Control': 'no-cache' },
          redirect: 'error',
          signal: controller.signal,
        })
        if (response.redirected || (response.url && response.url !== url)) {
          const error = new Error('Reviewed source response changed its approved URL')
          error.retryable = false
          throw error
        }
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status} for reviewed official source`)
          error.retryable = response.status === 408 || response.status === 429 || response.status >= 500
          throw error
        }
        return Buffer.from(await response.arrayBuffer())
      })()
      const body = await Promise.race([download, deadline])
      return { body, acquisition: { attempts: attempt, timeout_ms: timeoutMs } }
    } catch (error) {
      if (error.retryable === false || attempt > retries) {
        throw new Error(`Failed to download ${url} after ${attempt} attempt(s): ${error.message}`, { cause: error })
      }
    } finally {
      clearTimeout(timer)
      controller.abort()
    }
    await sleep(backoffMs * 2 ** (attempt - 1))
  }
}
