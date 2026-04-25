# 09 — Deployment Migration

**Status:** Sprint 3 TB-P1 update — GitHub Pages sidecar pilot selected
**Owner:** Nozimjon Ortiqov
**Implementation slice:** Sprint 3 TB-P1 pilot deployment migration

This document originally converted three deployment decisions from open
questions into concrete recommendations. Sprint 3 TB-P1 replaces the
preview-hosting recommendation with the implementable pilot path now used
by the repository: the React rebuild is published as a GitHub Pages sidecar
under `/policy-ui/`, while the legacy root remains frozen and available.

The read-before-write audit for the TB-P1 migration is recorded in
[sprint3-tb-p1-pilot-deployment-audit.md](../alignment/sprint3-tb-p1-pilot-deployment-audit.md).

---

## 1. Pilot URL

**Sprint 3 TB-P1 decision:** Use GitHub Pages as the pilot deployment path.
Keep the legacy site at the repository Pages root and publish the React
rebuild under `/policy-ui/`.

Pilot entry URL pattern:

```text
https://<org>.github.io/Uzbekistan-Economic-policy-engine/policy-ui/#/overview
```

The exact host depends on the repository Pages domain. Within the deployed
artifact, React routes are hash routes (`#/overview`, `#/scenario-lab`,
`#/comparison`, `#/model-explorer`, `#/knowledge-hub`) so static hosting
does not require a server-side rewrite rule.

### Why GitHub Pages sidecar for TB-P1

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **GitHub Pages sidecar at `/policy-ui/`** | Already wired in `.github/workflows/pages.yml`; no new vendor or secrets; preserves root legacy URLs; enough for named Sprint 3 pilot access. | Not password protected; public once deployed to Pages. | **Chosen for TB-P1.** |
| Vercel | Zero-config for Vite; can provide password-protected previews and per-PR URLs. | Requires Vercel org/vendor setup, access-control decisions, and repo integration outside this branch. | Deferred option, not required for TB-P1. |
| Replace Pages root with React | Makes React the top-level site immediately. | Would replace the existing legacy public surface and break the "legacy frozen unless explicitly replaced" constraint. | Rejected for TB-P1. |

### Workflow shape

The Pages workflow:

1. Runs on `epic/replatform-execution` and `main`, plus manual dispatch.
2. Installs, lints, tests, and builds `apps/policy-ui`.
3. Builds React with `POLICY_UI_BASE=/Uzbekistan-Economic-policy-engine/policy-ui/`.
4. Copies the existing repository-root legacy surface into `_site`.
5. Copies `apps/policy-ui/dist/` into `_site/policy-ui/`.
6. Validates `_site/index.html`, `_site/policy-ui/index.html`,
   `_site/policy-ui/404.html`, and `_site/policy-ui/assets` before upload.

This makes the React rebuild the Sprint 3 pilot deployment without deleting
or redirecting the legacy site.

### DFM freshness and default-branch activation

TB-P1 does not by itself mean scheduled DFM freshness is active for users.
The honest sequence remains:

1. On `epic/replatform-execution`, data regeneration is available by manual
   `workflow_dispatch`.
2. The React pilot deployment path lands on `main` through the normal
   promotion path.
3. Only after the workflow exists on the default branch should scheduled
   DFM regeneration be described as active for the user-facing pilot data.

Do not describe default-branch cron freshness as complete while the
deployment path lives only on the epic branch.

## 1a. Deferred Preview-Protection Option

The earlier Vercel recommendation remains a reversible option if CERR needs
password protection or per-PR preview URLs before public rollout. It is not
the Sprint 3 TB-P1 implementation path.

<!-- Historical recommendation retained for context. -->

**Prior recommendation:** Provision Vercel, scoped to the `apps/policy-ui`
build, with password protection via environment variable. Keep the existing
GitHub Pages pipeline (`.github/workflows/pages.yml`) running in parallel as
the public-facing surface for the legacy site until Decision 3 fires.

### Why Vercel over the alternatives

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Vercel** | Zero-config for Vite; `VERCEL_PASSWORD_PROTECTION` covers our gating need; free Hobby tier is ample for CERR pre-launch traffic; every PR gets an isolated preview URL automatically, which shortens review cycles. | New vendor in the stack; requires a Vercel org. | **Chosen.** |
| Netlify | Comparable DX and per-PR previews. | Password protection is a paid-tier feature (Netlify Pro, ~$19/user/mo). | Rejected on cost gating. |
| GitHub Pages on `/preview/` subpath | Already wired; no new vendor. | No native password protection — would need a custom auth proxy or client-side gate (both are brittle); preview URL would be indistinguishable from the production path, increasing the risk of premature exposure. | Rejected on the access-control gap. |

### Provisioning steps (≈4 hours)

1. Create a Vercel org `cerr-uzbekistan` and invite the CERR tech lead as a
   co-owner (prevents single-person lock-in).
2. Import the repo; set **Root Directory** to `apps/policy-ui`,
   **Framework Preset** to Vite. Vite's `base` is already wired to
   `process.env.POLICY_UI_BASE ?? '/'` (see [vite.config.ts](apps/policy-ui/vite.config.ts:6)),
   so the Vercel build needs no base override — it serves from the host root.
3. Set production branch to `epic/frontend-replatform` (not `main`). Every
   PR targeting the epic then gets its own `*-policy-ui.vercel.app` preview.
4. Enable **Deployment Protection → Password** at the project level. Store
   the password in 1Password under `CERR / Policy UI preview`. Rotate on
   public rollout (Decision 2).
5. Bind the custom domain `preview.cerr-uzbekistan.org` (if DNS is
   available) — otherwise publish the Vercel-generated URL.
6. Add a status badge and the password-retrieval link to
   [08_release_readiness.md](docs/frontend-replatform/08_release_readiness.md)
   so reviewers can find it without asking.

### Password-protection behaviour

Vercel's password gate is a server-side interstitial — no asset loads until
the password is submitted. This matters because it means unreleased
analytical content (reform write-ups, AI-generated narratives under the
governance draft) cannot be scraped or indexed during the pre-launch window.
The cookie persists for 24 hours per browser, which is compatible with
CERR-staff-only review.

### Reversibility

Switching away from Vercel later is cheap: the build output is a static
`dist/` folder, so any static host works. The only Vercel-specific item is
the password gate; replacing it would mean a one-week lead time to stand up
an alternative (e.g. Cloudflare Access).

---

## 2. Public rollout criterion

**Recommendation:** All three of the following must be true before the
preview URL flips to the primary public surface. Partial satisfaction does
not qualify — this is an AND, not an OR.

1. **Scope-complete:** TA-1 through TA-7 are merged to
   `epic/frontend-replatform`, with each task's acceptance checklist in
   [10_execution_plan.md](docs/frontend-replatform/10_execution_plan.md)
   ticked and its PR closed.
2. **Pilot green-light:** All three TB-P4 pilot users (analytical lead,
   research lead, comms lead) have given an explicit written
   green-light — either in GitHub PR review or in the shared rollout tracker.
   "Silent acceptance" does not count; we want a sentence of endorsement
   each so dissent has a clear surface.
3. **Dress-rehearsal:** At least one CERR analyst has completed a real
   analytical task end-to-end on the preview build (not a scripted demo) —
   typically a scenario comparison or a policy-tracker update — and has
   reported no blocking issues in the rollout tracker.

### Why a composite rather than a single gate

A scope-only gate (`TA-1…TA-7 done`) ships code that nobody has touched in
anger. A pilot-only gate ships code the pilot likes but hasn't been
stress-tested on a new task. A rehearsal-only gate ships a single analyst's
workflow. The composite closes all three gaps and is cheap — each criterion
costs less than a day.

### Non-criteria (explicitly excluded)

- **Feature parity with the legacy site.** Parity is unachievable by
  design — the replatform is *replacing* features the legacy site does
  poorly, not duplicating them. Using parity as a gate would block rollout
  on work we have consciously deprioritised.
- **Named single-person sign-off.** Single-person gates create bus-factor
  risk and undercut the pilot process. The three pilot leads are the
  sign-off quorum.

### If a criterion slips

- If scope (criterion 1) slips: rollout slips. No workaround.
- If a pilot (criterion 2) withholds green-light: the blocking concern is
  logged as a P0 issue; rollout waits until resolved or explicitly waived
  by the other two pilots plus the epic owner.
- If the rehearsal (criterion 3) uncovers a workflow bug: hotfix and
  re-run. One re-run is expected and budgeted.

---

## 3. Legacy site content freeze date

**Recommendation:** **2026-05-31** is the last day new content ships to the
legacy site (`cerr-uzbekistan.github.io`, backed by the top-level
[index.html](index.html) and its model folders).

### What "content freeze" means operationally

This is not a code freeze on the legacy site — the legacy site continues to
render and serve its existing content past 2026-05-31. What stops is
*inbound* content flow:

| Change type | Before 2026-05-31 | After 2026-05-31 |
|---|---|---|
| New reform write-up | Add to legacy + `apps/policy-ui` (dual-write window) | `apps/policy-ui` only |
| Data refresh (GDP, inflation, etc.) | Update legacy `*_data.js` / `_data.json` and the replatform data contract | Replatform data contract only |
| Research brief / analytical narrative | Either surface | `apps/policy-ui` only |
| Bug fix to legacy model HTML | Allowed | Allowed only if the bug also affects the replatform port; otherwise deferred |
| i18n string correction on legacy | Allowed | Not a supported workflow — file it against the replatform string table |

The dual-write window (Decision 1 provisioning → 2026-05-31) exists so the
content team never has to choose between the two surfaces during a
transition. After the freeze, the replatform is the single source of truth
for new content, and the legacy site becomes an archive.

### Why 2026-05-31

- Gives the content team ~5 weeks from this document's finalisation to
  absorb the new workflow (announcement + 2-week runway + 3 weeks of
  dual-write practice).
- Lands before the June analytical cycle, so the first post-freeze month's
  work is clean rather than mid-migration.
- Puts the freeze *before* the likely public-rollout date (criterion
  satisfaction expected early-to-mid June), which means pilots review the
  replatform with content that is already flowing through its pipeline —
  not a stale snapshot.

### What legacy stays good for

- Existing reform catalogue and model pages, referenced from academic
  outputs and prior publications — these URLs must not break.
- A "last known good" reference during the first month post-rollout, in
  case the replatform has a regression.

After six months of stable replatform operation, a separate decision (out
of scope here) will address whether to sunset the legacy URL or keep it
indefinitely as an archive.

---

## 4. Operational communication

Decisions 2 and 3 have direct workflow impact on people outside the
replatform team. They need to hear about the freeze date, the dual-write
window, and the new content pathway **at least two weeks before 2026-05-31**,
i.e. by **2026-05-17**, so they have runway to adjust.

### Who needs to know (by role)

- **Content team (analytical writers, reform catalogue maintainers).**
  They execute the dual-write and the post-freeze cutover.
- **Data pipeline owners (R/Python modellers who generate `*_data.js` and
  `*_data.json`).** They need to point outputs at the replatform's data
  contract rather than the legacy folders.
- **Research and analytical leads.** They are the TB-P4 pilots *and* the
  people whose briefs ship through the new surface.
- **Comms / external-facing staff.** They need to know which URL is
  public-facing when, so they don't publish a link to a password-gated
  preview.
- **CERR leadership.** They commit to the freeze date; they also need to
  know if the public rollout criterion slips past the freeze (which would
  leave a gap where the legacy site is frozen but the replatform is not
  yet the public surface — undesirable but survivable).

### When they need to know

- **By 2026-05-03** (two weeks before the announcement itself, four weeks
  before freeze): heads-up to content team and data pipeline owners so
  they can raise objections or flag blockers while there is still time to
  adjust the date.
- **By 2026-05-17** (two weeks before freeze): formal announcement to all
  five roles above, including written instructions and the replatform
  content pathway.
- **On 2026-05-31:** freeze-day reminder with the new pathway pinned at
  the top of whatever channel the content team lives in.

### Announcement template (1 paragraph)

> Subject: CERR Policy Engine — legacy site content freeze on 2026-05-31
>
> Starting 2026-05-31, new reforms, data refreshes, and research briefs
> will ship to the new React-based policy engine at
> `apps/policy-ui` rather than to the legacy `cerr-uzbekistan.github.io`
> site. The legacy site will continue to serve its existing content, but
> no new material will be added to it after that date. Between now and
> 2026-05-31, please dual-write: add new content to both surfaces so the
> cutover is seamless. A one-page guide to the new content pathway is
> pinned in `docs/frontend-replatform/`; if your workflow is not covered,
> raise it with Nozimjon Ortiqov before 2026-05-17 so we can patch the
> guide rather than discover the gap on freeze day.

---

## 5. Sign-off

Each checkbox below is a single decision with a named owner and a target
date. A decision is considered committed once the owner ticks the box in
the merged version of this document.

- [ ] **Decision 1 — Preview URL on Vercel, password-gated.**
      Owner: Nozimjon Ortiqov. Target: **TBD — deferred pending Sprint 3+ headcount and pilot assignment (per 2026-04-22 project status)**.
- [ ] **Decision 2 — Composite rollout criterion (scope + pilot + rehearsal).**
      Owner: CERR epic sponsor (analytical lead).
      Target commitment date: **TBD — deferred pending Sprint 3+ headcount and pilot assignment (per 2026-04-22 project status)**.
- [ ] **Decision 3 — Legacy content freeze 2026-05-31, announcement by 2026-05-17.**
      Owner: CERR content lead (in consultation with Nozimjon Ortiqov).
      Target commitment date: **TBD — deferred pending Sprint 3+ headcount and pilot assignment (per 2026-04-22 project status)**.

---
*Draft v1 committed 2026-04-19. v2 expanded with recommendations and
communication plan 2026-04-20. To be finalised with CERR leadership by
end of Week 1.*
