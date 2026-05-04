#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'http://127.0.0.1:4173/policy-ui/';
const HOSTED_BASE_URL = 'https://cerr-uzbekistan.github.io/Uzbekistan-Economic-policy-engine/policy-ui/';
const HASH_ROUTES = [
  '#/overview',
  '#/scenario-lab',
  '#/comparison',
  '#/model-explorer',
  '#/data-registry',
  '#/knowledge-hub',
];
const DATA_REGISTRY_SMOKE_CONTRACT = {
  implemented: [
    { model: 'QPM', assetText: ['QPM'] },
    { model: 'DFM', assetText: ['DFM'] },
    { model: 'I-O', assetText: ['I-O'] },
  ],
  plannedGated: [
    { model: 'HFI', assetText: ['High-frequency indicators'] },
    { model: 'PE', assetText: ['PE Trade Shock'] },
    { model: 'CGE', assetText: ['CGE Reform Shock'] },
    { model: 'FPP', assetText: ['FPP Fiscal Path'] },
  ],
  excluded: [
    { model: 'Synthesis' },
  ],
  exclusionReason: 'Synthesis is excluded because it is not in the current Data Registry contract.',
};
const EXPECTED_DATA_REGISTRY_IMPLEMENTED = ['QPM', 'DFM', 'I-O'];
const EXPECTED_DATA_REGISTRY_PLANNED_GATED = ['HFI', 'PE', 'CGE', 'FPP'];
const EXPECTED_DATA_REGISTRY_EXCLUDED = ['Synthesis'];
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
    `Hosted Pages URL: ${HOSTED_BASE_URL}`,
    '',
    'Aliases: local, hosted',
  ].join('\n');
}

function resolveBaseUrl(rawBaseUrl) {
  if (rawBaseUrl === undefined || rawBaseUrl === 'local') {
    return DEFAULT_BASE_URL;
  }

  if (rawBaseUrl === 'hosted') {
    return HOSTED_BASE_URL;
  }

  return rawBaseUrl;
}

function normalizeBaseUrl(rawBaseUrl) {
  const parsed = new URL(resolveBaseUrl(rawBaseUrl));
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

function registrySmokeContractDetails() {
  return [
    `Data Registry smoke contract implemented models: ${modelNames(DATA_REGISTRY_SMOKE_CONTRACT.implemented).join(', ')}.`,
    `Data Registry smoke contract planned/gated models: ${modelNames(DATA_REGISTRY_SMOKE_CONTRACT.plannedGated).join(', ')}.`,
    `Data Registry smoke contract excluded models: ${modelNames(DATA_REGISTRY_SMOKE_CONTRACT.excluded).join(', ')}.`,
    DATA_REGISTRY_SMOKE_CONTRACT.exclusionReason,
    'Data Registry smoke does not assert Synthesis presence or absence because Synthesis can appear outside the registry contract.',
  ];
}

function modelNames(records) {
  return records.map((record) => record.model);
}

function sameMembers(actual, expected) {
  return actual.length === expected.length && expected.every((value) => actual.includes(value));
}

function validateDataRegistrySmokeContract(details) {
  const implementedModels = modelNames(DATA_REGISTRY_SMOKE_CONTRACT.implemented);
  const plannedGatedModels = modelNames(DATA_REGISTRY_SMOKE_CONTRACT.plannedGated);
  const excludedModels = modelNames(DATA_REGISTRY_SMOKE_CONTRACT.excluded);

  if (!sameMembers(implementedModels, EXPECTED_DATA_REGISTRY_IMPLEMENTED)) {
    return failure('Data Registry smoke contract drift', 'Implemented model expectation must stay limited to QPM, DFM, and I-O.', details);
  }

  if (!sameMembers(plannedGatedModels, EXPECTED_DATA_REGISTRY_PLANNED_GATED)) {
    return failure('Data Registry smoke contract drift', 'Planned/gated model expectation must stay limited to HFI, PE, CGE, and FPP.', details);
  }

  if (!sameMembers(excludedModels, EXPECTED_DATA_REGISTRY_EXCLUDED)) {
    return failure('Data Registry smoke contract drift', 'Excluded model expectation must explicitly list Synthesis.', details);
  }

  const checkedModels = new Set([
    ...implementedModels,
    ...plannedGatedModels,
  ]);
  const unexpectedIncludedModels = excludedModels.filter((model) => checkedModels.has(model));
  if (unexpectedIncludedModels.length > 0) {
    return failure('Data Registry smoke contract drift', 'Excluded models cannot also be checked by Data Registry smoke.', [
      ...details,
      `Unexpected checked excluded models: ${unexpectedIncludedModels.join(', ')}.`,
    ]);
  }

  return null;
}

function findMissingAssetText(records, assetText) {
  return records.filter((record) => {
    return !record.assetText.some((expectedText) => assetText.includes(expectedText));
  });
}

function validateDataRegistryAssetContract(details, assetText) {
  const missingImplemented = findMissingAssetText(DATA_REGISTRY_SMOKE_CONTRACT.implemented, assetText);
  if (missingImplemented.length > 0) {
    return failure('Data Registry smoke contract missing from built assets', 'Implemented registry-contract model text was not found in built JS assets.', [
      ...details,
      `Missing implemented models: ${modelNames(missingImplemented).join(', ')}.`,
    ]);
  }

  const missingPlannedGated = findMissingAssetText(DATA_REGISTRY_SMOKE_CONTRACT.plannedGated, assetText);
  if (missingPlannedGated.length > 0) {
    return failure('Data Registry smoke contract missing from built assets', 'Planned/gated registry-contract model text was not found in built JS assets.', [
      ...details,
      `Missing planned/gated models: ${modelNames(missingPlannedGated).join(', ')}.`,
    ]);
  }

  details.push(`Data Registry smoke found implemented contract models in built JS assets: ${modelNames(DATA_REGISTRY_SMOKE_CONTRACT.implemented).join(', ')}.`);
  details.push(`Data Registry smoke found planned/gated contract models in built JS assets: ${modelNames(DATA_REGISTRY_SMOKE_CONTRACT.plannedGated).join(', ')}.`);
  details.push(`Data Registry smoke excluded ${modelNames(DATA_REGISTRY_SMOKE_CONTRACT.excluded).join(', ')} from registry-contract assertions.`);
  return null;
}

export async function runSmoke(rawBaseUrl) {
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  const details = [`Base URL: ${baseUrl.href}`, ...registrySmokeContractDetails()];
  const registryContractFailure = validateDataRegistrySmokeContract(details);
  if (registryContractFailure) {
    return registryContractFailure;
  }

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

  const jsAssetTexts = [];
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

    if (assetUrl.pathname.endsWith('.js')) {
      jsAssetTexts.push(await assetResponse.text());
    }
  }

  details.push('All referenced JS/CSS assets returned 2xx.');

  const registryAssetFailure = validateDataRegistryAssetContract(details, jsAssetTexts.join('\n'));
  if (registryAssetFailure) {
    return registryAssetFailure;
  }

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
