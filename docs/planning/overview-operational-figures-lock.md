# Overview Operational Figures Lock

Status: accepted implementation lock for the next Overview artifact foundation slice. This document does not authorize crawling, scheduler work, backend writes, model recalculation, or a production `/data/overview.json` artifact by itself.

Date: 2026-04-27  
Branch: `epic/replatform-execution`  
Owner status: project owner accepted the first Overview figure set in conversation before this lock.

## Purpose

The Overview page should become the operational front door for current macro conditions. It should show a small, stable set of headline figures with source period, freshness, and caveats. The next code slice should implement the artifact path around this locked target, not invent new metrics.

The page should answer:

- Is growth holding up?
- Is inflation pressure easing or rising?
- Are trade flows improving or weakening?
- Are monetary and FX conditions stable?
- Is gold providing external support or downside risk?
- Are the displayed figures current enough to use?

## Display Structure

Top headline cards should stay capped at eight metrics:

1. Real GDP growth, latest quarter
2. GDP nowcast, current quarter
3. CPI inflation, YoY
4. Food inflation, YoY
5. Exports growth, YoY
6. Imports growth, YoY
7. CBU policy rate
8. USD/UZS exchange rate level

Supporting panels may show the full locked set:

- Growth panel: annual GDP, quarterly GDP, DFM nowcast path.
- Inflation panel: CPI YoY, CPI MoM, food CPI YoY.
- Trade panel: exports YoY, imports YoY, trade balance.
- Monetary / FX panel: policy rate, USD/UZS level, USD/UZS MoM, USD/UZS YoY, REER level.
- Gold panel: observed gold price, gold price change, external gold forecast path.

## Locked Metric Set

| Metric id | Display label | Block | Claim type | Unit | Frequency | Primary source of record | Fallback source | Source period / vintage semantics | Stale rule | Citation label | Caveat if source unavailable |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `real_gdp_growth_annual_yoy` | Real GDP growth, latest year | Growth | observed | percent YoY | annual | Statistics Agency of Uzbekistan national accounts release | DFM/QPM artifact only if explicitly tagged as reference | latest published calendar year or annual estimate vintage | warning if latest annual observation is older than 15 months | Statistics Agency national accounts | Use fallback only as reference; do not label as official annual actual. |
| `real_gdp_growth_quarter_yoy` | Real GDP growth, latest quarter | Growth | observed | percent YoY | quarterly | Statistics Agency of Uzbekistan quarterly national accounts release | DFM artifact only if official quarterly actual is absent | latest published quarter and release date | warning if latest quarter is older than 5 months | Statistics Agency quarterly GDP | If unavailable, show no official quarterly actual rather than substituting a forecast. |
| `gdp_nowcast_current_quarter` | GDP nowcast, current quarter | Growth | nowcast | percent YoY | quarterly / model update cadence | DFM bridge artifact | current static Overview fallback | DFM artifact export timestamp plus nowcast target quarter | warning if DFM export older than accepted DFM freshness rule | DFM bridge nowcast | Not an official GDP release; model nowcast only. |
| `cpi_yoy` | CPI inflation, YoY | Inflation | observed | percent YoY | monthly | Statistics Agency CPI release | CBU inflation dashboard/report if it republishes official CPI | latest published CPI month | warning if latest month is older than 45 days | Statistics Agency CPI | If fallback is used, mark as republished official CPI. |
| `cpi_mom` | CPI inflation, monthly | Inflation | observed | percent MoM | monthly | Statistics Agency CPI release | CBU inflation dashboard/report if it republishes official CPI | latest published CPI month | warning if latest month is older than 45 days | Statistics Agency CPI | Monthly inflation can be volatile; do not present as trend alone. |
| `food_cpi_yoy` | Food inflation, YoY | Inflation | observed | percent YoY | monthly | Statistics Agency CPI by category | CBU inflation report if category is cited | latest published CPI month and category basket | warning if latest month is older than 45 days | Statistics Agency food CPI | Category definitions must be stable before comparing over time. |
| `exports_yoy` | Exports growth, YoY | Trade | observed | percent YoY | monthly or quarterly | Statistics Agency foreign trade release | Customs/CBU publication if matched to official trade release | latest published trade period | warning if latest trade period is older than 75 days for monthly or 5 months for quarterly | Statistics Agency foreign trade | Trade values can be revised; show latest-vintage status. |
| `imports_yoy` | Imports growth, YoY | Trade | observed | percent YoY | monthly or quarterly | Statistics Agency foreign trade release | Customs/CBU publication if matched to official trade release | latest published trade period | warning if latest trade period is older than 75 days for monthly or 5 months for quarterly | Statistics Agency foreign trade | Trade values can be revised; show latest-vintage status. |
| `trade_balance` | Trade balance | Trade | observed | USD million or USD billion | monthly or quarterly | Statistics Agency foreign trade release | Customs/CBU publication if matched to official trade release | latest published trade period | warning if latest trade period is older than 75 days for monthly or 5 months for quarterly | Statistics Agency foreign trade | Label goods trade balance if services are excluded. |
| `policy_rate` | CBU policy rate | Monetary / FX | observed policy setting | percent | event-based | Central Bank of Uzbekistan policy decision / rates page | latest CBU monetary policy report | effective date of current policy-rate decision | not stale by age alone; warning only if source cannot confirm current effective rate | Central Bank of Uzbekistan policy rate | Event-based setting; do not infer policy stance without inflation context. |
| `usd_uzs_level` | USD/UZS exchange rate | Monetary / FX | observed | UZS per USD | daily | Central Bank of Uzbekistan official exchange rate | last accepted market/reference rate only if source approved | rate date | warning if latest daily rate older than 5 business days | Central Bank of Uzbekistan exchange rate | Specify official/reference rate, not transaction-weighted market average unless sourced. |
| `usd_uzs_mom_change` | USD/UZS monthly change | Monetary / FX | observed / calculated identity | percent MoM | monthly from daily observations | calculated from CBU official exchange rate series | none unless rate series is accepted | latest month-end or latest available daily observation vs prior month | warning follows `usd_uzs_level` source; failed if comparison date missing | CBU exchange rate, calculated | Positive/negative direction must be labeled consistently as UZS depreciation/appreciation. |
| `usd_uzs_yoy_change` | USD/UZS annual change | Monetary / FX | observed / calculated identity | percent YoY | monthly from daily observations | calculated from CBU official exchange rate series | none unless rate series is accepted | latest observation vs same date/month one year earlier | warning follows `usd_uzs_level` source; failed if comparison date missing | CBU exchange rate, calculated | Positive/negative direction must be labeled consistently as UZS depreciation/appreciation. |
| `reer_level` | REER level | Monetary / FX | reference | index | monthly or quarterly | Central Bank of Uzbekistan or accepted external REER source | IMF/World Bank/other accepted source if CBU series unavailable | latest published REER period, base year/index definition | warning if latest REER period older than 4 months | REER source to be confirmed | Base year and methodology must be shown before citing. |
| `gold_price_level` | Gold price | Gold | observed market price | USD per troy ounce | daily or monthly | World Bank Pink Sheet or LBMA accepted price series | IMF commodity price series or other accepted public commodity source | latest observation date or monthly average period | warning if daily source older than 7 days or monthly source older than 45 days | Gold price source to be confirmed | External market price; not a CERR forecast. |
| `gold_price_change` | Gold price change | Gold | observed / calculated identity | percent MoM or YoY | monthly | calculated from accepted gold price source | none unless price source is accepted | latest monthly average vs comparison period | warning follows `gold_price_level` source | Gold price source, calculated | Show comparison basis: MoM or YoY. |
| `gold_price_forecast` | Gold price forecast | Gold | reference forecast | USD per troy ounce | semiannual / forecast release cadence | World Bank Commodity Markets Outlook or accepted external forecast provider | IMF WEO commodity assumptions if accepted | forecast vintage and horizon | warning if forecast vintage older than 9 months | External gold price forecast | External reference assumption, not a CERR forecast or policy recommendation. |

## Source Priority Rules

1. Official source artifact first when available and validated.
2. Bridge/model artifact only when the metric is explicitly tagged as nowcast, reference, or model output.
3. Static fallback only when the accepted source artifact is unavailable.
4. No React-side live scraping.
5. No silent substitution between observed, nowcast, forecast, scenario, and reference values.
6. Every metric must carry source period, artifact/export timestamp, claim type, and citation label.

## Explicit Exclusions For Overview V1

- No FPP projections.
- No PE trade-shock outputs.
- No CGE reform impacts.
- No I-O sector shock values.
- No HFI composite score or traffic light.
- No Knowledge Hub claims.
- No public debt or international reserves in the first Overview figure set.
- No current-account headline card in the first Overview figure set; use exports, imports, and trade balance instead.
- No live scraping or arbitrary website fetch from the React app.
- No model calculation changes.

## Artifact Implications

The next code slice should prepare `/data/overview.json` around this locked set. The artifact should support:

- headline metrics, with a subset marked for top-card display;
- grouped panel series for growth, inflation, trade, monetary/FX, and gold;
- per-metric claim type;
- per-metric source period and source label;
- artifact exported timestamp;
- validation status;
- caveats and warnings;
- fallback metadata.

The next code slice should not add the production artifact yet. It should add the type, guard, adapter, fallback behavior, and Data Registry representation.

## Acceptance Gate For Next Implementation

The Overview artifact foundation is unblocked when:

- this metric list is accepted by the owner;
- unresolved source questions are tracked as `TO CONFIRM` in code comments, tests, or Data Registry copy only where needed;
- no new metrics are added during implementation without owner approval;
- missing `/data/overview.json` falls back to the current Overview without console errors;
- Data Registry can show Overview artifact status as planned/missing until a real artifact exists.

## Unresolved Source Questions

| Question | Owner | Blocks |
|---|---|---|
| Confirm official source URL or export file for annual and quarterly GDP. | Project owner / source owner | overview exporter |
| Confirm official CPI category source for food inflation. | Project owner / source owner | overview exporter |
| Confirm whether trade metrics should use monthly or quarterly release cadence for V1. | Project owner | overview artifact shape |
| Confirm whether trade balance is goods-only or goods-and-services. | Project owner / source owner | overview artifact labels |
| Confirm REER source and base-year definition. | Project owner / source owner | REER display |
| Confirm gold observed price source: World Bank Pink Sheet, LBMA, IMF, or another accepted public source. | Project owner | gold display |
| Confirm gold forecast source: World Bank Commodity Markets Outlook, IMF WEO, or another accepted external provider. | Project owner | gold forecast display |

## Next Allowed Action

Implement the Overview artifact foundation:

- type and guard for `/data/overview.json`;
- source adapter with static fallback;
- visible source-state label on Overview;
- Data Registry row for the planned/missing Overview artifact;
- tests for valid, invalid, and missing artifact behavior.

No crawler, scheduler, backend write path, or production artifact should be added in that slice.
