# Knowledge Hub Reform Tracker v1

Date: 2026-05-05  
Status: product vision and implementation guardrail; docs-only  
Scope: Knowledge Hub reform tracker only; not research briefs, literature corpus, backend CRUD, or model implementation

2026-05-07 concept supersession: `docs/planning/knowledge-hub-v2-concept-lock.md`
supersedes this v1 document for product shape and next implementation direction. This v1
document remains the historical rulebook/guardrail for strict source intake, weak-news
exclusion, and source/citation discipline.

## 1. Purpose

The Reform Tracker is the Knowledge Hub surface for actual Uzbekistan economic policy reforms.

It should answer four practical questions:

1. What reform happened or moved forward?
2. What official source proves it?
3. What economic domain and model area does it affect?
4. What is its review/currentness state inside this project?

The tracker is not a news feed. It is not a legal registry. It is not a source institution. It is not an AI answer engine. It is a curated, source-linked reform intelligence layer for the policy engine.

## 2. Benchmarks Reviewed

Existing policy trackers show that this product category already exists, but successful examples are disciplined about scope, methodology, dates, caveats, and source authority.

| Benchmark | What it tracks | Useful lesson for us | What not to copy blindly |
|---|---|---|---|
| IMF COVID-19 Policy Tracker | Country economic policy responses by category | Clear categories, public-source caveat, strong warning against cross-country over-comparison | It was emergency-response text-heavy tracking, not a standing reform database |
| IMF Fiscal Measures Database | Fiscal measures by type and implementation period | Measure type taxonomy and fiscal-impact caveats | It is fiscal-only and explicitly not a fiscal-reporting classifier |
| IMF MONA | Fund-supported program reviews, quantitative targets, structural conditionality | Scheduled actions, review state, cumulative history, structural benchmarks | It tracks IMF program conditionality, not all domestic reforms |
| World Bank Women, Business and the Law reforms database | Legal reforms affecting women's economic opportunities | Topic taxonomy, legal-change focus, validation by contributors and desk research | It is domain-specific and not a general macro reform tracker |
| World Bank Doing Business reforms archive / B-READY | Business regulatory reforms and business-environment benchmarking | Reform summaries by topic, measurable regulatory environment categories | Doing Business is discontinued; B-READY is benchmarking, not a live reform feed |
| OECD Going for Growth / Foundations for Growth and Competitiveness | Structural reform priorities and actions | Reform priorities should be tied to economic bottlenecks and policy recommendations | It is recommendation/prioritization work, not item-level source intake |
| OECD Product Market Regulation indicators | Laws/regulations translated into comparable indicators | Methodology, questionnaires, legal verification, indicator mapping | It is periodic benchmarking, not event tracking |
| WTO Trade Monitoring Database / Global Trade Alert | Trade policy measures and interventions | Stable taxonomy, announcement/implementation dates, affected sectors, source verification | Trade-specific; impact classification must not be reused for all reforms |

## 3. Product Vision

The v1 Reform Tracker should become a timeline/table of accepted reform records, backed by a candidate intake queue.

The user-facing page should not show every scraped item. It should show:

- accepted reforms;
- optionally, clearly separated unreviewed candidates;
- source and review metadata;
- caveats that prevent legal/currentness overclaiming.

The user should feel: "This is a disciplined reform intelligence layer, not a ministry news mirror."

## 4. Definition Of A Reform

A record qualifies as a reform only if source text shows at least one hard reform signal:

- legal or policy instrument: law, decree, resolution, regulation, order, code, rule package;
- adopted policy measure: approved, enacted, introduced, expanded, abolished, launched, entered into force;
- parameter change: tax rate, tariff, duty, reserve requirement, quota, threshold, subsidy, compensation, allocation, incentive, or similar parameter changed or introduced;
- named implementation update: implementation of a named reform, law, resolution, program, roadmap, strategy, package, or master plan;
- binding financing program: signed financing tied to an adopted/named reform or program with implementation measures.

Domain relevance alone is not enough. A title containing "tax", "investment", "customs", "budget", "energy", or "reform" is only a weak signal unless the source states an actual measure.

## 5. Exclusions

Exclude these by default:

- meetings, roundtables, visits, speeches, and cooperation discussions;
- training, seminars, forums, public awareness, and capacity-building events;
- analytical reports, statistics releases, monitoring notes, and forecasts;
- draft consultations or future discussions without an adopted measure;
- generic project news without a policy instrument or named implementation measure;
- grant/loan/financing announcements unless tied to a named adopted reform/program and implementation measures;
- ceremonial, cultural, protocol, staffing, or internal administrative updates;
- source pages without a stable item-level URL.

These exclusions are not anti-content; they keep the tracker from becoming RSS.

## 6. Source Policy

Preferred source hierarchy:

1. Official legal texts: Lex.uz, presidential decrees/resolutions, Cabinet resolutions, formal regulations.
2. Official agency implementation notices: CBU, Ministry of Economy and Finance, Tax Committee, Customs, Energy, Investment/Trade, Justice, relevant sector regulators.
3. Official program/roadmap pages or PDFs.
4. IFI program documents only when they cite or attach the official domestic measure.
5. News articles only as discovery inputs, not final proof, unless they are official government pages with stable item URLs.

Every accepted record must keep:

- source title;
- source URL or reference;
- issuing institution;
- publication date where available;
- retrieval date;
- snapshot or archive pointer when feasible;
- source owner/institution;
- evidence type;
- caveat and citation state.

## 7. Record States

The tracker should separate extraction state from review state.

Extraction state:

- `source_extracted`: generated from configured source text.
- `manual_seed`: entered manually from a known source.
- `corrected`: edited after review/correction.

Review state:

- `candidate`: extracted but not reviewed.
- `accepted_internal`: owner reviewed for internal preview.
- `accepted_public`: cleared for public display/citation.
- `rejected`: not a reform, duplicate, weak source, or out of scope.
- `superseded`: replaced by a later record.
- `retracted`: removed after factual/source/copyright problem.

Status state:

- `adopted`: measure has been adopted/enacted/approved.
- `in_implementation`: implementation has started or a rollout phase is underway.
- `planned`: official adopted plan/roadmap exists, but measure is not implemented yet.
- `superseded`: replaced by a later measure.
- `unknown`: allowed only for candidates, not accepted records.

## 8. Minimum v1 Fields

Required for every candidate:

- `id`
- `title`
- `summary`
- `source_url`
- `source_institution`
- `source_published_at`
- `retrieved_at` or `extracted_at`
- `extraction_state`
- `review_state`
- `review_status`
- `evidence_types`
- `reform_category`
- `matched_rules`
- `inclusion_reason`
- `caveats`

Required before accepted/internal display:

- `status`
- `as_of_date`
- `status_authority`
- `source_title`
- `source_owner`
- `domain_tags`
- `reviewer_of_record`
- `review_date`
- `review_scope`
- `citation_permission`
- `license_class`
- `translation_review_state`
- item-level legal/currentness caveat

Required before public citation/export:

- source snapshot/version pin;
- copyright/redistribution rule;
- attribution text;
- RU/UZ review state if displayed in RU/UZ;
- correction/supersession policy;
- model reference review if model links are shown.

## 9. Categories

Initial controlled categories:

- `monetary_policy`
- `fiscal_tax`
- `budget_public_finance`
- `trade_customs`
- `energy_tariffs`
- `financial_sector`
- `soe_privatization`
- `social_protection`
- `business_environment`
- `agriculture`
- `digital_public_admin`
- `infrastructure_investment`
- `industrial_policy`
- `competition_regulation`
- `labor_market`
- `other_policy`

Free-text domain labels can be displayed, but backend/API records should use controlled category ids.

## 10. UI Target

The prototype direction remains right: timeline plus supporting context.

v1 UI should include:

- headline counts: accepted reforms, candidates pending review, sources monitored;
- filter controls: category, status, source institution, review state;
- reform timeline/card list;
- item card fields: date, title, summary, source, evidence type, category, status, review state;
- "why included" disclosure;
- item-level caveat;
- source link;
- clear separation between accepted reforms and candidates.

Do not show research briefs or literature as if they are reviewed until separate record types and review rules exist.

## 11. Automation Model

Automation should assist intake, not decide truth.

Allowed:

- fetch configured official sources;
- extract candidate titles, dates, URLs, summaries;
- classify candidates against the rulebook;
- deduplicate;
- produce diagnostics and review bundles;
- suggest category/evidence type;
- flag weak source/relevance cases.

Not allowed in v1:

- auto-promote to accepted/public;
- generate analytical mechanism text without reviewer approval;
- infer legal status from headlines alone;
- cite model outputs as evidence;
- publish source-fetched artifacts without review if page labels imply accepted reforms.

## 12. Acceptance Criteria For Reform Tracker v1

v1 is acceptable when:

- a written rulebook defines inclusion and exclusion;
- every displayed candidate has a stable source URL;
- weak news is excluded by default;
- accepted records are visibly distinct from candidates;
- every item shows source, date, category, evidence type, review state, and caveat;
- source fetch produces diagnostics, not silent failures;
- the tracker can be empty without looking broken;
- all source-generated content is marked unreviewed unless owner-reviewed;
- default GitHub Pages behavior does not imply a reviewed legal database;
- tests cover weak-news exclusion, hard-reform inclusion, dedupe, source-link validation, and empty state.

## 13. Phase Plan

Phase 1 - Product spec and UI discipline:

- Freeze this v1 vision.
- Keep current strict intake behavior.
- Redesign the Knowledge Hub page around reform-tracker states, not news cards.

Phase 2 - Candidate review workflow:

- Add a generated review bundle: accepted suggestions, rejected items, source failures, duplicate report.
- Add manual promotion path through PR-reviewed static artifacts.
- Add reviewer metadata fields for accepted/internal items.

Phase 3 - Better sources and source quality:

- Add Lex.uz/official legal text parsing only if stable item-level references can be extracted.
- Add CBU/Tax/Customs/Energy/MEF/MIIT/Justice configured sources where links are stable.
- Add source-specific tests and link checks.

Phase 4 - Reviewed reform records:

- Promote a small set of real reforms to `accepted_internal`.
- Add source snapshots and item-level caveats.
- Show accepted reforms separately from candidates.

Phase 5 - Research briefs and literature:

- Add separate record types for briefs/literature after reform tracker is stable.
- Do not mix research summaries with unreviewed source extraction.

## 14. Open Decisions

1. Should candidates be visible on the public page, or only accepted/internal reforms?
2. Who is the reviewer of record for `accepted_internal`?
3. Which categories are mandatory for CERR use cases?
4. Should model badges appear before model owner review?
5. What minimum source snapshot policy is feasible for gov.uz and Lex.uz?
6. Should the public UI include rejected/excluded diagnostics, or keep them in workflow artifacts only?

## 15. Benchmark References

- IMF COVID-19 Policy Responses Tracker: https://www.imf.org/en/Topics/imf-and-covid19/Policy-Responses-to-COVID-19
- IMF COVID-19 Fiscal Measures Database: https://www.imf.org/en/topics/imf-and-covid19/fiscal-policies-database-in-response-to-covid-19
- IMF Monitoring of Fund Arrangements (MONA): https://www.imf.org/external/np/pdr/mona
- World Bank Women, Business and the Law reforms database: https://wbl.worldbank.org/en/reforms
- World Bank Business Ready: https://www.worldbank.org/en/businessready
- World Bank Doing Business reforms archive: https://archive.doingbusiness.org/en/reforms
- OECD Product Market Regulation indicators: https://www.oecd.org/en/topics/sub-issues/product-market-regulation.html
- OECD structural reform / Going for Growth: https://www.oecd.org/en/topics/sub-issues/structural-reform.html
- WTO Trade Monitoring Database: https://data.wto.org/en/dataset/wto_tmdb
- Global Trade Alert methodology: https://globaltradealert.org/methodology
