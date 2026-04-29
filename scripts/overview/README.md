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
