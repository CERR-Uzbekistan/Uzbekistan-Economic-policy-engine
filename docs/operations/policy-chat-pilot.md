# Policy Chat internal analyst pilot

## Release boundary

This is an internal authenticated pilot for QPM, read-only DFM, and static 2022
input-output scenarios. It is not an official forecast channel and must not be
used for public publication or autonomous policy decisions.

## Entry gate

The operations owner records the staging URL, deployment revision, database
backup location, OIDC application owner, proxy owner, model owners, incident
contact, and approved retention period before inviting analysts. `/ready` must
report durable storage, the container CI job must pass, and the authenticated
smoke check must succeed.

Run the private-service smoke check from an authorized operator host:

```bash
export POLICY_CHAT_PROXY_SECRET='<secret-manager-value>'
python scripts/policy-chat/smoke.py \
  --base-url https://policy-chat.service.internal \
  --user policy-chat-smoke@example.internal \
  --execute-qpm
```

Do not place the proxy secret on the command line or in a committed file.

## Cohort and session

Invite 5–10 analysts representing macro, nowcasting, and sector analysis. Use a
60-minute moderated session followed by five working days of bounded access.
Every participant receives the scope statement and confirms that model output
is scenario evidence rather than an official forecast.

Each participant completes:

1. a QPM policy-rate shock with an explicit magnitude and horizon;
2. a QPM proposal with an omitted magnitude and identification of the displayed default;
3. retrieval of the approved DFM nowcast and uncertainty interval;
4. an I-O investment shock and identification of its base year/static limitation;
5. an edit to an assumption followed by confirmation of the new proposal hash;
6. an unsupported or out-of-scope request and verification that it is declined;
7. a saved Scenario Lab handoff and provenance review.

## Evidence to collect

Collect only operational metadata unless governance owners approve more:

- success/failure by model and operation;
- proposal-to-confirmation time and execution latency;
- default assumptions noticed before confirmation;
- stale-hash, validation, authentication, and rate-limit outcomes;
- save/handoff success;
- user-reported clarity, confidence, and terminology issues;
- run IDs and timestamps needed for investigation.

Do not copy prompt or result bodies into general telemetry, tickets, or chat.
Reference the run ID and use the restricted audit store when investigation is
authorized.

## Stop conditions

Disable `POLICY_CHAT_ENABLED`, or remove an affected model from
`POLICY_CHAT_ENABLED_MODELS`, if any of the following occurs:

- execution without a current explicit confirmation;
- cross-user proposal or run access;
- missing or misleading model attribution, units, assumptions, or caveats;
- a model result that does not reconcile with its direct engine API;
- prompt/result leakage into general logs;
- repeated 5xx errors, corrupted persistence, or an unavailable rollback;
- any unresolved severity-0 or severity-1 security or model-validity finding.

## Exit decision

At the end of the pilot, model, security, operations, and product owners record
one decision: release to the wider internal audience, extend the pilot with
named remediation, or stop. Wider release requires zero open critical/high
findings, successful restore evidence, accepted retention, and reconciliation
samples for all three model lanes.
