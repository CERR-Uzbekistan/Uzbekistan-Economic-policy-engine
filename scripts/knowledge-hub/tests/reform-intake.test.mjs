import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  buildKnowledgeHubCandidateArtifact,
  buildKnowledgeHubCandidateArtifactWithDiagnostics,
  classifyReformCandidateText,
  CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE,
  extractCandidateDecisionsFromSource,
  extractCandidatesFromSource,
  FIXTURE_DEMO_REFORM_PACKAGES,
  FIXTURE_DEMO_EXTRACTION_MODE,
  KNOWLEDGE_HUB_SCHEMA_VERSION,
  REFORM_INTAKE_RULEBOOK,
  REFORM_SOURCE_DEFINITIONS,
  RESEARCH_SOURCE_DEFINITIONS,
  assembleReformPackagesFromCandidates,
} from '../reform-intake.mjs'

describe('Knowledge Hub reform intake', () => {
  it('excludes consultations without adopted measures or parameter changes', () => {
    const html = `
      <article>
        <time datetime="2026-05-01">1 May 2026</time>
        <h2><a href="/policy-rate">Policy rate decision framework consultation</a></h2>
        <p class="summary">A policy rate transmission reform consultation.</p>
      </article>
      <article>
        <time datetime="2026-05-02">2 May 2026</time>
        <h2><a href="/training">Staff training calendar</a></h2>
        <p>Training only.</p>
      </article>
    `
    const [candidate] = extractCandidatesFromSource(
      {
        id: 'test-source',
        institution: 'Test Institution',
        url: 'https://example.test/news/',
      },
      html,
      '2026-05-05T08:00:00.000Z',
    )

    assert.equal(candidate, undefined)
  })

  it('extracts only hard reform candidates from configured source text', () => {
    const html = `
      <article>
        <time datetime="2026-05-01">1 May 2026</time>
        <h2><a href="/tax">Tax administration amendments introduced for electronic VAT reporting</a></h2>
        <p class="summary">The committee announced amended tax reporting rules, electronic declarations, and budget monitoring steps for taxpayers.</p>
      </article>
      <article>
        <time datetime="2026-05-02">2 May 2026</time>
        <h2><a href="/training">Staff training calendar</a></h2>
        <p>Training only.</p>
      </article>
    `
    const [candidate] = extractCandidatesFromSource(
      {
        id: 'test-source',
        institution: 'Test Institution',
        url: 'https://example.test/news/',
      },
      html,
      '2026-05-05T08:00:00.000Z',
    )

    assert.equal(candidate.title, 'Tax administration amendments introduced for electronic VAT reporting')
    assert.equal(candidate.extraction_state, 'source_extracted')
    assert.equal(candidate.review_state, 'candidate')
    assert.equal(candidate.review_status, 'needs_review')
    assert.equal(candidate.reform_category, 'fiscal_tax')
    assert.deepEqual(candidate.evidence_types, [
      'legal_text',
      'official_policy_announcement',
      'implementation_program',
      'budget_tax_measure',
      'regulatory_parameter_change',
    ])
    assert.equal(candidate.relevance_score, 100)
    assert.ok(candidate.matched_include_rules.includes('legal-or-regulatory-change'))
    assert.ok(candidate.matched_include_rules.includes('adopted-policy-measure'))
    assert.ok(candidate.matched_include_rules.includes('fiscal-tax-budget-measure'))
    assert.match(candidate.inclusion_reason, /hard reform signal/)
    assert.equal(candidate.source_institution, 'Test Institution')
    assert.equal(candidate.source_url, 'https://example.test/tax')
    assert.equal(candidate.extracted_at, '2026-05-05T08:00:00.000Z')
  })

  it('defines the reform intake rulebook with include, exclude, evidence, category, score, and reason rules', () => {
    assert.equal(REFORM_INTAKE_RULEBOOK.version, 'knowledge-hub-reform-intake-rulebook.v2')
    assert.match(REFORM_INTAKE_RULEBOOK.actual_reform_definition, /legal or policy instrument/)
    assert.ok(REFORM_INTAKE_RULEBOOK.include_rules.some((rule) => rule.id === 'legal-or-regulatory-change'))
    assert.ok(REFORM_INTAKE_RULEBOOK.include_rules.some((rule) => rule.id === 'adopted-policy-measure'))
    assert.ok(REFORM_INTAKE_RULEBOOK.exclude_rules.some((rule) => rule.id === 'routine-meeting-without-policy-measure'))
    assert.ok(REFORM_INTAKE_RULEBOOK.exclude_rules.some((rule) => rule.id === 'analytical-report-only'))
    assert.ok(REFORM_INTAKE_RULEBOOK.evidence_types.includes('legal_text'))
    assert.ok(REFORM_INTAKE_RULEBOOK.reform_categories.includes('trade_customs'))
    assert.equal(REFORM_INTAKE_RULEBOOK.relevance_scoring.include_threshold, 50)
    assert.ok(REFORM_INTAKE_RULEBOOK.exclusion_reasons.some((reason) => reason.id === 'routine_meeting_without_policy_measure'))
  })

  it('excludes routine meetings and cooperation news when no policy measure is present', () => {
    const html = `
      <article>
        <time datetime="2026-05-03">3 May 2026</time>
        <h2><a href="/meeting">Discussions Held on Prospects for Expanding Cooperation with JBIC</a></h2>
        <p>A meeting was held on the sidelines to exchange views on future cooperation.</p>
      </article>
    `
    const decisions = extractCandidateDecisionsFromSource(
      {
        id: 'test-source',
        institution: 'Test Institution',
        url: 'https://example.test/news/',
      },
      html,
      '2026-05-05T08:00:00.000Z',
    )

    assert.equal(decisions.candidates.length, 0)
    assert.equal(decisions.exclusions.length, 1)
    assert.equal(decisions.exclusions[0].exclusion_reason, 'routine_meeting_without_policy_measure')
    assert.deepEqual(decisions.exclusions[0].matched_include_rules, [])
    assert.ok(decisions.exclusions[0].matched_exclude_rules.includes('routine-meeting-without-policy-measure'))
  })

  it('classifies roundtables, analytical reports, training, cooperation, and generic announcements as exclusions', () => {
    const examples = [
      ['A roundtable discussion was held on SME development', 'routine_meeting_without_policy_measure'],
      ['Analytical Report on the Fulfillment of Target Indicators in Agriculture', 'analytical_report_only'],
      ['Ensuring the implementation of the resolution: training seminar held', 'training_or_outreach_only'],
      ['A new stage of international cooperation will be discussed', 'cooperation_news_without_policy_measure'],
      ['Consultation opens on customs digital corridor', 'generic_announcement_without_policy_action'],
    ]

    for (const [text, reason] of examples) {
      const decision = classifyReformCandidateText(text)

      assert.equal(decision.included, false, text)
      assert.equal(decision.exclusion_reason, reason, text)
    }
  })

  it('retains official video-conference coverage when hard implementation measures are present', () => {
    const decision = classifyReformCandidateText(
      'At a video conference on housing construction and urbanization, regional khokims were instructed to develop master plan implementation programs within two months. From July 1, technical specifications for electricity, gas, water supply, and sewerage will be issued through a single application and a single payment. Responsible officials were instructed to submit a draft resolution on reducing requirements, timelines, and payments by at least half.',
    )

    assert.equal(decision.included, true)
    assert.equal(decision.reform_category, 'infrastructure_investment')
    assert.ok(decision.matched_include_rules.includes('structural-implementation-program'))
    assert.ok(!decision.matched_exclude_rules.includes('training-or-outreach'))
  })

  it('retains public-transport proposals even when official-page boilerplate contains security words', () => {
    const decision = classifyReformCandidateText(
      'Proposals to improve efficiency of Tashkent Metro reviewed. The President approved the proposed measures and issued instructions. Platform screen doors will be tested at Shahriston station. Project-estimate documents are planned for the Mingorik-Chilonzor Buyum Bozori metro line. Distance-based fare payment and 2027-2030 rolling-stock procurement proposals will be prepared. Official page navigation includes security and defense links.',
    )

    assert.equal(decision.included, true)
    assert.equal(decision.reform_category, 'infrastructure_investment')
    assert.ok(decision.matched_include_rules.includes('adopted-policy-measure'))
    assert.ok(!decision.matched_exclude_rules.includes('security-defense-out-of-scope'))
  })

  it('excludes quarterly achievement reports even when they mention implementation of resolutions', () => {
    const decision = classifyReformCandidateText(
      'Results of the First Quarter of 2026 in the Field of Accounting and Auditing: Key Activities and Achievements. The ministry reported work to ensure implementation of Resolution No. PQ-282 and summarized target indicators, seminars, and monitoring activities.',
    )

    assert.equal(decision.included, false)
    assert.equal(decision.exclusion_reason, 'analytical_report_only')
    assert.ok(decision.matched_exclude_rules.includes('analytical-report-only'))
  })

  it('excludes policy-rate review previews that do not announce a parameter change', () => {
    const html = `
      <article>
        <time datetime="2026-04-25">25 April 2026</time>
        <h2><a href="/rate-review">Monetary policy rate review announced for the next Board meeting</a></h2>
        <p>The Central Bank published materials on inflation conditions, policy rate options, and transmission risks for the upcoming rate decision.</p>
      </article>
    `
    const decisions = extractCandidateDecisionsFromSource(
      {
        id: 'test-source',
        institution: 'Test Institution',
        url: 'https://example.test/news/',
      },
      html,
      '2026-05-05T08:00:00.000Z',
    )

    assert.equal(decisions.candidates.length, 0)
    assert.equal(decisions.exclusions.length, 1)
    assert.equal(decisions.exclusions[0].exclusion_reason, 'analytical_report_only')
    assert.deepEqual(decisions.exclusions[0].matched_include_rules, [])
    assert.ok(decisions.exclusions[0].matched_exclude_rules.includes('analytical-report-only'))
  })

  it('does not treat grant, loan, or financing amounts as parameter changes', () => {
    const examples = [
      'A €9 million grant was announced for regional green development.',
      'A $50 million loan will finance infrastructure preparation.',
      'Financing of 120 million dollars was discussed with partners.',
    ]

    for (const text of examples) {
      const decision = classifyReformCandidateText(text)

      assert.equal(decision.included, false, text)
      assert.ok(!decision.matched_actual_reform_signals.includes('parameter_change'), text)
    }
  })

  it('requires signed financing to be tied to a named adopted program with implementation measures', () => {
    const weakGrantDecision = classifyReformCandidateText(
      'An agreement was signed with GIZ to attract a €9 million grant to strengthen green economic development in the regions of Uzbekistan based on master plans.',
    )

    assert.equal(weakGrantDecision.included, false)
    assert.ok(!weakGrantDecision.matched_actual_reform_signals.includes('binding_financing_program'))
    assert.ok(!weakGrantDecision.matched_actual_reform_signals.includes('parameter_change'))

    const bindingProgramDecision = classifyReformCandidateText(
      'A financing agreement was signed for implementation of the approved Green Regions master plan with implementation measures and an action plan for regional rollout.',
    )

    assert.equal(bindingProgramDecision.included, true)
    assert.ok(bindingProgramDecision.matched_include_rules.includes('binding-international-financing-or-agreement'))
    assert.ok(bindingProgramDecision.matched_actual_reform_signals.includes('binding_financing_program'))
    assert.ok(!bindingProgramDecision.matched_actual_reform_signals.includes('parameter_change'))
  })

  it('retains tax incentive items with real incentive measure evidence', () => {
    const decision = classifyReformCandidateText(
      'Uzbekistan Expands Tax Incentives for Investors Financing Infrastructure Projects',
    )

    assert.equal(decision.included, true)
    assert.ok(decision.matched_include_rules.includes('adopted-policy-measure'))
    assert.ok(decision.matched_include_rules.includes('fiscal-tax-budget-measure'))
    assert.ok(!decision.matched_include_rules.includes('binding-international-financing-or-agreement'))
    assert.ok(decision.matched_actual_reform_signals.includes('adopted_measure'))
    assert.ok(decision.matched_actual_reform_signals.includes('parameter_change'))
  })

  it('classifies financial integrity and employment fund legal updates into useful policy areas', () => {
    const amlDecision = classifyReformCandidateText(
      'Toʻlov tizimlari operatorlari va elektron pullar tizimlarida jinoiy faoliyatdan olingan daromadlarni legallashtirishga qarshi kurashish boʻyicha ichki nazorat qoidalariga oʻzgartirish kiritish haqida',
    )
    const employmentDecision = classifyReformCandidateText(
      'O‘zbekiston Respublikasi Bandlikka ko‘maklashish davlat jamg‘armasi mablag‘lari hisobidan subsidiyalar va ssuda ajratish tartibi to‘g‘risidagi nizomni tasdiqlash haqida',
    )

    assert.equal(amlDecision.included, true)
    assert.equal(amlDecision.reform_category, 'financial_sector')
    assert.equal(employmentDecision.included, true)
    assert.equal(employmentDecision.reform_category, 'labor_market')
  })

  it('retains explicit legal and policy changes even when announced in meeting coverage', () => {
    const html = `
      <article>
        <time datetime="2026-05-04">4 May 2026</time>
        <h2><a href="/customs-resolution">Meeting held on approved customs regulation amendments</a></h2>
        <p>The Cabinet resolution approved amendments introducing risk-based customs clearance rules and electronic declarations.</p>
      </article>
    `
    const [candidate] = extractCandidatesFromSource(
      {
        id: 'test-source',
        institution: 'Test Institution',
        url: 'https://example.test/news/',
      },
      html,
      '2026-05-05T08:00:00.000Z',
    )

    assert.equal(candidate.title, 'Meeting held on approved customs regulation amendments')
    assert.equal(candidate.reform_category, 'trade_customs')
    assert.ok(candidate.evidence_types.includes('legal_text'))
    assert.ok(candidate.matched_include_rules.includes('legal-or-regulatory-change'))
    assert.ok(candidate.matched_include_rules.includes('trade-customs-modernization'))
    assert.equal(candidate.extraction_state, 'source_extracted')
    assert.equal(candidate.review_state, 'candidate')
  })

  it('builds a deterministic static artifact from source fixtures', async () => {
    const artifact = await buildKnowledgeHubCandidateArtifact({
      extractedAt: '2026-05-05T08:00:00.000Z',
    })

    assert.equal(artifact.schema_version, KNOWLEDGE_HUB_SCHEMA_VERSION)
    assert.equal(artifact.extraction_mode, FIXTURE_DEMO_EXTRACTION_MODE)
    assert.equal(artifact.extraction_mode_label, 'Fixture/demo intake')
    assert.equal(artifact.rulebook.version, REFORM_INTAKE_RULEBOOK.version)
    assert.equal(artifact.sources.length, REFORM_SOURCE_DEFINITIONS.length)
    assert.equal(artifact.source_diagnostics.length, REFORM_SOURCE_DEFINITIONS.length)
    assert.equal(artifact.reform_packages.length, 1)
    assert.equal(artifact.reform_packages[0].title, 'Healthcare quality, licensing, and private-sector participation reform')
    assert.equal(artifact.reform_packages[0].official_source_events[0].source_url, 'https://president.uz/en/lists/view/9164')
    assert.equal(artifact.reform_packages[0].implementation_milestones.length, 4)
    assert.equal(artifact.reform_packages[0].financing_or_incentive, '200 billion soums preferential credit resources; loans up to 10 billion soums')
    assert.deepEqual(artifact.accepted_reforms, [])
    assert.equal(artifact.candidates.length, 11)
    assert.ok(artifact.candidates.every((candidate) => candidate.extraction_state === 'source_extracted'))
    assert.ok(artifact.candidates.every((candidate) => candidate.extraction_mode === 'fixture-demo'))
    assert.ok(artifact.candidates.every((candidate) => candidate.review_state === 'candidate'))
    assert.ok(artifact.candidates.every((candidate) => candidate.review_status === 'needs_review'))
    assert.ok(artifact.candidates.every((candidate) => candidate.source_url_status === 'not_checked_fixture'))
    assert.ok(artifact.candidates.every((candidate) => candidate.source_institution.length > 0))
    assert.ok(artifact.candidates.every((candidate) => candidate.source_url.startsWith('https://')))
    assert.ok(artifact.candidates.every((candidate) => candidate.source_published_at || candidate.retrieved_at))
    assert.ok(artifact.candidates.every((candidate) => candidate.inclusion_reason.length > 0))
    assert.ok(artifact.candidates.every((candidate) => candidate.evidence_types.length > 0))
    assert.ok(artifact.caveats.some((caveat) => caveat.includes('Fixture/demo mode')))
    assert.ok(artifact.caveats.some((caveat) => caveat.includes('not an official reviewed policy database')))
  })

  it('marks fixture/demo healthcare package data as fixture-only', () => {
    const healthcarePackage = FIXTURE_DEMO_REFORM_PACKAGES[0]

    assert.equal(healthcarePackage.title, 'Healthcare quality, licensing, and private-sector participation reform')
    assert.equal(healthcarePackage.official_source_events[0].source_url_status, 'not_checked_fixture')
    assert.match(healthcarePackage.caveat, /Fixture\/demo/)
    assert.match(healthcarePackage.short_summary, /licensing, accreditation, state purchasing/)
    assert.ok(
      healthcarePackage.parameters_or_amounts.includes(
        'Private healthcare projects may receive preferential loans up to 10 billion soums; total credit resources are 200 billion soums.',
      ),
    )
    assert.ok(healthcarePackage.policy_channels.includes('Healthcare licensing and accreditation'))
    assert.deepEqual(
      healthcarePackage.measure_tracks.map((track) => track.label),
      [
        'licensing reform',
        'accreditation and state-funded service eligibility',
        'state hospital licensing rollout',
        'preferential credit support',
        'investment and PPP agency setup',
      ],
    )
    assert.deepEqual(
      healthcarePackage.implementation_milestones.map((milestone) => milestone.date),
      ['2026-07-01', '2027-04-01', '2028', '2030-12-31'],
    )
  })

  it('assembles configured-source healthcare packages only from verified source events', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-05T08:00:00.000Z',
      sources: [
        {
          id: 'president-reform-news',
          institution: 'Official website of the President of the Republic of Uzbekistan',
          url: 'https://president.uz/en/lists/news',
          parser: 'president-uz-list',
        },
      ],
      fetchImpl: async (url) => {
        if (String(url).includes('/lists/view/9164')) return new Response('<html>ok</html>')
        return new Response(`
          <a href="/en/lists/view/9164">Healthcare quality, licensing, and private-sector participation reform package approved</a>
          <span>01-05-2026</span>
        `)
      },
    })

    assert.equal(diagnostics.artifact.extraction_mode, CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE)
    assert.equal(diagnostics.artifact.candidates.length, 1)
    assert.equal(diagnostics.artifact.candidates[0].source_url_status, 'verified')
    assert.equal(diagnostics.artifact.reform_packages.length, 1)
    assert.equal(diagnostics.artifact.reform_packages[0].title, 'Healthcare quality, licensing, and private-sector participation reform')
    assert.equal(diagnostics.artifact.reform_packages[0].official_source_events[0].source_url, 'https://president.uz/en/lists/view/9164')
    assert.equal(diagnostics.artifact.reform_packages[0].official_source_events[0].source_url_status, 'verified')
    assert.match(diagnostics.artifact.reform_packages[0].caveat, /assembled from a verified source event/)
    assert.equal(diagnostics.artifact.reform_packages[0].financing_or_incentive, '200 billion soums preferential credit resources; loans up to 10 billion soums')
    assert.match(diagnostics.artifact.reform_packages[0].short_summary, /private-clinic financing/)
    assert.ok(
      diagnostics.artifact.reform_packages[0].parameters_or_amounts.includes(
        'Private healthcare projects may receive preferential loans up to 10 billion soums; total credit resources are 200 billion soums.',
      ),
    )
    assert.ok(diagnostics.artifact.reform_packages[0].policy_channels.includes('Preferential credit and PPP delivery'))
    assert.deepEqual(
      diagnostics.artifact.reform_packages[0].implementation_milestones.map((milestone) => milestone.date),
      ['2026-07-01', '2027-04-01', '2028', '2030-12-31'],
    )
  })

  it('adds official-language package content when RU and UZ source pages are available', async () => {
    const basePackage = JSON.parse(JSON.stringify(FIXTURE_DEMO_REFORM_PACKAGES[0]))
    basePackage.official_source_events[0].source_url = 'https://president.uz/en/lists/view/9164'
    basePackage.official_source_events[0].source_url_status = 'verified'

    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-05T08:00:00.000Z',
      sources: [],
      reformPackages: [basePackage],
      fetchImpl: async (url) => {
        const sourceUrl = String(url)
        if (sourceUrl.includes('/ru/')) {
          return new Response(`
            <html><body>
              <h1>Обсуждены вопросы развития системы здравоохранения</h1>
              <p>2026-05-01 17:05:00 / Презентации Президент Шавкат Мирзиёев ознакомился с презентацией по мерам развития системы здравоохранения.</p>
              <p>С 1 июля 2026 года изменится порядок лицензирования медицинской деятельности и &laquo;аккредитации&raquo; клиник.</p>
              <p>До 2028 года планируется внедрить государственное медицинское страхование.</p>
            </body></html>
          `)
        }
        if (sourceUrl.includes('/uz/')) {
          return new Response(`
            <html><body>
              <h1>Sog‘liqni saqlash tizimini rivojlantirish masalalari muhokama qilindi</h1>
              <p>2026-yil 1-iyuldan tibbiy faoliyatni litsenziyalash va klinikalarni akkreditatsiyadan o‘tkazish tartibi o‘zgaradi.</p>
              <p>2028-yilgacha davlat tibbiy sug‘urtasini joriy etish rejalashtirilgan.</p>
            </body></html>
          `)
        }
        return new Response('<html><body><h1>Healthcare system development issues discussed</h1><p>From 1 July 2026, medical licensing procedures change.</p></body></html>')
      },
    })

    const reformPackage = diagnostics.artifact.reform_packages[0]
    const sourceEvent = reformPackage.official_source_events[0]

    assert.equal(reformPackage.localized.title.ru, 'Обсуждены вопросы развития системы здравоохранения')
    assert.equal(
      reformPackage.localized.digest.ru.changed,
      'С 1 июля 2026 года изменится порядок лицензирования медицинской деятельности и «аккредитации» клиник.',
    )
    assert.doesNotMatch(sourceEvent.localized.summary.ru, /Презентации|&laquo;/)
    assert.equal(
      reformPackage.localized.parameters_or_amounts.uz[0],
      '2026-yil 1-iyuldan tibbiy faoliyatni litsenziyalash va klinikalarni akkreditatsiyadan o‘tkazish tartibi o‘zgaradi.',
    )
    assert.equal(sourceEvent.localized.source_url.ru, 'https://president.uz/ru/lists/view/9164')
    assert.equal(sourceEvent.localized.source_url.uz, 'https://president.uz/uz/lists/view/9164')
    assert.equal(sourceEvent.localized.source_url_status.ru, 'verified')
  })

  it('keeps localized reform digests focused on mechanisms instead of past allocation statistics', async () => {
    const basePackage = JSON.parse(JSON.stringify(FIXTURE_DEMO_REFORM_PACKAGES[0]))
    basePackage.official_source_events[0].source_url = 'https://gov.uz/en/news/view/109178'
    basePackage.official_source_events[0].source_url_status = 'verified'

    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-16T09:00:00.000Z',
      sources: [],
      reformPackages: [basePackage],
      fetchImpl: async (url) => {
        const sourceUrl = String(url)
        if (sourceUrl.includes('/ru/')) {
          return new Response(`
            <html><body>
              <h1>Рассмотрены планы финансирования и субсидирования аграрного сектора</h1>
              <p>Как отмечалось, на финансирование хлопководства и зерноводства, закупку сельскохозяйственной техники и внедрение водосберегающих технологий было выделено 29 триллионов сумов.</p>
              <p>Кроме того, в сферу направлено 2,35 триллиона сумов субсидий.</p>
              <p>Выделение субсидий в размере 10 процентов от стоимости хлопка позволило им вырастить хлопок за счет собственных средств, благодаря чему сэкономлено 1,9 триллиона сумов ресурсов.</p>
              <p>На урожай хлопка и зерновых, субсидии и другие расходы в следующем году запланировано выделение в общей сложности 34,2 триллиона сумов.</p>
              <p>Улучшение качества регулирования будет способствовать привлечению дополнительных 800 миллионов долларов иностранных инвестиций.</p>
              <p>Согласно изучениям, каждый доллар, вложенный в строительство, способен генерировать для экономики дополнительно 2-3 доллара.</p>
              <p>Она охватит задачи по двукратному расширению сети и дальнейшему повышению качества обслуживания.</p>
              <p>Унифицировано 420 норм и правил градостроительства, отменены старые и утверждены 140 новых.</p>
              <p>Отмечено, что по реализации каждого утвержденного генерального плана необходимо разработать комплексные программы по годам.</p>
              <p>Глава государства дал конкретные поручения по дальнейшему совершенствованию механизмов финансирования, обеспечению адресности и оперативности субсидирования.</p>
              <p>В частности, предложено в 2026 году выделить дополнительно 5 триллионов сумов на агротехнические мероприятия, включая расходы на плёнку и шланги.</p>
              <p>В связи с этим для внедрения модели “дисциплинированность – дешевле кредит” хозяйствам с кредитным рейтингом “A” предлагается предоставлять кредиты со снижением ставки на 2 процента.</p>
              <p>Согласно Указу Президента для совершенствования механизмов государственной поддержки аграрной сферы создано Агентство по платежам в аграрной сфере.</p>
            </body></html>
          `)
        }
        return new Response('<html><body><h1>Agriculture financing plans reviewed</h1><p>New agriculture payment mechanisms were proposed.</p></body></html>')
      },
    })

    const ruMeasures = diagnostics.artifact.reform_packages[0].localized.parameters_or_amounts.ru
    const joined = ruMeasures.join('\n')

    assert.ok(ruMeasures.some((value) => /5 триллионов сумов на агротехнические мероприятия/.test(value)))
    assert.ok(ruMeasures.some((value) => /дисциплинированность.*дешевле кредит/.test(value)))
    assert.ok(ruMeasures.some((value) => /Агентство по платежам в аграрной сфере/.test(value)))
    assert.doesNotMatch(
      joined,
      /2,35 триллиона|29 триллионов|34,2 триллиона|благодаря чему|сэкономлено|привлечению дополнительных|Согласно изучениям|Она охватит задачи|Унифицировано 420|Отмечено, что|Глава государства дал/,
    )
  })

  it('rejects localized Lex.uz boilerplate and keeps curated package measures', async () => {
    const basePackage = JSON.parse(JSON.stringify(FIXTURE_DEMO_REFORM_PACKAGES[0]))
    basePackage.title = 'Financial-sector AML/CFT internal control rules reform'
    basePackage.short_summary = 'AML/CFT internal-control rules change across financial institutions.'
    basePackage.parameters_or_amounts = [
      'Commercial-bank AML/CFT internal-control rules are amended.',
      'Nonbank credit-organization AML/CFT internal-control rules are amended.',
    ]
    basePackage.official_source_events[0] = {
      id: 'source-event-aml-lex',
      title: 'Nonbank credit organization AML/CFT internal-control rules amended',
      source_institution: 'National Database of Legislation of the Republic of Uzbekistan (Lex.uz)',
      source_url: 'https://lex.uz/uz/docs/8184204',
      source_published_at: '2026-05-08',
      evidence_type: 'official_policy_announcement',
      event_type: 'amended',
      summary: 'Nonbank credit-organization AML/CFT internal-control rules are amended.',
      source_url_status: 'verified',
      extracted_at: '2026-05-16T09:00:00.000Z',
    }

    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-16T09:00:00.000Z',
      sources: [],
      reformPackages: [basePackage],
      fetchImpl: async (url) => {
        const sourceUrl = String(url)
        if (sourceUrl.includes('/ru/')) {
          return new Response(`
            <html><body>
              <h1>2925-10-сон 08.05.2026. Nobank kredit tashkilotlarida jinoiy faoliyatdan olingan daromadlarni legallashtirishga qarshi kurashish qoidalariga qoʻshimcha va oʻzgartirishlar kiritish haqida</h1>
              <p>(Qonunchilik maʼlumotlari milliy bazasi, 08.05.2026 y., 10/26/2925-10/0474-son)</p>
              <p>Qo‘shimcha axborot Asosiy rekvizitlar Kodifikatsiya Qayta ko‘rib chiqilgan hujjatlar Ulashish Telegram Facebook Twitter Instagram</p>
            </body></html>
          `)
        }
        return new Response(`
          <html><body>
            <h1>2925-10-сон 08.05.2026. Nobank kredit tashkilotlarida jinoiy faoliyatdan olingan daromadlarni legallashtirishga qarshi kurashish qoidalariga qoʻshimcha va oʻzgartirishlar kiritish haqida</h1>
            <p>Qo‘shimcha axborot Asosiy rekvizitlar Qayta ko‘rib chiqish tarixi Ulashish Telegram Facebook Twitter Instagram</p>
          </body></html>
        `)
      },
    })

    const reformPackage = diagnostics.artifact.reform_packages[0]
    const localized = reformPackage.localized ?? {}
    const serializedLocalized = JSON.stringify(localized)

    assert.equal(localized.short_summary?.ru, undefined)
    assert.equal(localized.parameters_or_amounts?.ru, undefined)
    assert.equal(localized.digest?.ru?.changed, undefined)
    assert.ok(reformPackage.parameters_or_amounts.includes('Commercial-bank AML/CFT internal-control rules are amended.'))
    assert.doesNotMatch(serializedLocalized, /Qonunchilik|Qo.?shimcha axborot|Asosiy rekvizitlar|Ulashish Telegram/)
  })

  it('assembles configured-source housing and agriculture packages from verified official detail pages', () => {
    const baseCandidate = {
      extraction_mode: CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE,
      source_url_status: 'verified',
      extracted_at: '2026-05-06T12:30:00.000Z',
      source_institution: 'Government portal of the Republic of Uzbekistan',
      evidence_types: ['official_policy_announcement', 'implementation_program', 'budget_tax_measure'],
      relevance_score: 100,
      inclusion_reason: 'Included by adopted official-source implementation measure.',
    }
    const packages = assembleReformPackagesFromCandidates([
      {
        ...baseCandidate,
        title: 'Progress and priorities in housing construction and urbanization reviewed',
        summary: 'Master plans, construction permits, technical specifications, land privatization and apartment commissioning targets were instructed.',
        source_title: 'Progress and priorities in housing construction and urbanization reviewed',
        source_url: 'https://gov.uz/en/news/view/153724',
        source_published_at: '2026-04-15',
        reform_category: 'infrastructure_investment',
      },
      {
        ...baseCandidate,
        title: 'Financing and subsidy plans for the agricultural sector reviewed',
        summary: 'Agricultural Payments Agency, Agroportal, Agrosubsidy and proactive 2026 subsidy delivery were instructed.',
        source_title: 'Financing and subsidy plans for the agricultural sector reviewed',
        source_url: 'https://gov.uz/en/news/view/109178',
        source_published_at: '2025-12-09',
        reform_category: 'agriculture',
      },
    ])

    assert.equal(packages.length, 2)
    assert.equal(packages[0].title, 'Urbanization, construction permits, and housing delivery reform')
    assert.equal(packages[0].next_milestone_date, '2026-07-01')
    assert.match(packages[0].short_summary, /permit and utility procedures/)
    assert.ok(packages[0].parameters_or_amounts.includes('140,000 regional apartments are targeted for commissioning in 2026.'))
    assert.ok(packages[0].policy_channels.includes('Housing supply delivery'))
    assert.deepEqual(
      packages[0].implementation_milestones.map((milestone) => milestone.date),
      ['2026-06', '2026-06-01', '2026-07-01', '2026-07', '2026'],
    )
    assert.equal(packages[1].title, 'Agriculture financing and subsidy delivery reform')
    assert.equal(packages[1].reform_category, 'agriculture')
    assert.equal(packages[1].financing_or_incentive.includes('34.2 trillion soums'), true)
    assert.match(packages[1].short_summary, /payment agency/)
    assert.ok(
      packages[1].parameters_or_amounts.includes(
        'A “discipline-cheaper credit” model links lower interest rates to producer credit ratings.',
      ),
    )
    assert.ok(packages[1].policy_channels.includes('Agricultural producer finance'))
    assert.deepEqual(
      packages[1].implementation_milestones.map((milestone) => milestone.date),
      ['2025-12-09', '2026', '2026'],
    )
  })

  it('does not assemble configured-source packages from unverified source events', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-05T08:00:00.000Z',
      sources: [
        {
          id: 'president-reform-news',
          institution: 'Official website of the President of the Republic of Uzbekistan',
          url: 'https://president.uz/en/lists/news',
          parser: 'president-uz-list',
        },
      ],
      fetchImpl: async (url) => {
        if (String(url).includes('/lists/view/9164')) return new Response('missing', { status: 404 })
        return new Response(`
          <a href="/en/lists/view/9164">Healthcare quality, licensing, and private-sector participation reform package approved</a>
          <span>01-05-2026</span>
        `)
      },
    })

    assert.equal(diagnostics.artifact.candidates.length, 0)
    assert.equal(diagnostics.artifact.reform_packages.length, 0)
    assert.equal(diagnostics.source_results[0].link_invalid_count, 1)
  })

  it('can build package-only public artifacts while retaining intake diagnostics', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      includeCandidatesInArtifact: false,
      extractedAt: '2026-05-05T08:00:00.000Z',
      sources: [
        {
          id: 'president-reform-news',
          institution: 'Official website of the President of the Republic of Uzbekistan',
          url: 'https://president.uz/en/lists/news',
          parser: 'president-uz-list',
        },
      ],
      fetchImpl: async (url) => {
        if (String(url).includes('/lists/view/9164')) return new Response('<html>ok</html>')
        return new Response(`
          <a href="/en/lists/view/9164">Healthcare quality, licensing, and private-sector participation reform package approved</a>
          <span>01-05-2026</span>
        `)
      },
    })

    assert.equal(diagnostics.candidate_count, 1)
    assert.equal(diagnostics.artifact.candidates.length, 0)
    assert.equal(diagnostics.artifact.accepted_reforms.length, 0)
    assert.equal(diagnostics.artifact.reform_packages.length, 1)
    assert.equal(diagnostics.artifact.reform_packages[0].official_source_events[0].source_url_status, 'verified')
    assert.ok(diagnostics.artifact.caveats.some((caveat) => caveat.includes('official links passed validation')))
  })

  it('classifies configured-source President.uz list items from fetched detail body text', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-05T08:00:00.000Z',
      sources: [
        {
          id: 'president-reform-news',
          institution: 'Official website of the President of the Republic of Uzbekistan',
          url: 'https://president.uz/en/lists/news',
          parser: 'president-uz-list',
          follow_detail_links: true,
        },
      ],
      fetchImpl: async (url) => {
        if (String(url).includes('/lists/view/9301')) {
          return new Response(`
            <html>
              <title>Business environment issues reviewed</title>
              <body>
                <h1>Business environment issues reviewed</h1>
                <span>05.05.2026</span>
                <p>The Head of State approved the proposed measures and issued instructions to introduce a single-window permit system, reduce duplicate documents for importers, and revise tax incentive procedures.</p>
              </body>
            </html>
          `)
        }
        return new Response(`
          <a href="/en/lists/view/9301">Business environment issues reviewed</a>
          <span>05-05-2026</span>
        `)
      },
    })

    assert.equal(diagnostics.candidate_count, 1)
    assert.equal(diagnostics.artifact.reform_packages.length, 1)
    assert.equal(diagnostics.artifact.reform_packages[0].official_source_events[0].source_url, 'https://president.uz/en/lists/view/9301')
    assert.equal(diagnostics.artifact.reform_packages[0].official_source_events[0].source_url_status, 'verified')
  })

  it('extracts Lex.uz official search results as document detail links, not navigation shell links', () => {
    const decisions = extractCandidateDecisionsFromSource(
      {
        id: 'lex-official-legal-acts',
        institution: 'National Database of Legislation of the Republic of Uzbekistan (Lex.uz)',
        url: 'https://lex.uz/uz/search/official?lang=4&pub_date=month',
        parser: 'lexuz-official-search',
      },
      `
        <a href="/uz/search/official">RASMIY HUJJATLAR</a>
        <a href="/uz/docs/-8180719">Toʻlovga qobiliyatsizlik institutini yanada takomillashtirish chora-tadbirlari toʻgʻrisida</a>
        Oʻzbekiston Respublikasi Prezidentining Farmoni, 06.05.2026 yildagi PF-78-son
      `,
      '2026-05-05T08:00:00.000Z',
    )

    assert.equal(decisions.candidates.length, 1)
    assert.equal(decisions.candidates[0].source_url, 'https://lex.uz/uz/docs/-8180719')
    assert.ok(decisions.candidates[0].matched_include_rules.includes('legal-or-regulatory-change'))
    assert.equal(decisions.exclusions.length, 0)
  })

  it('parses gov.uz detail publication dates from official detail records before page clock timestamps', () => {
    const [candidate] = extractCandidatesFromSource(
      {
        id: 'gov-detail',
        institution: 'Government portal of the Republic of Uzbekistan',
        url: 'https://gov.uz/en/news/view/153724',
        parser: 'official-detail',
        allow_source_url_as_candidate: true,
      },
      `
        <body>
          <div>10:00:43 (UTC) 11.05.2026</div>
          \\"date\\":\\"2026-04-15 09:10:00\\",
          <h1>Progress and priorities in housing construction and urbanization reviewed</h1>
          <p>Regional khokims were instructed to develop comprehensive programs for the implementation of approved master plans, and from July 1 technical specifications will be issued through a single application and a single payment.</p>
        </body>
      `,
      '2026-05-05T08:00:00.000Z',
    )

    assert.equal(candidate.source_published_at, '2026-04-15')
  })

  it('assembles specific topic packages from unrelated verified source events', () => {
    const packages = assembleReformPackagesFromCandidates([
      {
        title: 'Uzbekistan Expands Tax Incentives for Investors Financing Infrastructure Projects',
        summary: 'Tax incentives for investors financing infrastructure projects were expanded.',
        source_url: 'https://gov.uz/en/imv/news/view/161792',
        source_title: 'Uzbekistan Expands Tax Incentives for Investors Financing Infrastructure Projects',
        source_institution: 'Ministry of Economy and Finance of Uzbekistan',
        source_published_at: '2026-05-05',
        reform_category: 'fiscal_tax',
        evidence_types: ['legal_text'],
        inclusion_reason: 'Legal or regulatory change.',
        extraction_mode: CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE,
        source_url_status: 'verified',
        extracted_at: '2026-05-05T08:00:00.000Z',
      },
    ])

    assert.equal(packages.length, 1)
    assert.equal(packages[0].title, 'Tax administration and investment incentive reform')
    assert.equal(packages[0].reform_category, 'fiscal_tax')
    assert.equal(packages[0].official_source_events[0].source_url_status, 'verified')
    assert.equal(packages[0].next_milestone, 'No future milestone published in verified source')
    assert.equal(packages[0].next_milestone_date, '2026-05-05')
    assert.match(packages[0].short_summary, /Infrastructure investors receive tax incentives/)
    assert.ok(packages[0].parameters_or_amounts.includes('Tax incentives apply to investors financing infrastructure projects.'))
    assert.ok(
      packages[0].parameters_or_amounts.includes(
        'Fiscal incentive treatment applies to qualifying infrastructure-investment financing.',
      ),
    )
    assert.ok(packages[0].policy_channels.includes('Fiscal incentives'))
    assert.equal(packages[0].measure_tracks[0].label, 'Tax incentives apply to infrastructure investors')
    assert.equal(packages[0].implementation_milestones.length, 1)
    assert.equal(packages[0].implementation_milestones[0].label, 'tax incentive source event recorded')
    assert.equal(packages[0].implementation_milestones[0].source_event_ids[0], packages[0].official_source_events[0].id)
  })

  it('groups related verified source events into one reform package', () => {
    const baseCandidate = {
      summary: 'The source describes electronic declarations and risk-based customs clearance measures.',
      source_institution: 'State Customs Committee of the Republic of Uzbekistan',
      reform_category: 'trade_customs',
      evidence_types: ['official_policy_announcement', 'implementation_program'],
      inclusion_reason: 'Trade or customs modernization.',
      extraction_mode: CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE,
      source_url_status: 'verified',
      extracted_at: '2026-05-05T08:00:00.000Z',
    }
    const packages = assembleReformPackagesFromCandidates([
      {
        ...baseCandidate,
        title: 'Single Window customs declaration rules introduced for importers',
        source_title: 'Single Window customs declaration rules introduced for importers',
        source_url: 'https://old.customs.uz/en/news/view/99001',
        source_published_at: '2026-04-20',
      },
      {
        ...baseCandidate,
        title: 'President approves measures for risk-based customs clearance and electronic declarations',
        source_title: 'President approves measures for risk-based customs clearance and electronic declarations',
        source_institution: 'Official website of the President of the Republic of Uzbekistan',
        source_url: 'https://president.uz/en/lists/view/12344',
        source_published_at: '2026-04-30',
      },
    ])

    assert.equal(packages.length, 1)
    assert.equal(packages[0].title, 'Risk-based customs clearance and electronic declaration reform')
    assert.equal(packages[0].official_source_events.length, 2)
    assert.equal(packages[0].implementation_milestones.length, 2)
    assert.equal(packages[0].current_stage, 'Multiple changes published')
  })

  it('groups parallel AML/CFT financial-sector legal updates into one package', () => {
    const baseCandidate = {
      summary: 'Rules on countering legalization of criminal proceeds, terrorism financing, and WMD proliferation financing were amended.',
      source_institution: 'National Database of Legislation of the Republic of Uzbekistan (Lex.uz)',
      reform_category: 'financial_sector',
      evidence_types: ['official_policy_announcement'],
      inclusion_reason: 'Legal or regulatory change.',
      extraction_mode: CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE,
      source_url_status: 'verified',
      extracted_at: '2026-05-08T08:00:00.000Z',
      source_published_at: '2026-05-08',
    }
    const packages = assembleReformPackagesFromCandidates([
      {
        ...baseCandidate,
        title: 'Tijorat banklarida jinoiy faoliyatdan olingan daromadlarni legallashtirishga qarshi kurashish boʻyicha ichki nazorat qoidalariga qoʻshimcha va oʻzgartirishlar kiritish haqida',
        source_title: 'Commercial bank AML/CFT internal-control rules amended',
        source_url: 'https://lex.uz/uz/docs/8184105',
      },
      {
        ...baseCandidate,
        title: 'Nobank kredit tashkilotlarida jinoiy faoliyatdan olingan daromadlarni legallashtirishga qarshi kurashish boʻyicha ichki nazorat qoidalariga qoʻshimcha va oʻzgartirishlar kiritish haqida',
        source_title: 'Nonbank credit organization AML/CFT internal-control rules amended',
        source_url: 'https://lex.uz/uz/docs/8184204',
      },
      {
        ...baseCandidate,
        title: 'Toʻlov tizimlari operatorlari va elektron pullar tizimlarida jinoiy faoliyatdan olingan daromadlarni legallashtirishga qarshi kurashish boʻyicha ichki nazorat qoidalariga oʻzgartirish kiritish haqida',
        source_title: 'Payment-system and e-money AML/CFT internal-control rules amended',
        source_url: 'https://lex.uz/uz/docs/8184096',
      },
    ])

    assert.equal(packages.length, 1)
    assert.equal(packages[0].title, 'Financial-sector AML/CFT internal control rules reform')
    assert.equal(packages[0].reform_category, 'financial_sector')
    assert.equal(packages[0].official_source_events.length, 3)
    assert.equal(packages[0].implementation_milestones.length, 3)
    assert.ok(packages[0].short_summary.includes('banks, nonbank lenders, payments'))
    assert.ok(!packages[0].title.includes('Energy'))
  })

  it('groups construction oversight and inspection-pricing legal updates into one package', () => {
    const baseCandidate = {
      source_institution: 'National Database of Legislation of the Republic of Uzbekistan (Lex.uz)',
      reform_category: 'infrastructure_investment',
      evidence_types: ['official_policy_announcement'],
      inclusion_reason: 'Legal or regulatory change.',
      extraction_mode: CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE,
      source_url_status: 'verified',
      extracted_at: '2026-05-08T08:00:00.000Z',
    }
    const packages = assembleReformPackagesFromCandidates([
      {
        ...baseCandidate,
        title: 'Measures discussed to reduce bureaucracy and strengthen construction oversight',
        summary: 'Construction oversight and bureaucracy-reduction measures were reviewed.',
        source_title: 'Measures discussed to reduce bureaucracy and strengthen construction oversight',
        source_url: 'https://president.uz/en/lists/view/9181',
        source_published_at: '2026-05-06',
      },
      {
        ...baseCandidate,
        title: 'Bino va inshootlarning instrumental texnik tekshiruv ishlarini baholash tartibi toʻgʻrisidagi buyruqni oʻz kuchini yoʻqotgan deb topish toʻgʻrisida',
        summary: 'Prior construction technical inspection pricing order was superseded.',
        source_title: 'Prior construction technical inspection pricing order superseded',
        source_url: 'https://lex.uz/uz/docs/8180484',
        source_published_at: '2026-05-07',
      },
      {
        ...baseCandidate,
        title: 'Bino va inshootlarning texnik holatini oʻrganish va sinov-laboratoriya ishlari narxlarini hisoblash tartibi toʻgʻrisidagi nizomni tasdiqlash haqida',
        summary: 'Construction technical condition and laboratory work price calculation regulation approved.',
        source_title: 'Construction inspection price calculation regulation approved',
        source_url: 'https://lex.uz/uz/docs/8180898',
        source_published_at: '2026-05-07',
      },
    ])

    assert.equal(packages.length, 1)
    assert.equal(packages[0].title, 'Construction oversight and technical inspection pricing reform')
    assert.equal(packages[0].official_source_events.length, 3)
    assert.equal(packages[0].current_stage, 'Multiple changes published')
    assert.ok(
      packages[0].parameters_or_amounts.includes(
        'Technical condition review and laboratory-work price calculation regulation is approved.',
      ),
    )
  })

  it('does not publish vague omnibus legal amendments as reform packages without a specific policy subject', () => {
    const packages = assembleReformPackagesFromCandidates([
      {
        title: 'O‘RQ-1144 O‘zbekiston Respublikasining ayrim qonun hujjatlariga o‘zgartirish va qo‘shimchalar kiritish to‘g‘risida',
        summary: 'Oʻzbekiston Respublikasining Qonuni, 07.05.2026 yildagi O‘RQ-1144-son.',
        source_url: 'https://lex.uz/uz/docs/-8181969',
        source_title: 'O‘zbekiston Respublikasining ayrim qonun hujjatlariga o‘zgartirish va qo‘shimchalar kiritish to‘g‘risida',
        source_institution: 'National Database of Legislation of the Republic of Uzbekistan (Lex.uz)',
        source_published_at: '2026-05-07',
        reform_category: 'other_policy',
        evidence_types: ['official_policy_announcement'],
        inclusion_reason: 'Legal or regulatory change.',
        extraction_mode: CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE,
        source_url_status: 'verified',
        extracted_at: '2026-05-08T08:00:00.000Z',
      },
    ])

    assert.deepEqual(packages, [])
  })

  it('does not assemble packages from direct unverified source events', () => {
    const packages = assembleReformPackagesFromCandidates([
      {
        title: 'Resolution approved on tax administration amendments',
        summary: 'Tax reporting rules amended.',
        source_url: 'https://gov.uz/en/imv/news/view/161792',
        source_title: 'Resolution approved on tax administration amendments',
        source_institution: 'Ministry of Economy and Finance of Uzbekistan',
        source_published_at: '2026-05-05',
        reform_category: 'fiscal_tax',
        evidence_types: ['legal_text'],
        inclusion_reason: 'Legal or regulatory change.',
        extraction_mode: CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE,
        source_url_status: 'not_checked_fixture',
        extracted_at: '2026-05-05T08:00:00.000Z',
      },
    ])

    assert.deepEqual(packages, [])
  })

  it('configures official source coverage for the requested next batch', () => {
    const sourceIds = REFORM_SOURCE_DEFINITIONS.map((source) => source.id)

    assert.ok(sourceIds.includes('lex-official-legal-acts'))
    assert.ok(sourceIds.includes('president-reform-news'))
    assert.ok(sourceIds.includes('gov-housing-urbanization-detail'))
    assert.ok(sourceIds.includes('gov-agriculture-subsidy-detail'))
    assert.ok(sourceIds.includes('gov-portal-reform-news'))
    assert.ok(sourceIds.includes('tax-committee-news'))
    assert.ok(sourceIds.includes('customs-committee-news'))
    assert.ok(sourceIds.includes('energy-ministry-news'))
    assert.ok(sourceIds.includes('investment-trade-ministry-news'))
    assert.ok(sourceIds.includes('justice-ministry-news'))
    assert.ok(REFORM_SOURCE_DEFINITIONS.every((source) => source.fixture_path))
    assert.ok(REFORM_SOURCE_DEFINITIONS.every((source) => source.url.startsWith('https://')))
  })

  it('has deterministic fixtures and extraction diagnostics for every configured source', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      extractedAt: '2026-05-05T08:00:00.000Z',
    })

    assert.equal(diagnostics.source_results.length, REFORM_SOURCE_DEFINITIONS.length)
    assert.equal(diagnostics.source_results.reduce((sum, source) => sum + source.candidate_count, 0), 12)
    assert.equal(diagnostics.artifact.candidates.length, 11)
    assert.equal(diagnostics.source_failures.length, 0)

    for (const source of REFORM_SOURCE_DEFINITIONS) {
      const fixture = readFileSync(source.fixture_path, 'utf8')
      const decisions = extractCandidateDecisionsFromSource(source, fixture, '2026-05-05T08:00:00.000Z')
      const result = diagnostics.source_results.find((entry) => entry.id === source.id)

      assert.ok(result, `missing diagnostics for ${source.id}`)
      assert.equal(result.ok, true)
      assert.equal(result.parser, source.parser ?? 'auto')
      assert.equal(result.fetch_url, source.api_url ?? source.url)
      assert.equal(result.candidate_count, decisions.candidates.length)
      assert.equal(result.excluded_count, decisions.exclusions.length)
      assert.ok(decisions.candidates.length + decisions.exclusions.length > 0, `fixture should classify ${source.id}`)
    }
  })

  it('uses the current official gov.uz Ministry News source for MEF intake', () => {
    const mefSource = REFORM_SOURCE_DEFINITIONS.find((source) => source.id === 'mef-policy-news')

    assert.equal(mefSource.url, 'https://gov.uz/en/imv/news/news')
    assert.equal(mefSource.api_url, 'https://api-portal.gov.uz/authorities/news/category?code_name=news&page=1')
    assert.deepEqual(mefSource.api_headers, {
      code: 'imv',
      language: 'en',
    })
    assert.equal(mefSource.parser, 'govuz-api')
  })

  it('extracts MEF candidates from the official gov.uz Ministry News API shape', () => {
    const payload = JSON.stringify({
      data: [
        {
          id: 161792,
          date: '2026-05-05 14:25:00',
          title: 'Resolution approved on tax administration amendments for agriculture and fisheries',
          anons: 'The resolution introduces tax reporting amendments and budget monitoring rules for the sector.',
        },
        {
          id: 161541,
          date: '2026-05-04 19:50:00',
          title: 'Meeting held with international partners',
          anons: 'Protocol meeting only.',
        },
      ],
    })
    const [candidate] = extractCandidatesFromSource(
      {
        id: 'mef-policy-news',
        institution: 'Ministry of Economy and Finance of Uzbekistan',
        url: 'https://gov.uz/en/imv/news/news',
      },
      payload,
      '2026-05-05T08:00:00.000Z',
    )

    assert.equal(candidate.title, 'Resolution approved on tax administration amendments for agriculture and fisheries')
    assert.equal(candidate.source_url, 'https://gov.uz/en/imv/news/view/161792')
    assert.equal(candidate.source_published_at, '2026-05-05 14:25:00')
    assert.equal(candidate.source_institution, 'Ministry of Economy and Finance of Uzbekistan')
    assert.equal(candidate.reform_category, 'agriculture')
    assert.equal(candidate.review_status, 'needs_review')
  })

  it('reports configured-source fetch counts and failures without dropping successful candidates', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-05T08:00:00.000Z',
      sources: [
        {
          id: 'ok-source',
          institution: 'OK Institution',
          url: 'https://gov.uz/en/ok/news/news',
        },
        {
          id: 'failed-source',
          institution: 'Failed Institution',
          url: 'https://gov.uz/en/fail/news/news',
        },
      ],
      fetchImpl: async (url) => {
        if (url.includes('/fail')) {
          throw new Error('synthetic fetch failure')
        }
        return new Response(`
          <article>
            <time datetime="2026-05-03">3 May 2026</time>
            <h2><a href="/tax">Tax administration amendments introduced for electronic VAT reporting</a></h2>
            <p>The resolution introduces amended tax reporting rules and budget monitoring requirements.</p>
          </article>
        `)
      },
    })

    assert.equal(diagnostics.candidate_count, 1)
    assert.equal(diagnostics.source_results.length, 2)
    assert.equal(diagnostics.source_results[0].ok, true)
    assert.equal(diagnostics.source_results[0].candidate_count, 1)
    assert.equal(diagnostics.source_results[0].excluded_count, 0)
    assert.equal(diagnostics.source_results[0].link_invalid_count, 0)
    assert.equal(diagnostics.source_results[1].ok, false)
    assert.equal(diagnostics.source_failures.length, 1)
    assert.equal(diagnostics.artifact.source_diagnostics.length, 2)
    assert.equal(diagnostics.artifact.source_diagnostics[0].ok, true)
    assert.equal(diagnostics.artifact.source_diagnostics[0].fetched_at, '2026-05-05T08:00:00.000Z')
    assert.equal(diagnostics.artifact.candidates[0].source_institution, 'OK Institution')
    assert.equal(diagnostics.artifact.candidates[0].extraction_mode, 'configured-source-fetch')
    assert.equal(diagnostics.artifact.candidates[0].source_url_status, 'verified')
    assert.equal(diagnostics.artifact.candidates[0].source_url_verified_at, '2026-05-05T08:00:00.000Z')
    assert.ok(diagnostics.artifact.caveats.some((caveat) => caveat.includes('configured sources failed')))
  })

  it('carries forward previous configured packages when an automatic source refresh has outages', async () => {
    const previousArtifact = await buildKnowledgeHubCandidateArtifact({
      extractedAt: '2026-05-05T08:00:00.000Z',
    })
    previousArtifact.extraction_mode = CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE
    previousArtifact.extraction_mode_label = 'Configured source fetch'
    const previousPackage = previousArtifact.reform_packages[0]

    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-15T09:00:00.000Z',
      includeCandidatesInArtifact: false,
      previousArtifact,
      sources: [
        {
          id: 'failed-source',
          institution: 'Failed Institution',
          url: 'https://gov.uz/en/fail/news/news',
        },
      ],
      fetchImpl: async () => {
        throw new Error('synthetic official-source outage')
      },
    })

    assert.equal(diagnostics.candidate_count, 0)
    assert.equal(diagnostics.source_failures.length, 1)
    assert.equal(diagnostics.retained_package_count, 1)
    assert.equal(diagnostics.artifact.candidates.length, 0)
    assert.equal(diagnostics.artifact.reform_packages.length, 1)
    assert.equal(diagnostics.artifact.reform_packages[0].package_id, previousPackage.package_id)
    assert.ok(
      diagnostics.artifact.model_impact_map.package_links.some(
        (packageLink) => packageLink.package_id === previousPackage.package_id,
      ),
    )
    assert.ok(diagnostics.artifact.caveats.some((caveat) => caveat.includes('automatic refresh')))
    assert.ok(diagnostics.artifact.caveats.some((caveat) => caveat.includes('carried forward')))
  })

  it('retains previous configured packages when the latest source window has no matching reforms', async () => {
    const previousArtifact = await buildKnowledgeHubCandidateArtifact({
      extractedAt: '2026-05-05T08:00:00.000Z',
    })
    previousArtifact.extraction_mode = CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE
    previousArtifact.extraction_mode_label = 'Configured source fetch'
    const previousPackage = previousArtifact.reform_packages[0]

    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-15T09:00:00.000Z',
      includeCandidatesInArtifact: false,
      previousArtifact,
      sources: [],
    })

    assert.equal(diagnostics.source_failures.length, 0)
    assert.equal(diagnostics.retained_package_count, 1)
    assert.equal(diagnostics.artifact.candidates.length, 0)
    assert.equal(diagnostics.artifact.reform_packages.length, 1)
    assert.equal(diagnostics.artifact.reform_packages[0].package_id, previousPackage.package_id)
  })

  it('builds research updates from configured research source pages', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-18T09:00:00.000Z',
      includeCandidatesInArtifact: false,
      sources: [],
      researchSources: [
        {
          id: 'imf-research-test',
          institution: 'International Monetary Fund',
          url: 'https://www.imf.org/en/research-test',
          parser: 'research-html-list',
        },
      ],
      fetchImpl: async (url) => {
        const sourceUrl = String(url)
        if (sourceUrl.endsWith('/en/research-test')) {
          return new Response(`
            <article>
              <time datetime="2026-05-11">May 11, 2026</time>
              <h2><a href="/en/Publications/WP/Issues/2026/05/11/Quarterly-Projection-Model-for-a-Small-Open-Economy-580001">Quarterly Projection Model for a Small Open Economy</a></h2>
              <p class="summary">This working paper uses a quarterly projection model, calibration, and scenario analysis for monetary policy transmission.</p>
            </article>
            <article>
              <time datetime="2026-05-10">May 10, 2026</time>
              <h2><a href="/en/Publications/WP/Issues/2026/05/10/Dynamic-Factor-Nowcasting-with-High-Frequency-Indicators-580002">Dynamic factor nowcasting with high-frequency indicators</a></h2>
              <p class="summary">The paper compares dynamic factor model and bridge model nowcasting performance with high-frequency indicators.</p>
            </article>
            <article>
              <time datetime="2026-05-09">May 9, 2026</time>
              <h2><a href="/en/news/general">General conference announcement</a></h2>
              <p>Registration is open for a research conference.</p>
            </article>
          `)
        }
        return new Response('<html>ok</html>')
      },
    })

    const fetchedUpdates = diagnostics.artifact.research_updates.filter((update) =>
      update.id.startsWith('research-imf-research-test-'),
    )

    assert.equal(diagnostics.research_source_results.length, 1)
    assert.equal(diagnostics.research_source_results[0].update_count, 2)
    assert.equal(diagnostics.research_source_failures.length, 0)
    assert.equal(fetchedUpdates.length, 2)
    assert.deepEqual(fetchedUpdates[0].model_ids, ['QPM'])
    assert.deepEqual(fetchedUpdates[1].model_ids, ['DFM', 'HFI'])
    assert.ok(fetchedUpdates.every((update) => update.source_url.startsWith('https://www.imf.org/en/Publications/WP/Issues/')))
    assert.ok(!diagnostics.artifact.research_updates.some((update) => update.title === 'General conference announcement'))
  })

  it('parses RePEc series pages for model-relevant research updates', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-18T09:00:00.000Z',
      includeCandidatesInArtifact: false,
      sources: [],
      researchSources: [
        {
          id: 'imf-repec-test',
          institution: 'International Monetary Fund',
          url: 'https://ideas.repec.org/s/imf/imfwpa.html',
          parser: 'research-repec-series',
        },
      ],
      fetchImpl: async (url) => {
        const sourceUrl = String(url)
        if (sourceUrl.endsWith('/s/imf/imfwpa.html')) {
          return new Response(`
            <LI class="list-group-item downfree"><B>2026/036 <A HREF="/p/imf/imfwpa/2026-036.html">A Novel Quarterly Macroeconomic Forecasting Framework</A></B><BR><I>by</I> Research Team</LI>
            <LI class="list-group-item downfree"><B>2026/032 <A HREF="/p/imf/imfwpa/2026-032.html">Nowcasting GDP Growth for Kenya</A></B><BR><I>by</I> Research Team</LI>
            <LI class="list-group-item downfree"><B>2026/001 <A HREF="/p/imf/imfwpa/2026-001.html">Unrelated Household Survey Notes</A></B><BR><I>by</I> Research Team</LI>
          `)
        }
        return new Response('<html>ok</html>')
      },
    })

    const fetchedUpdates = diagnostics.artifact.research_updates.filter((update) =>
      update.id.startsWith('research-imf-repec-test-'),
    )

    assert.equal(diagnostics.research_source_results[0].update_count, 2)
    assert.equal(fetchedUpdates.length, 2)
    assert.deepEqual(fetchedUpdates[0].model_ids, ['QPM'])
    assert.ok(fetchedUpdates[1].model_ids.includes('DFM'))
    assert.ok(fetchedUpdates.every((update) => update.source_url.startsWith('https://ideas.repec.org/p/imf/imfwpa/')))
  })

  it('carries forward previous research updates when configured research sources fail', async () => {
    const previousArtifact = await buildKnowledgeHubCandidateArtifact({
      extractedAt: '2026-05-05T08:00:00.000Z',
    })
    previousArtifact.extraction_mode = CONFIGURED_SOURCE_FETCH_EXTRACTION_MODE
    previousArtifact.extraction_mode_label = 'Configured source fetch'
    previousArtifact.research_updates = [
      {
        id: 'research-previous-qpm',
        title: 'Previous QPM research update',
        topic: 'QPM scenario design',
        summary: 'Previous source-linked QPM research update.',
        model_ids: ['QPM'],
        methods: ['Quarterly projection model'],
        source_title: 'Previous QPM research update',
        source_institution: 'International Monetary Fund',
        source_url: 'https://www.imf.org/en/Publications/WP/Issues/2026/05/01/Previous-QPM-Research-579900',
        published_at: '2026-05-01',
        why_relevant: 'Previous verified item carried forward during source outage.',
      },
    ]

    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-18T09:00:00.000Z',
      includeCandidatesInArtifact: false,
      previousArtifact,
      sources: [],
      researchSources: [
        {
          id: 'failed-research-source',
          institution: 'International Monetary Fund',
          url: 'https://www.imf.org/en/fail-research',
          parser: 'research-html-list',
        },
      ],
      fetchImpl: async () => {
        throw new Error('synthetic research outage')
      },
    })

    assert.equal(diagnostics.research_source_failures.length, 1)
    assert.equal(diagnostics.retained_research_update_count, 1)
    assert.equal(diagnostics.artifact.research_updates[0].id, 'research-previous-qpm')
    assert.ok(diagnostics.artifact.caveats.some((caveat) => caveat.includes('research sources failed')))
  })

  it('blocks synthetic or unusable source links from configured-source artifacts', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      fetchSource: true,
      extractedAt: '2026-05-05T08:00:00.000Z',
      sources: [
        {
          id: 'synthetic-source',
          institution: 'Synthetic Institution',
          url: 'https://example.test/news/',
        },
      ],
      fetchImpl: async () =>
        new Response(`
          <article>
            <time datetime="2026-05-03">3 May 2026</time>
            <h2><a href="/tax">Tax administration amendments introduced for electronic VAT reporting</a></h2>
            <p>The resolution introduces amended tax reporting rules and budget monitoring requirements.</p>
          </article>
        `),
    })

    assert.equal(diagnostics.candidate_count, 0)
    assert.equal(diagnostics.artifact.candidates.length, 0)
    assert.equal(diagnostics.source_results[0].candidate_count, 0)
    assert.equal(diagnostics.source_results[0].link_invalid_count, 1)
    assert.equal(diagnostics.source_results[0].exclusions[0].exclusion_reason, 'source_link_unusable')
    assert.match(diagnostics.source_results[0].exclusions[0].source_url_error, /Synthetic or local/)
  })

  it('deduplicates repeated candidates across source definitions before artifact output', async () => {
    const diagnostics = await buildKnowledgeHubCandidateArtifactWithDiagnostics({
      extractedAt: '2026-05-05T08:00:00.000Z',
      sources: [
        {
          id: 'duplicate-source-a',
          institution: 'Duplicate Institution A',
          url: 'https://example.test/news/',
          fixture_path: REFORM_SOURCE_DEFINITIONS[0].fixture_path,
        },
        {
          id: 'duplicate-source-b',
          institution: 'Duplicate Institution B',
          url: 'https://mirror.example.test/news/',
          fixture_path: REFORM_SOURCE_DEFINITIONS[0].fixture_path,
        },
      ],
    })

    const candidateIds = diagnostics.artifact.candidates.map((candidate) => candidate.id)
    assert.equal(candidateIds.length, new Set(candidateIds).size)
    assert.equal(diagnostics.source_results[0].candidate_count, diagnostics.source_results[1].candidate_count)
    assert.equal(diagnostics.artifact.candidates.length, diagnostics.source_results[0].candidate_count)
  })

  it('declares configured research sources separately from reform sources', () => {
    assert.ok(RESEARCH_SOURCE_DEFINITIONS.length >= 3)
    assert.ok(RESEARCH_SOURCE_DEFINITIONS.every((source) => source.parser === 'research-repec-series'))
    assert.ok(RESEARCH_SOURCE_DEFINITIONS.some((source) => source.institution === 'International Monetary Fund'))
    assert.ok(RESEARCH_SOURCE_DEFINITIONS.some((source) => source.institution === 'World Bank'))
  })
})
