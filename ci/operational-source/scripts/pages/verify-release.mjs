import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { access, readFile, writeFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
export async function boundedFetch(url, { attempts = 3, timeout = 5000, fetcher = fetch } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(timeout), cache: 'no-store' })
      if (!response.ok) throw new Error(`http_${response.status}`)
      return Buffer.from(await response.arrayBuffer())
    } catch {
      console.error(`release-check attempt ${attempt}/${attempts}: unavailable or timeout`)
      if (attempt === attempts) throw new Error('hosting_unavailable_or_timeout')
      await new Promise(done => setTimeout(done, 250))
    }
  }
}
export async function verifyServed(base, identityBytes, fetcher = boundedFetch) {
  const identity = JSON.parse(identityBytes)
  const root = new URL('../', base)
  assert.equal(hash(await fetcher(new URL('release-identity.json', root))), hash(identityBytes), 'served_release_identity_mismatch')
  const manifestBytes = await fetcher(new URL('publication-manifest.json', root))
  assert.equal(hash(manifestBytes), identity.publication_manifest_sha256, 'served_manifest_mismatch')
  const manifest = JSON.parse(manifestBytes)
  for (const item of manifest.files) {
    const bytes = await fetcher(new URL(item.path, root))
    assert.equal(hash(bytes), item.sha256, `served_content_mismatch:${item.path}`)
    assert.equal(bytes.length, item.bytes)
  }
  return identity
}
export async function browserTasks(base) {
  const { chromium } = await import('../../apps/policy-ui/node_modules/playwright-core/index.mjs')
  let executable
  for (const path of [process.env.CHROME_PATH, chromium.executablePath(), 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean)) {
    try { await access(path); executable = path; break } catch { /* next supported browser */ }
  }
  if (!executable) throw new Error('browser_unavailable')
  const browser = await chromium.launch({ executablePath: executable, headless: true })
  try {
    const context = await browser.newContext({ locale: 'en-US', acceptDownloads: true })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push('console_error') })
    const routes = [
      ['overview', '.overview-state-header', 'Overview'],
      ['scenario-lab', '.scenario-panel--assumptions', 'Scenario Lab'],
      ['comparison', '.cmp-selector', 'Comparison'],
      ['model-explorer', '.model-detail', 'Model Explorer'],
      ['data-registry', '.data-registry-section', 'Data Sources'],
      ['reform-tracker', '.reform-tracker__views', 'Business support reform tracker'],
      ['knowledge-hub', '.latest-changes', 'Knowledge Hub'],
    ]
    for (const [route, selector, title] of routes) {
      await page.goto(`${base}#/${route}`, { waitUntil: 'networkidle', timeout: 30000 })
      await page.locator('.language-switcher select').selectOption('en')
      await page.locator(selector).first().waitFor()
      assert.equal(await page.locator('.page-header h1').innerText(), title, `wrong_route:${route}`)
    }
    await page.locator('.language-switcher select').selectOption('ru')
    assert.equal(await page.locator('.page-header h1').innerText(), 'База знаний')
    await page.locator('.language-switcher select').selectOption('uz')
    assert.equal(await page.locator('.page-header h1').innerText(), 'Bilimlar markazi')
    await page.locator('.language-switcher select').selectOption('en')
    assert.deepEqual(errors, [], 'browser_runtime_errors')
    await page.goto(`${base}#/scenario-lab?preset=baseline&model=macro_qpm`)
    const save = page.locator('.scenario-session-controls__actions .btn-secondary')
    await save.waitFor()
    await page.waitForFunction(() => document.querySelector('.scenario-session-controls__actions .btn-secondary')?.disabled === false)
    const input = page.getByRole('textbox', { name: 'Policy rate change numeric value' })
    await input.click(); await input.press('Control+A'); await input.press('Backspace')
    await input.press('-'); await input.press('1'); await input.press('Tab')
    await page.getByRole('button', { name: /^Run scenario$/ }).click()
    await page.waitForFunction(() => document.querySelector('.scenario-session-controls__actions .btn-secondary')?.disabled === false)
    await save.click()
    const records = () => page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('policy-ui:scenario.v2:')).map(key => JSON.parse(localStorage.getItem(key))))
    const first = (await records())[0]
    assert.ok(first.assumptions.some(item => item.key === 'policy_rate_change' && item.value === -1), 'negative_input_not_saved')
    assert.equal(first.run_id, first.run_envelope.execution_id)
    assert.equal(first.run_envelope.qualification.authoritative, false)
    await page.reload()
    await page.getByRole('tab', { name: /Saved runs/i }).click()
    await page.locator('.saved-runs-panel__item').filter({ hasText: first.scenario_name }).first().getByRole('button', { name: /^Load$/i }).click()
    await save.click()
    assert.deepEqual((await records()).find(row => row.scenario_id === first.scenario_id).run_envelope, first.run_envelope)
    await page.getByRole('tab', { name: /Saved runs/i }).click()
    await page.locator('.saved-runs-panel__item').filter({ hasText: first.scenario_name }).first().getByRole('link', { name: /Comparison/i }).click()
    await page.getByRole('dialog').getByRole('button', { name: /Confirm replacement|Add selected/ }).click()
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export comparison JSON' }).click()
    const exported = JSON.parse(await readFile(await (await download).path(), 'utf8'))
    assert.deepEqual(exported.run_envelopes.find(row => row.scenario_id === first.scenario_id).envelope, first.run_envelope)
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
}
export async function verifyRelease(base, identityBytes, task = browserTasks, fetcher = boundedFetch) {
  const identity = JSON.parse(identityBytes)
  const evidence = { verifier_sha256: hash(await readFile(new URL(import.meta.url))), release_id: identity.release_id, publication_manifest_sha256: identity.publication_manifest_sha256, checks: { direct_http: false, browser_routes: false, scenario_save_reload_export: false, served_identity: false }, reasons: [] }
  try {
    if (identity.verifier_sha256 && evidence.verifier_sha256 !== identity.verifier_sha256) throw new Error('verification_implementation_mismatch')
    await verifyServed(base, identityBytes, fetcher)
    evidence.checks.direct_http = true
    await task(base)
    evidence.checks.browser_routes = true
    evidence.checks.scenario_save_reload_export = true
    await verifyServed(base, identityBytes, fetcher)
    evidence.checks.served_identity = true
  } catch (error) { evidence.reasons.push(error.code ?? String(error.message).split('\n')[0]) }
  evidence.status = Object.values(evidence.checks).every(Boolean) ? 'verified' : 'unverified'
  return evidence
}
async function main() {
  const arg = name => process.argv[process.argv.indexOf(name) + 1]
  const site = process.argv.includes('--site') ? resolve(arg('--site')) : undefined
  const identityBytes = await readFile(site ? resolve(site, 'release-identity.json') : resolve(arg('--expected-identity')))
  let server
  let base = arg('--url')
  if (!site) {
    const url = new URL(base)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !url.pathname.endsWith('/policy-ui/')) throw new Error('invalid_hosted_target')
  }
  if (site) {
    const manifest = JSON.parse(await readFile(resolve(site, 'publication-manifest.json'), 'utf8'))
    const prefix = manifest.policy_ui_base.slice(0, -'policy-ui/'.length)
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' }
    server = createServer(async (request, response) => {
      try {
        let path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname)
        if (!path.startsWith(prefix)) return response.writeHead(404).end()
        path = path.slice(prefix.length)
        if (!path || path.endsWith('/')) path += 'index.html'
        const file = resolve(site, path)
        if (!file.startsWith(site + sep)) return response.writeHead(404).end()
        response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file))
      } catch { response.writeHead(404).end() }
    })
    await new Promise(done => server.listen(0, '127.0.0.1', done))
    base = `http://127.0.0.1:${server.address().port}${manifest.policy_ui_base}`
  }
  try {
    const evidence = await verifyRelease(base, identityBytes)
    await writeFile(resolve(arg('--evidence')), JSON.stringify(evidence, null, 2) + '\n')
    console.log(JSON.stringify(evidence))
    if (evidence.status !== 'verified') process.exitCode = 1
  } finally { if (server) await new Promise(done => server.close(done)) }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main()
