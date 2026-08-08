// Hidden pilot content. Not deployable. Gated by docs/data-bridge/09_knowledge_hub_contract.md
// and CLAUDE.md preview gates. No data edits.
import type { KnowledgeHubContent, ReformTrackerItem } from '../../contracts/data-contract.js'

// Content seeded verbatim from docs/alignment/spec_prototype.html:2332–2412.
// Editorial voice is institutionally well-formed; Shot 2 will localize bylines
// and mechanism paragraphs into RU/UZ (translation keys are already wired).

type StaticPilotReform = {
  id: string
  date_label: string
  date_iso?: string
  status: 'completed' | 'in_progress' | 'planned'
  title: string
  mechanism: string
  domain_tag: string
  model_refs: string[]
}

function pilotReform(input: StaticPilotReform): ReformTrackerItem {
  const statusMap = {
    completed: 'adopted',
    in_progress: 'in_implementation',
    planned: 'planned',
  } as const
  const date = input.date_iso ?? input.date_label

  return {
    id: input.id,
    extraction_state: 'manual_seed',
    review_state: 'accepted_internal',
    review_status: 'owner_reviewed',
    status: statusMap[input.status],
    title: input.title,
    summary: input.mechanism,
    domain_tag: input.domain_tag,
    domain_tags: [input.domain_tag],
    reform_category: 'other_policy',
    evidence_types: ['official_policy_announcement'],
    inclusion_reason: 'Static pilot reform retained for hidden internal-preview tests.',
    matched_rules: ['manual-static-pilot'],
    source_title: input.title,
    source_institution: 'Static pilot content',
    source_owner: 'CERR internal preview',
    source_url: '#',
    source_published_at: date,
    as_of_date: date,
    status_authority: 'Static pilot status; source/legal authority pending review',
    reviewer_of_record: 'Internal preview owner pending',
    review_date: input.date_iso ?? '2026-05-05',
    review_scope: 'Static pilot copy only; source/legal currentness not cleared.',
    citation_permission: 'internal_only',
    license_class: 'unknown',
    translation_review_state: 'not_translated',
    caveats: [
      'Static pilot content. Do not treat this item as a live legal registry or current official notice.',
    ],
    model_refs: input.model_refs,
  }
}

export const knowledgeHubContentMock: KnowledgeHubContent = {
  meta: {
    reforms_tracked: 14,
    research_briefs: 9,
    literature_items: 22,
  },
  reforms: [
    pilotReform({
      id: 'pp-642-customs-phase-2',
      date_label: '14 APR 2026',
      date_iso: '2026-04-14',
      status: 'completed',
      title: 'PP-642 · Customs modernization Phase II',
      mechanism:
        'Risk-based customs clearance; reduces average physical-inspection rate to ~7%. Expected impact: ~0.4 pp ad-valorem trade-cost reduction.',
      domain_tag: 'Trade',
      model_refs: ['PE', 'CGE'],
    }),
    pilotReform({
      id: 'cbu-fx-rr-2026',
      date_label: '02 APR 2026',
      date_iso: '2026-04-02',
      status: 'in_progress',
      title: 'CBU reserve requirement on FX deposits',
      mechanism:
        'Raised from 14% to 18%; intended to lower dollarization incentives. Secondary effect on credit channel under analysis.',
      domain_tag: 'Monetary',
      model_refs: ['QPM', 'FPP'],
    }),
    pilotReform({
      id: 'gas-tariff-adjustment-2026',
      date_label: '21 MAR 2026',
      date_iso: '2026-03-21',
      status: 'in_progress',
      title: 'Gas tariff adjustment mechanism',
      mechanism:
        'Quarterly indexation to an oil-linked benchmark with a 3-month lag; phased subsidy reduction across 2026–2028.',
      domain_tag: 'Fiscal / structural',
      model_refs: ['CGE', 'FPP'],
    }),
    pilotReform({
      id: 'wto-final-tariff-schedule',
      date_label: 'Q3 2026 · Planned',
      status: 'planned',
      title: 'WTO accession · final tariff schedule',
      mechanism: 'Bound rates on HS 28–40 chapters; transition period 2026–2030.',
      domain_tag: 'Trade',
      model_refs: ['PE', 'CGE'],
    }),
  ],
  briefs: [
    {
      id: 'brief-remittance-ca-2026-04',
      byline: {
        author: 'N. Mamatov',
        date_label: '11 Apr 2026',
        read_time_minutes: 9,
      },
      title: 'Remittance-sensitive growth: how much insurance does the current account provide?',
      summary:
        'A scenario-based analysis of remittance shocks under three buffer regimes. Finds that a 15% decline leaves reserve adequacy intact but compresses non-tradable consumption disproportionately.',
      domain_tag: 'Monetary',
      model_refs: ['FPP', 'QPM'],
    },
    {
      id: 'brief-gas-tariff-inflation-2026-03',
      byline: {
        author: 'J. Akhmatov',
        date_label: '28 Mar 2026',
        read_time_minutes: 6,
      },
      title: 'Gas tariff reform: inflation arithmetic and compensation design',
      summary:
        'Direct and second-round inflation effects of the planned tariff indexation. Proposes a compensating transfer that neutralizes the welfare impact for the lowest two income deciles.',
      domain_tag: 'Fiscal',
      model_refs: ['CGE', 'QPM'],
    },
    {
      id: 'brief-wto-winners-losers-2026-03',
      byline: {
        ai_drafted: true,
        reviewed_by: 'CERR Trade Desk',
        date_label: '05 Mar 2026',
      },
      title: 'WTO accession: winners and losers under uniform vs. differentiated elasticities',
      summary:
        'Compares PE output under uniform ε = 1.27 against WITS sector-specific elasticities. Differentiated elasticities yield materially different sectoral welfare conclusions.',
      domain_tag: 'Trade',
      model_refs: ['PE', 'CGE'],
    },
  ],
}
