# AI Governance

**Status:** DRAFT
**Owner:** Nozimjon Ortiqov + analytical lead TBD
**Deadline:** This week (before TA-5 begins)

This document defines how AI-assisted output flows through the Uzbekistan Economic Policy Engine. It governs the `NarrativeBlock.generation_mode` type in the React app: `template` vs `assisted` vs reviewed.

## The six questions

### 1. Who reviews AI-assisted drafts first?

**Decision:** [TBD]

Candidates:
- Analytical lead assigned per model
- Rotating pool of senior analysts
- Model owner for each model

### 2. Where does the draft live before review?

**Decision:** [TBD]

Candidates:
- Dedicated `draft_queue` state in the app with a "Pending review" UI surface
- Shared Notion page
- Slack channel

### 3. What does the reviewer see?

**Decision:** [TBD]

Candidates:
- Raw AI output only
- Diff against template baseline
- Both side-by-side

### 4. What does "approve" mean operationally?

**Decision:** [TBD]

Candidates:
- Flips `generation_mode` from `assisted` back to `template` once reviewed, stripping AI attribution
- Keeps `assisted` tag but unlocks export with reviewer stamp
- Creates a new `reviewed` generation mode distinct from both

### 5. What does the audit log retain?

**Decision:** [TBD]

Candidates to include:
- Original AI output (full text)
- Reviewer edits (diff)
- Review timestamp
- Reviewer name
- Original and final `generation_mode` values

### 6. What disclaimer shows to end users?

**Decision:** [TBD]

Proposed wording for `generation_mode === assisted` (pre-review):
> AI-assisted draft. Not yet reviewed by CERR. Do not cite externally.

Proposed wording for reviewed AI-assisted content:
> AI-assisted, reviewed by [NAME] on [DATE].

Translations: EN wording to be drafted first; RU and UZ follow via TA-1a translation pipeline.

## Sign-off

This doc cannot be considered final until signed by:

- [ ] Product lead
- [ ] Analytical lead (not engineering alone)

## Hard gate

**No UI work on `NarrativeBlock.generation_mode === assisted` ships until this doc is signed.** TA-5 Interpretation panel renders `template` only until governance is adopted. TA-9 is blocked entirely on adoption of this doc.

---
*Draft committed 2026-04-19. To be finalized with analytical lead this week.*
