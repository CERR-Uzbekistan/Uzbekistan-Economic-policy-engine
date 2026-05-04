# Overview Exporter

`overview_source_snapshot.json` is a non-public draft scaffold. Do not generate or commit
`apps/policy-ui/public/data/overview.json` from it until every metric has:

- owner-accepted value,
- exact `source_reference` or release URL,
- completed arithmetic checks.

Additional export gates:

- USD/UZS MoM and YoY must reconcile with the level and previous values.
- Trade balance unit must be resolved to either USD million or USD billion.

## Phase 1 CBU FX Automation

Phase 1 automation is intentionally limited to these metrics:

- `usd_uzs_level`
- `usd_uzs_mom_change`
- `usd_uzs_yoy_change`

It uses the official CBU JSON endpoint pattern:

```bash
https://cbu.uz/en/arkhiv-kursov-valyut/json/USD/<date>/
```

Dry run:

```bash
node scripts/overview/fetch-overview-sources.mjs --dry-run --family cbu-fx --snapshot scripts/overview/overview_source_snapshot.json
```

Write the source snapshot after reviewer inspection of the diff:

```bash
node scripts/overview/fetch-overview-sources.mjs --write-snapshot --family cbu-fx --snapshot scripts/overview/overview_source_snapshot.json
```

Optional deterministic test dates:

```bash
node scripts/overview/fetch-overview-sources.mjs --dry-run --family cbu-fx --snapshot scripts/overview/overview_source_snapshot.json --latest-date 2026-04-27 --prior-month-date 2026-03-27 --prior-year-date 2025-04-27
```

`--write-snapshot` may update only the source snapshot. It must not write
`apps/policy-ui/public/data/overview.json`. It also writes
`scripts/overview/overview_source_snapshot.diff_report.json` by default; use
`--diff-report <path>` to choose another report path.

When automation changes metric values or provenance, the snapshot is moved to
`automation_pending_owner_review`, `snapshot_accepted_by` and `snapshot_accepted_at`
are removed, and `value_hash` is recomputed. The owner must review the diff and later
accept the exact hash before any public export.

`value_hash` is the SHA-256 hash of the canonicalized metric values and source
provenance. If a snapshot says `owner_verified_for_public_artifact` but its stored
`value_hash` no longer matches the metrics, the exporter refuses to write public
`overview.json`.

Source fetching is manual-script only. The React app and build do not import or run
CBU/stat.uz/SIAT source fetch code, and public artifact generation remains behind the
existing owner-verified exporter gate.

## Phase 2 SIAT Trade Automation

Phase 2 automation is intentionally limited to these SIAT trade metrics:

- `exports_yoy`
- `imports_yoy`
- `trade_balance`

It uses official SIAT / Statistics Agency machine-readable SDMX JSON endpoints already
present in the source snapshot as seeds. The script validates that each payload is the
expected foreign-trade family, flow (`exports` or `imports`), USD million unit, monthly
cumulative-window series, and comparable current/prior-year window before applying any
value. If metadata or window validation fails, the script reports `manual_required`,
leaves metric values unchanged, and writes that reason to the diff report on write runs.

Dry run with fixtures:

```bash
node scripts/overview/fetch-overview-sources.mjs --dry-run --family siat-trade --snapshot scripts/overview/overview_source_snapshot.json --fixture-dir scripts/overview/test-fixtures/siat-trade
```

Write the source snapshot after reviewer inspection of the diff:

```bash
node scripts/overview/fetch-overview-sources.mjs --write-snapshot --family siat-trade --snapshot scripts/overview/overview_source_snapshot.json --fixture-dir scripts/overview/test-fixtures/siat-trade
```

Calculated values:

- `exports_yoy = round2((exports_current - exports_prior_year) / exports_prior_year * 100)`
- `imports_yoy = round2((imports_current - imports_prior_year) / imports_prior_year * 100)`
- `trade_balance = round2((exports_current - imports_current) / 1000)` when SIAT levels are USD million and the displayed balance is USD billion.

The automated SIAT update preserves the existing warning posture for trade metrics until
the lock cleanup is handled separately. Any changed trade value or provenance moves the
snapshot to `automation_pending_owner_review`, clears prior acceptance fields, recomputes
`value_hash`, and updates `overview_source_snapshot.diff_report.json`. It must never
write `apps/policy-ui/public/data/overview.json`.

## Phase 3b-1 SIAT CPI Automation

Phase 3b-1 automation is intentionally limited to one CPI metric:

- `cpi_mom`

`cpi_yoy` and `food_cpi_yoy` remain manual/pending. This slice must not update those
metrics.

It uses the official SIAT / Statistics Agency CPI endpoint:

```bash
https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_4585.json
```

Dry run with the saved Phase 3a fixture:

```bash
node scripts/overview/fetch-overview-sources.mjs --dry-run --family siat-cpi --snapshot scripts/overview/overview_source_snapshot.json --fixture-dir scripts/overview/source-discovery/phase3
```

Write the source snapshot after reviewer inspection of the diff:

```bash
node scripts/overview/fetch-overview-sources.mjs --write-snapshot --family siat-cpi --snapshot scripts/overview/overview_source_snapshot.json --fixture-dir scripts/overview/source-discovery/phase3
```

The SIAT 4585 parser is deliberately narrow:

- It selects only the headline aggregate row where `Code === "1"` and the classifier
  label matches `COMPOSITE INDEX` or its RU/UZ equivalents. COICOP/product rows are
  never used to compute headline CPI MoM.
- Monthly period columns must use Cyrillic `М` keys such as `2026-М03`. Latin `M`
  keys are ignored; if no Cyrillic-`М` periods exist, the script returns
  `manual_required`.
- A `0.0` value on the selected aggregate row for the current or previous month is
  treated as a missing-data sentinel and returns `manual_required`.
- SIAT 4585 metadata is a multilingual `{ name_*, value_* }` array. Value preference is
  `value_en`, `value_ru`, `value_uz`, then `value_uzc`.
- Representation as `index_pct_prior_month` is accepted only when Unit normalizes to
  Percent and the indicator name contains both an index token and a previous-month
  token. The calculation is `round2(index_value - 100)`.
- Indicator identity is required: metadata `Indicator identification number (code)`
  must equal `1.11.01.0026`.
- Current and previous aggregate raw index values must satisfy
  `abs(index_value - 100) <= 5` before subtracting 100.
- `observed_at` is derived from SIAT `Last modified date`, normalized to
  `YYYY-MM-DDT00:00:00Z`.
- `source_period` remains frontend-readable, for example `March 2026`; the SIAT key
  format is not emitted as the visible period.

This is a provenance migration for `cpi_mom`: the numeric March 2026 value may remain
`0.6`, but source fields move from the CPI PDF press release to SIAT JSON 4585. Because
source URL/reference, `extracted_at`, and caveats are hashed provenance fields, the
snapshot still moves to `automation_pending_owner_review` when the migration is written.
Public export remains blocked until the owner accepts the updated source snapshot hash.

## Phase 3b-2 SIAT Annual GDP Automation

Phase 3b-2 automation is intentionally limited to one annual GDP metric:

- `real_gdp_growth_annual_yoy`

Quarterly GDP (`real_gdp_growth_quarter_yoy`) and the GDP nowcast
(`gdp_nowcast_current_quarter`) remain manual/pending and are not updated by this
family. Future quarterly GDP automation should use a separate family, not the annual
GDP source.

It uses the official SIAT / Statistics Agency annual GDP endpoint:

```bash
https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_582.json
```

Dry run with the saved Phase 3a fixture:

```bash
node scripts/overview/fetch-overview-sources.mjs --dry-run --family siat-gdp-annual --snapshot scripts/overview/overview_source_snapshot.json --fixture-dir scripts/overview/test-fixtures/siat-gdp-annual
```

Write the source snapshot after reviewer inspection of the diff:

```bash
node scripts/overview/fetch-overview-sources.mjs --write-snapshot --family siat-gdp-annual --snapshot scripts/overview/overview_source_snapshot.json --fixture-dir scripts/overview/test-fixtures/siat-gdp-annual
```

The SIAT 582 parser is deliberately narrow:

- Indicator identity is required: metadata `Indicator identification number (code)`
  must have `value_en === "1.01.01.0009"`.
- It selects exactly one national aggregate row where `Code === "1700"` and the
  classifier label matches Republic of Uzbekistan in EN/RU/UZ/UZC. Sectoral,
  regional, and any non-`1700` rows are never used.
- Annual period columns must be plain four-digit year keys such as `2025`. Monthly
  and Cyrillic-month keys are ignored; if no year keys exist, the script returns
  `manual_required`.
- SIAT 582 reports prior-year=100 index values, not direct growth percentages. The
  unit must prove this representation using the multilingual SIAT unit string
  `as a percentage of the corresponding period of the previous year` or its RU/UZ/UZC
  equivalents. The Overview value is `round2(index_value - 100)`.
- Current and previous-year raw index values must be present in the same selected row,
  non-zero, finite, unambiguous decimal numbers, and within the sanity bound
  `50 <= value <= 150`.
- `previous_value` is required from the same SIAT endpoint. For source period `2025`,
  it uses the `2024` index value.
- If the latest SIAT year is older than the current snapshot year, automation returns
  `manual_required` instead of silently no-oping.
- `observed_at` is derived from SIAT `Last modified date`, normalized to
  `YYYY-MM-DDT00:00:00Z`.
- `source_reference` includes the SIAT 582 calculation and surfaces the SIAT
  methodology URL from metadata when available.
- `source_period` remains the human-readable annual label, for example `2025`.

This is a provenance migration for `real_gdp_growth_annual_yoy`: the numeric 2025
value may remain `7.7` and `previous_value` may remain `6.7`, but source fields move
from the Statistics Agency PDF release to SIAT JSON 582. Because source URL/reference,
`extracted_at`, caveats, and `observed_at` are hashed provenance fields, the snapshot
still moves to `automation_pending_owner_review` when the migration is written. Public
export remains blocked until the owner accepts the updated source snapshot hash.
