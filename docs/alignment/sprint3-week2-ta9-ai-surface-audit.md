# Sprint 3 Week 2 TA-9 AI Surface Audit

**Date:** 2026-04-24
**Branch:** `codex/sprint3-week2-content-trust-redo`
**Base:** `epic/replatform-execution`
**Scope:** Bounded AI display/trust-surface treatment only.

## Governance Gate

`docs/ai-governance.md` is adopted and signed by Nozimjon Ortiqov as project owner, product owner, and interim analytical owner. The hard gate is closed for Sprint 3 Week 2. The same document keeps the full draft queue, reviewer collaboration workflow, export pipeline, and citation pipeline out of scope.

## Files Audited

| Area | Files | Finding |
|---|---|---|
| Contract | `apps/policy-ui/src/contracts/data-contract.ts` | `NarrativeGenerationMode` already supports `template`, `assisted`, and `reviewed`. `NarrativeBlock` and `ScenarioLabInterpretation.metadata` already carry reviewer fields as optional metadata. No contract change is needed. |
| Scenario Lab rendering | `apps/policy-ui/src/components/scenario-lab/InterpretationPanel.tsx` | Current renderer always shows the AI attribution aside, including template mode. This conflicts with governance: template-generated narrative should remain visually unframed by AI disclaimers. |
| Scenario Lab source/mock | `apps/policy-ui/src/data/mock/scenario-lab.ts`; `apps/policy-ui/src/data/scenario-lab/source.ts` | Mock and source paths emit template-mode interpretation metadata. No assisted/reviewed generation source exists in Week 2 scope. |
| Saved-run compatibility | `apps/policy-ui/src/state/scenarioStore.ts`; `apps/policy-ui/src/pages/ScenarioLabPage.tsx` | Saved runs persist `run_interpretation` as the existing interpretation shape. Display changes can read existing `metadata` or legacy top-level fields without migration. |
| Overview trust surface | `apps/policy-ui/src/components/overview/EconomicStateHeader.tsx`; `apps/policy-ui/src/data/mock/overview.ts` | Overview has its own provenance line with AI-assisted and reviewer labels. It is not a `NarrativeBlock` path and already keeps provenance visible. No TA-9 contract expansion is needed. |
| Tests | `apps/policy-ui/tests/components/scenario-lab/interpretation-panel.test.tsx` | Tests currently assert template mode still renders an AI disclaimer. They must be updated to the adopted governance behavior and add assisted/reviewed label coverage. |
| Locales | `apps/policy-ui/src/locales/en/common.json` | English already contains nested assisted/reviewed governance wording. RU/UZ should remain untouched per Week 2 scope. |

## Commitments

| Audit commitment | Planned PR delivery | Status |
|---|---|---|
| Do not change `NarrativeGenerationMode` or saved-run shapes. | Render-only update in `InterpretationPanel.tsx`; contracts and store shapes unchanged. | Delivered |
| Template mode must not show an AI disclaimer. | Template mode returns no AI attribution aside. | Delivered |
| Assisted mode must show the adopted unreviewed warning. | Assisted mode uses existing EN `aiAttribution.assisted` title/body keys. | Delivered |
| Reviewed mode must name reviewer and review date when both are present. | Reviewed mode uses existing EN `aiAttribution.reviewed` title/body keys with metadata interpolation. | Delivered |
| Incomplete reviewed metadata must not overclaim review clearance. | Reviewed mode falls back to assisted warning when reviewer name or review timestamp is missing. | Delivered |
| Do not build draft queue/reviewer/export/citation workflow. | No new routes, stores, queue UI, export code, or citation code added. | Delivered |

## STOP Conditions Checked

- Governance sign-off is complete.
- No contract migration is required.
- No saved-run migration is required.
- No export or citation path exists that must be guarded in this slice.
- No full AI Advisor workflow is needed to implement the visible treatment.
