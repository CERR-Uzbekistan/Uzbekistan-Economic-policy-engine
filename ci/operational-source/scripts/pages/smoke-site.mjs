import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { runSmoke } from '../../apps/policy-ui/scripts/active-preview-smoke.mjs'
import { runClientSmoke } from '../../apps/policy-ui/scripts/hosted-client-smoke.mjs'

const siteIndex = process.argv.indexOf('--site')
if (siteIndex < 0 || !process.argv[siteIndex + 1]) throw new Error('--site is required')
const site = resolve(process.argv[siteIndex + 1])
const manifest = JSON.parse(await readFile(resolve(site, 'publication-manifest.json'), 'utf8'))
const base = manifest.policy_ui_base
const prefix = base.slice(0, -'policy-ui/'.length)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' }
const server = createServer(async (request, response) => {
  try {
    let path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname)
    if (!path.startsWith(prefix)) return response.writeHead(404).end()
    path = path.slice(prefix.length)
    if (!path || path.endsWith('/')) path += 'index.html'
    const file = resolve(site, path)
    if (!file.startsWith(site + sep)) return response.writeHead(404).end()
    const body = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(body)
  } catch {
    response.writeHead(404).end()
  }
})
try {
  await new Promise(done => server.listen(0, '127.0.0.1', done))
  const origin = `http://127.0.0.1:${server.address().port}`
  for (const item of manifest.files) {
    const response = await fetch(origin + prefix + item.path)
    assert.equal(response.status, 200, item.path)
    assert.equal((await response.arrayBuffer()).byteLength, item.bytes, item.path)
  }
  for (const path of ['.mcp.json', '.env', 'docs/README.md', 'apps/policy-ui/src/main.tsx', 'tmp/runtime.json', 'model%20sources/private.xlsx']) {
    assert.equal((await fetch(origin + prefix + path)).status, 404, path)
  }
  const result = await runSmoke(origin + base)
  assert.equal(result.ok, true, JSON.stringify(result))
  if (process.argv.includes('--client')) {
    const client = await runClientSmoke(origin + base)
    assert.equal(client.ok, true, JSON.stringify(client))
    console.log('PASS mounted assembled Policy UI routes, direct data/asset requests and language switching')
  }
  console.log(`PASS assembled site: ${manifest.files.length} direct files, landing/legacy routes, Policy UI hash routes and exclusions`)
} finally {
  await new Promise(done => server.close(done))
}
