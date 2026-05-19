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
    follow_detail_links: true,
    fixture_path: fixturePath(fixture),
  }
}

export const REFORM_SOURCE_DEFINITIONS = [
  {
    id: 'lex-official-legal-acts',
    institution: 'National Database of Legislation of the Republic of Uzbekistan (Lex.uz)',
    url: 'https://lex.uz/uz/search/official?lang=4&pub_date=month',
    parser: 'lexuz-official-search',
    follow_detail_links: true,
    fixture_path: fixturePath('lex-official-legal-acts.html'),
  },
  {
    id: 'president-reform-news',
    institution: 'Official website of the President of the Republic of Uzbekistan',
    url: 'https://president.uz/en/lists/news',
    parser: 'president-uz-list',
    follow_detail_links: true,
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
    id: 'gov-housing-urbanization-detail',
    institution: 'Government portal of the Republic of Uzbekistan',
    url: 'https://gov.uz/en/news/view/153724',
    parser: 'official-detail',
    allow_source_url_as_candidate: true,
    fixture_path: fixturePath('gov-housing-urbanization-detail.html'),
  },
  {
    id: 'gov-agriculture-subsidy-detail',
    institution: 'Government portal of the Republic of Uzbekistan',
    url: 'https://gov.uz/en/news/view/109178',
    parser: 'official-detail',
    allow_source_url_as_candidate: true,
    fixture_path: fixturePath('gov-agriculture-subsidy-detail.html'),
  },
  {
    id: 'gov-portal-reform-news',
    institution: 'Government portal of the Republic of Uzbekistan',
    url: 'https://gov.uz/en/news/news',
    parser: 'html-articles',
    follow_detail_links: true,
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

export const RESEARCH_SOURCE_DEFINITIONS = [
  {
    id: 'imf-working-papers-repec',
    institution: 'International Monetary Fund',
    url: 'https://ideas.repec.org/s/imf/imfwpa.html',
    parser: 'research-repec-series',
    detail_fetch_limit: 12,
  },
  {
    id: 'world-bank-policy-research-working-papers-repec',
    institution: 'World Bank',
    url: 'https://ideas.repec.org/s/wbk/wbrwps.html',
    parser: 'research-repec-series',
    detail_fetch_limit: 12,
  },
  {
    id: 'adb-economics-working-papers-repec',
    institution: 'Asian Development Bank',
    url: 'https://ideas.repec.org/s/ris/adbewp.html',
    parser: 'research-repec-series',
    detail_fetch_limit: 12,
  },
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

const HEALTHCARE_PACKAGE_DEPTH = {
  short_summary:
    'Healthcare package changes licensing, accreditation, state purchasing, private-clinic financing, and medical PPP delivery.',
  parameters_or_amounts: [
    'From 2026-07-01, medical licensing procedures change.',
    'Private healthcare projects may receive preferential loans up to 10 billion soums; total credit resources are 200 billion soums.',
    'Republican medical institutions must complete licensing by 2027-04-01; district and city medical associations by 2030-12-31.',
    'From 2028, Insurance Fund purchases move to accredited medical organizations.',
  ],
  policy_channels: [
    'Public health service purchasing',
    'Private medical investment',
    'Healthcare licensing and accreditation',
    'Preferential credit and PPP delivery',
  ],
}

const HOUSING_URBANIZATION_PACKAGE_DEPTH = {
  short_summary:
    'Construction and housing package cuts permit and utility procedures and sets 2026 housing and infrastructure targets.',
  parameters_or_amounts: [
    'From 2026-07-01, utility technical specifications move to one application and one payment.',
    'Construction-permit requirements, timelines, and payments are to be cut by at least 50 percent.',
    '140,000 regional apartments are targeted for commissioning in 2026.',
    '1.4 trillion soums are planned for Yangi Uzbekistan residential infrastructure; state-client KPI evaluation starts 2026-06-01.',
  ],
  policy_channels: [
    'Construction permitting',
    'Utility connection cost and timing',
    'Public infrastructure spending',
    'Housing supply delivery',
  ],
}

const AGRICULTURE_SUBSIDY_PACKAGE_DEPTH = {
  short_summary:
    'Agriculture financing package creates a payment agency and moves subsidy delivery to digital channels.',
  parameters_or_amounts: [
    'Agricultural Payments Agency is established to administer subsidies and payments.',
    'An additional 5 trillion soums is proposed for agrotechnical measures; subsidy delivery moves through Agroportal and Agrosubsidy.',
    'A “discipline-cheaper credit” model links lower interest rates to producer credit ratings.',
    'Subsidy and payment workflows move to digital and proactive delivery channels.',
  ],
  policy_channels: [
    'Agricultural producer finance',
    'Subsidy delivery administration',
    'Rural liquidity',
    'Food-supply conditions',
  ],
}

const NO_FUTURE_MILESTONE_LABEL = 'No future milestone published in verified source'

const MODEL_IMPACT_ACTIVE_LENSES = [
  {
    id: 'QPM',
    label: 'Quarterly Projection Model',
    status: 'possible_lens',
    caveat: 'Use for monetary, inflation, output-gap, and macro-transmission framing only.',
  },
  {
    id: 'DFM',
    label: 'Dynamic Factor Model',
    status: 'possible_lens',
    caveat: 'Use for nowcasting and high-frequency indicator context only.',
  },
  {
    id: 'I-O',
    label: 'Input-output model',
    status: 'possible_lens',
    caveat: 'Use for sector linkage and final-demand shock propagation only.',
  },
  {
    id: 'PE',
    label: 'Partial-equilibrium trade',
    status: 'possible_lens',
    caveat: 'Use for direct tariff-incidence and trade-flow framing only.',
  },
]

const MODEL_IMPACT_GATED_LENSES = [
  { id: 'CGE', label: 'Computable general equilibrium', status: 'planned_gated', caveat: 'Not active in public outputs.' },
  { id: 'FPP', label: 'Fiscal programming', status: 'planned_gated', caveat: 'Not active in public outputs.' },
  { id: 'HFI', label: 'High-frequency indicators', status: 'planned_gated', caveat: 'Not active in public outputs.' },
  { id: 'Synthesis', label: 'Cross-model synthesis', status: 'planned_gated', caveat: 'Not active in public outputs.' },
]

const RESEARCH_MODEL_RULES = [
  {
    model_ids: ['QPM'],
    methods: ['Quarterly projection model', 'monetary policy model', 'scenario analysis'],
    topic: 'QPM scenario design and monetary transmission',
    why_relevant:
      'Useful for benchmarking semi-structural monetary-policy scenarios before platform model results are cited.',
    patterns: [
      /\bquarterly projection model\b/i,
      /\bqpm\b/i,
      /\bforecasting and policy analysis system\b/i,
      /\bmonetary policy model\b/i,
      /\bmacro(?:economic)? model\b/i,
      /\bmacro(?:economic)? forecasting framework\b/i,
      /\bsemi[-\s]?structural model/i,
    ],
  },
  {
    model_ids: ['DFM'],
    methods: ['Dynamic factor model', 'nowcasting', 'forecast evaluation'],
    topic: 'Nowcasting and high-frequency monitoring',
    why_relevant:
      'Useful for comparing nowcast methods and indicator use around the DFM lane.',
    patterns: [
      /\bdynamic factor model\b/i,
      /\bfactor model\b/i,
      /\bnowcast(?:ing)?\b/i,
      /\bbridge model\b/i,
      /\bhigh[-\s]?frequency indicator/i,
    ],
  },
  {
    model_ids: ['I-O'],
    methods: ['Input-output tables', 'sector linkages', 'value-added trade'],
    topic: 'Input-output linkages and value-added trade',
    why_relevant:
      'Useful for benchmarking sector-linkage and trade-exposure assumptions in the I-O lane.',
    patterns: [
      /\binput[-\s]?output\b/i,
      /\binter[-\s]?country input[-\s]?output\b/i,
      /\btiva\b/i,
      /\bvalue[-\s]?added trade\b/i,
      /\bglobal value chains?\b/i,
      /\bsector linkages?\b/i,
    ],
  },
  {
    model_ids: ['CGE'],
    methods: ['Computable general equilibrium', 'policy simulation'],
    topic: 'CGE policy-simulation methods',
    why_relevant:
      'Useful as a literature watch item while CGE remains gated in public outputs.',
    patterns: [/\bcge\b/i, /\bcomputable general equilibrium\b/i],
  },
  {
    model_ids: ['PE'],
    methods: ['Partial-equilibrium model', 'trade policy simulation'],
    topic: 'Partial-equilibrium trade policy methods',
    why_relevant:
      'Useful as a literature watch item while PE remains gated in public outputs.',
    patterns: [/\bpartial[-\s]?equilibrium\b/i, /\btrade policy simulation\b/i],
  },
  {
    model_ids: ['FPP'],
    methods: ['Fiscal programming', 'debt sustainability', 'medium-term fiscal framework'],
    topic: 'Fiscal programming and debt-sustainability methods',
    why_relevant:
      'Useful as a literature watch item while FPP remains gated in public outputs.',
    patterns: [
      /\bfiscal programming\b/i,
      /\bdebt sustainability\b/i,
      /\bmedium[-\s]?term fiscal framework\b/i,
      /\bmacro[-\s]?fiscal\b/i,
      /\bfiscal framework\b/i,
      /\bpublic debt trajectories\b/i,
    ],
  },
  {
    model_ids: ['HFI'],
    methods: ['High-frequency indicators', 'real-time monitoring'],
    topic: 'High-frequency indicator monitoring',
    why_relevant:
      'Useful as a literature watch item while HFI remains gated in public outputs.',
    patterns: [/\bhigh[-\s]?frequency\b/i, /\breal[-\s]?time monitor/i],
  },
]

export const STATIC_RESEARCH_UPDATES = [
  {
    id: 'research-qpm-tonga-2025',
    title: 'Quarterly projection model customized for small open-economy policy scenarios',
    topic: 'QPM scenario design for monetary transmission and external shocks',
    summary:
      'The paper adapts a QPM to a small open economy and uses scenario shocks for financial stress, natural disaster, and external-demand risk. The design is useful for deciding how country-specific transmission channels should enter a CERR-style QPM workspace.',
    model_ids: ['QPM'],
    methods: ['Quarterly projection model', 'calibration', 'scenario analysis', 'monetary transmission'],
    source_title: 'A Quarterly Projection Model for Tonga',
    source_institution: 'International Monetary Fund',
    source_url: 'https://www.imf.org/en/Publications/WP/Issues/2025/06/20/A-Quarterly-Projection-Model-for-Tonga-567845',
    published_at: '2025-06-20',
    geography: 'Tonga',
    why_relevant:
      'Shows how a compact QPM can be adapted for policy-relevant shocks when data and institutional structure differ from larger economies.',
  },
  {
    id: 'research-dfm-nowcasting-model-comparison-2025',
    title: 'GDP nowcasting comparison confirms bridge and dynamic-factor models as strong baselines',
    topic: 'Nowcasting method selection for short GDP series and high-frequency indicators',
    summary:
      'The study compares traditional econometric and machine-learning approaches across simulations and country cases. It finds bridge and dynamic-factor methods among the strongest empirical baselines, especially when data histories are limited.',
    model_ids: ['DFM'],
    methods: ['Dynamic factor model', 'bridge model', 'forecast evaluation', 'high-frequency indicators'],
    source_title: 'GDP Nowcasting Performance of Traditional Econometric Models vs Machine-Learning Algorithms',
    source_institution: 'International Monetary Fund',
    source_url:
      'https://www.imf.org/en/Publications/WP/Issues/2025/12/05/GDP-Nowcasting-Performance-of-Traditional-Econometric-Models-vs-Machine-Learning-572360',
    published_at: '2025-12-05',
    why_relevant:
      'Supports keeping the platform nowcast lane interpretable and benchmarked before adding heavier machine-learning methods.',
  },
  {
    id: 'research-dfm-world-trade-nowcast-2026',
    title: 'Multi-region factor model nowcasts world trade with regional spillovers',
    topic: 'Trade nowcasting and regional spillover structure',
    summary:
      'The paper builds a dynamic-factor nowcast of world trade with regional blocks and spillovers. It is relevant for monitoring external demand and trade-channel stress around Central Asia and Uzbekistan-style open-economy questions.',
    model_ids: ['DFM', 'I-O'],
    methods: ['Dynamic factor model', 'multi-region blocks', 'trade nowcasting', 'spillover analysis'],
    source_title: 'Nowcasting World Trade with a Multi-Region Factor Model',
    source_institution: 'International Monetary Fund',
    source_url: 'https://www.imf.org/en/Publications/WP/Issues/2026/03/13/Nowcasting-World-Trade-with-a-Multi-Region-Factor-Model-574626',
    published_at: '2026-03-13',
    geography: 'Global trade',
    why_relevant:
      'Links nowcasting methods to trade exposure monitoring, which can inform external-demand assumptions before sector propagation work.',
  },
  {
    id: 'research-oecd-icio-2025',
    title: 'OECD ICIO and TiVA 2025 data refresh expands current input-output evidence for trade exposure',
    topic: 'Input-output tables and value-added trade indicators',
    summary:
      'The 2025 ICIO and TiVA release provides current inter-country input-output infrastructure for production, consumption, investment, and trade flows by country and activity. It is a useful external benchmark for sector-linkage and value-added trade analysis.',
    model_ids: ['I-O'],
    methods: ['Inter-country input-output tables', 'value-added trade', 'global value chains', 'sector linkages'],
    source_title: 'Inter-Country Input-Output tables',
    source_institution: 'Organisation for Economic Co-operation and Development',
    source_url: 'https://www.oecd.org/en/data/datasets/inter-country-input-output-tables.html',
    as_of_date: '2026-01-15',
    geography: 'Global',
    why_relevant:
      'Provides a source-linked benchmark for checking sector-linkage assumptions and trade exposure indicators used around the I-O lane.',
  },
]

export const STATIC_LITERATURE_ITEMS = [
  {
    id: 'qpm-practical-model-policy-analysis',
    title: 'Practical Model-Based Monetary Policy Analysis: A How-To Guide',
    authors: 'Michal Andrle, Jaromir Benes, Andrew Berg, Rafael A. Portillo, and Douglas Laxton',
    year: '2006',
    source: 'IMF Working Paper 2006/081',
    url: 'https://www.imf.org/en/Publications/WP/Issues/2016/12/31/Practical-Model-Based-Monetary-Policy-Analysis-A-How-To-Guide-18842',
    model_ids: ['QPM'],
    methods: ['IS curve', 'Phillips curve', 'policy reaction function'],
    note: 'Core reference for practical semi-structural monetary policy model use.',
  },
  {
    id: 'dfm-two-step-estimator',
    title: 'A two-step estimator for large approximate dynamic factor models based on Kalman filtering',
    authors: 'Mario Forni, Domenico Giannone, Marco Lippi, and Lucrezia Reichlin',
    year: '2011',
    source: 'Journal of Econometrics',
    url: 'https://www.sciencedirect.com/science/article/pii/S030440761100039X',
    model_ids: ['DFM'],
    methods: ['Dynamic factor model', 'Kalman smoother', 'principal components'],
    note: 'Technical reference for estimating large dynamic-factor systems used in nowcasting.',
  },
  {
    id: 'io-foundations-extensions',
    title: 'Input-Output Analysis: Foundations and Extensions',
    authors: 'Ronald E. Miller and Peter D. Blair',
    year: '2022',
    source: 'Cambridge University Press',
    url: 'https://doi.org/10.1017/9781108676212',
    model_ids: ['I-O'],
    methods: ['Leontief inverse', 'multipliers', 'sector linkages'],
    note: 'Standard reference for interpreting input-output multipliers and sector linkages.',
  },
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
    ...HEALTHCARE_PACKAGE_DEPTH,
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
    ...HEALTHCARE_PACKAGE_DEPTH,
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

function housingUrbanizationPackageFromSourceEvent(sourceEvent) {
  return {
    package_id: 'pkg-urbanization-construction-permits-housing-2026',
    title: 'Urbanization, construction permits, and housing delivery reform',
    policy_area: 'Urbanization, construction permits, housing, and infrastructure delivery',
    reform_category: 'infrastructure_investment',
    current_stage: 'Instructions issued',
    current_stage_date: sourceEvent.source_published_at,
    next_milestone: 'Construction permit and utility connection simplification starts',
    next_milestone_date: '2026-07-01',
    responsible_institutions: [
      'National Committee for Urbanization',
      'Regional khokimiyats',
      'State Assets Management Agency',
      'Construction sector authorities',
    ],
    legal_basis: 'Official presidential meeting coverage on urbanization, master plans, construction permits, land privatization, and housing delivery.',
    official_basis: `${sourceEvent.source_institution}, ${sourceEvent.source_published_at}.`,
    financing_or_incentive: 'Annual master-plan budget allocations and 1.4 trillion soums planned infrastructure support for Yangi Uzbekistan residential areas identified in source.',
    ...HOUSING_URBANIZATION_PACKAGE_DEPTH,
    source_confidence: 'high',
    why_tracked: 'The official source sets dated instructions for master-plan preparation, online land-privatization processing, construction-permit simplification, utility-connection simplification, state-client KPIs, and housing delivery targets.',
    model_relevance: ['Investment', 'Construction output', 'Public infrastructure spending', 'Housing supply'],
    measure_tracks: [
      { id: 'urbanization-master-plan-programs', label: 'master-plan implementation programs', status: 'instructions issued' },
      { id: 'urbanization-land-privatization-online', label: 'online land privatization processing', status: 'scheduled' },
      { id: 'construction-permit-simplification', label: 'construction permit simplification', status: 'scheduled' },
      { id: 'utility-connection-single-application', label: 'single utility-connection application', status: 'scheduled' },
      { id: 'housing-delivery-target', label: 'regional apartment commissioning target', status: '2026 target' },
    ],
    implementation_milestones: [
      {
        id: 'urbanization-master-plan-programs-due-2026-06',
        label: 'regional master-plan implementation programs due',
        date: '2026-06',
        date_precision: 'month',
        event_type: 'target_deadline',
        responsible_institutions: ['Regional khokimiyats'],
        evidence_type: 'implementation_program',
        source_event_ids: [sourceEvent.id],
        confidence: 'high',
        related_next_milestone_ids: ['construction-utility-single-application-start-2026-07-01'],
      },
      {
        id: 'state-client-kpi-evaluation-start-2026-06-01',
        label: 'state client KPI evaluation starts',
        date: '2026-06-01',
        date_precision: 'day',
        event_type: 'effective_date',
        responsible_institutions: ['State clients', 'Construction sector authorities'],
        evidence_type: 'implementation_program',
        source_event_ids: [sourceEvent.id],
        confidence: 'high',
        related_next_milestone_ids: ['construction-utility-single-application-start-2026-07-01'],
      },
      {
        id: 'construction-utility-single-application-start-2026-07-01',
        label: 'single-stage permit and utility-connection application starts',
        date: '2026-07-01',
        date_precision: 'day',
        event_type: 'effective_date',
        responsible_institutions: ['Regional khokimiyats', 'Construction sector authorities'],
        evidence_type: 'implementation_program',
        source_event_ids: [sourceEvent.id],
        confidence: 'high',
        related_next_milestone_ids: ['construction-requirements-reduction-draft-2026-07'],
      },
      {
        id: 'construction-requirements-reduction-draft-2026-07',
        label: 'draft resolution on reducing requirements, timelines, and payments due',
        date: '2026-07',
        date_precision: 'month',
        event_type: 'target_deadline',
        responsible_institutions: ['Responsible construction-sector officials'],
        evidence_type: 'implementation_program',
        source_event_ids: [sourceEvent.id],
        confidence: 'high',
        related_next_milestone_ids: ['regional-apartment-commissioning-target-2026'],
      },
      {
        id: 'regional-apartment-commissioning-target-2026',
        label: '140,000 regional apartments commissioning target',
        date: '2026',
        date_precision: 'year',
        event_type: 'target_deadline',
        responsible_institutions: ['Regional khokimiyats', 'Responsible housing officials'],
        evidence_type: 'implementation_program',
        source_event_ids: [sourceEvent.id],
        confidence: 'high',
      },
    ],
    official_source_events: [sourceEvent],
    caveat: 'Automatic official-source tracker entry assembled from a verified source event. It is not an official legal registry and does not assert legal force beyond the cited official source.',
  }
}

function agricultureSubsidyPackageFromSourceEvent(sourceEvent) {
  return {
    package_id: 'pkg-agriculture-subsidy-financing-digital-delivery-2026',
    title: 'Agriculture financing and subsidy delivery reform',
    policy_area: 'Agriculture financing, subsidies, and digital delivery',
    reform_category: 'agriculture',
    current_stage: 'Instructions issued',
    current_stage_date: sourceEvent.source_published_at,
    next_milestone: '2026 proactive subsidy delivery through Agrosubsidy',
    next_milestone_date: '2026',
    responsible_institutions: [
      'Ministry of Agriculture',
      'Agricultural Payments Agency',
      'Government agencies integrated with Agrosubsidy',
    ],
    legal_basis: 'Official presidential presentation coverage citing the decree on improving state support for agriculture and the Agricultural Payments Agency.',
    official_basis: `${sourceEvent.source_institution}, ${sourceEvent.source_published_at}.`,
    financing_or_incentive:
      'Agricultural Payments Agency, Agroportal, and Agrosubsidy become the delivery channel for producer support; 2026 subsidies move to proactive delivery.',
    ...AGRICULTURE_SUBSIDY_PACKAGE_DEPTH,
    source_confidence: 'high',
    why_tracked: 'The official source identifies a new agriculture support delivery system, quantified subsidy and financing envelopes, the Agricultural Payments Agency, and digitalized subsidy procedures through Agroportal and Agrosubsidy.',
    model_relevance: ['Agricultural output', 'Food prices', 'Rural income', 'Fiscal costs'],
    measure_tracks: [
      { id: 'agriculture-payments-agency', label: 'Agricultural Payments Agency setup', status: 'established by decree' },
      { id: 'agrosubsidy-digital-delivery', label: 'Agrosubsidy digital subsidy delivery', status: 'scheduled' },
      { id: 'cotton-grain-financing-plan', label: 'cotton and grain financing plan', status: '2026 plan' },
      { id: 'preferential-credit-discipline-model', label: 'discipline for affordable credit model', status: 'proposed' },
    ],
    implementation_milestones: [
      {
        id: 'agriculture-payments-agency-organization-2025-12-09',
        label: 'Agricultural Payments Agency implementation reviewed',
        date: sourceEvent.source_published_at,
        date_precision: 'day',
        event_type: 'instructions_issued',
        responsible_institutions: ['Ministry of Agriculture', 'Agricultural Payments Agency'],
        evidence_type: 'official_policy_announcement',
        source_event_ids: [sourceEvent.id],
        confidence: 'high',
        related_next_milestone_ids: ['agriculture-financing-envelope-2026'],
      },
      {
        id: 'agriculture-financing-envelope-2026',
        label: 'cotton and grain financing support moves into the 2026 support plan',
        date: '2026',
        date_precision: 'year',
        event_type: 'financing_allocated',
        responsible_institutions: ['Ministry of Agriculture', 'Ministry of Economy and Finance'],
        evidence_type: 'budget_tax_measure',
        source_event_ids: [sourceEvent.id],
        confidence: 'high',
        related_next_milestone_ids: ['agrosubsidy-proactive-subsidy-delivery-2026'],
      },
      {
        id: 'agrosubsidy-proactive-subsidy-delivery-2026',
        label: '1.3 trillion soums proactive subsidy delivery through Agrosubsidy',
        date: '2026',
        date_precision: 'year',
        event_type: 'implementation_milestone',
        responsible_institutions: ['Agricultural Payments Agency', 'Integrated government agencies'],
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
      /\b(?:qonun(?:i)?|farmon(?:i)?|qaror(?:i)?|buyruq(?:i)?|kodeks|normativ-huquqiy hujjat|nizom|yoʻriqnoma|yo'riqnoma|qoidalar|tartib|oʻzgartirish|o'zgartirish|qoʻshimcha|qo'shimcha)\b/i,
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
      /\b(?:qabul qilindi|qabul qilingan|tasdiqlandi|tasdiqlash|joriy etildi|joriy etish|amalga oshirildi|kuchga kirdi|oʻz kuchini yoʻqotgan|o'z kuchini yo'qotgan|isloh qilish chora-tadbirlari|chora-tadbirlari(?:\s+toʻgʻrisida|\s+to'g'risida)?)\b/i,
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
      /\b(?:soliq|aksiz|boj|byudjet|subsidiya|tarif|kompensatsiya|yigʻim|yig'im|imtiyoz|imtiyozlar)\b.{0,100}\b(?:joriy etish|tasdiqlash|tasdiqlandi|qabul qilindi|oʻzgartirish|o'zgartirish|kamaytirish|bekor qilish|stavka|talab|miqdor)\b/i,
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
      /\b(?:bojxona|eksport|import|savdo|jahon savdo tashkiloti)\b.{0,100}\b(?:joriy etish|tasdiqlash|qabul qilindi|oʻzgartirish|o'zgartirish|chora-tadbirlar|qoidalar|tartib)\b/i,
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
      /\b(?:amalga oshirish|joriy etish|bosqich|dastur|yoʻl xaritasi|yo'l xaritasi|chora-tadbirlar)\b.{0,100}\b(?:isloh|qonun|farmon|qaror|loyiha|dastur|strategiya|nizom|qoidalar|tartib)\b/i,
      /\b(?:isloh|qonun|farmon|qaror|loyiha|dastur|strategiya|nizom|qoidalar|tartib)\b.{0,100}\b(?:amalga oshirish|joriy etish|bosqich|chora-tadbirlar|tasdiqlash)\b/i,
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
    description: 'Exclude trainings, calendars, awareness weeks, seminars, workshops, and public outreach even when they refer to an existing reform or resolution.',
    reason: 'training_or_outreach_only',
    overridable_by_policy_measure: false,
    patterns: [
      /\b(calendar|seminar|workshop|financial literacy|awareness|training conference|training forum|training seminar|training workshop|staff training|public outreach)\b/i,
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
      /\b(results of the .* quarter|quarterly results|key activities and achievements|accounting and auditing.*achievements)\b/i,
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
    id: 'security-defense-out-of-scope',
    label: 'Security or defense measure outside economic-policy scope',
    description: 'Exclude military, defense, and security-sector modernization unless separately represented as a fiscal, industrial, trade, or public-service economic measure.',
    reason: 'security_defense_out_of_scope',
    overridable_by_policy_measure: false,
    patterns: [
      /\b(military|army|armed forces|defense|defence|weapons?|commander-in-chief|unmanned aerial vehicles?|combat|security forces)\b/i,
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
    id: 'security_defense_out_of_scope',
    description: 'The item is military, defense, or security-sector modernization outside the economic-policy tracker scope.',
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
      /\b(?:qonun(?:i)?|farmon(?:i)?|qaror(?:i)?|buyruq(?:i)?|kodeks|normativ-huquqiy hujjat|nizom|yoʻriqnoma|yo'riqnoma|qoidalar(?:iga)?|tartib|chora-tadbirlar(?:i)?|o.?zgartirish\w*|qo.?shimcha\w*)\b/i,
    ],
  },
  {
    id: 'adopted_measure',
    patterns: [
      /\b(?:adopted|approved|enacted|introduced|expands|expanded|abolished|reduced|launched|implemented|entered into force|came into force|signed into law|approves measures|approved measures)\b/i,
      /\b(?:qabul qilindi|qabul qilingan|tasdiqlandi|tasdiqlash|joriy etildi|joriy etish|amalga oshirildi|kuchga kirdi|oʻz kuchini yoʻqotgan|o'z kuchini yo'qotgan|isloh qilish chora-tadbirlari|chora-tadbirlari|o.?zgartirish\w*|qo.?shimcha\w*)\b/i,
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
      /\b(?:amalga oshirish|joriy etish|bosqich|dastur|yoʻl xaritasi|yo'l xaritasi|chora-tadbirlar)\b.{0,100}\b(?:isloh|qonun|farmon|qaror|loyiha|dastur|strategiya|nizom|qoidalar|tartib)\b/i,
      /\b(?:isloh|qonun|farmon|qaror|loyiha|dastur|strategiya|nizom|qoidalar|tartib)\b.{0,100}\b(?:amalga oshirish|joriy etish|bosqich|chora-tadbirlar|tasdiqlash)\b/i,
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
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
}

function normalizeWhitespace(value) {
  return decodeHtml(String(value ?? '').replace(/<[^>]+>/g, ' '))
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
  if (/(anti-money laundering|terrorism financing|aml|cft|jinoiy faoliyatdan olingan daromad|legallashtirish|terrorizmni moliyalashtirish|ommaviy qirgʻin qurolini|ommaviy qirg'in qurolini|toʻlov tizimlari|to'lov tizimlari|elektron pullar|nobank kredit)/.test(normalized)) return 'financial_sector'
  if (/(qobiliyatsizlik|insolvency)/.test(normalized)) return 'business_environment'
  if (/(bandlikka|employment fund|labor market|labour market|workforce)/.test(normalized)) return 'labor_market'
  if (/(bozorlar|savdo komplekslari|bir martalik yigʻim|bir martalik yig'im|ijara toʻlovlari|ijara to'lovlari|market fees?|market complex)/.test(normalized)) return 'fiscal_tax'
  if (/(borish qiyin|togʻli hududlar|tog'li hududlar|remote settlement|mountain settlement)/.test(normalized)) return 'social_protection'
  if (/(construction oversight|qurilish.*nazorat|technical inspection|instrumental texnik|sinov-laboratoriya|narxlarini hisoblash)/.test(normalized)) return 'infrastructure_investment'
  if (/(housing|construction|urbanization|urban planning|master plan|land privatization|technical specifications|utility networks|qurilish|uy-joy|kadastr|shaharsozlik)/.test(normalized)) return 'infrastructure_investment'
  if (/(metro|metropolitan|public transport|rolling stock|fare payment|distance-based fare|bus routes?|transport system|harakat tarkibi|jamoat transporti)/.test(normalized)) return 'infrastructure_investment'
  if (/(energy|gas|tariff adjustment|elektr|energiya|gaz|tarif)/.test(normalized)) return 'energy_tariffs'
  if (/(healthcare|medical|clinic|clinics|health insurance|insurance fund|state-funded medical|sogʻliqni saqlash|sog'liqni saqlash|tibbiy)/.test(normalized)) return 'social_protection'
  if (/(privatization|state-owned|soe|xususiylashtirish|davlat aktiv)/.test(normalized)) return 'soe_privatization'
  if (/(customs|trade|wto|import|export|clearance|bojxona|eksport|import|savdo|jahon savdo tashkiloti)/.test(normalized)) return 'trade_customs'
  if (/(policy rate|reserve requirement|foreign exchange|fx|deposit|bank|microfinance|microcredit|toʻlov|to'lov|kredit|mikromoliya|markaziy bank)/.test(normalized)) return 'monetary_policy'
  if (/(agriculture|fisheries|forestry|qishloq xoʻjaligi|qishloq xo'jaligi|baliqchilik|oʻrmon|o'rmon)/.test(normalized)) return 'agriculture'
  if (/(budget|tax|excise|fiscal|subsidy|duty|byudjet|soliq|aksiz|subsidiya|boj|yigʻim|yig'im)/.test(normalized)) return 'fiscal_tax'
  if (/(compensation|social protection|household|kompensatsiya|ijtimoiy himoya|aholi)/.test(normalized)) return 'social_protection'
  if (/(digital|electronic declaration|e-government|public service|notarial|legal service|raqamli|elektron|davlat xizmati|notarial|huquqiy xizmat)/.test(normalized)) return 'digital_public_admin'
  if (/(infrastructure|grant|loan|financing|master plan|green economic development|infratuzilma|moliyalashtirish|yashil iqtisodiyot)/.test(normalized)) return 'infrastructure_investment'
  if (/(business|investment climate|investor|sme|small and medium-sized|tadbirkor|investitsiya|raqobat|kichik biznes)/.test(normalized)) return 'business_environment'
  return 'other_policy'
}

function isPublicTransportReformText(text) {
  return /\b(metro|metropolitan|public transport|rolling stock|fare payment|distance-based fare|platform screen doors?|bus routes?|transport system|toshkent metropoliteni)\b/i.test(
    text,
  )
}

function uniqueStrings(values) {
  return Array.from(new Set(values))
}

function matchedRules(definitions, text) {
  return definitions.filter((rule) => rule.patterns.some((pattern) => pattern.test(text)))
}

export function classifyReformCandidateText(text) {
  const includeRules = matchedRules(INCLUDE_RULE_DEFINITIONS, text)
  const excludeRules = matchedRules(EXCLUDE_RULE_DEFINITIONS, text).filter(
    (rule) => !(rule.reason === 'security_defense_out_of_scope' && isPublicTransportReformText(text)),
  )
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

const OFFICIAL_DETAIL_SOURCE_PATH_PATTERNS = [
  /\/(?:uz|ru|en)?\/?docs\/-?\d+/i,
  /\/(?:uz|ru|en)\/lists\/view\/\d+/i,
  /\/(?:uz|ru|en)\/(?:[^/]+\/)?news\/view\/\d+/i,
]

const OFFICIAL_DETAIL_SOURCE_TEXT_PATTERNS = [
  /\b(?:decree|resolution|law|order|regulation|program|programme|roadmap|action plan|incentive|implementation|adopted measures|approved measures)\b/i,
  /\b(?:farmon(?:i)?|qaror(?:i)?|qonun(?:i)?|buyruq(?:i)?|nizom|dastur|yoʻl xaritasi|yo'l xaritasi|chora-tadbirlar(?:i)?|imtiyoz|amalga oshirish|tasdiqlash)\b/i,
]

function hasOfficialDetailSourcePattern(sourceUrl) {
  try {
    const path = new URL(sourceUrl).pathname
    return OFFICIAL_DETAIL_SOURCE_PATH_PATTERNS.some((pattern) => pattern.test(path))
  } catch {
    return false
  }
}

function hasOfficialMeasureTextPattern(text) {
  return OFFICIAL_DETAIL_SOURCE_TEXT_PATTERNS.some((pattern) => pattern.test(text))
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

  const decisions = sourceItemsFromGovUzApi(source, payload)
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

function sourceItemsFromGovUzApi(source, payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.data)) return []

  return payload.data
    .map((item) => {
      const id = typeof item.id === 'number' || typeof item.id === 'string' ? String(item.id) : ''
      const title = typeof item.title === 'string' ? normalizeWhitespace(item.title) : ''
      const summary = typeof item.anons === 'string' ? normalizeWhitespace(item.anons) : ''
      const publishedAt = typeof item.date === 'string' ? item.date : ''
      return {
        id,
        title,
        summary,
        publishedAt,
        sourceUrl: id ? govUzAuthorityViewUrl(source, id) : source.url,
        text: `${title} ${summary}`,
      }
    })
    .filter((item) => item.id && item.title)
}

function parsePresidentUzDate(value) {
  const match = value.match(/^([0-3]\d)[.-]([01]\d)[.-](\d{4})$/)
  if (!match) return value
  return `${match[3]}-${match[2]}-${match[1]}`
}

function parseOfficialDate(value) {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return ''
  const isoMatch = normalized.match(/\b(\d{4}-[01]\d-[0-3]\d)(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?\b/)
  if (isoMatch) return isoMatch[1]
  const namedMonthMatch = normalized.match(
    /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+[0-3]?\d,\s+\d{4})\b/i,
  )
  if (namedMonthMatch) {
    const parsed = new Date(namedMonthMatch[1])
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  }
  const dayFirstMatch = normalized.match(/\b([0-3]\d)[.-]([01]\d)[.-](\d{4})\b/)
  if (dayFirstMatch) return `${dayFirstMatch[3]}-${dayFirstMatch[2]}-${dayFirstMatch[1]}`
  return normalized
}

function sourceItemsFromPresidentUzList(source, html) {
  return Array.from(
    html.matchAll(/<a\b[^>]*href=["']([^"']*\/lists\/view\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]{0,500}?([0-3]\d-[01]\d-\d{4})/gi),
  )
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
}

function extractDecisionsFromPresidentUzList(source, html, extractedAt) {
  const decisions = sourceItemsFromPresidentUzList(source, html)
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

function detailBodyTextFromHtml(html) {
  const contentBlock =
    firstMatch(html, [
      /<article\b[^>]*>([\s\S]*?)<\/article>/i,
      /<main\b[^>]*>([\s\S]*?)<\/main>/i,
      /<body\b[^>]*>([\s\S]*?)<\/body>/i,
    ]) || html
  const paragraphs = Array.from(
    contentBlock.matchAll(/<(?:p|li|td|div)\b[^>]*>([\s\S]*?)<\/(?:p|li|td|div)>/gi),
    (match) => normalizeWhitespace(match[1]),
  ).filter((paragraph) => paragraph.length > 30)
  const fallbackBodyText = normalizeWhitespace(contentBlock)
  const paragraphText = uniqueStrings(paragraphs).join(' ')
  return paragraphText.length > Math.min(500, fallbackBodyText.length * 0.4) ? paragraphText : fallbackBodyText
}

function detailTitleFromHtml(html, fallbackTitle = '') {
  const title = normalizeWhitespace(
    firstMatch(html, [
      /<meta\b[^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*>/i,
      /<title\b[^>]*>([\s\S]*?)<\/title>/i,
      /<h1\b[^>]*>([\s\S]*?)<\/h1>/i,
      /<h2\b[^>]*>([\s\S]*?)<\/h2>/i,
      /<h[2-3]\b[^>]*class=["'][^"']*(?:title|news|article)[^"']*["'][^>]*>([\s\S]*?)<\/h[2-3]>/i,
    ]) || fallbackTitle,
  )
  return title.replace(/\s*[-|]\s*(?:President|Official|Lex|Gov).*$/i, '').trim()
}

function detailDateFromHtml(html, fallbackDate = '') {
  return parseOfficialDate(
    firstMatch(html, [
      /<time\b[^>]*datetime=["']([^"']+)["']/i,
      /\\?["']date\\?["']\s*:\s*\\?["'](\d{4}-[01]\d-[0-3]\d)(?:\s+\d{2}:\d{2}:\d{2})?\\?["']/i,
      /<h3\b[^>]*>\s*(\d{4}-[01]\d-[0-3]\d)(?:\s+\d{2}:\d{2}:\d{2})?\s*\//i,
      /(?:class|itemprop)=["'][^"']*(?:date|published)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
      /\b(\d{4}-[01]\d-[0-3]\d)(?:\s+\d{2}:\d{2}:\d{2})?\b/i,
      /\b([0-3]\d[.-][01]\d[.-]\d{4})\b/i,
    ]) || fallbackDate,
  )
}

function sourceItemFromOfficialDetail(source, html, fallbackItem = {}) {
  const title = detailTitleFromHtml(html, fallbackItem.title ?? '')
  const publishedAt = detailDateFromHtml(html, fallbackItem.publishedAt ?? '')
  const bodyText = detailBodyTextFromHtml(html)
  const summary = bodyText.slice(0, 700)

  if (!title) return null

  return {
    id: fallbackItem.id ?? 'detail',
    title,
    summary,
    bodyText,
    publishedAt,
    sourceUrl: fallbackItem.sourceUrl ?? source.url,
    text: `${title} ${bodyText}`,
  }
}

const OFFICIAL_CONTENT_LANGUAGES = ['en', 'ru', 'uz']

function cleanLocalizedTextMap(value) {
  const clean = {}
  for (const language of OFFICIAL_CONTENT_LANGUAGES) {
    const entry = value?.[language]
    if (typeof entry === 'string' && entry.trim().length > 0) {
      clean[language] = entry
    }
  }
  return clean
}

function cleanLocalizedListMap(value) {
  const clean = {}
  for (const language of OFFICIAL_CONTENT_LANGUAGES) {
    const entry = value?.[language]
    if (!Array.isArray(entry)) continue
    const values = entry.filter((item) => typeof item === 'string' && item.trim().length > 0)
    if (values.length > 0) clean[language] = values
  }
  return clean
}

function cleanLocalizedStatusMap(value) {
  const clean = {}
  for (const language of OFFICIAL_CONTENT_LANGUAGES) {
    const entry = value?.[language]
    if (entry === 'verified' || entry === 'not_checked_fixture') {
      clean[language] = entry
    }
  }
  return clean
}

function cleanLocalizedDigestMap(value) {
  const clean = {}
  for (const language of OFFICIAL_CONTENT_LANGUAGES) {
    const entry = value?.[language]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const digest = {}
    for (const field of ['changed', 'applies_to', 'effective_status', 'document']) {
      const text = entry[field]
      if (typeof text === 'string' && text.trim().length > 0) {
        digest[field] = text
      }
    }
    if (Object.keys(digest).length > 0) clean[language] = digest
  }
  return clean
}

function compactRecord(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value && Object.keys(value).length > 0))
}

function sourceUrlLanguage(sourceUrl) {
  try {
    const firstSegment = new URL(sourceUrl).pathname.split('/').filter(Boolean)[0]
    return OFFICIAL_CONTENT_LANGUAGES.includes(firstSegment) ? firstSegment : null
  } catch {
    return null
  }
}

function officialLanguageUrl(sourceUrl, language) {
  try {
    const parsed = new URL(sourceUrl)
    const path = parsed.pathname

    if (parsed.hostname === 'president.uz' || parsed.hostname.endsWith('.president.uz')) {
      if (/^\/(?:en|ru|uz)\/lists\/view\/\d+/i.test(path)) {
        parsed.pathname = path.replace(/^\/(?:en|ru|uz)\//i, `/${language}/`)
        return parsed.toString()
      }
    }

    if (parsed.hostname === 'gov.uz' || parsed.hostname.endsWith('.gov.uz')) {
      if (/^\/(?:en|ru|uz)\//i.test(path)) {
        parsed.pathname = path.replace(/^\/(?:en|ru|uz)\//i, `/${language}/`)
        return parsed.toString()
      }
    }

    if (parsed.hostname === 'lex.uz' || parsed.hostname.endsWith('.lex.uz')) {
      const docsMatch = path.match(/^\/(?:(?:en|ru|uz)\/)?docs\/(-?\d+)/i)
      if (docsMatch && (language === 'ru' || language === 'uz')) {
        parsed.pathname = `/${language}/docs/${docsMatch[1]}`
        return parsed.toString()
      }
    }
  } catch {
    return null
  }

  return null
}

function officialLanguageUrls(sourceUrl) {
  const entries = {}
  const existingLanguage = sourceUrlLanguage(sourceUrl)
  if (existingLanguage) entries[existingLanguage] = sourceUrl

  for (const language of OFFICIAL_CONTENT_LANGUAGES) {
    const languageUrl = officialLanguageUrl(sourceUrl, language)
    if (languageUrl) entries[language] = languageUrl
  }

  return entries
}

function sourceSummarySentences(text, title = '') {
  const normalizedTitle = normalizeWhitespace(title).toLowerCase()
  const navigationNoise =
    /(official web-site|official pages in social networks|president of the republic|share|print|telegram|facebook|twitter|instagram|youtube|rss|search|site map|расмий веб|ижтимоий тармоқ|социальн|поделиться|печать)/i
  const introNoise =
    /^(?:Президент\s+Шавкат|Шавкат\s+Мирзиёев|Президенту|The President|The Head of State|Давлат раҳбари|Президент).{0,180}(?:ознаком|представ|презентац|briefed|presented|presentation|таниш)/iu
  const measureSignal =
    /\d{4}|(?:from|by|until|will|planned|approved|adopted|introduced|launched|transferred|created|reduced|increased|будет|утвержд|принят|внедр|переда|созда|сокращ|ошир|режалаштир|тасдиқ|жорий|ташкил|таклиф|соддалаштир|рақамлаштир|механизм|проактив|агросубсид|агропортал|бошлаб|гача|йил|года|фоиз|сўм|сум|млрд|трлн|percent|soums?)/i

  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+|(?<=[.;])\s+(?=[A-ZА-ЯЁЎҚҒҲ0-9"“«])/u)
    .map((sentence) =>
      sentence
        .replace(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s*\/\s*[^/]{1,80}\s+/u, '')
        .replace(/,\s*(?:что позволит|благодаря чему|which (?:will|would)|resulting in).+$/iu, '.')
        .trim(),
    )
    .filter((sentence) => sentence.length >= 40 && sentence.length <= 320)
    .filter((sentence) => !navigationNoise.test(sentence))
    .filter((sentence) => !introNoise.test(sentence))
    .filter((sentence) => !/[–—-]\s*$/.test(sentence))
    .filter((sentence) => !/[«"“][^»"”]{1,90}$/.test(sentence))
    .filter((sentence) => sentence.toLowerCase() !== normalizedTitle)
    .filter((sentence) => measureSignal.test(sentence))
    .filter((sentence) => sourceInitiativeScore(sentence) >= 2)
}

function sourceInitiativeScore(sentence) {
  const text = sentence.toLowerCase()
  let score = 0

  if (
    /(?:предложено|планируется|будут|будет|будут приняты|намечено|запланировано|предлагается|поставлена задача|создан|создаётся|утвержд|внедр|изменит|изменится|меняется|вносятся|изменени|жорий|taklif|таклиф|rejalashtir|режалаштир|o[‘'ʻ`]?zgar|ўзгар|joriy et|жорий эт|ташкил этил|белгилан|соддалаштир|рақамлаштир|from|will|planned|proposed|introduced|launched|created|approved|adopted|to be)/iu.test(
      text,
    )
  ) {
    score += 3
  }

  if (
    /(?:механизм|модель|система|агентств|платформ|единая ис|рейтинг|возмещ|компенсац|льгот|лицензирован|аккредитац|имтиёз|агентлиги|тизим|механизм|модель|кредит|субсид|аризач|проактив|агропортал|агросубсид|дала кундалиги|private sector|single window|agency|platform|mechanism|model|rating|compensation|reimbursement|preferential|subsidy|credit)/iu.test(
      text,
    )
  ) {
    score += 2
  }

  if (
    /(?:как отмечалось|кроме того, в сферу направлено|было выделено|было направлено|направлено\s+[\d,.\s]+(?:триллион|миллиард|млрд|трлн)|выделение субсидий.*позволило|благодаря чему|сэкономлено|досрочно погасили|согласно изучениям|каждый доллар.*строительств|унифицировано\s+\d+.*(?:норм|правил)|отменены старые и утверждены|тақдимот аввалида|тақдимот билан танишди|тақдимотда|кўриб чиқилди|ҳозирда|ахборот берилди|қайд этилганидек|қайд этилди|ажратилди|йўналтирилди|ажратилиши натижасида|натижасида.*тежалди|муддатидан олдин|мавжудлиги|кўрсатиб ўтилди|талаб қилади|чегаралангани|деди давлатимиз раҳбари|халқаро тажрибага кўра|as noted|was allocated|were allocated|has been allocated|thanks to this|saved|enabled them to)/iu.test(
      text,
    )
  ) {
    score -= 4
  }

  if (
    /(?:в результате|это позволит|позволит ежегодно|сможет экономить|даст.*эффект|will save|resulting in|as a result)/iu.test(
      text,
    )
  ) {
    score -= 2
  }

  if (
    /(?:будет способствовать|будет повышать|способствуют.*(?:доход|увеличен)|улучшение качества регулирования|упрощение взаимодействия|президент.*отметил|глава государства дал.*поручени|глава нашего государства отметил|было отмечено|как отмечено|отмечено, что|указано, что|подчеркивалось, что|в стране созданы широкие возможности|контролирующие органы ограничивались|она охватит задачи|наряду с этим подчеркнуто|подвергнут\w*\s+критик|маълум қилинди|таъкидланди|қайта қайд этилди|деди давлатимиз раҳбари|will contribute to|will increase productivity|increase revenue|the president noted|it was noted)/iu.test(
      text,
    )
  ) {
    score -= 4
  }

  if (
    /(?:в общей сложности|общей сложности|жами\s+[\d,.\s]+(?:триллион|миллиард|млрд|трлн|сўм|сум)|totaling|in total|total amount)/iu.test(text) &&
    !/(?:предложено|предлагается|will|proposed|модель|mechanism|agency|агентств|система|таклиф|механизм|агентлиги|тизим)/iu.test(text)
  ) {
    score -= 6
  }

  return score
}

function scriptProfile(value) {
  const text = normalizeWhitespace(value).toLowerCase()
  const cyrillic = (text.match(/[а-яёўқғҳ]/giu) ?? []).length
  const latin = (text.match(/[a-z]/giu) ?? []).length
  return { cyrillic, latin }
}

function looksLikeLanguage(value, language) {
  const { cyrillic, latin } = scriptProfile(value)
  if (language === 'ru') {
    return cyrillic >= 8 && cyrillic / Math.max(cyrillic + latin, 1) >= 0.45
  }
  if (language === 'en') {
    return cyrillic <= 2
  }
  return true
}

function isSourceBoilerplateSnippet(value) {
  const text = normalizeWhitespace(value)
  if (!text) return true
  return (
    /^\([^)]*(?:qonunchilik ma[ʼ'’ʻ`]?lumotlari milliy bazasi|10\/\d{2}\/)[^)]*\)$/iu.test(text) ||
    /(?:qonunchilik ma[ʼ'’ʻ`]?lumotlari milliy bazasi|qo[‘'ʻ`]?shimcha axborot|asosiy rekvizitlar|qayta ko[‘'ʻ`]?rib chiqish|qayta ko[‘'ʻ`]?rib chiqilgan hujjatlar|hujjatni qayta ko[‘'ʻ`]?rib chiqishga asos|kodifikatsiya|korrespondentlar|respondentlar|ulashish\s+telegram|rasmiy hujjatlar|farmoniga\s+\d+-?ilova|prezidentining ayrim (?:hujjat|farmon)|kosmik tadqiqotlar va texnologiyalar agentligi|oko[zз]|tsz|hujjatga taklif|audioni tinglash)/iu.test(
      text,
    )
  )
}

function isContextOnlySnippet(value) {
  return /(?:согласно изучениям|каждый доллар.*строительств|она охватит задачи|наряду с этим подчеркнуто|подвергнут\w*\s+критик|как отмечалось|кроме того, в сферу направлено|было выделено|было направлено|выделение субсидий.*позволило|благодаря чему|сэкономлено|досрочно погасили|в общей сложности|унифицировано\s+\d+.*(?:норм|правил)|отменены старые и утверждены|глава государства дал.*поручени|глава нашего государства отметил|было отмечено|как отмечено|отмечено, что|указано, что|подчеркивалось, что|тақдимот аввалида|тақдимот билан танишди|тақдимотда|кўриб чиқилди|ҳозирда|ахборот берилди|қайд этилганидек|қайд этилди|ажратилди|йўналтирилди|ажратилиши натижасида|натижасида.*тежалди|муддатидан олдин|маълум қилинди|таъкидланди|мавжудлиги|кўрсатиб ўтилди|талаб қилади|чегаралангани|деди давлатимиз раҳбари|халқаро тажрибага кўра|as noted|was allocated|were allocated|thanks to this|saved|as a result)/iu.test(
    normalizeWhitespace(value),
  )
}

function isPublishableLocalizedSnippet(value, language) {
  const text = normalizeWhitespace(value)
  return (
    text.length > 0 &&
    looksLikeLanguage(text, language) &&
    !isSourceBoilerplateSnippet(text) &&
    !isContextOnlySnippet(text) &&
    sourceInitiativeScore(text) >= 2
  )
}

function isPublishableLocalizedFreeText(value, language) {
  const text = normalizeWhitespace(value)
  return (
    text.length > 0 &&
    looksLikeLanguage(text, language) &&
    !isSourceBoilerplateSnippet(text) &&
    !isContextOnlySnippet(text)
  )
}

function isPublishableLocalizedTitle(value, language) {
  const text = normalizeWhitespace(value)
  return text.length > 0 && looksLikeLanguage(text, language) && !isSourceBoilerplateSnippet(text)
}

function publicSourceEventSummary(summary, fallback) {
  const text = normalizeWhitespace(summary ?? '')
  if (!text || text.length > 420 || isSourceBoilerplateSnippet(text) || isContextOnlySnippet(text)) return fallback
  return text
}

function sanitizeLocalizedTextMapForPublication(value, validator) {
  const clean = {}
  for (const language of OFFICIAL_CONTENT_LANGUAGES) {
    const entry = value?.[language]
    if (typeof entry === 'string' && validator(entry, language)) {
      clean[language] = entry
    }
  }
  return clean
}

function sanitizeLocalizedListMapForPublication(value) {
  const clean = {}
  for (const language of OFFICIAL_CONTENT_LANGUAGES) {
    const entry = value?.[language]
    if (!Array.isArray(entry)) continue
    const values = uniqueStrings(entry.filter((item) => isPublishableLocalizedFreeText(item, language)))
    if (values.length > 0) clean[language] = values
  }
  return clean
}

function sanitizeLocalizedDigestMapForPublication(value) {
  const clean = {}
  for (const language of OFFICIAL_CONTENT_LANGUAGES) {
    const entry = value?.[language]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const digest = {
      ...(isPublishableLocalizedFreeText(entry.changed, language) ? { changed: entry.changed } : {}),
      ...(isPublishableLocalizedFreeText(entry.applies_to, language) ? { applies_to: entry.applies_to } : {}),
      ...(isPublishableLocalizedFreeText(entry.effective_status, language)
        ? { effective_status: entry.effective_status }
        : {}),
      ...(isPublishableLocalizedTitle(entry.document, language) ? { document: entry.document } : {}),
    }
    if (Object.keys(digest).length > 0) clean[language] = digest
  }
  return clean
}

function sanitizeLocalizedPackageForPublication(localized) {
  if (!localized) return undefined
  const clean = compactRecord({
    title: sanitizeLocalizedTextMapForPublication(localized.title, isPublishableLocalizedTitle),
    short_summary: sanitizeLocalizedTextMapForPublication(localized.short_summary, isPublishableLocalizedFreeText),
    policy_area: sanitizeLocalizedTextMapForPublication(localized.policy_area, isPublishableLocalizedFreeText),
    current_stage: sanitizeLocalizedTextMapForPublication(localized.current_stage, isPublishableLocalizedFreeText),
    next_milestone: sanitizeLocalizedTextMapForPublication(localized.next_milestone, isPublishableLocalizedFreeText),
    legal_basis: sanitizeLocalizedTextMapForPublication(localized.legal_basis, isPublishableLocalizedFreeText),
    official_basis: sanitizeLocalizedTextMapForPublication(localized.official_basis, isPublishableLocalizedFreeText),
    financing_or_incentive: sanitizeLocalizedTextMapForPublication(
      localized.financing_or_incentive,
      isPublishableLocalizedFreeText,
    ),
    why_tracked: sanitizeLocalizedTextMapForPublication(localized.why_tracked, isPublishableLocalizedFreeText),
    parameters_or_amounts: sanitizeLocalizedListMapForPublication(localized.parameters_or_amounts),
    digest: sanitizeLocalizedDigestMapForPublication(localized.digest),
  })
  return Object.keys(clean).length > 0 ? clean : undefined
}

function sanitizeSourceEventForPublication(event) {
  const localized = event.localized
    ? compactRecord({
        title: sanitizeLocalizedTextMapForPublication(event.localized.title, isPublishableLocalizedTitle),
        summary: sanitizeLocalizedTextMapForPublication(event.localized.summary, isPublishableLocalizedFreeText),
        source_url: cleanLocalizedTextMap(event.localized.source_url),
        source_url_status: cleanLocalizedStatusMap(event.localized.source_url_status),
      })
    : undefined

  return {
    ...event,
    summary: publicSourceEventSummary(event.summary, event.title),
    ...(localized && Object.keys(localized).length > 0 ? { localized } : { localized: undefined }),
  }
}

function sanitizePublicReformPackage(reformPackage) {
  const localized = sanitizeLocalizedPackageForPublication(reformPackage.localized)
  return {
    ...reformPackage,
    official_source_events: (reformPackage.official_source_events ?? []).map(sanitizeSourceEventForPublication),
    ...(localized ? { localized } : { localized: undefined }),
  }
}

function localizedPackageSnippetsFromItem(item, language) {
  const sentences = sourceSummarySentences(item.summary, item.title)
  return uniqueStrings(sentences)
    .filter((sentence) => isPublishableLocalizedSnippet(sentence, language))
    .slice(0, 8)
}

async function fetchOfficialLanguageItem(event, language, sourceUrl, fetchImpl) {
  if (sourceUrl === event.source_url) {
    return {
      title: event.title,
      summary: event.summary,
      sourceUrl,
    }
  }

  const response = await fetchImpl(sourceUrl, {
    headers: SOURCE_LINK_VALIDATION_HEADERS,
  })
  if (!response.ok) return null

  const detailHtml = await response.text()
  const item = sourceItemFromOfficialDetail({ url: sourceUrl }, detailHtml, {
    id: event.id,
    title: event.title,
    publishedAt: event.source_published_at,
    sourceUrl,
  })

  return item
    ? {
        title: item.title,
        summary: item.bodyText ?? item.summary,
        sourceUrl,
      }
    : null
}

async function enrichSourceEventWithOfficialLanguages(event, { fetchSource, fetchImpl }) {
  const languageUrls = officialLanguageUrls(event.source_url)
  if (Object.keys(languageUrls).length === 0) return { event, snippets: {} }

  const localized = {
    title: cleanLocalizedTextMap(event.localized?.title),
    summary: {},
    source_url: cleanLocalizedTextMap(event.localized?.source_url),
    source_url_status: cleanLocalizedStatusMap(event.localized?.source_url_status),
  }
  const snippets = {}

  for (const language of OFFICIAL_CONTENT_LANGUAGES) {
    const sourceUrl = languageUrls[language]
    if (!sourceUrl) continue
    if (!fetchSource && sourceUrl !== event.source_url) continue

    try {
      const item = await fetchOfficialLanguageItem(event, language, sourceUrl, fetchImpl)
      if (!item?.title) continue
      const itemSnippets = localizedPackageSnippetsFromItem(item, language)
      if (isPublishableLocalizedTitle(item.title, language)) localized.title[language] = item.title
      if (itemSnippets.length > 0) localized.summary[language] = itemSnippets.slice(0, 2).join(' ')
      localized.source_url[language] = sourceUrl
      localized.source_url_status[language] = event.source_url_status
      snippets[language] = itemSnippets
    } catch {
      // Missing language pages should not block the official-source refresh.
    }
  }

  const cleanLocalized = compactRecord({
    title: cleanLocalizedTextMap(localized.title),
    summary: cleanLocalizedTextMap(localized.summary),
    source_url: cleanLocalizedTextMap(localized.source_url),
    source_url_status: cleanLocalizedStatusMap(localized.source_url_status),
  })

  return {
    event: Object.keys(cleanLocalized).length > 0 ? { ...event, localized: cleanLocalized } : event,
    snippets,
  }
}

async function enrichReformPackageWithOfficialLanguages(reformPackage, { fetchSource, fetchImpl }) {
  const enrichedEvents = []
  const snippetsByLanguage = {}

  for (const event of reformPackage.official_source_events ?? []) {
    const enriched = await enrichSourceEventWithOfficialLanguages(event, { fetchSource, fetchImpl })
    enrichedEvents.push(enriched.event)
    for (const [language, snippets] of Object.entries(enriched.snippets)) {
      if (language === 'en' || snippetsByLanguage[language]?.length > 0) continue
      snippetsByLanguage[language] = snippets
    }
  }

  const primaryEvent = enrichedEvents[0]
  const localized = {
    title: cleanLocalizedTextMap(reformPackage.localized?.title),
    short_summary: cleanLocalizedTextMap(reformPackage.localized?.short_summary),
    policy_area: cleanLocalizedTextMap(reformPackage.localized?.policy_area),
    current_stage: cleanLocalizedTextMap(reformPackage.localized?.current_stage),
    next_milestone: cleanLocalizedTextMap(reformPackage.localized?.next_milestone),
    legal_basis: cleanLocalizedTextMap(reformPackage.localized?.legal_basis),
    official_basis: cleanLocalizedTextMap(reformPackage.localized?.official_basis),
    financing_or_incentive: cleanLocalizedTextMap(reformPackage.localized?.financing_or_incentive),
    why_tracked: cleanLocalizedTextMap(reformPackage.localized?.why_tracked),
    parameters_or_amounts: cleanLocalizedListMap(reformPackage.localized?.parameters_or_amounts),
    digest: cleanLocalizedDigestMap(reformPackage.localized?.digest),
  }

  for (const language of OFFICIAL_CONTENT_LANGUAGES.filter((entry) => entry !== 'en')) {
    const eventTitle = primaryEvent?.localized?.title?.[language]
    const snippets = snippetsByLanguage[language] ?? []
    if (!eventTitle && snippets.length === 0) continue

    if (eventTitle) localized.title[language] = eventTitle
    if (snippets[0]) localized.short_summary[language] = snippets[0]
    if (snippets.length > 0) localized.parameters_or_amounts[language] = snippets
    localized.digest[language] = {
      ...(localized.digest[language] ?? {}),
      ...(snippets[0] ? { changed: snippets[0] } : {}),
      ...(eventTitle ? { document: eventTitle } : {}),
    }
  }

  const cleanLocalized = compactRecord({
    title: cleanLocalizedTextMap(localized.title),
    short_summary: cleanLocalizedTextMap(localized.short_summary),
    policy_area: cleanLocalizedTextMap(localized.policy_area),
    current_stage: cleanLocalizedTextMap(localized.current_stage),
    next_milestone: cleanLocalizedTextMap(localized.next_milestone),
    legal_basis: cleanLocalizedTextMap(localized.legal_basis),
    official_basis: cleanLocalizedTextMap(localized.official_basis),
    financing_or_incentive: cleanLocalizedTextMap(localized.financing_or_incentive),
    why_tracked: cleanLocalizedTextMap(localized.why_tracked),
    parameters_or_amounts: cleanLocalizedListMap(localized.parameters_or_amounts),
    digest: cleanLocalizedDigestMap(localized.digest),
  })

  return {
    ...reformPackage,
    official_source_events: enrichedEvents,
    ...(Object.keys(cleanLocalized).length > 0 ? { localized: cleanLocalized } : {}),
  }
}

async function enrichReformPackagesWithOfficialLanguages(reformPackages, { fetchSource, fetchImpl }) {
  const enriched = []
  for (const reformPackage of reformPackages) {
    enriched.push(await enrichReformPackageWithOfficialLanguages(reformPackage, { fetchSource, fetchImpl }))
  }
  return enriched
}

function extractDecisionsFromPresidentUzDetail(source, html, extractedAt) {
  const item = sourceItemFromOfficialDetail(source, html, {
    id: 'detail',
    sourceUrl: source.url,
  })

  if (!item) return { candidates: [], exclusions: [] }

  const decision = sourceItemToDecision(
    source,
    item,
    extractedAt,
    'President.uz detail page did not expose a separate summary in the configured extraction block.',
  )

  return {
    candidates: decision.candidate ? [decision.candidate] : [],
    exclusions: decision.exclusion ? [decision.exclusion] : [],
  }
}

export function extractCandidateDecisionsFromSource(source, html, extractedAt) {
  if (source.parser === 'lexuz-official-search') {
    const decisions = sourceItemsFromLexOfficialSearch(source, html)
      .map((item) =>
        sourceItemToDecision(
          source,
          item,
          extractedAt,
          'Lex.uz official search result did not expose a separate summary in the configured extraction block.',
        ),
      )

    return {
      candidates: decisions.flatMap((decision) => (decision.candidate ? [decision.candidate] : [])),
      exclusions: decisions.flatMap((decision) => (decision.exclusion ? [decision.exclusion] : [])),
    }
  }

  if (source.parser === 'president-uz-list') {
    return extractDecisionsFromPresidentUzList(source, html, extractedAt)
  }
  if (source.parser === 'president-uz-detail' || source.parser === 'official-detail') {
    return extractDecisionsFromPresidentUzDetail(source, html, extractedAt)
  }

  const jsonPayload = maybeParseJson(html)
  const apiDecisions = extractDecisionsFromGovUzApi(source, jsonPayload, extractedAt)
  if (apiDecisions.candidates.length > 0 || apiDecisions.exclusions.length > 0) return apiDecisions

  const decisions = sourceItemsFromHtmlArticles(source, html)
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

function sourceItemsFromHtmlArticles(source, html) {
  const articleItems = extractArticleBlocks(html)
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
          /<p\b[^>]*class=["'][^"']*(?:summary|description|excerpt|anons)[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
          /<p\b[^>]*>([\s\S]*?)<\/p>/i,
        ]),
      )
      const publishedAt = parseOfficialDate(
        firstMatch(block, [
          /<time\b[^>]*datetime=["']([^"']+)["']/i,
          /data-date=["']([^"']+)["']/i,
          /\b([0-3]\d[.-][01]\d[.-]\d{4})\b/i,
          /\b(\d{4}-[01]\d-[0-3]\d)\b/i,
        ]),
      )
      return {
        title,
        summary,
        publishedAt,
        sourceUrl: toAbsoluteUrl(href, source.url),
        text: `${title} ${summary}`,
      }
    })
    .filter((item) => item.title)

  if (articleItems.length > 0) return articleItems

  if (source.follow_detail_links !== true) return []

  return Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi), (match) => ({
    title: normalizeWhitespace(match[2]),
    summary: normalizeWhitespace(match[2]),
    publishedAt: '',
    sourceUrl: toAbsoluteUrl(match[1], source.url),
    text: normalizeWhitespace(match[2]),
  })).filter(
    (item) =>
      item.title.length > 20 &&
      hasOfficialDetailSourcePattern(item.sourceUrl) &&
      hasOfficialMeasureTextPattern(`${item.title} ${item.summary}`),
  )
}

function sourceItemsFromLexOfficialSearch(source, html) {
  const items = Array.from(
    html.matchAll(/<a\b[^>]*href=["']([^"']*\/docs\/-?\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>([\s\S]{0,450})/gi),
    (match) => {
      const title = normalizeWhitespace(match[2])
      const trailingText = normalizeWhitespace(match[3])
      return {
        title,
        summary: trailingText,
        publishedAt: parseOfficialDate(trailingText),
        sourceUrl: toAbsoluteUrl(match[1], source.url),
        text: `${title} ${trailingText}`,
      }
    },
  ).filter((item) => item.title.length > 20 && hasOfficialMeasureTextPattern(`${item.title} ${item.summary}`))

  return items.filter((item, index, allItems) => {
    const firstIndex = allItems.findIndex((other) => normalizeUrlForComparison(other.sourceUrl) === normalizeUrlForComparison(item.sourceUrl))
    return firstIndex === index
  })
}

function sourceItemsFromSourceListing(source, html) {
  if (source.parser === 'lexuz-official-search') return sourceItemsFromLexOfficialSearch(source, html)
  if (source.parser === 'president-uz-list') return sourceItemsFromPresidentUzList(source, html)

  const jsonPayload = maybeParseJson(html)
  const govUzApiItems = sourceItemsFromGovUzApi(source, jsonPayload)
  if (govUzApiItems.length > 0) return govUzApiItems

  if (source.parser === 'president-uz-detail' || source.parser === 'official-detail') {
    const item = sourceItemFromOfficialDetail(source, html, { id: 'detail', sourceUrl: source.url })
    return item ? [item] : []
  }

  return sourceItemsFromHtmlArticles(source, html)
}

function researchUrlIsUsable(source, sourceUrl) {
  if (!sourceUrl || sourceUrl.endsWith('#')) return false
  const normalizedSourceUrl = normalizeUrlForComparison(sourceUrl)
  if (!normalizedSourceUrl || normalizedSourceUrl === normalizeUrlForComparison(source.url)) return false

  try {
    const parsed = new URL(sourceUrl)
    if (!/^https?:$/i.test(parsed.protocol)) return false
    if (/(?:mailto|javascript):/i.test(sourceUrl)) return false
    if (/(?:share|print|subscribe|newsletter|login|signin|contact|about|privacy|terms|facebook|twitter|linkedin|telegram|youtube)/i.test(sourceUrl)) {
      return false
    }
  } catch {
    return false
  }

  return true
}

function sourceItemsFromRepecSeries(source, html) {
  return Array.from(
    html.matchAll(
      /<LI\b[^>]*class=["'][^"']*list-group-item[^"']*["'][^>]*>\s*<B>\s*(\d{4})(?:\/\d+)?\s*<A\b[^>]*HREF=["']([^"']+)["'][^>]*>([\s\S]*?)<\/A><\/B>([\s\S]*?)(?=<LI\b[^>]*class=["'][^"']*list-group-item|<\/UL>|$)/gi,
    ),
    (match) => {
      const year = match[1]
      const title = normalizeWhitespace(match[3])
      const trailingText = normalizeWhitespace(match[4])
      return {
        title,
        summary: trailingText,
        publishedAt: year,
        sourceUrl: toAbsoluteUrl(match[2], source.url),
        text: `${title} ${trailingText}`,
      }
    },
  ).filter((item) => item.title.length >= 18 && researchUrlIsUsable(source, item.sourceUrl))
}

function sourceItemsFromResearchHtml(source, html) {
  if (source.parser === 'research-repec-series') return sourceItemsFromRepecSeries(source, html)

  const blockItems = extractArticleBlocks(html)
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
          /<p\b[^>]*class=["'][^"']*(?:summary|description|excerpt|abstract|teaser)[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
          /<p\b[^>]*>([\s\S]*?)<\/p>/i,
        ]),
      )
      const dateText = firstMatch(block, [
        /<time\b[^>]*datetime=["']([^"']+)["']/i,
        /data-date=["']([^"']+)["']/i,
        /\b(\d{4}-[01]\d-[0-3]\d)\b/i,
        /\b([0-3]\d[.-][01]\d[.-]\d{4})\b/i,
        /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+[0-3]?\d,\s+\d{4})\b/i,
      ])
      return {
        title,
        summary,
        publishedAt: parseOfficialDate(dateText),
        sourceUrl: toAbsoluteUrl(href, source.url),
        text: `${title} ${summary}`,
      }
    })
    .filter((item) => item.title.length >= 18 && researchUrlIsUsable(source, item.sourceUrl))

  const anchorItems = Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>([\s\S]{0,700})/gi), (match) => {
    const title = normalizeWhitespace(match[2])
    const trailingText = normalizeWhitespace(match[3])
    const dateText =
      firstMatch(match[3], [
        /\b(\d{4}-[01]\d-[0-3]\d)\b/i,
        /\b([0-3]\d[.-][01]\d[.-]\d{4})\b/i,
        /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+[0-3]?\d,\s+\d{4})\b/i,
      ]) || trailingText
    return {
      title,
      summary: trailingText,
      publishedAt: parseOfficialDate(dateText),
      sourceUrl: toAbsoluteUrl(match[1], source.url),
      text: `${title} ${trailingText}`,
    }
  }).filter((item) => item.title.length >= 18 && researchUrlIsUsable(source, item.sourceUrl))

  const allItems = [...blockItems, ...anchorItems]
  return allItems.filter((item, index, items) => {
    const key = normalizeUrlForComparison(item.sourceUrl) || `${item.title}-${item.publishedAt}`
    return items.findIndex((other) => (normalizeUrlForComparison(other.sourceUrl) || `${other.title}-${other.publishedAt}`) === key) === index
  })
}

function researchRulesForText(text) {
  return RESEARCH_MODEL_RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(text)))
}

function researchUpdateFromItem(source, item, extractedAt) {
  const rules = researchRulesForText(`${item.title} ${item.summary}`)
  if (rules.length === 0) return null

  const title = normalizeWhitespace(item.title)
  if (
    !title ||
    /^(?:download|pdf|read more|learn more|view all|working papers|publications|research|search)$/i.test(title) ||
    title.length < 18
  ) {
    return null
  }

  const modelIds = uniqueStrings(rules.flatMap((rule) => rule.model_ids))
  const methods = uniqueStrings(rules.flatMap((rule) => rule.methods))
  const topic = uniqueStrings(rules.map((rule) => rule.topic)).join('; ')
  const whyRelevant = uniqueStrings(rules.map((rule) => rule.why_relevant)).join(' ')
  const summary = normalizeWhitespace(item.summary)
  const compactSummary =
    summary.length >= 80 && summary.toLowerCase() !== title.toLowerCase()
      ? summary.slice(0, 360).replace(/\s+\S*$/, '').trim()
      : `${topic}. Included as a source-linked methods update for ${modelIds.join(', ')}; it is not a platform model result.`
  const publishedAt = /^\d{4}(?:-[01]\d(?:-[0-3]\d)?)?$/.test(item.publishedAt ?? '') ? item.publishedAt : ''

  return {
    id: `research-${source.id}-${slugify(`${publishedAt || extractedAt}-${title}`)}`,
    title,
    topic,
    summary: compactSummary,
    model_ids: modelIds,
    methods,
    source_title: title,
    source_institution: source.institution,
    source_url: item.sourceUrl,
    ...(publishedAt ? { published_at: publishedAt } : { as_of_date: extractedAt.slice(0, 10) }),
    why_relevant: whyRelevant,
  }
}

function sortResearchUpdates(updates) {
  return updates.sort((left, right) => {
    const leftDate = left.published_at ?? left.as_of_date ?? ''
    const rightDate = right.published_at ?? right.as_of_date ?? ''
    return rightDate.localeCompare(leftDate) || left.title.localeCompare(right.title)
  })
}

function uniqueResearchUpdates(updates) {
  const seen = new Set()
  return updates.filter((update) => {
    const keys = [
      normalizeUrlForComparison(update.source_url),
      slugify(update.title),
    ].filter(Boolean)
    if (keys.some((key) => seen.has(key))) return false
    for (const key of keys) seen.add(key)
    return true
  })
}

function previousResearchUpdates(previousArtifact) {
  if (!Array.isArray(previousArtifact?.research_updates)) return []
  return previousArtifact.research_updates.filter((update) => update?.id && update?.source_url)
}

async function validateResearchUpdateLink(update, fetchImpl) {
  try {
    const host = new URL(update.source_url).hostname
    if (/\.test$/i.test(host) || /^(?:example|localhost|127\.0\.0\.1)(?:\.|$)/i.test(host)) {
      return false
    }
    const response = await fetchImpl(update.source_url, {
      method: 'GET',
      headers: SOURCE_LINK_VALIDATION_HEADERS,
    })
    return response.ok
  } catch {
    return false
  }
}

async function validateResearchUpdateLinks(updates, { fetchSource, fetchImpl }) {
  if (!fetchSource) return updates

  const decisions = await Promise.all(
    updates.map(async (update) => ({
      update,
      ok: await validateResearchUpdateLink(update, fetchImpl),
    })),
  )
  return decisions.filter((decision) => decision.ok).map((decision) => decision.update)
}

async function buildResearchUpdatesWithDiagnostics({
  fetchSource,
  fetchImpl,
  extractedAt,
  previousArtifact,
  researchSources = RESEARCH_SOURCE_DEFINITIONS,
}) {
  if (!fetchSource) {
    return {
      updates: STATIC_RESEARCH_UPDATES,
      source_results: [],
      source_failures: [],
      retained_update_count: 0,
    }
  }

  const sourceResults = await Promise.all(
    researchSources.map(async (source) => {
      try {
        const html = await readSource(source, true, fetchImpl)
        const parsedUpdates = sourceItemsFromResearchHtml(source, html)
          .map((item) => researchUpdateFromItem(source, item, extractedAt))
          .filter((update) => update !== null)
          .slice(0, source.detail_fetch_limit ?? 12)
        const verifiedUpdates = await validateResearchUpdateLinks(uniqueResearchUpdates(parsedUpdates), {
          fetchSource,
          fetchImpl,
        })
        return {
          ...sourceDefinitionToArtifactSource(source),
          parser: source.parser ?? 'research-html-list',
          fetch_url: source.url,
          ok: true,
          update_count: verifiedUpdates.length,
          fetched_at: extractedAt,
          updates: verifiedUpdates,
        }
      } catch (error) {
        return {
          ...sourceDefinitionToArtifactSource(source),
          parser: source.parser ?? 'research-html-list',
          fetch_url: source.url,
          ok: false,
          update_count: 0,
          fetched_at: extractedAt,
          updates: [],
          error: formatError(error),
        }
      }
    }),
  )

  const fetchedUpdates = uniqueResearchUpdates(sortResearchUpdates(sourceResults.flatMap((result) => result.updates)))
  const fallbackUpdates = previousResearchUpdates(previousArtifact)
  const fallback = fallbackUpdates.length > 0 ? fallbackUpdates : STATIC_RESEARCH_UPDATES
  const updates = uniqueResearchUpdates(sortResearchUpdates([...fetchedUpdates, ...fallback])).slice(0, 12)

  return {
    updates,
    source_results: sourceResults.map(({ updates: _updates, ...result }) => result),
    source_failures: sourceResults
      .filter((result) => !result.ok)
      .map(({ id, institution, url, parser, fetch_url, error }) => ({ id, institution, url, parser, fetch_url, error })),
    retained_update_count: Math.max(0, updates.length - fetchedUpdates.length),
  }
}

function shouldFetchDetailItems(source, fetchSource) {
  return fetchSource && source.follow_detail_links === true && source.parser !== 'president-uz-detail' && source.parser !== 'official-detail'
}

async function fetchOfficialDetailItem(source, item, fetchImpl) {
  if (!isUsableCandidateSourceUrl(source, item.sourceUrl)) return item

  const response = await fetchImpl(item.sourceUrl, {
    headers: SOURCE_LINK_VALIDATION_HEADERS,
  })
  if (!response.ok) {
    return {
      ...item,
      text: '',
      summary: '',
      detail_fetch_error: `HTTP ${response.status}`,
    }
  }

  const detailHtml = await response.text()
  const detailItem = sourceItemFromOfficialDetail(source, detailHtml, item)
  if (!detailItem) {
    return {
      ...item,
      text: '',
      summary: '',
      detail_fetch_error: 'Detail page did not expose parseable title/body text',
    }
  }
  return detailItem
}

async function extractCandidateDecisionsFromSourceWithDetails(source, html, extractedAt, { fetchSource, fetchImpl }) {
  if (!shouldFetchDetailItems(source, fetchSource)) return extractCandidateDecisionsFromSource(source, html, extractedAt)

  const items = sourceItemsFromSourceListing(source, html).slice(0, source.detail_fetch_limit ?? 12)
  const decisions = await Promise.all(
    items.map(async (item) => {
      if (!isUsableCandidateSourceUrl(source, item.sourceUrl)) {
        return sourceItemToDecision(
          source,
          item,
          extractedAt,
          'Official source list item did not expose a stable detail link.',
        )
      }

      const detailItem = await fetchOfficialDetailItem(source, item, fetchImpl)
      if (detailItem.detail_fetch_error) {
        return {
          candidate: null,
          exclusion: {
            title: item.title,
            source_institution: source.institution,
            source_url: item.sourceUrl,
            source_published_at: item.publishedAt || undefined,
            exclusion_reason: 'source_link_unusable',
            matched_include_rules: [],
            matched_exclude_rules: [],
            relevance_score: 0,
            source_url_error: detailItem.detail_fetch_error,
          },
        }
      }

      return sourceItemToDecision(
        source,
        detailItem,
        extractedAt,
        'Official detail page did not expose a separate summary in the configured extraction block.',
      )
    }),
  )

  return {
    candidates: decisions.flatMap((decision) => (decision.candidate ? [decision.candidate] : [])),
    exclusions: decisions.flatMap((decision) => (decision.exclusion ? [decision.exclusion] : [])),
  }
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
  const titleText = `${candidate.title} ${candidate.source_title ?? ''}`.toLowerCase()
  const text = `${titleText} ${candidate.summary}`.toLowerCase()
  const eventType = /\b(?:superseded|repealed|invalidated|o.?z kuchini yo.?qotgan)\b/i.test(titleText)
    ? 'superseded'
    : /\b(?:amended|amendments|o.?zgartirish\w*|qo.?shimcha\w*)/i.test(titleText)
      ? 'amended'
      : /\b(?:approved|adopted|tasdiqlash|tasdiqlandi|qabul qilindi|qabul qilingan)\b/i.test(titleText)
        ? 'approved'
        : text.includes('financing') || text.includes('loan') || text.includes('grant')
          ? 'financing_allocated'
          : text.includes('implemented') || text.includes('launched') || text.includes('introduced') || text.includes('joriy etish')
            ? 'implementation_milestone'
            : 'instructions_issued'
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
    event_type: eventType,
    summary: publicSourceEventSummary(candidate.summary, candidate.inclusion_reason),
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

function isVerifiedHousingUrbanizationSourceEvent(candidate) {
  const text = `${candidate.title} ${candidate.summary} ${candidate.source_url}`.toLowerCase()
  return (
    isConfiguredVerifiedCandidate(candidate) &&
    candidate.source_url.includes('gov.uz') &&
    (candidate.source_url.includes('/153724') ||
      (text.includes('urbanization') && text.includes('construction') && text.includes('master plans')))
  )
}

function isVerifiedAgricultureSubsidySourceEvent(candidate) {
  const text = `${candidate.title} ${candidate.summary} ${candidate.source_url}`.toLowerCase()
  return (
    isConfiguredVerifiedCandidate(candidate) &&
    candidate.source_url.includes('gov.uz') &&
    (candidate.source_url.includes('/109178') ||
      (text.includes('agricultur') && text.includes('subsid') && text.includes('agroportal')))
  )
}

const PACKAGE_TOPIC_DEFINITIONS = [
  {
    id: 'remote-mountain-settlement-classification',
    title: 'Remote and mountain settlement classification rules update',
    policy_area: 'Regional settlement classification and public-service eligibility',
    reform_category: 'social_protection',
    patterns: [/\b(borish qiyin|togʻli hududlar|tog'li hududlar|remote settlement|mountain settlement|aholi punktlarini)\b/i],
  },
  {
    id: 'market-fee-rent-collection',
    title: 'Market fee, rent, and service-payment collection rules',
    policy_area: 'Market complex fee collection and rental-payment administration',
    reform_category: 'fiscal_tax',
    patterns: [/\b(bozorlar|savdo komplekslari|bir martalik yigʻim|bir martalik yig'im|ijara toʻlovlari|ijara to'lovlari|market fees?|market complex)\b/i],
  },
  {
    id: 'aml-cft-financial-control',
    title: 'Financial-sector AML/CFT internal control rules reform',
    policy_area: 'AML/CFT controls for banks, nonbank lenders, payments, and e-money institutions',
    reform_category: 'financial_sector',
    patterns: [/\b(anti-money laundering|terrorism financing|aml|cft|jinoiy faoliyatdan olingan daromad|legallashtirish|terrorizmni moliyalashtirish|ommaviy qirgʻin qurolini|ommaviy qirg'in qurolini)\b/i],
  },
  {
    id: 'employment-fund-subsidy-loans',
    title: 'Employment Fund subsidy and loan allocation rules',
    policy_area: 'Employment fund subsidies, loans, and labor-market support',
    reform_category: 'labor_market',
    patterns: [/\b(bandlikka|employment fund|subsidiyalar va ssuda|subsidy and loan allocation)\b/i],
  },
  {
    id: 'large-investment-integrity-competition-review',
    title: 'Large investment project integrity and competition review reform',
    policy_area: 'Investment project anti-corruption review and competition impact assessment',
    reform_category: 'business_environment',
    patterns: [/\b(yirik investitsiya loyihalarini|anti-corruption expert|korrupsiyaga qarshi|competition impact|raqobat muhitiga)\b/i],
  },
  {
    id: 'construction-oversight-inspection-pricing',
    title: 'Construction oversight and technical inspection pricing reform',
    policy_area: 'Construction oversight, technical inspection pricing, and inspection bureaucracy',
    reform_category: 'infrastructure_investment',
    patterns: [/\b(construction oversight|reduce bureaucracy and strengthen construction oversight|instrumental texnik|sinov-laboratoriya|texnik holatini|narxlarini hisoblash|qurilish.*nazorat inspeksiyasi)\b/i],
  },
  {
    id: 'insolvency-framework',
    title: 'Insolvency framework reform',
    policy_area: 'Insolvency procedures and business restructuring',
    reform_category: 'business_environment',
    patterns: [/\b(qobiliyatsizlik|insolvency)\b/i],
  },
  {
    id: 'urbanization-housing-construction',
    title: 'Urbanization, construction permits, and housing delivery reform',
    policy_area: 'Urbanization, construction permits, housing, and infrastructure delivery',
    reform_category: 'infrastructure_investment',
    patterns: [/\b(urbanization|housing construction|construction permits?|master plans?|land privatization|technical specifications|utility networks|yangi uzbekistan)\b/i],
  },
  {
    id: 'agriculture-subsidy-financing',
    title: 'Agriculture financing and subsidy delivery reform',
    policy_area: 'Agriculture financing, subsidies, and digital delivery',
    reform_category: 'agriculture',
    patterns: [/\b(agrosubsidy|agricultural payments agency|cotton and grain|cotton.*grain|paxta va bug.?doy|agricultur(?:e|al).{0,60}subsid|farmers?.{0,60}subsid|proactive subsidy)\b/i],
  },
  {
    id: 'pasture-dryland-use-incentives',
    title: 'Dryland and pasture land-use incentive reform',
    policy_area: 'Dryland and pasture land activation incentives',
    reform_category: 'agriculture',
    patterns: [/\b(lalmi|yaylov|pasture|dryland|yer uchastkalarini foydalanishga kiritish|rag.?batlantirishning yangi mexanizmlari)\b/i],
  },
  {
    id: 'food-safety-veterinary-agrologistics',
    title: 'Food safety, veterinary, and agrologistics reform',
    policy_area: 'Food safety, veterinary services, agrologistics, and agricultural exports',
    reform_category: 'agriculture',
    patterns: [
      /\b(food safety|food security|veterinary|livestock|pasture|phytosanitary|agrologistics|agroko.?makchi|field diary|pests?|fruit and vegetable exports?)\b/i,
    ],
  },
  {
    id: 'customs-clearance-digitalization',
    title: 'Risk-based customs clearance and electronic declaration reform',
    policy_area: 'Trade facilitation and customs digitalization',
    reform_category: 'trade_customs',
    patterns: [/\b(customs|clearance|electronic declaration|single window|risk-based)\b/i],
  },
  {
    id: 'public-transport-system',
    title: 'Public transport service and financing reform',
    policy_area: 'Public transport routes, fleet renewal, fare systems, and service delivery',
    reform_category: 'infrastructure_investment',
    patterns: [/\b(public transport|metro|metropolitan|bus routes?|electric buses|rolling stock|distance-based fare|transport system|fare payment|transport service)\b/i],
  },
  {
    id: 'tax-administration-incentives',
    title: 'Tax administration and investment incentive reform',
    policy_area: 'Tax administration and fiscal incentives',
    reform_category: 'fiscal_tax',
    patterns: [/\b(tax|vat|incentive|incentives|excise|duty)\b/i],
  },
  {
    id: 'energy-tariff-compensation',
    title: 'Energy tariff adjustment and compensation reform',
    policy_area: 'Energy tariffs, household compensation, and fiscal monitoring',
    reform_category: 'energy_tariffs',
    patterns: [/\b(energy|tariff|gas|electricity|compensation)\b/i],
  },
  {
    id: 'public-services-digital-legal',
    title: 'Digital public service and legal process reform',
    policy_area: 'Digital public administration and legal services',
    reform_category: 'digital_public_admin',
    patterns: [/\b(public service|notarial|notary|legal service|digital|online)\b/i],
  },
  {
    id: 'investment-climate-sez',
    title: 'Investment climate and special economic zone reform',
    policy_area: 'Investment climate and special economic zones',
    reform_category: 'business_environment',
    patterns: [/\b(investment climate|special economic zones|investor service|investors?)\b/i],
  },
  {
    id: 'monetary-prudential-parameters',
    title: 'Monetary and financial-sector parameter reform',
    policy_area: 'Monetary policy and prudential regulation',
    reform_category: 'monetary_policy',
    patterns: [/\b(policy rate|reserve requirement|prudential|bank|foreign-currency deposit)\b/i],
  },
  {
    id: 'public-administration-legal',
    title: 'Public administration legal framework reform',
    policy_area: 'Public administration and local state power rules',
    reform_category: 'other_policy',
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

function topicPackageEnrichment(topic, sortedCandidates, sourceEvents) {
  const groupText = sortedCandidates.map((candidate) => `${candidate.title} ${candidate.summary}`).join(' ')

  if (topic?.id === 'tax-administration-incentives') {
    if (!/\bincentives?\b/i.test(groupText) || !/\binfrastructure projects?\b/i.test(groupText)) return {}

    return {
      short_summary: 'Infrastructure investors receive tax incentives.',
      parameters_or_amounts: [
        'Tax incentives apply to investors financing infrastructure projects.',
        'Fiscal incentive treatment applies to qualifying infrastructure-investment financing.',
      ],
      policy_channels: [
        'Fiscal incentives',
        'Private infrastructure investment',
        'Business cost of capital',
        'Public-private financing',
      ],
      financing_or_incentive: 'Tax incentives for investors financing infrastructure projects',
      why_tracked:
        'The verified official source records a fiscal incentive measure for investors financing infrastructure projects. It is tracked as an incentive package while avoiding any inferred implementation deadline not present in the source.',
      measure_label: 'Tax incentives apply to infrastructure investors',
      milestone_label: 'tax incentive source event recorded',
    }
  }

  if (topic?.id === 'aml-cft-financial-control') {
    return {
      short_summary:
        'AML/CFT internal-control rules change across banks, nonbank lenders, payments, and e-money institutions.',
      parameters_or_amounts: [
        'Commercial-bank AML/CFT internal-control rules are amended.',
        'Nonbank credit-organization AML/CFT internal-control rules are amended.',
        'Payment-system, e-money, and payment-organization AML/CFT rules are amended.',
      ],
      policy_channels: [
        'Financial integrity supervision',
        'Bank and nonbank compliance',
        'Payment-system and e-money oversight',
        'Financial stability and market confidence',
      ],
      model_relevance: ['Financial stability', 'Credit conditions', 'Compliance costs'],
      why_tracked:
        'The source events amend binding internal-control rules for financial institutions and payment providers. They are grouped to avoid presenting parallel AML/CFT legal updates as separate reforms.',
      measure_label: 'AML/CFT internal-control rules were amended',
    }
  }

  if (topic?.id === 'construction-oversight-inspection-pricing') {
    return {
      short_summary:
        'Construction oversight and technical-inspection pricing rules are approved.',
      parameters_or_amounts: [
        'Technical condition review and laboratory-work price calculation regulation is approved.',
        'Construction oversight and bureaucracy-reduction measures are grouped under the construction reform package.',
        'The previous technical-inspection pricing order is superseded where cited by the source.',
      ],
      policy_channels: [
        'Construction inspection oversight',
        'Technical inspection pricing',
        'Administrative burden in construction',
        'Construction quality and safety',
      ],
      model_relevance: ['Construction output', 'Investment', 'Public administration'],
      why_tracked:
        'The official sources identify related construction oversight and inspection-pricing measures. Grouping them prevents a repealed pricing order, a new pricing regulation, and presidential oversight instructions from appearing as unrelated dossiers.',
      measure_label: 'Construction oversight and inspection-pricing rules were approved',
    }
  }

  const enrichments = {
    'remote-mountain-settlement-classification': {
      short_summary:
        'Settlement classification rules change for hard-to-reach and mountainous areas.',
      parameters_or_amounts: [
        'The preamble to the settlement classification instruction is amended.',
        'Regional eligibility classification rules are updated for hard-to-reach and mountainous areas.',
      ],
      policy_channels: ['Regional classification', 'Targeted public support', 'Service-delivery eligibility'],
      model_relevance: ['Public spending', 'Regional development', 'Household access'],
      measure_label: 'Settlement classification rules were amended',
    },
    'market-fee-rent-collection': {
      short_summary:
        'Market fee, rent, and service-payment collection rules are amended.',
      parameters_or_amounts: [
        'One-time fee, rent, and service-payment collection rules are amended.',
        'Payment collection procedures are updated for markets, trade complexes, and their branches.',
      ],
      policy_channels: ['Market fee administration', 'Rent and service-payment collection', 'Fiscal compliance'],
      model_relevance: ['Business costs', 'Fiscal administration', 'Market services'],
      measure_label: 'Market fee, rent, and service-payment collection rules were amended',
    },
    'employment-fund-subsidy-loans': {
      short_summary:
        'Rules are approved for subsidies and loans from the State Employment Assistance Fund.',
      parameters_or_amounts: [
        'Subsidy and loan allocation regulation is approved.',
        'State Employment Assistance Fund resources are identified as the funding source.',
        'Employment-support financing procedures are updated.',
      ],
      policy_channels: ['Employment support subsidies', 'Labor-market financing', 'Public fund administration'],
      model_relevance: ['Employment', 'Public spending', 'Labor supply'],
      measure_label: 'Rules were approved for Employment Fund subsidies and loans',
    },
    'pasture-dryland-use-incentives': {
      short_summary:
        'New incentives are introduced to bring dryland and pasture plots into use.',
      parameters_or_amounts: [
        'New incentive mechanisms apply to dryland and pasture land activation.',
        'Agricultural land-use activation rules are introduced.',
      ],
      policy_channels: ['Agricultural land use', 'Rural production incentives', 'Pasture and dryland activation'],
      model_relevance: ['Agricultural output', 'Rural investment', 'Land productivity'],
      measure_label: 'Incentives apply to dryland and pasture land activation',
    },
    'agriculture-subsidy-financing': {
      short_summary:
        'Agriculture support moves toward agency-administered, digital, and proactive subsidy delivery.',
      parameters_or_amounts: [
        'Agricultural Payments Agency is set up to administer subsidy and payment workflows.',
        'Agrosubsidy and Agroportal become the main channels for proactive and digital subsidy delivery.',
        'A “discipline-cheaper credit” model links lower interest rates to producer credit ratings.',
        'An additional 5 trillion soums is proposed for agrotechnical measures, including film and hose costs.',
      ],
      policy_channels: ['Agricultural producer finance', 'Subsidy delivery', 'Rural liquidity'],
      model_relevance: ['Agricultural output', 'Food prices', 'Rural income'],
      financing_or_incentive:
        'Agricultural Payments Agency, Agroportal, and Agrosubsidy become the delivery channel for producer support.',
      measure_label: 'Agriculture subsidy delivery moves to agency-administered digital channels',
    },
    'food-safety-veterinary-agrologistics': {
      short_summary:
        'Food-safety, veterinary, export-logistics, livestock, and digital field-control measures are set out.',
      parameters_or_amounts: [
        'From 2027, six state functions are to be transferred gradually to the private sector, including laboratory tests, animal vaccination, disinfection, and identification.',
        'By 2027-03-01, a unified food-safety information system is to launch and integrate with the border-control single window.',
        'From 2029-01-01, fruit and vegetable exports are to move through agrologistics centers.',
        'Food-industry enterprises are to move toward HACCP and Codex Alimentarius standards; full transition is targeted by 2032.',
        'Agroko‘makchi gets an electronic Field Diary, and AI tools will forecast pests and advise farmers.',
      ],
      policy_channels: [
        'Food-safety administration',
        'Veterinary and livestock services',
        'Agrologistics and export controls',
        'Digital field monitoring',
      ],
      model_relevance: ['Agricultural output', 'Food prices', 'Export logistics'],
      why_tracked:
        'The official source sets dated food-safety, veterinary, export-logistics, and digital agriculture measures.',
      measure_label: 'Food-safety and agrologistics measures were set out',
    },
    'customs-clearance-digitalization': {
      short_summary:
        'Customs clearance, declaration, and border-process measures are updated.',
      parameters_or_amounts: [
        'Customs and trade-facilitation procedures are updated.',
        'Clearance and declaration processes are updated.',
      ],
      policy_channels: ['Customs clearance', 'Trade facilitation', 'Import and export transaction costs'],
      model_relevance: ['Trade flows', 'Import costs', 'Sector linkages'],
      measure_label: 'Customs and trade-facilitation procedures were updated',
    },
    'public-services-digital-legal': {
      short_summary:
        'Bureaucracy-reduction measures set targets to cut state functions, simplify services, and move more delivery online.',
      parameters_or_amounts: [
        'The “Eliminating Bureaucracy – 2030” program targets a 30 percent reduction in state-body functions.',
        'Business requirements are to be optimized by up to 20 percent.',
        'The share of electronic public services is targeted to exceed 90 percent.',
        'The “zero bureaucracy” principle is proposed for 783 public services.',
        '550 public services are to be converted to electronic format, with service stages halved.',
        '80 services are planned for proactive and composite delivery formats.',
        'Another 80 services are to be shortened from an average 13 days to 6 days.',
        'Fees for 25 service types are to be reduced, with estimated annual savings of up to 851 billion soums.',
        '10 services are planned for transfer to the private sector.',
        '15 certificate and document types are to be digitized, removing repeat requests across more than 270 services.',
        'State functions, mandatory requirements, and public services are to be maintained on reestr.gov.uz.',
      ],
      policy_channels: ['Public service delivery', 'Administrative burden', 'Digital public administration'],
      model_relevance: ['Public administration', 'Transaction costs', 'Productivity'],
      measure_label: 'Bureaucracy-reduction targets and public-service simplification measures were published',
    },
    'large-investment-integrity-competition-review': {
      short_summary:
        'Large investment projects get anti-corruption review and competition-impact assessment procedures.',
      parameters_or_amounts: [
        'Anti-corruption expert review procedure for large investment projects is approved.',
        'Competition-environment impact assessment procedure is approved.',
      ],
      policy_channels: ['Investment project appraisal', 'Anti-corruption screening', 'Competition impact assessment'],
      model_relevance: ['Private investment', 'Market structure', 'Governance quality'],
      measure_label: 'Investment integrity and competition review procedures were approved',
    },
    'insolvency-framework': {
      short_summary:
        'Records presidential measures to further improve the insolvency institution. The dossier is kept as a business-environment reform because insolvency procedures affect restructuring, creditor recovery, and investment risk.',
      parameters_or_amounts: [
        'Presidential decree on improving the insolvency institution',
        'Business restructuring and creditor-resolution channel identified',
      ],
      policy_channels: ['Insolvency procedures', 'Business restructuring', 'Creditor and debtor resolution'],
      model_relevance: ['Private investment', 'Financial stability', 'Business exit and restructuring'],
      measure_label: 'insolvency framework measures',
    },
    'public-transport-system': {
      short_summary:
        'Public-transport proposals cover a new metro line, fare-payment changes, and 2027-2030 rolling-stock needs.',
      parameters_or_amounts: [
        'Platform screen doors will be tested at Shahriston metro station.',
        'Project-estimate documents are planned for the Mingorik-Chilonzor Buyum Bozori metro line.',
        'Construction options are to be studied in two stages: Mingorik-South Station, then South Station-Chilonzor Buyum Bozori.',
        'Distance-based fares, social-category benefits, and daily, weekly, and monthly passes are to be studied.',
        'Rolling-stock procurement proposals for 2027-2030 are to be prepared.',
      ],
      policy_channels: ['Public transport routes', 'Fleet renewal', 'Fare and payment systems', 'Urban and regional mobility'],
      model_relevance: ['Public investment', 'Household transport access', 'Urban productivity'],
      measure_label: 'Public transport development measures were updated',
    },
  }

  return enrichments[topic?.id] ?? {}
}

function candidateTopic(candidate) {
  const text = `${candidate.title} ${candidate.summary} ${candidate.inclusion_reason}`.toLowerCase()
  return PACKAGE_TOPIC_DEFINITIONS.find((topic) => topic.patterns.some((pattern) => pattern.test(text))) ?? null
}

function packageAssemblyKey(candidate) {
  const topic = candidateTopic(candidate)
  const category = topic?.reform_category ?? candidate.reform_category ?? 'other_policy'
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

function genericPackageSummary(topic, defaults, sourceEvents) {
  const eventCount = sourceEvents.length
  const policyArea = topic?.policy_area ?? defaults.policy_area
  if (eventCount > 1) {
    return `Consolidates ${eventCount} official measures under ${policyArea}. The dossier groups related source events while keeping legal and currentness interpretation limited to the cited official documents.`
  }
  return `Records a specific official measure under ${policyArea}. The dossier summarizes the cited document without inferring unpublished implementation deadlines or legal effects.`
}

function genericPackageParameters(sortedCandidates, _sourceEvents, financingOrIncentive) {
  const parameters = []
  if (financingOrIncentive) parameters.push(financingOrIncentive)
  parameters.push(...sortedCandidates.map((candidate) => measureLabelFromCandidate(candidate)))
  return uniqueStrings(parameters)
}

function milestoneLabelForSourceEvent(event, topic, enrichment) {
  if (enrichment.milestone_label) return enrichment.milestone_label
  if (event.event_type === 'approved') return 'official measure approved'
  if (event.event_type === 'amended') return 'rules amended'
  if (event.event_type === 'superseded') return 'previous rule superseded'
  if (event.event_type === 'implementation_milestone') return 'implementation measure recorded'
  if (event.event_type === 'financing_allocated') {
    return topic?.id === 'tax-administration-incentives'
      ? 'tax incentive source event recorded'
      : 'financing or incentive source event recorded'
  }
  return 'official measure recorded'
}

function currentStageForSourceEvents(sourceEvents) {
  if (sourceEvents.length > 1) {
    const eventTypes = new Set(sourceEvents.map((event) => event.event_type))
    if (eventTypes.size === 1 && eventTypes.has('amended')) return 'Rules amended'
    if (eventTypes.size === 1 && eventTypes.has('financing_allocated')) return 'Incentive published'
    if (eventTypes.size === 1 && eventTypes.has('instructions_issued')) return 'Instructions issued'
    return 'Multiple changes published'
  }
  const eventType = sourceEvents[0]?.event_type
  if (eventType === 'approved') return 'Regulation approved'
  if (eventType === 'amended') return 'Rules amended'
  if (eventType === 'superseded') return 'Previous rule superseded'
  if (eventType === 'instructions_issued') return 'Instructions issued'
  if (eventType === 'implementation_milestone') return 'Implementation started'
  if (eventType === 'financing_allocated') return 'Incentive published'
  return 'Verified official measure'
}

function isVagueOmnibusLegalAmendment(candidate) {
  const text = `${candidate.title} ${candidate.summary}`.toLowerCase()
  return (
    /\bayrim qonun hujjatlariga\b/i.test(text) &&
    /\bo[ʻ'‘’]?zgartirish/i.test(text) &&
    !candidateTopic(candidate)
  )
}

function isPackageableCandidate(candidate) {
  return (
    !isVagueOmnibusLegalAmendment(candidate) &&
    (candidateTopic(candidate) ||
      isVerifiedHealthcareSourceEvent(candidate) ||
      isVerifiedHousingUrbanizationSourceEvent(candidate) ||
      isVerifiedAgricultureSubsidySourceEvent(candidate))
  )
}

function genericPackageFromCandidateGroup(candidates) {
  const sortedCandidates = [...candidates].sort((left, right) => packageDate(left).localeCompare(packageDate(right)))
  const first = sortedCandidates[0]
  const latest = sortedCandidates[sortedCandidates.length - 1]
  const topic = candidateTopic(first)
  const category = topic?.reform_category ?? first.reform_category ?? 'other_policy'
  const defaults = CATEGORY_PACKAGE_DEFAULTS[category] ?? CATEGORY_PACKAGE_DEFAULTS.other_policy
  const sourceEvents = sortedCandidates.map(candidateToSourceEvent)
  const currentStageDate = packageDate(latest)
  const packageSlug = topic?.id ?? slugify(`${first.reform_category}-${first.title}`)
  const confidence = sourceConfidenceForCandidates(sortedCandidates)
  const enrichment = topicPackageEnrichment(topic, sortedCandidates, sourceEvents)
  const fallbackFinancingOrIncentive = financingOrIncentiveFromCandidates(sortedCandidates)
  const financingOrIncentive = enrichment.financing_or_incentive ?? fallbackFinancingOrIncentive
  const milestones = sourceEvents.map((event, index) => ({
    id: `${packageSlug}-${event.event_type}-${event.source_published_at || index + 1}`,
    label: milestoneLabelForSourceEvent(event, topic, enrichment),
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
    current_stage: currentStageForSourceEvents(sourceEvents),
    current_stage_date: currentStageDate,
    next_milestone: NO_FUTURE_MILESTONE_LABEL,
    next_milestone_date: currentStageDate,
    responsible_institutions: uniqueStrings(sortedCandidates.map((candidate) => candidate.source_institution)),
    legal_basis: `Verified official source event${sourceEvents.length > 1 ? 's' : ''}: ${sourceEvents.map((event) => event.title).join('; ')}.`,
    official_basis: uniqueStrings(sourceEvents.map((event) => event.source_institution)).join('; '),
    financing_or_incentive: financingOrIncentive,
    short_summary: enrichment.short_summary ?? genericPackageSummary(topic, defaults, sourceEvents),
    parameters_or_amounts:
      enrichment.parameters_or_amounts ?? genericPackageParameters(sortedCandidates, sourceEvents, financingOrIncentive),
    source_confidence: confidence,
    why_tracked:
      enrichment.why_tracked ??
      `The package is assembled from ${sourceEvents.length} verified official source event${sourceEvents.length > 1 ? 's' : ''} with legal, fiscal, regulatory, parameter, or implementation evidence accepted by the intake rulebook.`,
    model_relevance: enrichment.model_relevance ?? defaults.model_relevance,
    policy_channels: enrichment.policy_channels ?? defaults.model_relevance,
    measure_tracks: sortedCandidates.map((candidate, index) => ({
      id: `${packageSlug}-measure-${index + 1}`,
      label: enrichment.measure_label ?? measureLabelFromCandidate(candidate),
      status: candidateToSourceEvent(candidate).event_type === 'approved' ? 'approved' : 'source verified',
    })),
    implementation_milestones: milestones,
    official_source_events: sourceEvents,
    caveat: 'Automatic official-source tracker entry assembled from verified source events. It is not an official legal registry and does not assert legal force beyond the cited official sources.',
  }
}

function cleanPublicDigestText(value) {
  return String(value ?? '')
    .replace(/^Tracks an?\s+/i, '')
    .replace(/^Tracks one verified official source event.*?\.\s*/i, '')
    .replace(/^Official detail page did not expose.*$/i, '')
    .replace(/\bsource-backed\b/gi, 'official')
    .replace(/\s+/g, ' ')
    .trim()
}

function publicDigestChanged(reformPackage) {
  const parameter = reformPackage.parameters_or_amounts?.find((value) => cleanPublicDigestText(value).length > 0)
  const measure = reformPackage.measure_tracks.find((track) => track.label)?.label
  const financing = reformPackage.financing_or_incentive
  const summary = reformPackage.short_summary ?? reformPackage.why_tracked
  return cleanPublicDigestText(parameter ?? measure ?? financing ?? summary)
}

function publicDigestEffectiveStatus(reformPackage) {
  const date = reformPackage.next_milestone_date || reformPackage.current_stage_date
  if (reformPackage.next_milestone && reformPackage.next_milestone !== NO_FUTURE_MILESTONE_LABEL) {
    return `${reformPackage.current_stage}; next step: ${reformPackage.next_milestone}${date ? ` (${date})` : ''}`
  }
  return `${reformPackage.current_stage}${reformPackage.current_stage_date ? ` (${reformPackage.current_stage_date})` : ''}`
}

function addPublicDigest(reformPackage) {
  const sourceEvent = reformPackage.official_source_events[0]
  const documentTitle = sourceEvent?.title && !/^Official detail page did not expose/i.test(sourceEvent.title)
    ? sourceEvent.title
    : reformPackage.official_basis

  return {
    ...reformPackage,
    digest: {
      changed: publicDigestChanged(reformPackage),
      applies_to: reformPackage.policy_area,
      effective_status: publicDigestEffectiveStatus(reformPackage),
      document: cleanPublicDigestText(documentTitle),
    },
  }
}

function sortPublicReformPackages(reformPackages) {
  return [...reformPackages].sort((left, right) => {
    const leftDate = left.current_stage_date ?? ''
    const rightDate = right.current_stage_date ?? ''
    return rightDate.localeCompare(leftDate) || String(left.title ?? '').localeCompare(String(right.title ?? ''))
  })
}

function configuredPreviousPackages(previousArtifact) {
  if (previousArtifact?.extraction_mode !== CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE) return []
  if (!Array.isArray(previousArtifact.reform_packages)) return []
  return previousArtifact.reform_packages
    .filter((reformPackage) => reformPackage?.package_id)
    .map(sanitizePublicReformPackage)
}

function publicPackageIdentityKey(reformPackage) {
  return slugify(
    [
      reformPackage.reform_category,
      reformPackage.title,
      reformPackage.policy_area,
    ]
      .filter(Boolean)
      .join(' '),
  )
}

function uniquePackageItemsById(items) {
  const seen = new Set()
  return items.filter((item) => {
    const id = item?.id
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function sortSourceEvents(events) {
  return uniquePackageItemsById(events).sort((left, right) => {
    const leftDate = left.source_published_at ?? ''
    const rightDate = right.source_published_at ?? ''
    return leftDate.localeCompare(rightDate) || String(left.title ?? '').localeCompare(String(right.title ?? ''))
  })
}

function sortMilestones(milestones) {
  return uniquePackageItemsById(milestones).sort((left, right) => {
    const leftDate = left.date ?? ''
    const rightDate = right.date ?? ''
    return leftDate.localeCompare(rightDate) || String(left.label ?? '').localeCompare(String(right.label ?? ''))
  })
}

function packageStageDate(reformPackage) {
  return reformPackage.current_stage_date ?? reformPackage.official_source_events?.at(-1)?.source_published_at ?? ''
}

function shouldPreferPreviousPackage(previousPackage, currentPackage) {
  const previousDate = packageStageDate(previousPackage)
  const currentDate = packageStageDate(currentPackage)
  return !currentDate && Boolean(previousDate)
}

function mergePublicPackageRecords(primaryPackage, secondaryPackage) {
  const officialSourceEvents = sortSourceEvents([
    ...(secondaryPackage.official_source_events ?? []),
    ...(primaryPackage.official_source_events ?? []),
  ].map(sanitizeSourceEventForPublication))
  const implementationMilestones = sortMilestones([
    ...(secondaryPackage.implementation_milestones ?? []),
    ...(primaryPackage.implementation_milestones ?? []),
  ])
  const latestEvent = officialSourceEvents.at(-1)
  const latestStageDate = [packageStageDate(primaryPackage), latestEvent?.source_published_at]
    .filter(Boolean)
    .sort()
    .at(-1)

  return {
    ...primaryPackage,
    current_stage_date: latestStageDate,
    official_source_events: officialSourceEvents,
    implementation_milestones: implementationMilestones,
  }
}

function mergeWithPreviousPublicPackages(currentPackages, previousArtifact) {
  const previousPackages = configuredPreviousPackages(previousArtifact)
  const packagesByKey = new Map(
    currentPackages
      .map(sanitizePublicReformPackage)
      .map((reformPackage) => [publicPackageIdentityKey(reformPackage), reformPackage]),
  )
  let retainedPackageCount = 0

  for (const previousPackage of previousPackages) {
    const key = publicPackageIdentityKey(previousPackage)
    const currentPackage = packagesByKey.get(key)

    if (!currentPackage) {
      packagesByKey.set(key, sanitizePublicReformPackage(previousPackage))
      retainedPackageCount += 1
      continue
    }

    if (shouldPreferPreviousPackage(previousPackage, currentPackage)) {
      packagesByKey.set(key, mergePublicPackageRecords(previousPackage, currentPackage))
      retainedPackageCount += 1
    } else {
      packagesByKey.set(key, mergePublicPackageRecords(currentPackage, previousPackage))
    }
  }

  return {
    packages: sortPublicReformPackages([...packagesByKey.values()].map(sanitizePublicReformPackage).map(addPublicDigest)),
    retainedPackageCount,
  }
}

function buildModelImpactMap(reformPackages) {
  return {
    active_lenses: MODEL_IMPACT_ACTIVE_LENSES,
    gated_lenses: MODEL_IMPACT_GATED_LENSES,
    package_links: reformPackages.map((reformPackage) => {
      const text = `${reformPackage.reform_category} ${reformPackage.policy_area} ${reformPackage.model_relevance.join(' ')}`.toLowerCase()
      const active_lenses = [
        ...(text.match(/\b(monetary|inflation|credit|financial)\b/)
          ? [{ model_id: 'QPM', channel: 'Macro-financial and inflation transmission context.', caveat: 'Possible lens only.' }]
          : []),
        ...(text.match(/\b(nowcast|transport|construction|agriculture|trade|customs|investment|output|sector)\b/)
          ? [{ model_id: 'DFM', channel: 'High-frequency monitoring context.', caveat: 'Possible lens only.' }]
          : []),
        ...(text.match(/\b(trade|customs|construction|agriculture|transport|infrastructure|sector|investment)\b/)
          ? [{ model_id: 'I-O', channel: 'Sector-linkage and final-demand propagation context.', caveat: 'Possible lens only.' }]
          : []),
        ...(text.match(/\b(trade|customs|tariff|import|export|investment)\b/)
          ? [{ model_id: 'PE', channel: 'Direct tariff-incidence and trade-flow context.', caveat: 'Possible lens only.' }]
          : []),
      ]

      return {
        package_id: reformPackage.package_id,
        active_lenses: active_lenses.length > 0
          ? active_lenses
          : [{ model_id: 'DFM', channel: 'General monitoring context.', caveat: 'Possible lens only.' }],
        gated_lenses: MODEL_IMPACT_GATED_LENSES.map((lens) => ({
          model_id: lens.id,
          status: 'planned_gated',
          caveat: 'Not active in public outputs.',
        })),
      }
    }),
    caveats: ['Model links are routing hints for analyst navigation and do not represent model results.'],
  }
}

function firstPackageIdByCategory(reformPackages, category) {
  return reformPackages.find((reformPackage) => reformPackage.reform_category === category)?.package_id
}

function buildInternalPolicyBriefs(reformPackages) {
  const tradePackage = firstPackageIdByCategory(reformPackages, 'trade_customs')
  const infrastructurePackage = firstPackageIdByCategory(reformPackages, 'infrastructure_investment')
  const agriculturePackage = firstPackageIdByCategory(reformPackages, 'agriculture')
  const financialPackage = firstPackageIdByCategory(reformPackages, 'financial_sector')
  const packageIds = [tradePackage, infrastructurePackage, agriculturePackage, financialPackage].filter(Boolean)
  const sourceEventsByPackage = new Map(reformPackages.map((reformPackage) => [reformPackage.package_id, reformPackage.official_source_events[0]?.id]))

  return [
    {
      id: 'brief-model-routing-internal-2026-05',
      title: 'Model routing notes for current reform packages',
      summary: 'Internal package-routing note retained for non-public workflow compatibility.',
      package_ids: packageIds.slice(0, 3),
      policy_channels: ['Macro monitoring', 'Sector linkages', 'Trade exposure'],
      possible_lenses: ['QPM', 'DFM', 'I-O', 'PE'],
      source_event_ids: packageIds.slice(0, 3).map((id) => sourceEventsByPackage.get(id)).filter(Boolean),
      as_of_date: '2026-05-13',
      publication_state: 'internal_preview',
      citation_permission: 'internal_only',
      citable: false,
      caveats: ['Do not cite. Internal compatibility note only.'],
    },
    {
      id: 'brief-sector-linkage-internal-2026-05',
      title: 'Sector-linkage note for infrastructure and agriculture packages',
      summary: 'Internal package-routing note retained for non-public workflow compatibility.',
      package_ids: [infrastructurePackage, agriculturePackage].filter(Boolean),
      policy_channels: ['Infrastructure delivery', 'Agriculture financing', 'Regional access'],
      possible_lenses: ['DFM', 'I-O', 'PE'],
      source_event_ids: [infrastructurePackage, agriculturePackage].map((id) => id && sourceEventsByPackage.get(id)).filter(Boolean),
      as_of_date: '2026-05-13',
      publication_state: 'internal_preview',
      citation_permission: 'internal_only',
      citable: false,
      caveats: ['Do not cite. Internal compatibility note only.'],
    },
    {
      id: 'brief-financial-monitoring-internal-2026-05',
      title: 'Financial-sector monitoring note',
      summary: 'Internal package-routing note retained for non-public workflow compatibility.',
      package_ids: [financialPackage].filter(Boolean),
      policy_channels: ['Financial integrity', 'Compliance costs', 'Credit conditions'],
      possible_lenses: ['QPM', 'DFM'],
      source_event_ids: [financialPackage].map((id) => id && sourceEventsByPackage.get(id)).filter(Boolean),
      as_of_date: '2026-05-13',
      publication_state: 'internal_preview',
      citation_permission: 'internal_only',
      citable: false,
      caveats: ['Do not cite. Internal compatibility note only.'],
    },
  ].filter((brief) => brief.package_ids.length > 0 && brief.source_event_ids.length > 0)
}

export function assembleReformPackagesFromCandidates(candidates) {
  const verifiedCandidates = candidates.filter((candidate) => isConfiguredVerifiedCandidate(candidate) && isPackageableCandidate(candidate))
  const healthcarePackages = verifiedCandidates
    .filter(isVerifiedHealthcareSourceEvent)
    .slice(0, 1)
    .map((candidate) => healthcarePackageFromSourceEvent(candidateToSourceEvent(candidate)))
  const housingUrbanizationPackages = verifiedCandidates
    .filter(isVerifiedHousingUrbanizationSourceEvent)
    .slice(0, 1)
    .map((candidate) => housingUrbanizationPackageFromSourceEvent(candidateToSourceEvent(candidate)))
  const agricultureSubsidyPackages = verifiedCandidates
    .filter(isVerifiedAgricultureSubsidySourceEvent)
    .slice(0, 1)
    .map((candidate) => agricultureSubsidyPackageFromSourceEvent(candidateToSourceEvent(candidate)))
  const genericGroups = new Map()

  for (
    const candidate of verifiedCandidates.filter(
      (item) =>
        !isVerifiedHealthcareSourceEvent(item) &&
        !isVerifiedHousingUrbanizationSourceEvent(item) &&
        !isVerifiedAgricultureSubsidySourceEvent(item),
    )
  ) {
    const key = packageAssemblyKey(candidate)
    genericGroups.set(key, [...(genericGroups.get(key) ?? []), candidate])
  }

  const genericPackages = Array.from(genericGroups.values())
    .map(genericPackageFromCandidateGroup)
    .sort((left, right) => right.current_stage_date.localeCompare(left.current_stage_date))

  return [...healthcarePackages, ...housingUrbanizationPackages, ...agricultureSubsidyPackages, ...genericPackages].map(addPublicDigest)
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
        const decisions = await extractCandidateDecisionsFromSourceWithDetails(source, html, extractedAt, {
          fetchSource,
          fetchImpl,
        })
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
  const sourceFailures = sourceResults
    .filter((result) => !result.ok)
    .map(({ id, institution, url, parser, fetch_url, error }) => ({ id, institution, url, parser, fetch_url, error }))
  const reformPackages = Array.isArray(options.reformPackages)
    ? options.reformPackages
    : fetchSource
      ? assembleReformPackagesFromCandidates(candidates)
      : FIXTURE_DEMO_REFORM_PACKAGES
  const generatedPublicReformPackages = sortPublicReformPackages(reformPackages.map(addPublicDigest))
  const carryForward = fetchSource
    ? mergeWithPreviousPublicPackages(generatedPublicReformPackages, options.previousArtifact)
    : { packages: generatedPublicReformPackages, retainedPackageCount: 0 }
  const publicReformPackages = (
    await enrichReformPackagesWithOfficialLanguages(carryForward.packages, {
      fetchSource,
      fetchImpl,
    })
  ).map(sanitizePublicReformPackage)
  const researchDiagnostics = await buildResearchUpdatesWithDiagnostics({
    fetchSource,
    fetchImpl,
    extractedAt,
    previousArtifact: options.previousArtifact,
    researchSources:
      options.researchUpdates || Array.isArray(options.sources)
        ? (options.researchSources ?? [])
        : (options.researchSources ?? RESEARCH_SOURCE_DEFINITIONS),
  })
  const policyBriefs = options.policyBriefs ?? buildInternalPolicyBriefs(publicReformPackages)
  const researchUpdates = options.researchUpdates ?? researchDiagnostics.updates
  const literatureItems = options.literatureItems ?? STATIC_LITERATURE_ITEMS
  const modelImpactMap = options.modelImpactMap ?? buildModelImpactMap(publicReformPackages)
  const includeCandidatesInArtifact = options.includeCandidatesInArtifact !== false
  const artifactCandidates = includeCandidatesInArtifact ? candidates : []
  const caveats = includeCandidatesInArtifact
    ? [
        'This is a deterministic reform-candidate intake artifact.',
        fetchSource
          ? 'Generated from configured source URLs at artifact build time.'
          : 'Fixture/demo mode: generated from checked-in HTML fixtures for deterministic review and smoke testing.',
        'Items are source-extracted and unreviewed; this is not an official reviewed policy database.',
        'The frontend loads this static JSON artifact only and does not scrape source pages in the browser.',
      ]
    : [
        'This is a deterministic official-source reform package artifact.',
        fetchSource
          ? 'Generated from configured source URLs at artifact build time.'
          : 'Fixture/demo mode: generated from checked-in HTML fixtures for deterministic review and smoke testing.',
        'Public packages are assembled only from source events whose official links passed validation.',
        'The frontend loads this static JSON artifact only and does not scrape source pages in the browser.',
      ]

  if (sourceFailures.length > 0) {
    caveats.push('One or more configured sources failed during this automatic refresh; previous verified packages were carried forward when needed to avoid deleting reforms during a temporary source outage.')
  }
  if (researchDiagnostics.source_failures.length > 0) {
    caveats.push('One or more configured research sources failed during this automatic refresh; previous or curated research updates were carried forward when needed.')
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
    reform_packages: publicReformPackages,
    policy_briefs: policyBriefs,
    research_updates: researchUpdates,
    literature_items: literatureItems,
    model_impact_map: modelImpactMap,
    accepted_reforms: [],
    candidates: artifactCandidates,
    caveats,
  }

  return {
    artifact,
    candidate_count: candidates.length,
    source_results: sourceResults.map(({ candidates: _candidates, ...result }) => result),
    source_failures: sourceFailures,
    retained_package_count: carryForward.retainedPackageCount,
    research_update_count: researchUpdates.length,
    research_source_results: researchDiagnostics.source_results,
    research_source_failures: researchDiagnostics.source_failures,
    retained_research_update_count: researchDiagnostics.retained_update_count,
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
