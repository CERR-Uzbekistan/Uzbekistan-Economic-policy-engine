# Phase 3a Overview Source Discovery

Scope: discovery documentation and raw source samples only. No Overview metric values were changed, no parser was added, and the source snapshot/public artifact were intentionally left untouched.

Discovery date: 2026-04-29

Target metrics:
- real_gdp_growth_annual_yoy
- real_gdp_growth_quarter_yoy
- cpi_yoy
- cpi_mom
- food_cpi_yoy
- policy_rate

Fixture directory: `scripts/overview/source-discovery/phase3/`

Saved source samples:
- `scripts/overview/source-discovery/phase3/nsdp-index.html` from `https://nsdp.stat.uz/`
- `scripts/overview/source-discovery/phase3/statuz-national-accounts-index.html` from `https://stat.uz/en/official-statistics/national-accounts`
- `scripts/overview/source-discovery/phase3/statuz-prices-and-indexes-index.html` from `https://stat.uz/en/official-statistics/prices-and-indexes`
- `scripts/overview/source-discovery/phase3/siat-gdp-growth-annual-582.json` from `https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_582.json`
- `scripts/overview/source-discovery/phase3/siat-gdp-growth-quarterly-1857.json` from `https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_1857.json`
- `scripts/overview/source-discovery/phase3/siat-cpi-all-items-mom-4585.json` from `https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_4585.json`
- `scripts/overview/source-discovery/phase3/siat-cpi-coicop-mom-1286.json` from `https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_1286.json`
- `scripts/overview/source-discovery/phase3/siat-cpi-coicop-yoy-1292.json` from `https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_1292.json`
- `scripts/overview/source-discovery/phase3/nsdp-national-accounts-nag-uzbekistan-mcd.xml` from `https://stat.uz/img/uploads/download_xml/nag_uzbekistan_mcd.xml`
- `scripts/overview/source-discovery/phase3/nsdp-cpi-uzbekistan-mcd-online.xml` from `https://stat.uz/img/uploads/download_xml/cpi_uzbekistan_mcd_online.xml`
- `scripts/overview/source-discovery/phase3/cbu-policy-rate-page.html` from `https://cbu.uz/en/monetary-policy/refinancing-rate/press-releases/1451483/?mobile=Y`
- `scripts/overview/source-discovery/phase3/cbu-policy-rate-dynamics-asosiy_stavka.xlsx` from `https://cbu.uz/upload/medialibrary/479/szj8z2sr5oanndna0npgsw6r0xcyi67u/asosiy_stavka.xlsx`
- `scripts/overview/source-discovery/phase3/cbu-policy-press-release-index.html` from `https://cbu.uz/en/monetary-policy/publications/press-releases/`
- `scripts/overview/source-discovery/phase3/cbu-nsdp-interest-rates-sdmx.xml` from `https://cbu.uz/sdmx/INR_Uzbekistan_Online_STA.xml`

The XML files are official NSDP/SDMX downloads. The required source-type taxonomy does not include `sdmx_xml`; rows below mark those candidates as `unknown` and describe them as SDMX XML in notes.

## Recommendation Summary

| metric_id | current snapshot value/period | recommendation | primary reason |
|---|---:|---|---|
| real_gdp_growth_annual_yoy | 7.7, 2025 | automatable | Official SIAT/NSDP structured sources include 2025 and prior year; requires explicit 100-index to percent-growth transform. |
| real_gdp_growth_quarter_yoy | 8.7, 2026 Q1 | manual_required_only | Official SIAT/NSDP structured source observed only through 2025 Q4; current snapshot period is newer and comes from PDF release. |
| cpi_yoy | 7.1, March 2026 | manual_required_only | Current monthly YoY value was found only in release/PDF or HTML body style sources; no stable machine-readable monthly YoY endpoint confirmed. |
| cpi_mom | 0.6, March 2026 | automatable | Official SIAT/NSDP structured CPI MoM sources include March 2026 and previous month; requires explicit 100-index to percent-change transform. |
| food_cpi_yoy | 5.6, March 2026 | manual_required_only | Current monthly food CPI YoY value was found only in release/PDF or HTML body style sources; machine-readable source found is not monthly YoY. |
| policy_rate | 14, Effective 18 March 2026 | needs_owner_decision | CBU-only structured XLS has current effective rate but period semantics differ from the event-based Overview source period; previous decision value is not available from same XLS row. |

## Metric Findings

### real_gdp_growth_annual_yoy

metric_id: real_gdp_growth_annual_yoy

current_snapshot_value_period: 7.7, 2025

candidate_source:
- source_owner_host: National Statistics Committee / SIAT, `api.siat.stat.uz`
- source_type: sdmx_json
- source_url: `https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_582.json`
- sample_fixture: `scripts/overview/source-discovery/phase3/siat-gdp-growth-annual-582.json`
- frequency_cadence: annual, source index page last modified 2026-01-27
- latest_available_period_observed: 2025
- unit_frequency_compatibility: Source unit is "as a percentage of the corresponding period of the previous year" and stores index-style values such as 107.7. The locked Overview metric stores percent growth, so Phase 3b must explicitly transform `source_value - 100` and reject any changed unit label.
- previous_value_available_same_endpoint_release: yes, 2024 is present in the same JSON/SDMX family.
- structure_stability_notes: Single country row in SIAT JSON. National Accounts index page exposes stable xlsx/pdf/csv/json/xml links for the same dataset.
- license_access_notes: Public official Statistics Agency/SIAT endpoint, no authentication observed.
- recommendation: automatable
- rationale: The source has the current snapshot period and prior period in a stable machine-readable official endpoint. The only automation decision needed is to encode the visible index-to-growth transform as an explicit, tested rule, not an inferred unit conversion.

secondary_candidate_source:
- source_owner_host: NSDP/stat.uz, `stat.uz`
- source_type: unknown
- source_url: `https://stat.uz/img/uploads/download_xml/nag_uzbekistan_mcd.xml`
- sample_fixture: `scripts/overview/source-discovery/phase3/nsdp-national-accounts-nag-uzbekistan-mcd.xml`
- latest_available_period_observed: annual `NGDP_R_PYP_PT` through 2025
- recommendation: automatable
- rationale: Official NSDP SDMX XML corroborates the annual growth series, but Phase 3b should choose one canonical source family to avoid duplicate-source drift.

### real_gdp_growth_quarter_yoy

metric_id: real_gdp_growth_quarter_yoy

current_snapshot_value_period: 8.7, 2026 Q1

candidate_source:
- source_owner_host: National Statistics Committee / SIAT, `api.siat.stat.uz`
- source_type: sdmx_json
- source_url: `https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_1857.json`
- sample_fixture: `scripts/overview/source-discovery/phase3/siat-gdp-growth-quarterly-1857.json`
- frequency_cadence: quarterly, source index page last modified 2026-01-27
- latest_available_period_observed: 2025 Q4
- unit_frequency_compatibility: Source is quarterly and "as a percentage of the corresponding period of the previous year"; it stores index-style values such as 107.7. The locked Overview metric stores percent YoY growth. Frequency is compatible, but current period is not.
- previous_value_available_same_endpoint_release: yes for the machine endpoint's own latest/prior periods, but not for the current snapshot period 2026 Q1.
- structure_stability_notes: SIAT JSON includes Republic of Uzbekistan plus region rows, with period columns in `YYYY-Qn` format.
- license_access_notes: Public official Statistics Agency/SIAT endpoint, no authentication observed.
- recommendation: manual_required_only
- manual_required_reason: endpoint period older than current snapshot period; current Overview value is from the 2026 Q1 PDF release and cannot be replaced by stale structured data.
- rationale: Phase 3b must not automate this metric from the saved SIAT/NSDP sample until the endpoint reaches 2026 Q1 or another stable machine-readable official source is confirmed.

secondary_candidate_source:
- source_owner_host: NSDP/stat.uz, `stat.uz`
- source_type: unknown
- source_url: `https://stat.uz/img/uploads/download_xml/nag_uzbekistan_mcd.xml`
- sample_fixture: `scripts/overview/source-discovery/phase3/nsdp-national-accounts-nag-uzbekistan-mcd.xml`
- latest_available_period_observed: quarterly `NGDP_R_PYP_CUM_PT` through 2025 Q4
- recommendation: manual_required_only
- manual_required_reason: endpoint period older than current snapshot period.

### cpi_yoy

metric_id: cpi_yoy

current_snapshot_value_period: 7.1, March 2026

candidate_source:
- source_owner_host: National Statistics Committee / SIAT, `api.siat.stat.uz`
- source_type: sdmx_json
- source_url: `https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_1292.json`
- sample_fixture: `scripts/overview/source-discovery/phase3/siat-cpi-coicop-yoy-1292.json`
- frequency_cadence: annual dataset, source index page last modified 2026-01-16
- latest_available_period_observed: 2025
- unit_frequency_compatibility: Unit is percent and YoY concept is compatible in principle, but frequency is annual, not monthly. It does not match the locked March 2026 monthly Overview metric.
- previous_value_available_same_endpoint_release: yes for annual periods, no for the locked monthly March/February 2026 comparison.
- structure_stability_notes: SIAT JSON has COICOP rows and annual columns. It is unsuitable for a monthly Overview YoY value.
- license_access_notes: Public official Statistics Agency/SIAT endpoint, no authentication observed.
- recommendation: manual_required_only
- manual_required_reason: no stable machine-readable endpoint for the locked monthly YoY value was confirmed; available machine-readable source is annual only.
- rationale: The current value appears in official CPI release material, but Phase 3a did not identify a stable official machine-readable monthly YoY source. Do not parse PDF body text or CBU/stat.uz HTML body text into this metric.

candidate_source:
- source_owner_host: CBU, `cbu.uz`
- source_type: html_index_only
- source_url: `https://cbu.uz/en/monetary-policy/annual-inflation/indicators/`
- sample_fixture: none saved; discovery only observed the page as a candidate and rejected it as a parser source because it is HTML body content, not a structured release index.
- frequency_cadence: monthly page update cadence
- latest_available_period_observed: March 2026 visible on page
- unit_frequency_compatibility: Compatible concept, but not an allowed parser source under Phase 3a hard rules.
- previous_value_available_same_endpoint_release: visually present on page, but not usable without HTML body parsing.
- structure_stability_notes: HTML presentation table, not a stable API or file endpoint.
- license_access_notes: Public CBU page.
- recommendation: manual_required_only
- manual_required_reason: source requires HTML body parsing.

### cpi_mom

metric_id: cpi_mom

current_snapshot_value_period: 0.6, March 2026

candidate_source:
- source_owner_host: National Statistics Committee / SIAT, `api.siat.stat.uz`
- source_type: sdmx_json
- source_url: `https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_4585.json`
- sample_fixture: `scripts/overview/source-discovery/phase3/siat-cpi-all-items-mom-4585.json`
- frequency_cadence: monthly, source index page last modified 2026-04-05
- latest_available_period_observed: 2026-M03
- unit_frequency_compatibility: Source stores all-goods-and-services price index against the previous month, with index-style values such as 100.6. Locked Overview metric stores percent MoM, so Phase 3b must explicitly transform `source_value - 100`, round according to the locked metric, and reject any changed unit/label.
- previous_value_available_same_endpoint_release: yes, February 2026 is present in the same endpoint.
- structure_stability_notes: SIAT JSON includes many classifier rows; the aggregate row is labelled "COMPOSITE INDEX". Phase 3b must lock the aggregate row identity and stop on row/schema drift.
- license_access_notes: Public official Statistics Agency/SIAT endpoint, no authentication observed.
- recommendation: automatable
- rationale: Official structured source is current for March 2026 and includes prior month from the same endpoint. The transform is explicit and should be guarded.

secondary_candidate_source:
- source_owner_host: NSDP/stat.uz, `stat.uz`
- source_type: unknown
- source_url: `https://stat.uz/img/uploads/download_xml/cpi_uzbekistan_mcd_online.xml`
- sample_fixture: `scripts/overview/source-discovery/phase3/nsdp-cpi-uzbekistan-mcd-online.xml`
- latest_available_period_observed: monthly `PCPI_IX` through 2026-03
- recommendation: automatable
- rationale: Official NSDP SDMX XML confirms current monthly CPI index availability, but Phase 3b should choose SIAT JSON or NSDP XML as canonical rather than mixing them.

### food_cpi_yoy

metric_id: food_cpi_yoy

current_snapshot_value_period: 5.6, March 2026

candidate_source:
- source_owner_host: National Statistics Committee / SIAT, `api.siat.stat.uz`
- source_type: sdmx_json
- source_url: `https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_1292.json`
- sample_fixture: `scripts/overview/source-discovery/phase3/siat-cpi-coicop-yoy-1292.json`
- frequency_cadence: annual dataset, source index page last modified 2026-01-16
- latest_available_period_observed: 2025
- unit_frequency_compatibility: COICOP category structure may be compatible with food CPI definitions, but the saved machine-readable endpoint is annual, not monthly. It does not match March 2026.
- previous_value_available_same_endpoint_release: no for March/February 2026 monthly food CPI YoY.
- structure_stability_notes: COICOP rows need owner-approved category mapping before use; current endpoint cadence is not compatible.
- license_access_notes: Public official Statistics Agency/SIAT endpoint, no authentication observed.
- recommendation: manual_required_only
- manual_required_reason: no stable machine-readable endpoint for the locked monthly food CPI YoY value was confirmed; available machine-readable source is annual only.
- rationale: Current Overview value is from official release material. Phase 3b must not parse PDF body text or HTML body text to update this metric.

### policy_rate

metric_id: policy_rate

current_snapshot_value_period: 14, Effective 18 March 2026

candidate_source:
- source_owner_host: Central Bank of Uzbekistan, `cbu.uz`
- source_type: xlsx
- source_url: `https://cbu.uz/upload/medialibrary/479/szj8z2sr5oanndna0npgsw6r0xcyi67u/asosiy_stavka.xlsx`
- sample_fixture: `scripts/overview/source-discovery/phase3/cbu-policy-rate-dynamics-asosiy_stavka.xlsx`
- frequency_cadence: event-based effective-rate history, updated when CBU changes the policy rate
- latest_available_period_observed: open-ended effective range starting 24.03.2025 at 14 percent
- unit_frequency_compatibility: Current rate value is compatible, but source period semantics are effective-rate history. The locked Overview period is the latest policy meeting decision date, not the original effective date of the current rate.
- previous_value_available_same_endpoint_release: no for the locked previous policy-meeting value; the XLS previous row is the previous changed rate, not the previous decision when the rate was maintained.
- structure_stability_notes: Workbook has language-specific sheets and two columns: effective date range and percent. Parser would need sheet/header guards.
- license_access_notes: Public official CBU file, no authentication observed.
- recommendation: needs_owner_decision
- rationale: This source is CBU-only and machine-readable, but using it would change provenance semantics from "latest decision kept rate unchanged" to "current effective rate". Owner must decide whether Overview should show current effective rate or latest decision event.

candidate_source:
- source_owner_host: Central Bank of Uzbekistan, `cbu.uz`
- source_type: html_index_only
- source_url: `https://cbu.uz/en/monetary-policy/publications/press-releases/`
- sample_fixture: `scripts/overview/source-discovery/phase3/cbu-policy-press-release-index.html`
- frequency_cadence: policy decision/event release cadence
- latest_available_period_observed: 18 March 2026 press release visible in index
- unit_frequency_compatibility: Event cadence matches the current snapshot period, but the index is not sufficient for a safe value update without parsing a press-release body.
- previous_value_available_same_endpoint_release: latest and prior decision links are listed, but values require HTML body parsing.
- structure_stability_notes: HTML index can identify candidate release URLs/dates only; it must not be used to parse rate values.
- license_access_notes: Public official CBU page.
- recommendation: manual_required_only
- manual_required_reason: source requires HTML body parsing for values.

rejected_candidate_source:
- source_owner_host: NSDP/CBU, `cbu.uz`
- source_type: unknown
- source_url: `https://cbu.uz/sdmx/INR_Uzbekistan_Online_STA.xml`
- sample_fixture: `scripts/overview/source-discovery/phase3/cbu-nsdp-interest-rates-sdmx.xml`
- reason: official SDMX interest-rate feed includes `FPOLM_PA`, but latest observed period is 2025-12, older than current snapshot period and monthly rather than event-based.

## Phase 3b Stop Conditions

Any future Phase 3b automation for these metrics must stop without changing values when any of the following applies:

- endpoint period older than current snapshot period
- schema drift from saved fixture
- unit/frequency/period mismatch
- decimal separator ambiguity
- host not on per-metric allowlist
- current/prior period comparability not proven
- previous_value unavailable from same endpoint/release
- source requires PDF body parsing
- source requires HTML body parsing for numeric values
- no stable machine-readable endpoint

Per-metric allowlist proposal:
- real_gdp_growth_annual_yoy: `api.siat.stat.uz`, `stat.uz`
- real_gdp_growth_quarter_yoy: `api.siat.stat.uz`, `stat.uz`
- cpi_yoy: `api.siat.stat.uz`, `stat.uz`; CBU only as citation, not parser source
- cpi_mom: `api.siat.stat.uz`, `stat.uz`
- food_cpi_yoy: `api.siat.stat.uz`, `stat.uz`; CBU only as citation, not parser source
- policy_rate: `cbu.uz` only

## Boundary Confirmation

This discovery did not modify:
- `scripts/overview/fetch-overview-sources.mjs`
- `scripts/overview/overview_source_snapshot.json`
- `scripts/overview/overview_source_snapshot.diff_report.json`
- `scripts/overview/export-overview.mjs`
- `apps/policy-ui/public/data/overview.json`
- frontend UI/components/locales
- backend/model/contract files
- unrelated planning docs
