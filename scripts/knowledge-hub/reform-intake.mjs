import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const KNOWLEDGE_HUB_SCHEMA_VERSION = 'knowledge-hub-reform-tracker.v1'
export const FIXTURE_DEMO_EXTRACTION_MODE = 'fixture-demo'
export const CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE = 'configured-source-fetch'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..', '..')
const defaultPublicArtifactPath = resolve(repoRoot, 'apps', 'policy-ui', 'public', 'data', 'knowledge-hub.json')
const GOV_UZ_NEWS_API_URL = 'https://api-portal.gov.uz/authorities/news/category?code_name=news&page=1'
const SOURCE_LINK_VALIDATION_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.5',
  'User-Agent': 'Uzbekistan-Economic-Policy-Engine/knowledge-hub-intake (+manual-review)',
}

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
    id: 'president-healthcare-reform-detail',
    institution: 'Official website of the President of the Republic of Uzbekistan',
    url: 'https://president.uz/en/lists/view/9164',
    parser: 'president-uz-detail',
    allow_source_url_as_candidate: true,
    fixture_path: fixturePath('president-healthcare-reform-detail.html'),
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
    candidate_url_prefix: 'https://cbu.uz/en/press_center/news/',
    fixture_path: fixturePath('cbu-policy-news.html'),
  },
  {
    id: 'customs-committee-news',
    institution: 'State Customs Committee of the Republic of Uzbekistan',
    url: 'https://www.customs.uz/en',
    parser: 'html-articles',
    fixture_path: fixturePath('customs-committee-news.html'),
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
  'budget_public_finance',
  'trade_customs',
  'energy_tariffs',
  'financial_sector',
  'soe_privatization',
  'social_protection',
  'business_environment',
  'agriculture',
  'digital_public_admin',
  'infrastructure_investment',
  'industrial_policy',
  'competition_regulation',
  'labor_market',
  'other_policy',
]

export const FIXTURE_DEMO_REFORM_PACKAGES = [
  {
    package_id: 'pkg-healthcare-quality-licensing-private-sector-2026',
    title: 'Healthcare quality, licensing, and private-sector participation reform',
    policy_area: 'Healthcare services and private-sector participation',
    reform_category: 'social_protection',
    current_stage: 'Instructions issued',
    current_stage_date: '2026-05-01',
    next_milestone: 'Revised licensing procedures start',
    next_milestone_date: '2026-07-01',
    responsible_institutions: [
      'Ministry of Health',
      'National Health Insurance Fund',
      'Agency for Attracting Investments and Implementing PPP Projects in Medicine',
    ],
    legal_basis: 'Official presidential instruction package on healthcare quality, licensing, accreditation, and private-sector participation.',
    official_basis: 'Official website of the President of the Republic of Uzbekistan, 1 May 2026.',
    financing_or_incentive: '200 billion soums preferential credit resources; loans up to 10 billion soums',
    source_confidence: 'high',
    why_tracked: 'The official source sets dated licensing, accreditation, state-funded service eligibility, credit, and institutional implementation milestones that affect health-sector service delivery and public financing channels.',
    model_relevance: ['Social spending', 'Private investment', 'Public finance', 'Service-sector productivity'],
    measure_tracks: [
      { id: 'healthcare-licensing-reform', label: 'licensing reform', status: 'instructions issued' },
      { id: 'healthcare-accreditation-state-funded', label: 'accreditation and state-funded service eligibility', status: 'planned' },
      { id: 'healthcare-state-hospital-licensing', label: 'state hospital licensing rollout', status: 'scheduled' },
      { id: 'healthcare-preferential-credit-support', label: 'preferential credit support', status: 'announced' },
      { id: 'healthcare-investment-ppp-agency', label: 'investment and PPP agency setup', status: 'announced' },
    ],
    implementation_milestones: [
      {
        id: 'healthcare-licensing-procedures-start-2026-07-01',
        label: 'revised licensing procedures start',
        date: '2026-07-01',
        date_precision: 'day',
        event_type: 'effective_date',
        responsible_institutions: ['Ministry of Health'],
        evidence_type: 'implementation_program',
        source_event_ids: ['president-healthcare-quality-2026-05-01'],
        confidence: 'high',
        related_next_milestone_ids: ['healthcare-republican-institutions-deadline-2027-04-01'],
      },
      {
        id: 'healthcare-republican-institutions-deadline-2027-04-01',
        label: 'republican institutions licensing deadline',
        date: '2027-04-01',
        date_precision: 'day',
        event_type: 'target_deadline',
        responsible_institutions: ['Ministry of Health', 'Republican medical institutions'],
        evidence_type: 'implementation_program',
        source_event_ids: ['president-healthcare-quality-2026-05-01'],
        confidence: 'high',
        related_next_milestone_ids: ['healthcare-insurance-fund-accreditation-rule-2028'],
      },
      {
        id: 'healthcare-insurance-fund-accreditation-rule-2028',
        label: 'Insurance Fund accreditation purchasing rule starts',
        date: '2028',
        date_precision: 'year',
        event_type: 'effective_date',
        responsible_institutions: ['National Health Insurance Fund', 'Accredited medical organizations'],
        evidence_type: 'implementation_program',
        source_event_ids: ['president-healthcare-quality-2026-05-01'],
        confidence: 'high',
        related_next_milestone_ids: ['healthcare-district-city-licensing-target-2030-12-31'],
      },
      {
        id: 'healthcare-district-city-licensing-target-2030-12-31',
        label: 'district/city licensing target',
        date: '2030-12-31',
        date_precision: 'day',
        event_type: 'target_deadline',
        responsible_institutions: ['Ministry of Health', 'District and city medical associations'],
        evidence_type: 'implementation_program',
        source_event_ids: ['president-healthcare-quality-2026-05-01'],
        confidence: 'high',
      },
    ],
    official_source_events: [
      {
        id: 'president-healthcare-quality-2026-05-01',
        title: 'Presentation on reforms in the healthcare system',
        source_institution: 'Official website of the President of the Republic of Uzbekistan',
        source_url: 'https://president.uz/en/lists/view/9164',
        source_published_at: '2026-05-01',
        evidence_type: 'official_policy_announcement',
        event_type: 'instructions_issued',
        summary: 'Official presidential source describing instructions on licensing, accreditation, state hospital rollout, preferential credit resources, private investment, and the medical PPP agency.',
        source_url_status: 'not_checked_fixture',
      },
    ],
    caveat: 'Fixture/demo reform package for deterministic UI review. It is not configured-source automatic output, not an official legal registry, and does not assert legal force beyond the cited official source.',
  },
]

function healthcarePackageFromSourceEvent(sourceEvent) {
  return {
    package_id: 'pkg-healthcare-quality-licensing-private-sector-2026',
    title: 'Healthcare quality, licensing, and private-sector participation reform',
    policy_area: 'Healthcare services and private-sector participation',
    reform_category: 'social_protection',
    current_stage: 'Instructions issued',
    current_stage_date: sourceEvent.source_published_at,
    next_milestone: 'Revised licensing procedures start',
    next_milestone_date: '2026-07-01',
    responsible_institutions: [
      'Ministry of Health',
      'National Health Insurance Fund',
      'Agency for Attracting Investments and Implementing PPP Projects in Medicine',
    ],
    legal_basis: 'Official presidential instruction package on healthcare quality, licensing, accreditation, and private-sector participation.',
    official_basis: `${sourceEvent.source_institution}, ${sourceEvent.source_published_at}.`,
    financing_or_incentive: '200 billion soums preferential credit resources; loans up to 10 billion soums',
    source_confidence: 'high',
    why_tracked: 'The official source sets dated licensing, accreditation, state-funded service eligibility, credit, and institutional implementation milestones that affect health-sector service delivery and public financing channels.',
    model_relevance: ['Social spending', 'Private investment', 'Public finance', 'Service-sector productivity'],
    measure_tracks: [
      { id: 'healthcare-licensing-reform', label: 'licensing reform', status: 'instructions issued' },
      { id: 'healthcare-accreditation-state-funded', label: 'accreditation and state-funded service eligibility', status: 'planned' },
      { id: 'healthcare-state-hospital-licensing', label: 'state hospital licensing rollout', status: 'scheduled' },
      { id: 'healthcare-preferential-credit-support', label: 'preferential credit support', status: 'announced' },
      { id: 'healthcare-investment-ppp-agency', label: 'investment and PPP agency setup', status: 'announced' },
    ],
    implementation_milestones: [
      {
        id: 'healthcare-licensing-procedures-start-2026-07-01',
        label: 'revised licensing procedures start',
        date: '2026-07-01',
        date_precision: 'day',
        event_type: 'effective_date',
        responsible_institutions: ['Ministry of Health'],
        evidence_type: 'implementation_program',
        source_event_ids: [sourceEvent.id],
        confidence: 'high',
        related_next_milestone_ids: ['healthcare-republican-institutions-deadline-2027-04-01'],
      },
      {
        id: 'healthcare-republican-institutions-deadline-2027-04-01',
        label: 'republican institutions licensing deadline',
        date: '2027-04-01',
        date_precision: 'day',
        event_type: 'target_deadline',
        responsible_institutions: ['Ministry of Health', 'Republican medical institutions'],
        evidence_type: 'implementation_program',
        source_event_ids: [sourceEvent.id],
        confidence: 'high',
        related_next_milestone_ids: ['healthcare-insurance-fund-accreditation-rule-2028'],
      },
      {
        id: 'healthcare-insurance-fund-accreditation-rule-2028',
        label: 'Insurance Fund accreditation purchasing rule starts',
        date: '2028',
        date_precision: 'year',
        event_type: 'effective_date',
        responsible_institutions: ['National Health Insurance Fund', 'Accredited medical organizations'],
        evidence_type: 'implementation_program',
        source_event_ids: [sourceEvent.id],
        confidence: 'high',
        related_next_milestone_ids: ['healthcare-district-city-licensing-target-2030-12-31'],
      },
      {
        id: 'healthcare-district-city-licensing-target-2030-12-31',
        label: 'district/city licensing target',
        date: '2030-12-31',
        date_precision: 'day',
        event_type: 'target_deadline',
        responsible_institutions: ['Ministry of Health', 'District and city medical associations'],
        evidence_type: 'implementation_program',
        source_event_ids: [sourceEvent.id],
        confidence: 'high',
      },
    ],
    official_source_events: [sourceEvent],
    caveat: 'Automatic official-source tracker entry assembled from a verified source event. It is not an official legal registry and does not assert legal force beyond the cited official source.',
  }
}

const INCLUDE_RULE_DEFINITIONS = [
  {
    id: 'legal-or-regulatory-change',
    label: 'Legal or regulatory change',
    description: 'Include legal or policy instruments only when the text identifies an adopted or amended law, decree, resolution, regulation, order, code, legal act, or rule package.',
    weight: 55,
    evidence_types: ['legal_text', 'official_policy_announcement'],
    category: 'other_policy',
    patterns: [
      /\b(?:law on|law of|draft law|new law|decree|resolution|regulation|code|order|amendments?|amended|legal act|normative legal act|rule package|rules amended|rules introduced)\b/i,
    ],
  },
  {
    id: 'adopted-policy-measure',
    label: 'Adopted policy measure',
    description: 'Include explicit adopted measures, approvals, launches, introduced packages, expanded incentives, or entered-into-force changes.',
    weight: 50,
    evidence_types: ['official_policy_announcement', 'implementation_program'],
    category: 'other_policy',
    patterns: [
      /\b(?:adopted|approved|enacted|introduced|expands|expanded|abolished|reduced|launched|implemented|entered into force|came into force|signed into law|approves measures|approved measures)\b/i,
    ],
  },
  {
    id: 'monetary-or-financial-parameter',
    label: 'Monetary or financial-sector parameter',
    description: 'Include monetary or financial-sector parameter changes, not previews, analytical material, or future policy-rate meetings.',
    weight: 50,
    evidence_types: ['regulatory_parameter_change', 'official_policy_announcement'],
    category: 'monetary_policy',
    patterns: [
      /\b(?:policy[- ]rate|refinancing rate|reserve requirement|capital requirement|liquidity requirement|prudential ratio|foreign[- ]currency deposit requirement|fx-market rule|payment-system rule|banking regulation|microfinance regulation|microcredit regulation)\b.{0,90}\b(?:changed|increased|decreased|cut|hiked|reduced|adjusted|set|kept|maintained|raised|lowered|introduced|amended)\b/i,
      /\b(?:changed|increased|decreased|cut|hiked|reduced|adjusted|set|kept|maintained|raised|lowered|introduced|amended)\b.{0,90}\b(?:policy[- ]rate|refinancing rate|reserve requirement|capital requirement|liquidity requirement|prudential ratio|foreign[- ]currency deposit requirement|fx-market rule|payment-system rule|banking regulation|microfinance regulation|microcredit regulation)\b/i,
    ],
  },
  {
    id: 'fiscal-tax-budget-measure',
    label: 'Fiscal, tax, budget, subsidy, or tariff measure',
    description: 'Include explicit fiscal, tax, budget, subsidy, duty, tariff, incentive, compensation, or fiscal-monitoring measures with an adopted or parameterized change.',
    weight: 50,
    evidence_types: ['budget_tax_measure', 'regulatory_parameter_change'],
    category: 'fiscal_tax',
    patterns: [
      /\b(?:tax|excise|duty|budget|public finance|fiscal|subsidy|subsidies|tariff|compensation|fiscal monitoring|allocation|incentive|incentives)\b.{0,100}\b(?:introduced|amended|approved|adopted|expands|expanded|reduced|abolished|adjusted|parameter|parameters|rate|threshold|requirement|requirements)\b/i,
      /\b(?:introduced|amended|approved|adopted|expands|expanded|reduced|abolished|adjusted)\b.{0,100}\b(?:tax|excise|duty|budget|subsidy|subsidies|tariff|compensation|fiscal monitoring|allocation|incentive|incentives)\b/i,
    ],
  },
  {
    id: 'trade-customs-modernization',
    label: 'Trade or customs modernization',
    description: 'Include adopted trade, customs, border, declaration, WTO, or market-access measures, not general trade or customs news.',
    weight: 45,
    evidence_types: ['official_policy_announcement', 'implementation_program'],
    category: 'trade_customs',
    patterns: [
      /\b(?:customs|border clearance|risk-based clearance|electronic declaration|electronic declarations|trade corridor|import|export|wto|market access)\b.{0,100}\b(?:introduced|approved|adopted|amended|implemented|launched|rules|measures|schedule|schedule adopted)\b/i,
      /\b(?:introduced|approved|adopted|amended|implemented|launched|approves measures)\b.{0,100}\b(?:customs|border clearance|risk-based clearance|electronic declaration|electronic declarations|trade corridor|import|export|wto|market access)\b/i,
    ],
  },
  {
    id: 'structural-implementation-program',
    label: 'Structural implementation program',
    description: 'Include implementation updates tied to a named reform, law, resolution, strategy, master plan, roadmap, program, project, or adopted package.',
    weight: 45,
    evidence_types: ['implementation_program', 'official_policy_announcement'],
    category: 'business_environment',
    patterns: [
      /\b(?:implementation|implemented|launched|rollout|roll-out|phase|stage|package)\b.{0,100}\b(?:reform|program|programme|strategy|master plan|roadmap|resolution|decree|law|project|rules|legal amendments|special economic zones|green economic development)\b/i,
      /\b(?:reform|program|programme|strategy|master plan|roadmap|resolution|decree|law|project|rules|legal amendments|special economic zones|green economic development)\b.{0,100}\b(?:implementation|implemented|launched|rollout|roll-out|phase|stage|package|measures)\b/i,
    ],
  },
  {
    id: 'binding-international-financing-or-agreement',
    label: 'Binding international financing or agreement',
    description: 'Include signed grants, loans, and donor financing only when tied to a named adopted reform, program, master plan, or roadmap with implementation measures.',
    weight: 55,
    evidence_types: ['international_agreement', 'implementation_program'],
    category: 'infrastructure_investment',
    patterns: [
      /\b(?:agreement was signed|signed agreement|grant agreement|loan agreement|financing agreement|program agreement|signed\b.{0,60}\b(?:grant|loan|financing))\b.{0,180}\b(?:adopted|approved|named|under|within|as part of|for implementation of|to implement)\b.{0,120}\b(?:reform|program|programme|master plan|roadmap)\b.{0,140}\b(?:implementation measures|implementation of measures|measures for implementation|action plan|to implement|implementation roadmap)\b/i,
      /\b(?:implementation measures|implementation of measures|measures for implementation|action plan|to implement|implementation roadmap)\b.{0,140}\b(?:adopted|approved|named|under|within|as part of|for implementation of)\b.{0,120}\b(?:reform|program|programme|master plan|roadmap)\b.{0,180}\b(?:agreement was signed|signed agreement|grant agreement|loan agreement|financing agreement|program agreement|signed\b.{0,60}\b(?:grant|loan|financing))\b/i,
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
      /\b(meeting held|meeting was held|board meeting|discussions held|discussions on cooperation|talks were held|roundtable discussion|roundtable was held|met with|visit of|on the sidelines|personal reception)\b/i,
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
    description: 'Exclude trainings, calendars, awareness weeks, conferences, seminars, workshops, and public outreach even when they refer to an existing reform or resolution.',
    reason: 'training_or_outreach_only',
    overridable_by_policy_measure: false,
    patterns: [
      /\b(training|calendar|seminar|workshop|financial literacy|awareness|conference|forum)\b/i,
    ],
  },
  {
    id: 'analytical-report-only',
    label: 'Analytical report only',
    description: 'Exclude analytical reports, indicator reviews, monitoring notes, and statistics releases without an adopted measure or implementation update.',
    reason: 'analytical_report_only',
    overridable_by_policy_measure: false,
    patterns: [
      /\b(analytical report|analysis report|indicator review|target indicators|statistics release|published materials|inflation conditions|growth rate)\b/i,
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
  {
    id: 'generic-announcement-without-action',
    label: 'Generic announcement without action',
    description: 'Exclude previews, future discussions, draft consultations, generic announcements, and published materials without an adopted measure or parameterized instrument.',
    reason: 'generic_announcement_without_policy_action',
    overridable_by_policy_measure: true,
    patterns: [
      /\b(will be discussed|to be discussed|announced for the next|upcoming rate decision|consultation opens|invited comments|public comment|stakeholder feedback|prospects|priorities reviewed)\b/i,
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
    id: 'analytical_report_only',
    description: 'The item is an analytical report, indicator review, monitoring note, or statistics release without an adopted reform measure.',
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
    id: 'generic_announcement_without_policy_action',
    description: 'The item previews future activity, consultation, or generic priorities without an adopted measure, instrument, parameter change, or named implementation update.',
  },
  {
    id: 'low_relevance_score',
    description: 'The text matched weak signals but not enough evidence for intake.',
  },
  {
    id: 'source_link_unusable',
    description: 'The item did not expose a stable item-level source link.',
  },
]

export const REFORM_INTAKE_RULEBOOK = {
  version: 'knowledge-hub-reform-intake-rulebook.v2',
  actual_reform_definition:
    'Actual reform requires a legal or policy instrument, an explicit adopted measure, a parameter change, or an implementation update tied to a named reform, law, resolution, strategy, program, project, master plan, roadmap, or adopted package.',
  include_rules: INCLUDE_RULE_DEFINITIONS.map(({ patterns: _patterns, ...rule }) => rule),
  exclude_rules: EXCLUDE_RULE_DEFINITIONS.map(({ patterns: _patterns, ...rule }) => rule),
  evidence_types: REFORM_EVIDENCE_TYPES,
  reform_categories: REFORM_CATEGORIES,
  relevance_scoring: {
    range: [0, 100],
    include_threshold: 50,
    hard_gate:
      'Domain relevance alone is insufficient. A candidate must match at least one include rule and at least one hard reform signal: instrument, adopted measure, parameter change, named implementation update, or binding financing program.',
    high_relevance: '70-100: explicit adopted legal, regulatory, budget, monetary, trade, binding financing program, or implementation measure.',
    medium_relevance: '50-69: hard reform candidate with a single adopted instrument, measure, parameter, implementation, or binding financing program signal.',
    low_relevance: '0-49: generic news, routine activity, reports, training, cooperation, consultations, or insufficient hard reform evidence.',
  },
  exclusion_reasons: REFORM_EXCLUSION_REASONS,
}

const ACTUAL_REFORM_SIGNAL_DEFINITIONS = [
  {
    id: 'legal_or_policy_instrument',
    patterns: [
      /\b(?:law on|law of|draft law|new law|decree|resolution|regulation|code|order|legal act|normative legal act|rule package|rules amended|rules introduced)\b/i,
    ],
  },
  {
    id: 'adopted_measure',
    patterns: [
      /\b(?:adopted|approved|enacted|introduced|expands|expanded|abolished|reduced|launched|implemented|entered into force|came into force|signed into law|approves measures|approved measures)\b/i,
    ],
  },
  {
    id: 'parameter_change',
    patterns: [
      /\b(?:rate|tariff|duty|excise|tax|reserve requirement|requirement|threshold|quota|allocation|incentive|incentives|compensation)\b.{0,80}\b(?:\d+(?:[.,]\d+)?\s*(?:%|percent|percentage points?|pp|basis points?|bps|million|billion|trillion|€|\$|uzs|sum)|parameters?|adjusted|expands|expanded|introduced|amended|approved|reduced|raised|lowered)\b/i,
      /\b(?:\d+(?:[.,]\d+)?\s*(?:%|percent|percentage points?|pp|basis points?|bps|million|billion|trillion|€|\$|uzs|sum)|parameters?|adjusted|expands|expanded|introduced|amended|approved|reduced|raised|lowered)\b.{0,80}\b(?:rate|tariff|duty|excise|tax|reserve requirement|requirement|threshold|quota|allocation|incentive|incentives|compensation)\b/i,
    ],
  },
  {
    id: 'binding_financing_program',
    patterns: [
      /\b(?:agreement was signed|signed agreement|grant agreement|loan agreement|financing agreement|program agreement|signed\b.{0,60}\b(?:grant|loan|financing))\b.{0,180}\b(?:adopted|approved|named|under|within|as part of|for implementation of|to implement)\b.{0,120}\b(?:reform|program|programme|master plan|roadmap)\b.{0,140}\b(?:implementation measures|implementation of measures|measures for implementation|action plan|to implement|implementation roadmap)\b/i,
      /\b(?:implementation measures|implementation of measures|measures for implementation|action plan|to implement|implementation roadmap)\b.{0,140}\b(?:adopted|approved|named|under|within|as part of|for implementation of)\b.{0,120}\b(?:reform|program|programme|master plan|roadmap)\b.{0,180}\b(?:agreement was signed|signed agreement|grant agreement|loan agreement|financing agreement|program agreement|signed\b.{0,60}\b(?:grant|loan|financing))\b/i,
    ],
  },
  {
    id: 'named_implementation_update',
    patterns: [
      /\b(?:implementation|implemented|launched|rollout|roll-out|phase|stage|package)\b.{0,100}\b(?:reform|program|programme|strategy|master plan|roadmap|resolution|decree|law|project|rules|legal amendments|special economic zones|green economic development)\b/i,
      /\b(?:reform|program|programme|strategy|master plan|roadmap|resolution|decree|law|project|rules|legal amendments|special economic zones|green economic development)\b.{0,100}\b(?:implementation|implemented|launched|rollout|roll-out|phase|stage|package|measures)\b/i,
    ],
  },
]

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
  if (/(healthcare|medical|clinic|clinics|health insurance|insurance fund|state-funded medical)/.test(normalized)) return 'social_protection'
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
  const actualReformSignals = matchedRules(ACTUAL_REFORM_SIGNAL_DEFINITIONS, text)
  const nonOverridableExcludeRule = excludeRules.find((rule) => rule.overridable_by_policy_measure !== true)
  const hasPolicyMeasure = includeRules.length > 0 && actualReformSignals.length > 0
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
      ? `Included by ${includeRules.map((rule) => rule.label).join(', ')} with hard reform signal(s): ${actualReformSignals.map((rule) => rule.id).join(', ')}; source evidence: ${evidenceTypes.join(', ')}.`
      : '',
    exclusion_reason: exclusionReason,
    matched_include_rules: includeRules.map((rule) => rule.id),
    matched_exclude_rules: excludeRules.map((rule) => rule.id),
    matched_actual_reform_signals: actualReformSignals.map((rule) => rule.id),
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

function normalizeUrlForComparison(value) {
  try {
    const parsed = new URL(value)
    parsed.hash = ''
    return parsed.href.replace(/\/$/, '')
  } catch {
    return ''
  }
}

function isUsableCandidateSourceUrl(source, sourceUrl) {
  if (!sourceUrl || sourceUrl.endsWith('#')) return false
  const normalizedSourceUrl = normalizeUrlForComparison(sourceUrl)
  if (!normalizedSourceUrl) return false
  if (normalizedSourceUrl === normalizeUrlForComparison(source.url) && !source.allow_source_url_as_candidate) return false
  if (source.candidate_url_prefix && !sourceUrl.startsWith(source.candidate_url_prefix)) return false
  return true
}

function govUzAuthorityViewUrl(source, id) {
  let authorityCode = typeof source.api_headers?.code === 'string' ? source.api_headers.code : ''
  if (!authorityCode) {
    try {
      const match = new URL(source.url).pathname.match(/^\/en\/([^/]+)\/news\//)
      authorityCode = match?.[1] ?? ''
    } catch {
      authorityCode = ''
    }
  }
  if (authorityCode) return toAbsoluteUrl(`/en/${authorityCode}/news/view/${id}`, source.url)
  return toAbsoluteUrl(`/en/news/view/${id}`, source.url)
}

function sourceItemToDecision(source, item, extractedAt, summaryFallback) {
  const sourceUrl = item.sourceUrl ?? source.url

  if (!isUsableCandidateSourceUrl(source, sourceUrl)) {
    return {
      candidate: null,
      exclusion: {
        title: item.title,
        source_institution: source.institution,
        source_url: sourceUrl,
        source_published_at: item.publishedAt || undefined,
        exclusion_reason: 'source_link_unusable',
        matched_include_rules: [],
        matched_exclude_rules: [],
        relevance_score: 0,
      },
    }
  }

  const classification = classifyReformCandidateText(item.text)

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
      extraction_state: 'source_extracted',
      review_state: 'candidate',
      review_status: 'needs_review',
      status: 'unknown',
      title: item.title,
      summary: item.summary || summaryFallback,
      domain_tag: categoryToDomainTag(classification.reform_category),
      domain_tags: [categoryToDomainTag(classification.reform_category)],
      reform_category: classification.reform_category,
      evidence_types: classification.evidence_types,
      relevance_score: classification.relevance_score,
      inclusion_reason: classification.inclusion_reason,
      matched_rules: classification.matched_include_rules,
      matched_include_rules: classification.matched_include_rules,
      source_title: item.title,
      source_institution: source.institution,
      source_owner: source.institution,
      source_url: sourceUrl,
      source_published_at: item.publishedAt || undefined,
      retrieved_at: extractedAt,
      extracted_at: extractedAt,
      citation_permission: 'pending',
      license_class: 'unknown',
      translation_review_state: 'not_translated',
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
        sourceUrl: id ? govUzAuthorityViewUrl(source, id) : source.url,
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
  const match = value.match(/^([0-3]\d)[.-]([01]\d)[.-](\d{4})$/)
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

function extractDecisionsFromPresidentUzDetail(source, html, extractedAt) {
  const title = normalizeWhitespace(
    firstMatch(html, [
      /<meta\b[^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<title\b[^>]*>([\s\S]*?)<\/title>/i,
      /<h1\b[^>]*>([\s\S]*?)<\/h1>/i,
      /<h[2-3]\b[^>]*class=["'][^"']*(?:title|news|article)[^"']*["'][^>]*>([\s\S]*?)<\/h[2-3]>/i,
    ]),
  ).replace(/\s*[-|]\s*.*$/, '')
  const publishedAt = parsePresidentUzDate(
    firstMatch(html, [
      /<time\b[^>]*datetime=["']([^"']+)["']/i,
      /\b([0-3]\d[.-][01]\d[.-]\d{4})\b/i,
    ]),
  )
  const paragraphs = Array.from(html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi), (match) => normalizeWhitespace(match[1]))
    .filter((paragraph) => paragraph.length > 40)
  const fallbackBodyText = normalizeWhitespace(
    firstMatch(html, [/<article\b[^>]*>([\s\S]*?)<\/article>/i, /<main\b[^>]*>([\s\S]*?)<\/main>/i, /<body\b[^>]*>([\s\S]*?)<\/body>/i]) ||
      html,
  )
  const bodyText = paragraphs.length > 0 ? paragraphs.join(' ') : fallbackBodyText
  const summary = bodyText.slice(0, 700)

  if (!title) return { candidates: [], exclusions: [] }

  const decision = sourceItemToDecision(
    source,
    {
      id: 'detail',
      title,
      summary,
      publishedAt,
      sourceUrl: source.url,
      text: `${title} ${bodyText}`,
    },
    extractedAt,
    'President.uz detail page did not expose a separate summary in the configured extraction block.',
  )

  return {
    candidates: decision.candidate ? [decision.candidate] : [],
    exclusions: decision.exclusion ? [decision.exclusion] : [],
  }
}

export function extractCandidateDecisionsFromSource(source, html, extractedAt) {
  if (source.parser === 'president-uz-list') {
    return extractDecisionsFromPresidentUzList(source, html, extractedAt)
  }
  if (source.parser === 'president-uz-detail') {
    return extractDecisionsFromPresidentUzDetail(source, html, extractedAt)
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

function candidateWithRunMetadata(candidate, extractionMode, sourceUrlStatus, extractedAt) {
  return {
    ...candidate,
    extraction_mode: extractionMode,
    source_url_status: sourceUrlStatus,
    ...(sourceUrlStatus === 'verified' ? { source_url_verified_at: extractedAt } : {}),
  }
}

function candidateToSourceEvent(candidate) {
  const text = `${candidate.title} ${candidate.summary}`.toLowerCase()
  return {
    id: candidate.source_url.includes('/9164')
      ? 'president-healthcare-quality-2026-05-01'
      : `source-event-${slugify(`${candidate.source_published_at ?? candidate.id}-${candidate.title}`)}`,
    title: candidate.source_title || candidate.title,
    source_institution: candidate.source_institution,
    source_url: candidate.source_url,
    source_published_at: candidate.source_published_at?.slice(0, 10) ?? candidate.extracted_at?.slice(0, 10) ?? '',
    evidence_type: candidate.evidence_types.includes('official_policy_announcement')
      ? 'official_policy_announcement'
      : candidate.evidence_types[0],
    event_type: text.includes('amended') || text.includes('amendments')
      ? 'amended'
      : text.includes('approved') || text.includes('adopted')
        ? 'approved'
        : text.includes('financing') || text.includes('loan') || text.includes('grant')
          ? 'financing_allocated'
          : text.includes('implemented') || text.includes('launched') || text.includes('introduced')
            ? 'implementation_milestone'
            : 'instructions_issued',
    summary: candidate.summary || candidate.inclusion_reason,
    source_url_status: candidate.source_url_status,
    extracted_at: candidate.extracted_at,
  }
}

function isConfiguredVerifiedCandidate(candidate) {
  if (
    candidate.extraction_mode !== CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE ||
    candidate.source_url_status !== 'verified'
  ) {
    return false
  }

  try {
    const host = new URL(candidate.source_url).hostname.toLowerCase()
    if (/\.test$/i.test(host) || /^(?:example|localhost|127\.0\.0\.1)(?:\.|$)/i.test(host)) return false
    return (
      host === 'president.uz' ||
      host.endsWith('.president.uz') ||
      host === 'lex.uz' ||
      host.endsWith('.lex.uz') ||
      host === 'gov.uz' ||
      host.endsWith('.gov.uz') ||
      host === 'cbu.uz' ||
      host.endsWith('.cbu.uz') ||
      host === 'customs.uz' ||
      host.endsWith('.customs.uz')
    )
  } catch {
    return false
  }
}

function isVerifiedHealthcareSourceEvent(candidate) {
  const text = `${candidate.title} ${candidate.summary} ${candidate.source_url}`.toLowerCase()
  return (
    isConfiguredVerifiedCandidate(candidate) &&
    candidate.source_url.includes('president.uz') &&
    (candidate.source_url.includes('/9164') ||
      (text.includes('healthcare') && text.includes('licensing') && text.includes('private-sector')))
  )
}

const PACKAGE_TOPIC_DEFINITIONS = [
  {
    id: 'customs-clearance-digitalization',
    title: 'Risk-based customs clearance and electronic declaration reform',
    policy_area: 'Trade facilitation and customs digitalization',
    patterns: [/\b(customs|clearance|electronic declaration|single window|risk-based)\b/i],
  },
  {
    id: 'tax-administration-incentives',
    title: 'Tax administration and investment incentive reform',
    policy_area: 'Tax administration and fiscal incentives',
    patterns: [/\b(tax|vat|incentive|incentives|excise|duty)\b/i],
  },
  {
    id: 'energy-tariff-compensation',
    title: 'Energy tariff adjustment and compensation reform',
    policy_area: 'Energy tariffs, household compensation, and fiscal monitoring',
    patterns: [/\b(energy|tariff|gas|electricity|compensation)\b/i],
  },
  {
    id: 'public-services-digital-legal',
    title: 'Digital public service and legal process reform',
    policy_area: 'Digital public administration and legal services',
    patterns: [/\b(public service|notarial|notary|legal service|digital|online)\b/i],
  },
  {
    id: 'investment-climate-sez',
    title: 'Investment climate and special economic zone reform',
    policy_area: 'Investment climate and special economic zones',
    patterns: [/\b(investment climate|special economic zones|investor service|investors?)\b/i],
  },
  {
    id: 'monetary-prudential-parameters',
    title: 'Monetary and financial-sector parameter reform',
    policy_area: 'Monetary policy and prudential regulation',
    patterns: [/\b(policy rate|reserve requirement|prudential|bank|foreign-currency deposit)\b/i],
  },
  {
    id: 'public-administration-legal',
    title: 'Public administration legal framework reform',
    policy_area: 'Public administration and local state power rules',
    patterns: [/\b(local state power|public administration|state power legislation)\b/i],
  },
]

const CATEGORY_PACKAGE_DEFAULTS = {
  monetary_policy: {
    title: 'Monetary and financial-sector policy reform',
    policy_area: 'Monetary policy and financial-sector regulation',
    model_relevance: ['Inflation', 'Credit conditions', 'Financial stability'],
  },
  fiscal_tax: {
    title: 'Fiscal, tax, and budget measure reform',
    policy_area: 'Fiscal policy, tax administration, and budget monitoring',
    model_relevance: ['Fiscal balance', 'Investment', 'Business costs'],
  },
  budget_public_finance: {
    title: 'Public finance management reform',
    policy_area: 'Budget execution and public finance management',
    model_relevance: ['Fiscal balance', 'Public spending', 'Debt dynamics'],
  },
  trade_customs: {
    title: 'Trade and customs modernization reform',
    policy_area: 'Trade facilitation, customs, and market access',
    model_relevance: ['Trade flows', 'Import costs', 'Export competitiveness'],
  },
  energy_tariffs: {
    title: 'Energy tariff and compensation reform',
    policy_area: 'Energy tariffs and social compensation',
    model_relevance: ['Inflation', 'Household income', 'Fiscal costs'],
  },
  financial_sector: {
    title: 'Financial-sector regulatory reform',
    policy_area: 'Banking, payments, and financial-sector regulation',
    model_relevance: ['Credit conditions', 'Financial stability', 'Investment'],
  },
  soe_privatization: {
    title: 'SOE and privatization reform',
    policy_area: 'State-owned enterprise reform and privatization',
    model_relevance: ['Public assets', 'Investment', 'Productivity'],
  },
  social_protection: {
    title: 'Social protection and service delivery reform',
    policy_area: 'Social protection and public service delivery',
    model_relevance: ['Household income', 'Public spending', 'Labor supply'],
  },
  business_environment: {
    title: 'Business environment reform',
    policy_area: 'Business regulation and investment climate',
    model_relevance: ['Private investment', 'Productivity', 'Business costs'],
  },
  agriculture: {
    title: 'Agriculture policy reform',
    policy_area: 'Agriculture, fisheries, and food-sector regulation',
    model_relevance: ['Agricultural output', 'Food prices', 'Rural income'],
  },
  digital_public_admin: {
    title: 'Digital public administration reform',
    policy_area: 'Digital public services and administrative procedures',
    model_relevance: ['Public administration', 'Transaction costs', 'Productivity'],
  },
  infrastructure_investment: {
    title: 'Infrastructure investment program reform',
    policy_area: 'Infrastructure investment and program financing',
    model_relevance: ['Investment', 'Public spending', 'Potential growth'],
  },
  industrial_policy: {
    title: 'Industrial policy reform',
    policy_area: 'Industrial development and sector support',
    model_relevance: ['Industrial output', 'Investment', 'Productivity'],
  },
  competition_regulation: {
    title: 'Competition and market regulation reform',
    policy_area: 'Competition policy and market regulation',
    model_relevance: ['Prices', 'Market structure', 'Productivity'],
  },
  labor_market: {
    title: 'Labor-market reform',
    policy_area: 'Labor-market regulation and workforce measures',
    model_relevance: ['Employment', 'Wages', 'Labor supply'],
  },
  other_policy: {
    title: 'Policy implementation reform',
    policy_area: 'Official policy implementation',
    model_relevance: ['Public administration', 'Investment', 'Growth'],
  },
}

function candidateTopic(candidate) {
  const text = `${candidate.title} ${candidate.summary} ${candidate.inclusion_reason}`.toLowerCase()
  return PACKAGE_TOPIC_DEFINITIONS.find((topic) => topic.patterns.some((pattern) => pattern.test(text))) ?? null
}

function packageAssemblyKey(candidate) {
  const topic = candidateTopic(candidate)
  const category = candidate.reform_category ?? 'other_policy'
  if (topic) return `${category}:${topic.id}`
  return `${category}:${slugify(candidate.title).slice(0, 48)}`
}

function packageDate(candidate) {
  return candidate.source_published_at?.slice(0, 10) ?? candidate.extracted_at?.slice(0, 10) ?? ''
}

function sourceConfidenceForCandidates(candidates) {
  return candidates.every((candidate) => candidate.relevance_score >= 70) ? 'high' : 'medium'
}

function measureLabelFromCandidate(candidate) {
  const text = candidate.title.toLowerCase()
  if (text.includes('amend')) return 'amended rules'
  if (text.includes('approved')) return 'approved measures'
  if (text.includes('introduced')) return 'introduced rules'
  if (text.includes('expanded') || text.includes('expands')) return 'expanded incentives'
  if (text.includes('launched')) return 'launched implementation'
  return 'verified official measure'
}

function financingOrIncentiveFromCandidates(candidates) {
  const candidate = candidates.find((item) => /\b(financing|grant|loan|tax incentive|incentives|allocation|subsidy|compensation)\b/i.test(`${item.title} ${item.summary}`))
  if (!candidate) return undefined
  if (/\btax incentive|incentives\b/i.test(candidate.title)) return 'Tax incentive measure identified in verified official source event'
  if (/\bcompensation\b/i.test(`${candidate.title} ${candidate.summary}`)) return 'Compensation measure identified in verified official source event'
  return 'Financing or incentive measure identified in verified official source event'
}

function genericPackageFromCandidateGroup(candidates) {
  const sortedCandidates = [...candidates].sort((left, right) => packageDate(left).localeCompare(packageDate(right)))
  const first = sortedCandidates[0]
  const latest = sortedCandidates[sortedCandidates.length - 1]
  const topic = candidateTopic(first)
  const category = first.reform_category ?? 'other_policy'
  const defaults = CATEGORY_PACKAGE_DEFAULTS[category] ?? CATEGORY_PACKAGE_DEFAULTS.other_policy
  const sourceEvents = sortedCandidates.map(candidateToSourceEvent)
  const currentStageDate = packageDate(latest)
  const packageSlug = topic?.id ?? slugify(`${first.reform_category}-${first.title}`)
  const confidence = sourceConfidenceForCandidates(sortedCandidates)
  const milestones = sourceEvents.map((event, index) => ({
    id: `${packageSlug}-${event.event_type}-${event.source_published_at || index + 1}`,
    label: event.event_type === 'approved'
      ? 'official measure approved'
      : event.event_type === 'amended'
        ? 'rules amended'
        : event.event_type === 'implementation_milestone'
          ? 'implementation measure recorded'
          : event.event_type === 'financing_allocated'
            ? 'financing or incentive measure recorded'
            : 'official measure recorded',
    date: event.source_published_at,
    date_precision: 'day',
    event_type: event.event_type,
    responsible_institutions: [event.source_institution],
    evidence_type: event.evidence_type,
    source_event_ids: [event.id],
    confidence,
    ...(index < sourceEvents.length - 1
      ? { related_next_milestone_ids: [`${packageSlug}-${sourceEvents[index + 1].event_type}-${sourceEvents[index + 1].source_published_at || index + 2}`] }
      : {}),
  }))

  return {
    package_id: `pkg-${packageSlug}-${currentStageDate || slugify(first.source_institution)}`,
    title: topic?.title ?? defaults.title,
    policy_area: topic?.policy_area ?? defaults.policy_area,
    reform_category: category,
    current_stage: sortedCandidates.length > 1 ? 'Multiple verified source events' : 'Verified official measure',
    current_stage_date: currentStageDate,
    next_milestone: milestones[0]?.label ?? 'official measure recorded',
    next_milestone_date: milestones[0]?.date ?? currentStageDate,
    responsible_institutions: uniqueStrings(sortedCandidates.map((candidate) => candidate.source_institution)),
    legal_basis: `Verified official source event${sourceEvents.length > 1 ? 's' : ''}: ${sourceEvents.map((event) => event.title).join('; ')}.`,
    official_basis: uniqueStrings(sourceEvents.map((event) => event.source_institution)).join('; '),
    financing_or_incentive: financingOrIncentiveFromCandidates(sortedCandidates),
    source_confidence: confidence,
    why_tracked: `The package is assembled from ${sourceEvents.length} verified official source event${sourceEvents.length > 1 ? 's' : ''} with legal, fiscal, regulatory, parameter, or implementation evidence accepted by the intake rulebook.`,
    model_relevance: defaults.model_relevance,
    measure_tracks: sortedCandidates.map((candidate, index) => ({
      id: `${packageSlug}-measure-${index + 1}`,
      label: measureLabelFromCandidate(candidate),
      status: candidateToSourceEvent(candidate).event_type === 'approved' ? 'approved' : 'source verified',
    })),
    implementation_milestones: milestones,
    official_source_events: sourceEvents,
    caveat: 'Automatic official-source tracker entry assembled from verified source events. It is not an official legal registry and does not assert legal force beyond the cited official sources.',
  }
}

export function assembleReformPackagesFromCandidates(candidates) {
  const verifiedCandidates = candidates.filter(isConfiguredVerifiedCandidate)
  const healthcarePackages = verifiedCandidates
    .filter(isVerifiedHealthcareSourceEvent)
    .slice(0, 1)
    .map((candidate) => healthcarePackageFromSourceEvent(candidateToSourceEvent(candidate)))
  const genericGroups = new Map()

  for (const candidate of verifiedCandidates.filter((item) => !isVerifiedHealthcareSourceEvent(item))) {
    const key = packageAssemblyKey(candidate)
    genericGroups.set(key, [...(genericGroups.get(key) ?? []), candidate])
  }

  const genericPackages = Array.from(genericGroups.values())
    .map(genericPackageFromCandidateGroup)
    .sort((left, right) => right.current_stage_date.localeCompare(left.current_stage_date))

  return [...healthcarePackages, ...genericPackages]
}

async function validateCandidateSourceLink(candidate, fetchImpl) {
  try {
    const host = new URL(candidate.source_url).hostname
    if (/\.test$/i.test(host) || /^(?:example|localhost|127\.0\.0\.1)(?:\.|$)/i.test(host)) {
      return { ok: false, error: 'Synthetic or local candidate source host' }
    }
    const response = await fetchImpl(candidate.source_url, {
      method: 'GET',
      headers: SOURCE_LINK_VALIDATION_HEADERS,
    })
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` }
    }
    return { ok: true, error: null }
  } catch (error) {
    return { ok: false, error: formatError(error) }
  }
}

async function validateCandidateSourceLinks(candidates, { fetchSource, fetchImpl, extractionMode, extractedAt }) {
  if (!fetchSource) {
    return {
      candidates: candidates.map((candidate) =>
        candidateWithRunMetadata(candidate, extractionMode, 'not_checked_fixture', extractedAt),
      ),
      exclusions: [],
    }
  }

  const decisions = await Promise.all(
    candidates.map(async (candidate) => {
      const sourceLink = await validateCandidateSourceLink(candidate, fetchImpl)
      if (sourceLink.ok) {
        return {
          candidate: candidateWithRunMetadata(candidate, extractionMode, 'verified', extractedAt),
          exclusion: null,
        }
      }

      return {
        candidate: null,
        exclusion: {
          title: candidate.title,
          source_institution: candidate.source_institution,
          source_url: candidate.source_url,
          source_published_at: candidate.source_published_at,
          exclusion_reason: 'source_link_unusable',
          matched_include_rules: candidate.matched_include_rules ?? candidate.matched_rules,
          matched_exclude_rules: [],
          relevance_score: candidate.relevance_score,
          source_url_error: sourceLink.error,
        },
      }
    }),
  )

  return {
    candidates: decisions.flatMap((decision) => (decision.candidate ? [decision.candidate] : [])),
    exclusions: decisions.flatMap((decision) => (decision.exclusion ? [decision.exclusion] : [])),
  }
}

function sourceResultToArtifactDiagnostic(result) {
  const diagnostic = {
    id: result.id,
    institution: result.institution,
    url: result.url,
    parser: result.parser,
    fetch_url: result.fetch_url,
    ok: result.ok,
    candidate_count: result.candidate_count,
    excluded_count: result.excluded_count,
    link_invalid_count: result.link_invalid_count,
    fetched_at: result.fetched_at,
  }
  if (result.error) diagnostic.error = result.error
  return diagnostic
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
        const linkValidation = await validateCandidateSourceLinks(uniqueCandidatesById(decisions.candidates), {
          fetchSource,
          fetchImpl,
          extractionMode,
          extractedAt,
        })
        const exclusions = [...decisions.exclusions, ...linkValidation.exclusions]
        return {
          ...sourceDefinitionToArtifactSource(source),
          parser: source.parser ?? 'auto',
          fetch_url: source.api_url ?? source.url,
          ok: true,
          candidate_count: linkValidation.candidates.length,
          excluded_count: exclusions.length,
          link_invalid_count: linkValidation.exclusions.length,
          fetched_at: extractedAt,
          exclusions,
          candidates: linkValidation.candidates,
        }
      } catch (error) {
        return {
          ...sourceDefinitionToArtifactSource(source),
          parser: source.parser ?? 'auto',
          fetch_url: source.api_url ?? source.url,
          ok: false,
          candidate_count: 0,
          excluded_count: 0,
          link_invalid_count: 0,
          fetched_at: extractedAt,
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
  const reformPackages = Array.isArray(options.reformPackages)
    ? options.reformPackages
    : fetchSource
      ? assembleReformPackagesFromCandidates(candidates)
      : FIXTURE_DEMO_REFORM_PACKAGES
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
    source_diagnostics: sourceResults.map(sourceResultToArtifactDiagnostic),
    reform_packages: reformPackages,
    accepted_reforms: [],
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
