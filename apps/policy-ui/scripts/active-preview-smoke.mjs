#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'http://127.0.0.1:4173/policy-ui/';
const HASH_ROUTES = [
  '#/overview',
  '#/scenario-lab',
  '#/comparison',
  '#/model-explorer',
  '#/data-registry',
  '#/knowledge-hub',
];
const HTTP_ONLY_LIMITATIONS = [
  'console errors',
  'client-rendered route content',
  'language switching',
  'localStorage behavior',
  'client network calls such as /api/v1/registry',
];
const REQUEST_TIMEOUT_MS = 15000;

function usage() {
  return [
    'Usage: npm run smoke:active-preview -- [base-url]',
    '',
    `Default base URL: ${DEFAULT_BASE_URL}`,
    'Hosted Pages URL: https://cerr-uzbekistan.github.io/Uzbekistan-Economic-policy-engine/policy-ui/',
  ].join('\n');
}

function normalizeBaseUrl(rawBaseUrl) {
  const parsed = new URL(rawBaseUrl);
  parsed.hash = '';
  parsed.search = '';
  if (!parsed.pathname.endsWith('/')) {
    parsed.pathname = `${parsed.pathname}/`;
  }
  return parsed;
}

function routeUrl(baseUrl, hashRoute) {
  const next = new URL(baseUrl.href);
  next.hash = hashRoute;
  return next;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url) {
  const response = await fetchWithTimeout(url);
  const text = await response.text();
  return { response, text };
}

function isHostedPagesUrl(url) {
  return url.hostname.endsWith('github.io');
}

function extractJsAndCssAssetRefs(html) {
  const refs = new Set();
  const attrPattern = /\b(?:src|href)\s*=\s*["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/gi;

  for (const match of html.matchAll(attrPattern)) {
    refs.add(match[1]);
  }

  return [...refs];
}

function failure(category, message, details = []) {
  return { ok: false, category, message, details };
}

function pass(details = []) {
  return { ok: true, category: 'smoke pass', details };
}

export async function runSmoke(rawBaseUrl) {
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  const details = [`Base URL: ${baseUrl.href}`];

  let root;
  try {
    root = await fetchText(baseUrl);
  } catch (error) {
    const scope = isHostedPagesUrl(baseUrl) ? 'hosted URL unavailable / timeout' : 'URL unavailable / timeout';
    return failure(scope, `Unable to fetch root app URL within ${REQUEST_TIMEOUT_MS}ms.`, [
      ...details,
      `Error: ${error.name}: ${error.message}`,
    ]);
  }

  if (root.response.status !== 200) {
    const scope = isHostedPagesUrl(baseUrl) ? 'hosted URL unavailable / timeout' : 'URL unavailable / timeout';
    return failure(scope, `Root app URL returned HTTP ${root.response.status}, expected 200.`, [
      ...details,
      `Root status: ${root.response.status} ${root.response.statusText}`,
    ]);
  }

  details.push('Root app URL returned HTTP 200.');

  const assetRefs = extractJsAndCssAssetRefs(root.text);
  if (assetRefs.length === 0) {
    return failure('asset/base-path failure', 'Built HTML shell does not reference any JS or CSS assets.', details);
  }

  const assetUrls = assetRefs.map((ref) => new URL(ref, baseUrl));
  const outsidePolicyUiAssets = assetUrls.filter((assetUrl) => !assetUrl.pathname.includes('/policy-ui/assets/'));
  if (outsidePolicyUiAssets.length > 0) {
    return failure('asset/base-path failure', 'Built HTML shell references assets outside /policy-ui/assets/.', [
      ...details,
      ...outsidePolicyUiAssets.map((assetUrl) => `Unexpected asset path: ${assetUrl.href}`),
    ]);
  }

  details.push(`HTML shell references ${assetUrls.length} JS/CSS asset(s) under /policy-ui/assets/.`);

  for (const assetUrl of assetUrls) {
    let assetResponse;
    try {
      assetResponse = await fetchWithTimeout(assetUrl);
    } catch (error) {
      return failure('asset/base-path failure', `Asset request failed for ${assetUrl.href}.`, [
        ...details,
        `Error: ${error.name}: ${error.message}`,
      ]);
    }

    if (!assetResponse.ok) {
      return failure('asset/base-path failure', `Asset returned HTTP ${assetResponse.status}: ${assetUrl.href}`, [
        ...details,
        `Asset status: ${assetResponse.status} ${assetResponse.statusText}`,
      ]);
    }
  }

  details.push('All referenced JS/CSS assets returned 2xx.');

  for (const hashRoute of HASH_ROUTES) {
    const url = routeUrl(baseUrl, hashRoute);
    let routeResponse;
    try {
      routeResponse = await fetchWithTimeout(url);
    } catch (error) {
      return failure('route shell unavailable', `Route shell request failed for ${url.href}.`, [
        ...details,
        `Error: ${error.name}: ${error.message}`,
      ]);
    }

    if (routeResponse.status !== 200) {
      return failure('route shell unavailable', `Route shell returned HTTP ${routeResponse.status}: ${url.href}`, [
        ...details,
        `Route status: ${routeResponse.status} ${routeResponse.statusText}`,
      ]);
    }
  }

  details.push(`Hash route shell resolved with HTTP 200 for ${HASH_ROUTES.join(', ')}.`);
  return pass(details);
}

export function printResult(result) {
  const status = result.ok ? 'PASS' : 'FAIL';
  console.log(`[active-preview-smoke] ${status}: ${result.category}`);

  if (result.message) {
    console.log(result.message);
  }

  for (const detail of result.details) {
    console.log(`- ${detail}`);
  }

  console.log('');
  console.log('HTTP-only limitations: this smoke cannot verify:');
  for (const limitation of HTTP_ONLY_LIMITATIONS) {
    console.log(`- ${limitation}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv[2];
  if (arg === '--help' || arg === '-h') {
    console.log(usage());
    process.exit(0);
  }

  try {
    const result = await runSmoke(arg ?? DEFAULT_BASE_URL);
    printResult(result);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(`[active-preview-smoke] FAIL: invalid input`);
    console.error(`${error.name}: ${error.message}`);
    console.error('');
    console.error(usage());
    process.exitCode = 1;
  }
}
