import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const KNOWLEDGE_HUB_SCHEMA_VERSION = 'knowledge-hub-reform-candidates.v2'
export const FIXTURE_DEMO_EXTRACTION_MODE = 'fixture-demo'
export const CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE = 'configured-source-fetch'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..', '..')
const defaultPublicArtifactPath = resolve(repoRoot, 'apps', 'policy-ui', 'public', 'data', 'knowledge-hub.json')
const GOV_UZ_NEWS_API_URL = 'https://api-portal.gov.uz/authorities/news/category?code_name=news&page=1'

function fixturePath(fileName) {
  return resolve(scriptDir, 'source-fixtures', fileName)
}

function govUzAuthorityNewsSource({ id, institution, code, url, fixture }) {
  return {
    id,
    institution,
    url,
    api_url: GOV_UZ_NEWS_API_URL,
    api_headers: {
      code,
      language: 'en',
    },
    parser: 'govuz-api',
    fixture_path: fixturePath(fixture),
  }
}

export const REFORM_SOURCE_DEFINITIONS = [
  {
    id: 'lex-official-legal-acts',
    institution: 'National Database of Legislation of the Republic of Uzbekistan (Lex.uz)',
    url: 'https://lex.uz/uz/search/official?lang=4&pub_date=month',
    parser: 'html-articles',
    fixture_path: fixturePath('lex-official-legal-acts.html'),
  },
  {
    id: 'president-reform-news',
    institution: 'Official website of the President of the Republic of Uzbekistan',
    url: 'https://president.uz/en/lists/news',
    parser: 'president-uz-list',
    fixture_path: fixturePath('president-reform-news.html'),
  },
  {
    id: 'gov-portal-reform-news',
    institution: 'Government portal of the Republic of Uzbekistan',
    url: 'https://gov.uz/en/news/news',
    parser: 'html-articles',
    fixture_path: fixturePath('gov-portal-reform-news.html'),
  },
  {
    id: 'cbu-policy-news',
    institution: 'Central Bank of Uzbekistan',
    url: 'https://cbu.uz/en/press_center/news/',
    parser: 'html-articles',
    fixture_path: fixturePath('cbu-policy-news.html'),
  },
  govUzAuthorityNewsSource({
    id: 'mef-policy-news',
    institution: 'Ministry of Economy and Finance of Uzbekistan',
    code: 'imv',
    url: 'https://gov.uz/en/imv/news/news',
    fixture: 'mef-policy-news.html',
  }),
  govUzAuthorityNewsSource({
    id: 'tax-committee-news',
    institution: 'Tax Committee of the Republic of Uzbekistan',
    code: 'soliq',
    url: 'https://gov.uz/en/soliq/news/news',
    fixture: 'tax-committee-news.json',
  }),
  {
    id: 'customs-committee-news',
    institution: 'State Customs Committee of the Republic of Uzbekistan',
    url: 'https://old.customs.uz/en/',
    parser: 'html-articles',
    fixture_path: fixturePath('customs-committee-news.html'),
  },
  govUzAuthorityNewsSource({
    id: 'energy-ministry-news',
    institution: 'Ministry of Energy of the Republic of Uzbekistan',
    code: 'minenergy',
    url: 'https://gov.uz/en/minenergy/news/news',
    fixture: 'energy-ministry-news.json',
  }),
  govUzAuthorityNewsSource({
    id: 'investment-trade-ministry-news',
    institution: 'Ministry of Investment, Industry and Trade of the Republic of Uzbekistan',
    code: 'miit',
    url: 'https://gov.uz/en/miit/news/news',
    fixture: 'investment-trade-ministry-news.json',
  }),
  govUzAuthorityNewsSource({
    id: 'justice-ministry-news',
    institution: 'Ministry of Justice of the Republic of Uzbekistan',
    code: 'adliya',
    url: 'https://gov.uz/en/adliya/news/news',
    fixture: 'justice-ministry-news.json',
  }),
]

export const REFORM_EVIDENCE_TYPES = [
  'legal_text',
  'official_policy_announcement',
  'consultation_notice',
  'budget_tax_measure',
  'regulatory_parameter_change',
  'implementation_program',
  'international_agreement',
]

export const REFORM_CATEGORIES = [
  'monetary_policy',
  'fiscal_tax',
  'trade_customs',
  'energy_tariffs',
  'financial_sector',
  'soe_privatization',
  'social_protection',
  'business_environment',
  'agriculture',
  'digital_public_admin',
  'infrastructure_investment',
  'other_policy',
]

const INCLUDE_RULE_DEFINITIONS = [
  {
    id: 'legal-or-regulatory-change',
    label: 'Legal or regulatory change',
    description: 'Include laws, decrees, resolutions, regulations, code changes, orders, or amendments that create or alter a policy rule.',
    weight: 55,
    evidence_types: ['legal_text', 'official_policy_announcement'],
    category: 'other_policy',
    patterns: [
      /\b(law|decree|resolution|regulation|code|order|rule|rules|amendment|amended|adopted|approved|enacted|introduced|legal act|normative legal act)\b/i,
    ],
  },
  {
    id: 'monetary-or-financial-parameter',
    label: 'Monetary or financial-sector parameter',
    description: 'Include policy-rate, reserve requirement, prudential, deposit, FX-market, bank, microfinance, or payment-system changes.',
    weight: 50,
    evidence_types: ['regulatory_parameter_change', 'official_policy_announcement'],
    category: 'monetary_policy',
    patterns: [
      /\b(policy[- ]rate decision framework|policy[- ]rate framework consultation|policy[- ]rate consultation|policy[- ]rate (?:change|changes|changed|increase|decrease|cut|hike|reduction|adjustment|set|kept|maintained|raised|lowered)|refinancing rate (?:change|changes|changed|increase|decrease|cut|hike|reduction|adjustment|set|kept|maintained|raised|lowered)|reserve requirement|foreign[- ]currency deposit|foreign exchange|fx market|prudential|capital requirement|liquidity requirement|payment system|microfinance|microcredit|banking regulation)\b/i,
    ],
  },
  {
    id: 'fiscal-tax-budget-measure',
    label: 'Fiscal, tax, budget, subsidy, or tariff measure',
    description: 'Include tax, excise, duty, budget, public-finance, subsidy, tariff, compensation, or fiscal-monitoring changes.',
    weight: 50,
    evidence_types: ['budget_tax_measure', 'regulatory_parameter_change'],
    category: 'fiscal_tax',
    patterns: [
      /\b(tax|excise|duty|budget|public finance|fiscal|subsidy|subsidies|tariff|compensation|fiscal monitoring|allocation)\b/i,
    ],
  },
  {
    id: 'trade-customs-modernization',
    label: 'Trade or customs modernization',
    description: 'Include customs, border, clearance, declarations, trade corridor, import/export, WTO, or market-access measures.',
    weight: 45,
    evidence_types: ['consultation_notice', 'implementation_program'],
    category: 'trade_customs',
    patterns: [
      /\b(customs|border clearance|risk-based clearance|electronic declaration|trade corridor|import|export|wto|market access)\b/i,
    ],
  },
  {
    id: 'structural-implementation-program',
    label: 'Structural implementation program',
    description: 'Include privatization, SOE, energy, infrastructure, agriculture, digital-government, or business-environment reforms with implementation steps.',
    weight: 45,
    evidence_types: ['implementation_program', 'official_policy_announcement'],
    category: 'business_environment',
    patterns: [
      /\b(privatization|state-owned enterprise|soe|energy tariff|green economic development|master plan|infrastructure|agriculture|digital government|digitalization|public service|legal service|notarial|business environment|investment climate|small and medium-sized businesses|sme)\b/i,
    ],
  },
  {
    id: 'formal-consultation-or-draft',
    label: 'Formal consultation or draft measure',
    description: 'Include formal consultations and draft measures when the text identifies the proposed policy instrument or mechanism.',
    weight: 40,
    evidence_types: ['consultation_notice'],
    category: 'other_policy',
    patterns: [
      /\b(consultation|draft|invited comments|public comment|stakeholder feedback)\b/i,
    ],
  },
  {
    id: 'binding-international-financing-or-agreement',
    label: 'Binding international financing or agreement',
    description: 'Include signed agreements, grants, loans, and donor financing when tied to a policy program or implementation measure.',
    weight: 42,
    evidence_types: ['international_agreement', 'implementation_program'],
    category: 'infrastructure_investment',
    patterns: [
      /\b(agreement was signed|signed agreement|grant|loan|financing|program agreement|memorandum approved)\b/i,
    ],
  },
]

const EXCLUDE_RULE_DEFINITIONS = [
  {
    id: 'routine-meeting-without-policy-measure',
    label: 'Routine meeting without policy measure',
    description: 'Exclude meetings, talks, roundtables, visits, and side-event diplomacy unless the text states a legal, budgetary, regulatory, or implementation measure.',
    reason: 'routine_meeting_without_policy_measure',
    overridable_by_policy_measure: true,
    patterns: [
      /\b(meeting held|meeting was held|board meeting|discussions held|discussions on cooperation|talks were held|roundtable discussion|met with|visit of|on the sidelines)\b/i,
    ],
  },
  {
    id: 'cooperation-news-without-instrument',
    label: 'Cooperation news without instrument',
    description: 'Exclude generic cooperation, partnership, or prospect-expansion announcements without a signed instrument, financing amount, or concrete policy action.',
    reason: 'cooperation_news_without_policy_measure',
    overridable_by_policy_measure: true,
    patterns: [
      /\b(cooperation|partnership|prospects for expanding|exchange of views|strengthening relations)\b/i,
    ],
  },
  {
    id: 'training-or-outreach',
    label: 'Training or outreach',
    description: 'Exclude trainings, calendars, awareness weeks, conferences, and public outreach unless a policy measure is explicitly announced.',
    reason: 'training_or_outreach_only',
    overridable_by_policy_measure: true,
    patterns: [
      /\b(training|calendar|seminar|workshop|financial literacy|awareness|conference|forum)\b/i,
    ],
  },
  {
    id: 'ceremonial-cultural-event',
    label: 'Ceremonial or cultural event',
    description: 'Exclude commemorative, cultural, spiritual, award, and protocol events.',
    reason: 'ceremonial_or_cultural_event',
    overridable_by_policy_measure: false,
    patterns: [
      /\b(spiritual|enlightenment|anniversary|birthday|award ceremony|commemorative|cultural event|protocol event)\b/i,
    ],
  },
  {
    id: 'administrative-update-only',
    label: 'Administrative update only',
    description: 'Exclude internal performance-discipline, reporting, staffing, and ministry process updates without a policy measure.',
    reason: 'administrative_update_only',
    overridable_by_policy_measure: true,
    patterns: [
      /\b(performance discipline|work carried out within the system|staffing|internal process|target indicators reviewed)\b/i,
    ],
  },
]

export const REFORM_EXCLUSION_REASONS = [
  {
    id: 'no_policy_measure',
    description: 'The text does not identify a legal, regulatory, fiscal, monetary, trade, implementation, or financing measure.',
  },
  {
    id: 'routine_meeting_without_policy_measure',
    description: 'The item is routine meeting or diplomatic engagement coverage without an explicit policy measure.',
  },
  {
    id: 'cooperation_news_without_policy_measure',
    description: 'The item announces cooperation or prospects but no signed instrument, financing commitment, or policy change.',
  },
  {
    id: 'training_or_outreach_only',
    description: 'The item is training, awareness, outreach, or event logistics only.',
  },
  {
    id: 'ceremonial_or_cultural_event',
    description: 'The item is ceremonial, cultural, commemorative, or protocol content.',
  },
  {
    id: 'administrative_update_only',
    description: 'The item is internal administrative reporting without a policy measure.',
  },
  {
    id: 'low_relevance_score',
    description: 'The text matched weak signals but not enough evidence for intake.',
  },
]

export const REFORM_INTAKE_RULEBOOK = {
  version: 'knowledge-hub-reform-intake-rulebook.v1',
  include_rules: INCLUDE_RULE_DEFINITIONS.map(({ patterns: _patterns, ...rule }) => rule),
  exclude_rules: EXCLUDE_RULE_DEFINITIONS.map(({ patterns: _patterns, ...rule }) => rule),
  evidence_types: REFORM_EVIDENCE_TYPES,
  reform_categories: REFORM_CATEGORIES,
  relevance_scoring: {
    range: [0, 100],
    include_threshold: 40,
    high_relevance: '70-100: explicit legal, regulatory, budget, monetary, trade, or implementation measure.',
    medium_relevance: '40-69: plausible reform candidate with a formal consultation, program, agreement, or parameter signal.',
    low_relevance: '0-39: generic news, routine activity, or insufficient source evidence.',
  },
  exclusion_reasons: REFORM_EXCLUSION_REASONS,
}

function parseArgs(argv) {
  const args = {
    fetchSource: false,
    writePublicArtifact: false,
    output: defaultPublicArtifactPath,
    extractedAt: new Date().toISOString(),
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--fetch-source') args.fetchSource = true
    else if (arg === '--write-public-artifact') args.writePublicArtifact = true
    else if (arg === '--output') {
      args.output = resolve(argv[index + 1])
      index += 1
    } else if (arg === '--extracted-at') {
      args.extractedAt = argv[index + 1]
      index += 1
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function normalizeWhitespace(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function firstMatch(value, patterns) {
  for (const pattern of patterns) {
    const match = value.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return ''
}

function toAbsoluteUrl(url, baseUrl) {
  if (!url) return baseUrl
  try {
    return new URL(url, baseUrl).toString()
  } catch {
    return baseUrl
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function classifyDomain(text) {
  const normalized = text.toLowerCase()
  if (/(energy|gas|tariff adjustment)/.test(normalized)) return 'energy_tariffs'
  if (/(privatization|state-owned|soe)/.test(normalized)) return 'soe_privatization'
  if (/(customs|trade|wto|import|export|clearance)/.test(normalized)) return 'trade_customs'
  if (/(policy rate|reserve requirement|foreign exchange|fx|deposit|bank|microfinance|microcredit)/.test(normalized)) return 'monetary_policy'
  if (/(budget|tax|excise|fiscal|subsidy|duty)/.test(normalized)) return 'fiscal_tax'
  if (/(compensation|social protection|household)/.test(normalized)) return 'social_protection'
  if (/(agriculture|fisheries|forestry)/.test(normalized)) return 'agriculture'
  if (/(digital|electronic declaration|e-government|public service|notarial|legal service)/.test(normalized)) return 'digital_public_admin'
  if (/(infrastructure|grant|loan|financing|master plan|green economic development)/.test(normalized)) return 'infrastructure_investment'
  if (/(business|investment climate|investor|sme|small and medium-sized)/.test(normalized)) return 'business_environment'
  return 'other_policy'
}

function uniqueStrings(values) {
  return Array.from(new Set(values))
}

function matchedRules(definitions, text) {
  return definitions.filter((rule) => rule.patterns.some((pattern) => pattern.test(text)))
}

export function classifyReformCandidateText(text) {
  const includeRules = matchedRules(INCLUDE_RULE_DEFINITIONS, text)
  const excludeRules = matchedRules(EXCLUDE_RULE_DEFINITIONS, text)
  const nonOverridableExcludeRule = excludeRules.find((rule) => rule.overridable_by_policy_measure !== true)
  const hasPolicyMeasure = includeRules.length > 0
  const policyMeasureOverridesRoutine = hasPolicyMeasure && !nonOverridableExcludeRule
  const scoreBeforeExclusions = includeRules.reduce((score, rule) => score + rule.weight, 0)
  const exclusionPenalty = excludeRules.length > 0 && !policyMeasureOverridesRoutine ? 25 : 0
  const relevanceScore = Math.max(0, Math.min(100, scoreBeforeExclusions - exclusionPenalty))
  const includeThreshold = REFORM_INTAKE_RULEBOOK.relevance_scoring.include_threshold

  let exclusionReason = null
  if (nonOverridableExcludeRule) {
    exclusionReason = nonOverridableExcludeRule.reason
  } else if (!hasPolicyMeasure) {
    exclusionReason = excludeRules[0]?.reason ?? 'no_policy_measure'
  } else if (relevanceScore < includeThreshold) {
    exclusionReason = 'low_relevance_score'
  }

  const included = exclusionReason === null
  const evidenceTypes = uniqueStrings(includeRules.flatMap((rule) => rule.evidence_types))
  const category = classifyDomain(text)

  return {
    included,
    inclusion_reason: included
      ? `Included by ${includeRules.map((rule) => rule.label).join(', ')} with source evidence: ${evidenceTypes.join(', ')}.`
      : '',
    exclusion_reason: exclusionReason,
    matched_include_rules: includeRules.map((rule) => rule.id),
    matched_exclude_rules: excludeRules.map((rule) => rule.id),
    evidence_types: evidenceTypes,
    reform_category: category,
    relevance_score: relevanceScore,
  }
}

function extractArticleBlocks(html) {
  const articleBlocks = Array.from(html.matchAll(/<article\b[\s\S]*?<\/article>/gi), (match) => match[0])
  if (articleBlocks.length > 0) return articleBlocks
  return Array.from(html.matchAll(/<li\b[\s\S]*?<\/li>/gi), (match) => match[0])
}

function maybeParseJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function sourceItemToDecision(source, item, extractedAt, summaryFallback) {
  const classification = classifyReformCandidateText(item.text)
  const sourceUrl = item.sourceUrl ?? source.url

  if (!classification.included) {
    return {
      candidate: null,
      exclusion: {
        title: item.title,
        source_institution: source.institution,
        source_url: sourceUrl,
        source_published_at: item.publishedAt || undefined,
        exclusion_reason: classification.exclusion_reason ?? 'no_policy_measure',
        matched_include_rules: classification.matched_include_rules,
        matched_exclude_rules: classification.matched_exclude_rules,
        relevance_score: classification.relevance_score,
      },
    }
  }

  return {
    candidate: {
      id: `${source.id}-${slugify(`${item.publishedAt}-${item.id ?? ''}-${item.title}`)}`,
      extraction_state: 'source-extracted',
      review_state: 'unreviewed',
      review_status: 'needs_review',
      title: item.title,
      summary: item.summary || summaryFallback,
      domain_tag: categoryToDomainTag(classification.reform_category),
      reform_category: classification.reform_category,
      evidence_types: classification.evidence_types,
      relevance_score: classification.relevance_score,
      inclusion_reason: classification.inclusion_reason,
      matched_include_rules: classification.matched_include_rules,
      source_institution: source.institution,
      source_url: sourceUrl,
      source_published_at: item.publishedAt || undefined,
      extracted_at: extractedAt,
      caveats: [
        'Deterministic extraction from configured source text.',
        'Unreviewed candidate; not an official reviewed policy database entry.',
      ],
    },
    exclusion: null,
  }
}

function categoryToDomainTag(category) {
  const labels = {
    monetary_policy: 'Monetary',
    fiscal_tax: 'Fiscal',
    trade_customs: 'Trade',
    energy_tariffs: 'Energy',
    financial_sector: 'Financial sector',
    soe_privatization: 'SOE',
    social_protection: 'Social protection',
    business_environment: 'Business environment',
    agriculture: 'Agriculture',
    digital_public_admin: 'Digital public administration',
    infrastructure_investment: 'Infrastructure',
    other_policy: 'Policy',
  }
  return labels[category] ?? 'Policy'
}

function extractDecisionsFromGovUzApi(source, payload, extractedAt) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.data)) {
    return { candidates: [], exclusions: [] }
  }

  const decisions = payload.data
    .map((item) => {
      const id = typeof item.id === 'number' || typeof item.id === 'string' ? String(item.id) : ''
      const title = typeof item.title === 'string' ? normalizeWhitespace(item.title) : ''
      const summary = typeof item.anons === 'string' ? normalizeWhitespace(item.anons) : ''
      const publishedAt = typeof item.date === 'string' ? item.date : ''
      const text = `${title} ${summary}`
      return {
        id,
        title,
        summary,
        publishedAt,
        sourceUrl: id ? toAbsoluteUrl(`/en/imv/news/view/${id}`, source.url) : source.url,
        text,
      }
    })
    .filter((item) => item.id && item.title)
    .map((item) =>
      sourceItemToDecision(
        source,
        item,
        extractedAt,
        'Source API did not expose a summary for this configured extraction item.',
      ),
    )

  return {
    candidates: decisions.flatMap((decision) => (decision.candidate ? [decision.candidate] : [])),
    exclusions: decisions.flatMap((decision) => (decision.exclusion ? [decision.exclusion] : [])),
  }
}

function parsePresidentUzDate(value) {
  const match = value.match(/^([0-3]\d)-([01]\d)-(\d{4})$/)
  if (!match) return value
  return `${match[3]}-${match[2]}-${match[1]}`
}

function extractDecisionsFromPresidentUzList(source, html, extractedAt) {
  const matches = Array.from(
    html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]{0,500}?([0-3]\d-[01]\d-\d{4})/gi),
  )
  const decisions = matches
    .map((match) => {
      const title = normalizeWhitespace(match[2])
      return {
        title,
        summary: title,
        publishedAt: parsePresidentUzDate(match[3]),
        sourceUrl: toAbsoluteUrl(match[1], source.url),
        text: title,
      }
    })
    .filter((item) => item.title.length > 20 && !/president of the republic of uzbekistan/i.test(item.title))
    .map((item) =>
      sourceItemToDecision(
        source,
        item,
        extractedAt,
        'President.uz list item did not expose a separate summary in the configured extraction block.',
      ),
    )

  return {
    candidates: decisions.flatMap((decision) => (decision.candidate ? [decision.candidate] : [])),
    exclusions: decisions.flatMap((decision) => (decision.exclusion ? [decision.exclusion] : [])),
  }
}

export function extractCandidateDecisionsFromSource(source, html, extractedAt) {
  if (source.parser === 'president-uz-list') {
    return extractDecisionsFromPresidentUzList(source, html, extractedAt)
  }

  const jsonPayload = maybeParseJson(html)
  const apiDecisions = extractDecisionsFromGovUzApi(source, jsonPayload, extractedAt)
  if (apiDecisions.candidates.length > 0 || apiDecisions.exclusions.length > 0) return apiDecisions

  const decisions = extractArticleBlocks(html)
    .map((block) => {
      const href = firstMatch(block, [/<a\b[^>]*href=["']([^"']+)["']/i])
      const title = normalizeWhitespace(
        firstMatch(block, [
          /<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/i,
          /<a\b[^>]*>([\s\S]*?)<\/a>/i,
        ]),
      )
      const summary = normalizeWhitespace(
        firstMatch(block, [
          /<p\b[^>]*class=["'][^"']*(?:summary|description|excerpt)[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
          /<p\b[^>]*>([\s\S]*?)<\/p>/i,
        ]),
      )
      const publishedAt = firstMatch(block, [
        /<time\b[^>]*datetime=["']([^"']+)["']/i,
        /data-date=["']([^"']+)["']/i,
      ])
      const text = `${title} ${summary}`
      return {
        title,
        summary,
        publishedAt,
        sourceUrl: toAbsoluteUrl(href, source.url),
        text,
      }
    })
    .filter((item) => item.title)
    .map((item) =>
      sourceItemToDecision(
        source,
        item,
        extractedAt,
        'Source page did not expose a summary in the configured extraction block.',
      ),
    )

  return {
    candidates: decisions.flatMap((decision) => (decision.candidate ? [decision.candidate] : [])),
    exclusions: decisions.flatMap((decision) => (decision.exclusion ? [decision.exclusion] : [])),
  }
}

export function extractCandidatesFromSource(source, html, extractedAt) {
  return extractCandidateDecisionsFromSource(source, html, extractedAt).candidates
}

async function readSource(source, fetchSource, fetchImpl = fetch) {
  if (!fetchSource) return readFileSync(source.fixture_path, 'utf8')

  const response = await fetchImpl(source.api_url ?? source.url, {
    headers: {
      Accept: source.api_url ? 'application/json' : 'text/html',
      'User-Agent': 'Uzbekistan-Economic-Policy-Engine/knowledge-hub-intake (+manual-review)',
      ...(source.api_headers ?? {}),
    },
  })
  if (!response.ok) throw new Error(`Failed to fetch ${source.url}: HTTP ${response.status}`)
  return response.text()
}

function sourceDefinitionToArtifactSource(source) {
  return {
    id: source.id,
    institution: source.institution,
    url: source.url,
  }
}

function formatError(error) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}

function sortCandidates(candidates) {
  return candidates.sort((left, right) => {
    const leftDate = left.source_published_at ?? ''
    const rightDate = right.source_published_at ?? ''
    return rightDate.localeCompare(leftDate) || left.title.localeCompare(right.title)
  })
}

function uniqueCandidatesById(candidates) {
  const seen = new Set()
  return candidates.filter((candidate) => {
    if (seen.has(candidate.id)) return false
    seen.add(candidate.id)
    return true
  })
}

function candidateDedupeKey(candidate) {
  const normalizedTitle = candidate.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const publishedDate = candidate.source_published_at?.slice(0, 10) ?? ''
  return `${publishedDate}:${normalizedTitle}`
}

function uniqueCandidatesAcrossSources(candidates) {
  const seen = new Set()
  return candidates.filter((candidate) => {
    const key = candidateDedupeKey(candidate)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function buildKnowledgeHubCandidateArtifactWithDiagnostics(options = {}) {
  const extractedAt = options.extractedAt ?? new Date().toISOString()
  const sources = options.sources ?? REFORM_SOURCE_DEFINITIONS
  const fetchSource = options.fetchSource === true
  const fetchImpl = options.fetchImpl ?? fetch
  const extractionMode = fetchSource
    ? CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE
    : FIXTURE_DEMO_EXTRACTION_MODE
  const sourceResults = await Promise.all(
    sources.map(async (source) => {
      try {
        const html = await readSource(source, fetchSource, fetchImpl)
        const decisions = extractCandidateDecisionsFromSource(source, html, extractedAt)
        const candidates = uniqueCandidatesById(decisions.candidates)
        return {
          ...sourceDefinitionToArtifactSource(source),
          parser: source.parser ?? 'auto',
          fetch_url: source.api_url ?? source.url,
          ok: true,
          candidate_count: candidates.length,
          excluded_count: decisions.exclusions.length,
          exclusions: decisions.exclusions,
          candidates,
        }
      } catch (error) {
        return {
          ...sourceDefinitionToArtifactSource(source),
          parser: source.parser ?? 'auto',
          fetch_url: source.api_url ?? source.url,
          ok: false,
          candidate_count: 0,
          excluded_count: 0,
          exclusions: [],
          candidates: [],
          error: formatError(error),
        }
      }
    }),
  )
  const candidates = uniqueCandidatesAcrossSources(
    uniqueCandidatesById(sortCandidates(sourceResults.flatMap((result) => result.candidates))),
  )
  const sourceFailures = sourceResults
    .filter((result) => !result.ok)
    .map(({ id, institution, url, parser, fetch_url, error }) => ({ id, institution, url, parser, fetch_url, error }))
  const caveats = [
    'This is a deterministic reform-candidate intake artifact.',
    fetchSource
      ? 'Generated from configured source URLs at artifact build time.'
      : 'Fixture/demo mode: generated from checked-in HTML fixtures for deterministic review and smoke testing.',
    'Items are source-extracted and unreviewed; this is not an official reviewed policy database.',
    'The frontend loads this static JSON artifact only and does not scrape source pages in the browser.',
  ]

  if (sourceFailures.length > 0) {
    caveats.push('One or more configured sources failed during this manual intake run; inspect the workflow report before review.')
  }

  const artifact = {
    schema_version: KNOWLEDGE_HUB_SCHEMA_VERSION,
    generated_at: extractedAt,
    generated_by: options.generatedBy ?? 'scripts/knowledge-hub/reform-intake.mjs',
    extraction_mode: extractionMode,
    extraction_mode_label: fetchSource ? 'Configured source fetch' : 'Fixture/demo intake',
    rulebook: REFORM_INTAKE_RULEBOOK,
    sources: sources.map(sourceDefinitionToArtifactSource),
    candidates,
    caveats,
  }

  return {
    artifact,
    candidate_count: candidates.length,
    source_results: sourceResults.map(({ candidates: _candidates, ...result }) => result),
    source_failures: sourceFailures,
  }
}

export async function buildKnowledgeHubCandidateArtifact(options = {}) {
  const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics(options)
  if (diagnostics.source_failures.length > 0) {
    throw new Error(
      `Failed to read ${diagnostics.source_failures.length} Knowledge Hub source(s): ` +
        diagnostics.source_failures.map((failure) => `${failure.id} (${failure.error})`).join('; '),
    )
  }
  return diagnostics.artifact
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const artifact = await buildKnowledgeHubCandidateArtifact({
    fetchSource: args.fetchSource,
    extractedAt: args.extractedAt,
  })

  if (args.writePublicArtifact) {
    writeFileSync(args.output, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')
    console.log(`Wrote Knowledge Hub candidate artifact: ${args.output}`)
  } else {
    console.log(JSON.stringify(artifact, null, 2))
  }
}

if (process.argv[1] && existsSync(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
