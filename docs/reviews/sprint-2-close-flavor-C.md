# Sprint 2 Close Strategic Review - Flavor C

Roadmap and priority review for Sprint 3 entry.

Inputs read: the Flavor C prompt in `docs/reviews/sprint-2-close-strategic-prompts.md`, all five conversation-history files under `docs/sessions/`, PR #89's Known carve-outs section, `docs/alignment/01_shot1_prompt.md` section 0 and relevant out-of-scope notes, and the committed Flavor A/B outputs plus adjudications. Per prompt, this pass did not read code.

## 1. Backlog Completeness Check

The written Flavor C backlog is directionally complete, but it undercounts Sprint 3 capacity pressure unless the Flavor B adjudication is treated as first-class input. Sprint 3 does not start from a blank roadmap queue. It starts with a technical foundation package already committed by the supervisor: Model Explorer source-pipeline wiring, env typing, sentinel inventory, DFM PR 4, bridge-backed Comparison row-fill tests, Scenario Lab metadata retirement, duplicate-key locale guard, bridge helper within the first new bridge slice, Scenario Lab saved-run restore integration test, accessibility sweep, and a testing philosophy doc. That package consumes roughly 28-45 hours before ordinary backlog prioritization. These are not backlog candidates to rank; they are pre-committed Sprint 3 work.

The Shot 2 editorial backlog is correctly captured: eight Overview KPI contextual footnotes per locale, five Model Explorer validation summaries, full equation sets for DFM/PE/IO/CGE/FPP, Comparison trade-off Shell A and Shell C, RU/UZ translations of Shell B, and RU/UZ Knowledge Hub reform titles and brief summaries. The missing operational point is that this needs an inventory gate before writing begins. The sentinel inventory test promoted in Flavor B should become the content burn-down source of truth. Without it, CERR/@nozim will fill visible gaps opportunistically and miss hidden strings.

The live wiring backlog is also correctly captured: Comparison `+ Add saved scenario`, live-mode Scenario Lab impulse-response chart, real `unemployment_avg` and `real_wages_cumulative`, and Knowledge Hub source-mode parametrization. The important correction is sequencing. The Comparison modal is mostly a workflow affordance and can be prioritized independently. The impulse-response chart and missing metrics depend on bridge-output coverage. Knowledge Hub source mode depends on a product freshness decision, not architecture. If Knowledge Hub is editorially curated weekly, mock/static mode is acceptable indefinitely. If CERR expects daily reform freshness, it becomes live-source work.

Deferred slices are correctly named: DFM PR 4, TA-9 AI surface treatment, and PE/IO/CGE/FPP bridges. The nuance is that DFM PR 4 is not just "a workflow." It interacts with default-branch cron activation and TB-P1 deployment migration. A workflow that exists only off the default branch does not solve freshness for users.

Additional backlog items visible in histories but not central in the Flavor C prompt:

- TA-6c schema drift detection, load-handler reset coverage, status-color-token cleanup, bundle monitoring, Node 24 action pin cleanup, and several small hardening/test follow-ups.
- Full AI Advisor review workflow is separate from TA-9 surface treatment. TA-9 should consume TB-P3 governance fields and improve visible trust surfaces; it should not silently become a full review-queue product.
- Model Explorer parallel-type consolidation should wait until the source pipeline is wired and at least one additional bridge lands. It is not a Week 1 task.
- The deployment migration and pilot-user decisions remain open strategic blockers, not implementation chores.

Net: the backlog is complete enough to plan, but Sprint 3 must be planned as consolidation plus one or two high-leverage product expansions, not as a broad feature sprint.

## 2. Dependency Analysis

The central dependency chain is:

```text
Flavor B foundation package
  -> reliable live/mock data modes
  -> credible bridge consumption
  -> visible editorial/content fill
  -> pilot/demo readiness
```

More concretely:

```text
Sentinel inventory test
  -> Shot 2 editorial burn-down
  -> RU/UZ translation pass
  -> pilot-facing content confidence

Model Explorer source pipeline
  -> additional bridge content can reach Model Explorer
  -> Model Explorer parallel types can later retire
  -> Model Explorer becomes safe for PE/IO/CGE/FPP work

DFM PR 4 nightly regen
  -> DFM freshness is automated
  -> Overview can trust DFM live data
  -> deployment/default-branch cron question becomes unavoidable

Env typing + data-mode defaults
  -> fewer silent mock/live divergences
  -> safer Knowledge Hub source-mode decision
  -> deployment migration becomes less brittle

Bridge helper in first new bridge slice
  -> IO/PE/CGE/FPP bridge repetition drops
  -> bridge-backed Comparison tests become reusable

IO/PE/CGE/FPP bridges
  -> real Comparison rows beyond QPM/DFM
  -> live Scenario Lab chart extensions
  -> real unemployment/wage metrics where model output supports them

TB-P1 deployment decision
  -> default-branch workflows and user-facing React surface align
  -> DFM cron activation becomes operationally meaningful

TB-P4 named pilot users
  -> accessibility sweep and content order have real evaluator targets
  -> 8-week/12-week scope can be validated against actual use
```

The bridge order should be based on UI unlock, not model taxonomy. DFM PR 4 should finish first because DFM is already partially bridged and freshness is a credibility issue. After that, IO is the best first new bridge if the goal is visible cross-model richness: it is likely to improve Model Explorer, Comparison, and Knowledge Hub narratives. PE is important for WTO/trade-policy specificity, but it is narrower. CGE and FPP are important for the fiscal/labor/current-account rows that are currently weakest, but they should not jump ahead unless the Sprint 3 demo target centers on those outcomes.

Shot 2 editorial work can run in parallel with technical foundation, but only after the sentinel inventory exists. English/source editorial content should precede RU/UZ translation. Translating placeholder or unstable English copy creates churn.

TA-9 can run after the first foundation package lands. It depends more on governance-contract confidence and UI trust-surface clarity than on new bridges. It should remain a full-path slice because it affects AI/provenance language across demo surfaces.

Knowledge Hub live mode should not be scheduled until the source-mode product question is answered. If freshness is not required, keeping it curated is the lower-risk product choice.

## 3. Timeline-Scoped Priority Orderings

All timelines below assume the pre-committed Flavor B technical package is scheduled first and classified by tier:

- Full path: Model Explorer source pipeline, DFM PR 4, Scenario Lab legacy metadata retirement, bridge helper when included in first new bridge slice.
- Lightweight path: env typing, sentinel inventory test, duplicate-key guard, bridge-backed row-fill tests, saved-run restore integration test, accessibility sweep, testing philosophy doc.

Lightweight items should save 20-40 percent process overhead. Full-path items retain audit/PR/review discipline because they touch data integrity, contracts, demo surfaces, or multi-page behavior.

### 4-week ordering: demo-stabilization sprint

End state: the five-page React surface is coherent, DFM/QPM freshness is credible, visible SME sentinels have a managed content burn-down, TA-9 trust surfaces are improved, and one new bridge is either started or narrowly completed if capacity allows. This is the safest plan if there is a near-term presidential or senior-stakeholder demo.

1. Model Explorer source pipeline - Full. Must-do-first. No Model Explorer content work proceeds before this.
2. Env typing/data-mode defaults - Lightweight. Do immediately with source pipeline or directly after.
3. Sentinel inventory test - Lightweight. Establishes Shot 2 content ledger.
4. DFM PR 4 nightly regen - Full. Complete workflow and explicitly decide activation/default-branch path.
5. Duplicate-key locale guard - Lightweight. Cheap protection before RU/UZ content expands.
6. Shot 2 minimum editorial packet - Lightweight if content-only PRs; full path only if contract/UI shape changes. Prioritize the eight KPI notes, five validation summaries, Shell A/C English, and equation completeness for DFM/IO/PE first.
7. TA-9 AI surface treatment - Full. Keep to visible governance fields and trust labels; do not expand into full AI Advisor workflow.
8. Accessibility sweep - Lightweight. Run after Shot 1 surfaces and TA-9 changes are visible.
9. IO bridge PR 1 or bridge-helper-with-IO start - Full. Only schedule if the above clears early.

Out of scope for 4 weeks: all remaining bridges, Model Explorer type consolidation, full live Scenario Lab impulse-response wiring, real unemployment/wage rows, full deployment migration unless an external demo requires it, and named pilot onboarding beyond opportunistic review.

Risk: the 4-week plan can look conservative. That is acceptable. The Sprint 2 close left a strong surface but also a backlog of credibility gaps. A rushed bridge binge would create more silent source-path issues.

### 8-week ordering: pilot-readiness plan

End state: the React rebuild is ready for named pilot users, QPM/DFM are operationally credible, IO is live or nearly live, core editorial placeholders are mostly replaced, and deployment/pilot decisions are no longer deferred.

1. Complete all 4-week foundation items.
2. Complete IO bridge - Full. Include bridge helper in the first IO PR and apply the page-adapter boundary decision from Flavor B adjudication.
3. Bridge-backed Comparison row-fill tests - Lightweight. Add as IO begins populating rows, not months later.
4. Complete Shot 2 editorial packet - Lightweight/full by PR type. Finish all five validation summaries, all full equation sets, Shell A/B/C coverage, and RU/UZ translations for visible strings.
5. Comparison `+ Add saved scenario` modal - Full. User workflow and persisted scenario semantics make this more than a copy fix.
6. Scenario Lab saved-run restore integration test - Lightweight. Protect the workflow before pilots try saved scenarios.
7. Retire Scenario Lab legacy metadata after migration tests - Full. Do after integration coverage exists.
8. TA-9 AI surface treatment if not already done - Full.
9. TB-P1 deployment migration decision and first implementation step - Full. For pilot use, the React rebuild needs a stable public home distinct from the frozen legacy surface.
10. TB-P4 named pilot users - Decision, not code. Identify 2-3 named evaluators and assign what each should test.
11. PE bridge kickoff or completion - Full, depending on trade/WTO priority and IO duration.

Out of scope for 8 weeks: all five remaining bridges if IO/PE take the expected two weeks each, full AI Advisor review queue, REST/backend migration, collaboration features, and Knowledge Hub live mode unless the freshness decision says daily updates are required.

Risk: pilot-readiness depends less on raw feature count than on decision latency. If TB-P1 and TB-P4 remain open at Week 4, the 8-week plan loses its evaluator loop and becomes another internal demo cycle.

### 12-week ordering: integrated pilot platform

End state: the React rebuild is the primary pilot surface, all six model families have a bridge path or explicit documented limitation, editorial placeholders are mostly gone, pilots are active, and remaining debt is about consolidation rather than basic wiring.

1. Complete the 8-week plan.
2. Finish PE bridge - Full, if not complete.
3. Complete CGE bridge - Full. Prioritize if unemployment/real-wage or fiscal/labor rows are pilot-critical.
4. Complete FPP bridge - Full. Prioritize current-account/fiscal consistency and cross-model reconciliation.
5. Populate real `unemployment_avg` and `real_wages_cumulative` where supported - Full. Tie to bridge output, not mock padding.
6. Live-mode Scenario Lab impulse-response chart - Full. Only after the relevant model output supports it.
7. Model Explorer parallel-type consolidation - Full or lightweight depending on blast radius, but schedule only after at least one post-DFM bridge validates the new pipeline.
8. Knowledge Hub source mode - Full only if freshness requires live source; otherwise document curated/static mode as product choice.
9. Testing philosophy doc - Lightweight. Can happen earlier, but by 12 weeks it should be written to prevent contributor drift.
10. Full pilot feedback loop - Process/product work. Collect structured findings from named users and convert them into Sprint 4 backlog.

Out of scope for 12 weeks unless pilot feedback demands it: full AI Advisor review workflow, auto-curation without human gate, backend/API/SDK migration, multi-user collaboration, and broad component-test expansion.

Risk: the 12-week plan is bridge-heavy. It works only if the bridge helper and page-adapter boundary reduce repetition after IO. If IO takes longer than precedent, CGE/FPP should slip rather than forcing partial live paths across all models.

## 4. Strategic Decisions Needing Adjudication Before Sprint 3

TB-P1 deployment migration. The project has a frozen legacy deployment and a React rebuild that is becoming the real product surface. Sprint 3 cannot leave this ambiguous if DFM cron activation or pilot users matter. Recommendation: decide by the end of Week 2 whether React becomes the primary pilot deployment in Sprint 3. If a 4-week external demo is scheduled, decide in Week 1.

TB-P4 named pilot users. Informal review has been useful, but Sprint 3 needs named evaluators if the goal is pilot readiness. Recommendation: choose 2-3 named users by Week 4 at the latest, with one focused on policy narrative, one on model credibility, and one on operational usability.

DFM nightly cron activation. DFM PR 4 is not complete until the workflow can actually run in the deployment/default-branch arrangement. Recommendation: complete the workflow early, then explicitly choose default-branch activation, manual dispatch as interim, or documented deferment. Do not let "workflow exists on epic" count as done.

Knowledge Hub source-mode freshness. This is a product decision: does Knowledge Hub content need daily/live freshness, or is weekly/curated editorial content the correct operating model? If daily freshness is required, schedule live source mode and guard tests. If not, keep the curated static model and spend the capacity on content quality.

## 5. Risks

The largest risk is capacity overcommitment. Flavor B already commits 28-45 hours, and several items are full-path. Mitigation: treat the 4-week plan as stabilization plus one new expansion, not a feature sweep.

The second risk is SME content drag. Shot 2 can block visible credibility even if engineering succeeds. Mitigation: sentinel inventory first, then small content PRs with a clear burn-down list.

The third risk is bridge optimism. QPM/DFM precedent helps, but PE/IO/CGE/FPP may reveal different data-shape and page-adapter needs. Mitigation: start with IO, land helper inside that slice, and slip later bridges rather than weakening source boundaries.

The fourth risk is decision latency. TB-P1, TB-P4, DFM cron activation, and Knowledge Hub freshness are all owner decisions. None should be allowed to masquerade as engineering backlog.

The fifth risk is process regression. Sprint 2's discipline worked, but applying full process to every lightweight item would crowd out useful work. Mitigation: classify every Sprint 3 item at kickoff and actually use the lightweight path where the blast radius is low.
