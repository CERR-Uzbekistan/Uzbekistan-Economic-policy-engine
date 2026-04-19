# 09 — Deployment Migration

**Status:** DRAFT
**Owner:** Nozimjon Ortiqov
**Deadline:** End of Week 1 (before TA-3 ships)

## 1. Preview URL

**Decision:** [TBD — provisioning by 2026-04-24]

Candidates:
- Vercel (recommended — zero config for Vite, password-protect via env)
- Netlify
- GitHub Pages on subpath `/preview/`

Preview URL will be password-protected until public rollout criterion is met.

## 2. Public rollout criterion

**Decision:** [TBD]

Candidates:
- (a) Feature parity with legacy site
- (b) Sprint 2 TA-1 through TA-7 complete
- (c) Stakeholder sign-off from [named person]
- (d) All three TB-P4 pilot users green-light

Current leaning: (b) + (d) combined.

## 3. Legacy site content freeze date

**Decision:** [TBD — propose 2026-05-31]

Past this date, no new reforms, data refreshes, or research briefs land on the legacy static site at `cerr-uzbekistan.github.io`. Everything new goes into `apps/policy-ui`.

## Sign-off

- [ ] Preview URL provisioned and accessible
- [ ] Rollout criterion committed
- [ ] Legacy freeze date committed
- [ ] All three owners identified

---
*Draft committed 2026-04-19. To be finalized with CERR leadership by end of Week 1.*
