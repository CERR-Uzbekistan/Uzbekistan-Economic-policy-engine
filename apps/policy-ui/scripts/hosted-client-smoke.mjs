#!/usr/bin/env node

import { createHash, randomBytes } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import http from 'node:http'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'

const DEFAULT_HOSTED_BASE_URL =
  'https://cerr-uzbekistan.github.io/Uzbekistan-Economic-policy-engine/policy-ui/'
const DEFAULT_LOCAL_BASE_URL = 'http://127.0.0.1:4173/policy-ui/'
const HOSTED_UNAVAILABLE_EXIT_CODE = 2
const BROWSER_UNAVAILABLE_EXIT_CODE = 3
const REQUEST_TIMEOUT_MS = 15_000
const ROUTE_TIMEOUT_MS = 30_000
const LANGUAGE_TIMEOUT_MS = 15_000
const DEVTOOLS_TIMEOUT_MS = 15_000
const HASH_ROUTES = [
  {
    hash: '#/overview',
    selector: '.overview-state-header',
    titles: {
      en: 'Overview',
      ru: '\u041e\u0431\u0437\u043e\u0440',
      uz: "Umumiy ko'rinish",
    },
  },
  {
    hash: '#/scenario-lab',
    selector: '.scenario-panel--assumptions',
    titles: {
      en: 'Scenario Lab',
      ru: '\u0421\u0438\u043c\u0443\u043b\u044f\u0442\u043e\u0440 \u0441\u0446\u0435\u043d\u0430\u0440\u0438\u0435\u0432',
      uz: 'Stsenariy simulyatori',
    },
  },
  {
    hash: '#/comparison',
    selector: '.cmp-selector',
    titles: {
      en: 'Comparison',
      ru: '\u0421\u0440\u0430\u0432\u043d\u0435\u043d\u0438\u0435 \u0441\u0446\u0435\u043d\u0430\u0440\u0438\u0435\u0432',
      uz: 'Stsenariylarni solishtirish',
    },
  },
  {
    hash: '#/model-explorer',
    selector: '.model-detail',
    titles: {
      en: 'Model Explorer',
      ru: '\u041e\u0431\u0437\u043e\u0440 \u043c\u043e\u0434\u0435\u043b\u0435\u0439',
      uz: 'Model katalogi',
    },
  },
  {
    hash: '#/data-registry',
    selector: '.data-registry-section',
    titles: {
      en: 'Data Registry',
      ru: '\u0420\u0435\u0435\u0441\u0442\u0440 \u0434\u0430\u043d\u043d\u044b\u0445',
      uz: "Ma'lumotlar reyestri",
    },
    extraExpression: `
      !document.querySelector('.data-registry-page [role="status"]') &&
      document.body.innerText.includes('/data/qpm.json') &&
      document.body.innerText.includes('High-frequency indicators') &&
      document.body.innerText.includes('PE Trade Shock') &&
      document.body.innerText.includes('CGE Reform Shock') &&
      document.body.innerText.includes('FPP Fiscal Path')
    `,
  },
  {
    hash: '#/knowledge-hub',
    selector: '.pending-surface',
    titles: {
      en: 'Knowledge Hub',
      ru: '\u0411\u0430\u0437\u0430 \u0437\u043d\u0430\u043d\u0438\u0439',
      uz: 'Bilimlar markazi',
    },
    extraExpression: `
      !!document.querySelector('.pending-surface') &&
      !document.body.innerText.includes('Reform timeline') &&
      !document.body.innerText.includes('Research brief') &&
      !document.body.innerText.includes('KnowledgeHubContentView')
    `,
  },
]

function usage() {
  return [
    'Usage: node scripts/hosted-client-smoke.mjs [base-url]',
    '',
    `Default hosted URL: ${DEFAULT_HOSTED_BASE_URL}`,
    `Local alias URL: ${DEFAULT_LOCAL_BASE_URL}`,
    '',
    'Aliases: hosted, local',
    '',
    'Optional env:',
    '- CHROME_PATH or CHROME_BIN: absolute Chrome/Chromium/Edge executable path',
    '- POLICY_UI_CLIENT_SMOKE_HEADFUL=1: run browser headful',
  ].join('\n')
}

function resolveBaseUrl(rawBaseUrl) {
  if (!rawBaseUrl || rawBaseUrl === 'hosted') return DEFAULT_HOSTED_BASE_URL
  if (rawBaseUrl === 'local') return DEFAULT_LOCAL_BASE_URL
  return rawBaseUrl
}

function normalizeBaseUrl(rawBaseUrl) {
  const baseUrl = new URL(resolveBaseUrl(rawBaseUrl))
  baseUrl.hash = ''
  baseUrl.search = ''
  if (!baseUrl.pathname.endsWith('/')) {
    baseUrl.pathname = `${baseUrl.pathname}/`
  }
  return baseUrl
}

function routeUrl(baseUrl, hash, language = 'en') {
  const url = new URL(baseUrl.href)
  url.searchParams.set('lang', language)
  url.hash = hash
  return url
}

function isHostedPagesUrl(url) {
  return url.hostname.endsWith('github.io')
}

function failure(category, message, details = []) {
  return { ok: false, category, message, details }
}

function pass(details = []) {
  return { ok: true, category: 'client smoke pass', details }
}

function exitCodeForResult(result) {
  if (result.ok) return 0
  if (result.category === 'hosted URL unavailable / timeout') return HOSTED_UNAVAILABLE_EXIT_CODE
  if (result.category === 'browser unavailable') return BROWSER_UNAVAILABLE_EXIT_CODE
  return 1
}

async function fetchWithTimeout(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, {
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function preflightRoot(baseUrl, details) {
  try {
    const response = await fetchWithTimeout(baseUrl)
    if (response.status !== 200) {
      const scope = isHostedPagesUrl(baseUrl) ? 'hosted URL unavailable / timeout' : 'URL unavailable / timeout'
      return failure(scope, `Root app URL returned HTTP ${response.status}, expected 200.`, [
        ...details,
        `Root status: ${response.status} ${response.statusText}`,
      ])
    }
    details.push('Root app URL returned HTTP 200 before browser launch.')
    return null
  } catch (error) {
    const scope = isHostedPagesUrl(baseUrl) ? 'hosted URL unavailable / timeout' : 'URL unavailable / timeout'
    return failure(scope, `Unable to fetch root app URL within ${REQUEST_TIMEOUT_MS}ms.`, [
      ...details,
      `Error: ${error.name}: ${error.message}`,
    ])
  }
}

function shellCommandCandidates() {
  if (process.platform === 'win32') {
    return [
      process.env.CHROME_PATH,
      process.env.CHROME_BIN,
      'chrome.exe',
      'msedge.exe',
      join(process.env.PROGRAMFILES ?? 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
      join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
      join(process.env.LOCALAPPDATA ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
      join(process.env.PROGRAMFILES ?? 'C:\\Program Files', 'Microsoft\\Edge\\Application\\msedge.exe'),
      join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Microsoft\\Edge\\Application\\msedge.exe'),
      join(process.env.LOCALAPPDATA ?? '', 'Microsoft\\Edge\\Application\\msedge.exe'),
    ]
  }

  if (process.platform === 'darwin') {
    return [
      process.env.CHROME_PATH,
      process.env.CHROME_BIN,
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      'google-chrome',
      'chromium',
      'microsoft-edge',
    ]
  }

  return [
    process.env.CHROME_PATH,
    process.env.CHROME_BIN,
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
    'microsoft-edge',
  ]
}

async function commandWorks(command) {
  if (!command) return false
  return await new Promise((resolve) => {
    const child = spawn(command, ['--version'], {
      stdio: ['ignore', 'ignore', 'ignore'],
      shell: false,
    })
    child.on('error', () => resolve(false))
    child.on('exit', (code) => resolve(code === 0))
  })
}

async function findBrowserExecutable() {
  for (const candidate of shellCommandCandidates()) {
    if (await commandWorks(candidate)) return candidate
  }
  return null
}

async function waitForDevToolsPort(userDataDir) {
  const activePortPath = join(userDataDir, 'DevToolsActivePort')
  const startedAt = Date.now()
  while (Date.now() - startedAt < DEVTOOLS_TIMEOUT_MS) {
    try {
      const text = await readFile(activePortPath, 'utf8')
      const [portLine] = text.split(/\r?\n/)
      const port = Number(portLine)
      if (Number.isInteger(port) && port > 0) return port
    } catch {
      // Retry until Chrome writes the DevToolsActivePort file.
    }
    await delay(100)
  }
  throw new Error(`Chrome did not expose DevToolsActivePort within ${DEVTOOLS_TIMEOUT_MS}ms.`)
}

async function launchBrowser() {
  const executable = await findBrowserExecutable()
  if (!executable) {
    throw new Error('No Chrome, Chromium, or Edge executable was found.')
  }

  const userDataDir = await mkdtemp(join(tmpdir(), 'policy-ui-client-smoke-'))
  const args = [
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-sync',
    '--disable-translate',
    '--metrics-recording-only',
    '--mute-audio',
    '--window-size=1440,1200',
    'about:blank',
  ]

  if (process.platform !== 'win32') {
    args.unshift('--no-sandbox')
  }

  if (process.env.POLICY_UI_CLIENT_SMOKE_HEADFUL !== '1') {
    args.unshift('--headless=new')
  }

  const child = spawn(executable, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  })
  const stderr = []
  const stdout = []
  child.stderr?.on('data', (chunk) => {
    stderr.push(chunk.toString())
  })
  child.stdout?.on('data', (chunk) => {
    stdout.push(chunk.toString())
  })

  let exited = false
  child.on('exit', () => {
    exited = true
  })

  try {
    const port = await waitForDevToolsPort(userDataDir)
    return { child, executable, port, userDataDir, stderr, stdout, get exited() { return exited } }
  } catch (error) {
    child.kill('SIGTERM')
    await rm(userDataDir, { recursive: true, force: true })
    error.message = `${error.message}\nBrowser stderr:\n${stderr.join('').slice(-2000)}`
    throw error
  }
}

async function closeBrowser(browser, client) {
  try {
    if (client) {
      await client.send('Browser.close').catch(() => {})
      client.close()
    }
  } finally {
    if (!browser.exited) {
      browser.child.kill('SIGTERM')
    }
    await rm(browser.userDataDir, { recursive: true, force: true })
  }
}

function httpJson(port, method, path) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path,
      },
      (response) => {
        let body = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          body += chunk
        })
        response.on('end', () => {
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`DevTools HTTP ${method} ${path} returned ${response.statusCode}: ${body}`))
            return
          }
          try {
            resolve(JSON.parse(body))
          } catch (error) {
            reject(error)
          }
        })
      },
    )
    request.on('error', reject)
    request.end()
  })
}

function createTarget(port) {
  return httpJson(port, 'PUT', '/json/new?about:blank')
}

function parseWebSocketUrl(rawUrl) {
  const parsed = new URL(rawUrl)
  if (parsed.protocol !== 'ws:') {
    throw new Error(`Only ws:// DevTools endpoints are supported: ${rawUrl}`)
  }
  return {
    host: parsed.hostname,
    port: Number(parsed.port),
    path: `${parsed.pathname}${parsed.search}`,
  }
}

class CdpClient extends EventEmitter {
  constructor(socket) {
    super()
    this.socket = socket
    this.buffer = Buffer.alloc(0)
    this.nextId = 1
    this.pending = new Map()

    socket.on('data', (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk])
      this.readFrames()
    })
    socket.on('close', () => {
      for (const { reject } of this.pending.values()) {
        reject(new Error('CDP socket closed.'))
      }
      this.pending.clear()
    })
    socket.on('error', (error) => {
      this.emit('socketError', error)
    })
  }

  static connect(rawUrl) {
    const { host, port, path } = parseWebSocketUrl(rawUrl)
    const key = randomBytes(16).toString('base64')
    const expectedAccept = createHash('sha1')
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest('base64')

    return new Promise((resolve, reject) => {
      const socket = net.connect({ host, port })
      let headerBuffer = Buffer.alloc(0)

      function fail(error) {
        socket.destroy()
        reject(error)
      }

      socket.once('connect', () => {
        socket.write([
          `GET ${path} HTTP/1.1`,
          `Host: ${host}:${port}`,
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Key: ${key}`,
          'Sec-WebSocket-Version: 13',
          '',
          '',
        ].join('\r\n'))
      })

      socket.on('error', fail)
      socket.on('data', function onHandshakeData(chunk) {
        headerBuffer = Buffer.concat([headerBuffer, chunk])
        const headerEnd = headerBuffer.indexOf('\r\n\r\n')
        if (headerEnd === -1) return

        socket.off('data', onHandshakeData)
        socket.off('error', fail)
        const header = headerBuffer.slice(0, headerEnd).toString('utf8')
        const rest = headerBuffer.slice(headerEnd + 4)
        if (!/^HTTP\/1\.1 101\b/.test(header)) {
          fail(new Error(`DevTools WebSocket upgrade failed:\n${header}`))
          return
        }
        if (!header.toLowerCase().includes(`sec-websocket-accept: ${expectedAccept.toLowerCase()}`)) {
          fail(new Error('DevTools WebSocket accept key did not match.'))
          return
        }

        const client = new CdpClient(socket)
        if (rest.length > 0) {
          client.buffer = Buffer.concat([client.buffer, rest])
          client.readFrames()
        }
        resolve(client)
      })
    })
  }

  send(method, params = {}) {
    const id = this.nextId
    this.nextId += 1
    const payload = JSON.stringify({ id, method, params })
    this.writeFrame(payload)
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })
  }

  close() {
    this.socket.end()
  }

  waitFor(method, predicate = () => true, timeoutMs = 10_000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off(method, onEvent)
        reject(new Error(`Timed out waiting for CDP event ${method}.`))
      }, timeoutMs)
      const onEvent = (params) => {
        if (!predicate(params)) return
        clearTimeout(timeout)
        this.off(method, onEvent)
        resolve(params)
      }
      this.on(method, onEvent)
    })
  }

  writeFrame(text) {
    const payload = Buffer.from(text)
    const mask = randomBytes(4)
    let header
    if (payload.length < 126) {
      header = Buffer.from([0x81, 0x80 | payload.length])
    } else if (payload.length <= 0xffff) {
      header = Buffer.alloc(4)
      header[0] = 0x81
      header[1] = 0x80 | 126
      header.writeUInt16BE(payload.length, 2)
    } else {
      header = Buffer.alloc(10)
      header[0] = 0x81
      header[1] = 0x80 | 127
      header.writeBigUInt64BE(BigInt(payload.length), 2)
    }

    const maskedPayload = Buffer.alloc(payload.length)
    for (let index = 0; index < payload.length; index += 1) {
      maskedPayload[index] = payload[index] ^ mask[index % 4]
    }
    this.socket.write(Buffer.concat([header, mask, maskedPayload]))
  }

  readFrames() {
    while (this.buffer.length >= 2) {
      const first = this.buffer[0]
      const second = this.buffer[1]
      const opcode = first & 0x0f
      const masked = (second & 0x80) !== 0
      let length = second & 0x7f
      let offset = 2

      if (length === 126) {
        if (this.buffer.length < offset + 2) return
        length = this.buffer.readUInt16BE(offset)
        offset += 2
      } else if (length === 127) {
        if (this.buffer.length < offset + 8) return
        const bigLength = this.buffer.readBigUInt64BE(offset)
        if (bigLength > BigInt(Number.MAX_SAFE_INTEGER)) {
          this.socket.destroy(new Error('WebSocket frame too large.'))
          return
        }
        length = Number(bigLength)
        offset += 8
      }

      let mask
      if (masked) {
        if (this.buffer.length < offset + 4) return
        mask = this.buffer.slice(offset, offset + 4)
        offset += 4
      }

      if (this.buffer.length < offset + length) return
      let payload = this.buffer.slice(offset, offset + length)
      this.buffer = this.buffer.slice(offset + length)

      if (masked && mask) {
        const unmasked = Buffer.alloc(payload.length)
        for (let index = 0; index < payload.length; index += 1) {
          unmasked[index] = payload[index] ^ mask[index % 4]
        }
        payload = unmasked
      }

      if (opcode === 0x1) {
        this.handleMessage(payload.toString('utf8'))
      } else if (opcode === 0x8) {
        this.socket.end()
        return
      } else if (opcode === 0x9) {
        this.writePong(payload)
      }
    }
  }

  writePong(payload) {
    const mask = randomBytes(4)
    const header = Buffer.from([0x8a, 0x80 | payload.length])
    const maskedPayload = Buffer.alloc(payload.length)
    for (let index = 0; index < payload.length; index += 1) {
      maskedPayload[index] = payload[index] ^ mask[index % 4]
    }
    this.socket.write(Buffer.concat([header, mask, maskedPayload]))
  }

  handleMessage(text) {
    let message
    try {
      message = JSON.parse(text)
    } catch (error) {
      this.emit('protocolError', error)
      return
    }

    if (message.id !== undefined) {
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      if (message.error) {
        pending.reject(new Error(`${message.error.message}${message.error.data ? `: ${message.error.data}` : ''}`))
      } else {
        pending.resolve(message.result)
      }
      return
    }

    if (message.method) {
      this.emit(message.method, message.params ?? {})
    }
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function expressionForRoute(route) {
  return `
    (async () => {
      const expectedTitles = ${JSON.stringify(Object.values(route.titles))};
      const selector = ${JSON.stringify(route.selector)};
      const deadline = Date.now() + ${ROUTE_TIMEOUT_MS};
      const isVisible = (element) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      };
      while (Date.now() < deadline) {
        const main = document.querySelector('#main-content');
        const h1 = document.querySelector('.page-header h1');
        const target = document.querySelector(selector);
        const bodyText = document.body.innerText || '';
        const textLength = main ? (main.innerText || '').trim().length : 0;
        const title = h1 ? h1.textContent.trim() : '';
        const extraOk = ${route.extraExpression ? `Boolean(${route.extraExpression})` : 'true'};
        if (
          main &&
          h1 &&
          expectedTitles.includes(title) &&
          isVisible(target) &&
          textLength > 40 &&
          extraOk
        ) {
          return {
            ok: true,
            title: h1.textContent.trim(),
            textLength,
            selector,
            sample: bodyText.slice(0, 240),
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return {
        ok: false,
        title: document.querySelector('.page-header h1')?.textContent?.trim() ?? null,
        selector,
        selectorFound: !!document.querySelector(selector),
        text: (document.querySelector('#main-content')?.innerText || document.body.innerText || '').slice(0, 500),
      };
    })()
  `
}

function languageSwitchExpression(language, expectedTitle) {
  return `
    (async () => {
      const expectedTitle = ${JSON.stringify(expectedTitle)};
      const language = ${JSON.stringify(language)};
      const select = document.querySelector('.language-switcher select');
      if (!select) {
        return { ok: false, reason: 'language select not found' };
      }
      select.value = language;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const deadline = Date.now() + ${LANGUAGE_TIMEOUT_MS};
      while (Date.now() < deadline) {
        const h1 = document.querySelector('.page-header h1')?.textContent?.trim() ?? '';
        if (select.value === language && h1 === expectedTitle) {
          return { ok: true, language, title: h1 };
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return {
        ok: false,
        language,
        selectValue: select.value,
        title: document.querySelector('.page-header h1')?.textContent?.trim() ?? null,
      };
    })()
  `
}

function knowledgeHubPendingExpression() {
  return `
    (() => {
      const pendingSurface = document.querySelector('.knowledge-hub-page .pending-surface');
      const forbiddenSelectors = [
        '.knowledge-hub-static-banner',
        '.hub-grid',
        '.knowledge-hub-reform-timeline-title',
      ];
      const forbiddenSelector = forbiddenSelectors.find((selector) => document.querySelector(selector));
      const text = document.body.innerText || '';
      const forbiddenText = [
        'Reform timeline',
        'Research brief',
        'BriefCard',
        'ResearchBriefList',
      ].find((snippet) => text.includes(snippet));
      return {
        ok: !!pendingSurface && !forbiddenSelector && !forbiddenText,
        hasPendingSurface: !!pendingSurface,
        forbiddenSelector: forbiddenSelector ?? null,
        forbiddenText: forbiddenText ?? null,
      };
    })()
  `
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  })
  if (result.exceptionDetails) {
    const description = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text
    throw new Error(description)
  }
  return result.result?.value
}

function summarizeConsoleArgs(args = []) {
  return args
    .map((arg) => arg.value ?? arg.description ?? arg.unserializableValue ?? arg.type)
    .filter(Boolean)
    .join(' ')
    .slice(0, 500)
}

function isIgnorableNetworkStatus(url) {
  try {
    const parsed = new URL(url)
    return basename(parsed.pathname) === 'favicon.ico'
  } catch {
    return false
  }
}

function installFailureCapture(client, baseUrl) {
  const consoleErrors = []
  const pageErrors = []
  const networkFailures = []
  const registryRequests = []

  client.on('Runtime.consoleAPICalled', (event) => {
    if (event.type !== 'error') return
    consoleErrors.push({
      type: event.type,
      text: summarizeConsoleArgs(event.args),
      url: event.stackTrace?.callFrames?.[0]?.url ?? '',
    })
  })

  client.on('Runtime.exceptionThrown', (event) => {
    pageErrors.push({
      text: event.exceptionDetails?.exception?.description ?? event.exceptionDetails?.text ?? 'Runtime exception',
      url: event.exceptionDetails?.url ?? '',
    })
  })

  client.on('Log.entryAdded', (event) => {
    if (event.entry?.level !== 'error') return
    if (event.entry.url && isIgnorableNetworkStatus(event.entry.url)) return
    consoleErrors.push({
      type: 'log',
      text: event.entry.text,
      url: event.entry.url ?? '',
    })
  })

  client.on('Network.requestWillBeSent', (event) => {
    const url = event.request?.url ?? ''
    if (!url) return
    try {
      const parsed = new URL(url)
      if (parsed.pathname.includes('/api/v1/registry')) {
        registryRequests.push(url)
      }
    } catch {
      // Ignore non-URL protocol internals.
    }
  })

  client.on('Network.responseReceived', (event) => {
    const response = event.response
    const url = response?.url ?? ''
    const status = response?.status ?? 0
    if (status < 400) return
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return
    } catch {
      return
    }
    if (isIgnorableNetworkStatus(url)) return
    networkFailures.push({
      status,
      url,
      type: event.type,
    })
  })

  return {
    consoleErrors,
    pageErrors,
    networkFailures,
    registryRequests,
  }
}

function firstFailures(captured) {
  const details = []
  for (const error of captured.consoleErrors) {
    details.push(`Console error: ${error.text}${error.url ? ` (${error.url})` : ''}`)
  }
  for (const error of captured.pageErrors) {
    details.push(`Page error: ${error.text}${error.url ? ` (${error.url})` : ''}`)
  }
  for (const failureItem of captured.networkFailures) {
    details.push(`Network ${failureItem.status}: ${failureItem.url}`)
  }
  for (const request of captured.registryRequests) {
    details.push(`Unexpected registry request: ${request}`)
  }
  return details
}

async function enableCdp(client) {
  await Promise.all([
    client.send('Page.enable'),
    client.send('Runtime.enable'),
    client.send('Network.enable'),
    client.send('Log.enable'),
  ])
}

async function navigateAndAssertRoute(client, baseUrl, route, details) {
  const url = routeUrl(baseUrl, route.hash, 'en')
  const navigation = await client.send('Page.navigate', { url: url.href })
  if (navigation.errorText) {
    const scope = isHostedPagesUrl(baseUrl) ? 'hosted URL unavailable / timeout' : 'URL unavailable / timeout'
    return failure(scope, `Browser navigation failed for ${url.href}: ${navigation.errorText}`, details)
  }

  const routeResult = await evaluate(client, expressionForRoute(route))
  if (!routeResult?.ok) {
    return failure('route hydration failure', `Route did not render expected hydrated content: ${route.hash}`, [
      ...details,
      `Observed route state: ${JSON.stringify(routeResult)}`,
    ])
  }

  details.push(`${route.hash} rendered hydrated content using selector ${route.selector}.`)

  for (const language of ['en', 'ru', 'uz']) {
    const languageResult = await evaluate(client, languageSwitchExpression(language, route.titles[language]))
    if (!languageResult?.ok) {
      return failure('language switching failure', `${route.hash} did not switch to ${language.toUpperCase()}.`, [
        ...details,
        `Observed language state: ${JSON.stringify(languageResult)}`,
      ])
    }
  }
  details.push(`${route.hash} switched EN/RU/UZ through the real language select.`)

  if (route.hash === '#/knowledge-hub') {
    const pendingResult = await evaluate(client, knowledgeHubPendingExpression())
    if (!pendingResult?.ok) {
      return failure('Knowledge Hub pending-only failure', 'Knowledge Hub rendered content beyond PendingSurface.', [
        ...details,
        `Observed Knowledge Hub state: ${JSON.stringify(pendingResult)}`,
      ])
    }
    details.push('Knowledge Hub rendered pending-only PendingSurface content.')
  }

  return null
}

export async function runClientSmoke(rawBaseUrl) {
  const baseUrl = normalizeBaseUrl(rawBaseUrl)
  const details = [
    `Base URL: ${baseUrl.href}`,
    `Hash routes: ${HASH_ROUTES.map((route) => route.hash).join(', ')}`,
    'Expected default Data Registry behavior: no /api/v1/registry request unless VITE_REGISTRY_API_URL was built in.',
  ]

  const preflightFailure = await preflightRoot(baseUrl, details)
  if (preflightFailure) return preflightFailure

  let browser
  let client
  try {
    browser = await launchBrowser()
    details.push(`Browser executable: ${browser.executable}`)
    const target = await createTarget(browser.port)
    client = await CdpClient.connect(target.webSocketDebuggerUrl)
    await enableCdp(client)
  } catch (error) {
    if (browser) {
      await closeBrowser(browser, client).catch(() => {})
    }
    return failure('browser unavailable', 'Unable to launch or connect to a Chrome-family browser via CDP.', [
      ...details,
      `Error: ${error.name}: ${error.message}`,
    ])
  }

  const captured = installFailureCapture(client, baseUrl)
  try {
    for (const route of HASH_ROUTES) {
      const routeFailure = await navigateAndAssertRoute(client, baseUrl, route, details)
      if (routeFailure) {
        routeFailure.details.push(...firstFailures(captured))
        return routeFailure
      }
    }

    if (captured.registryRequests.length === 0) {
      details.push('Data Registry default made no /api/v1/registry request.')
    }

    const capturedFailures = firstFailures(captured)
    if (capturedFailures.length > 0) {
      return failure('browser-observed app regression', 'Browser CDP capture found client errors or unexpected requests.', [
        ...details,
        ...capturedFailures,
      ])
    }

    details.push('No console errors, page errors, network 4xx/5xx, or unexpected registry requests were captured.')
    return pass(details)
  } finally {
    await closeBrowser(browser, client)
  }
}

export function printResult(result) {
  const status = result.ok ? 'PASS' : 'FAIL'
  console.log(`[hosted-client-smoke] ${status}: ${result.category}`)
  if (result.message) {
    console.log(result.message)
  }
  for (const detail of result.details) {
    console.log(`- ${detail}`)
  }
  if (!result.ok) {
    console.log('')
    console.log(`Exit code: ${exitCodeForResult(result)}`)
    console.log(`Hosted unavailable / timeout exit code: ${HOSTED_UNAVAILABLE_EXIT_CODE}`)
    console.log(`Browser unavailable exit code: ${BROWSER_UNAVAILABLE_EXIT_CODE}`)
    console.log('App regression exit code: 1')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv[2]
  if (arg === '--help' || arg === '-h') {
    console.log(usage())
    process.exit(0)
  }

  try {
    const result = await runClientSmoke(arg ?? 'hosted')
    printResult(result)
    process.exitCode = exitCodeForResult(result)
  } catch (error) {
    const result = failure('invalid input', `${error.name}: ${error.message}`, [usage()])
    printResult(result)
    process.exitCode = 1
  }
}
