# DFM canonical export report

Generated: 2026-05-24T13:42:51.063Z

- Source workbook status: available_locally_untracked
- Source coverage status: not_ready_for_target_nowcast_refit
- Source refit status: completed_without_pdf_report
- Public export status: completed
- Validation status: completed
- Reconciliation status: matched_public_artifact

## Reconciliation

The local source refit reproduces the public bridge nowcast, so the public artifact is source-reconciled.

## Source coverage

Do not publish a DFM target-quarter nowcast from this source bundle until the missing GDP/monthly coverage is filled.

- Target quarter: 2026Q2
- Required monthly data through: 2026-04-01
- Previous-quarter GDP ready: false
- Monthly indicators ready: 0 / 35

| Field | Source refit | Public artifact | Difference |
|---|---:|---:|---:|
| GDP YoY | 7.0078 | 7.0078 | 0 |
| GDP QoQ | 1.4398 | 1.4398 | 0 |

## Notes

- The raw source workbook remains outside source control.
- When the source workbook is unavailable, CI can regenerate the bridge artifact but cannot prove source-refit reconciliation.
- Direct publication from the source refit still requires a reviewed source-output contract and model-owner sign-off.
