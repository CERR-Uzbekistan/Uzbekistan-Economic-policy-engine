# Policy Chat MVP — Product, UX, and Technical Specification

**Status:** Confirmed; local MVP implemented
**Product surface:** `apps/policy-ui`
**Route:** `/policy-chat`
**Audience:** Internal CERR analysts and approved institutional users
**MVP model scope:** QPM, DFM, and Input–Output (I-O)
**Decision date:** 2026-07-17

## 1. Feature summary

Policy Chat is an authenticated conversational scenario workspace for asking economic-policy questions in natural language, reviewing how the system has translated those questions into model assumptions, and running approved models only after explicit user confirmation.

The page does not treat the language model as an economic model. The language model interprets intent, proposes a structured run, and explains returned results; all quantitative scenario outputs must come from the policy engine and retain model attribution, data vintage, assumptions, and caveats.

## 2. Problem statement

The engine currently exposes model-oriented screens and structured scenario controls. Expert users still need to know which model to open, which controls represent their policy question, and how to combine outputs into a concise interpretation. This creates avoidable friction for exploratory questions and makes cross-model discovery harder.

Policy Chat should reduce that friction without concealing model boundaries or allowing conversational fluency to weaken analytical governance.

## 3. Goals and success criteria

### Goals

1. Let an internal analyst express a scenario or evidence question in ordinary policy language.
2. Route the question to QPM, DFM, I-O, or a clearly labelled non-runnable response.
3. Present the parsed model, assumptions, units, horizon, and data vintage for review before execution.
4. Require explicit confirmation before every new or materially changed scenario run.
5. Return concise narrative interpretation alongside structured results, charts, tables, attribution, and caveats.
6. Preserve an auditable relationship between the original question, confirmed assumptions, tool call, raw result, and generated explanation.
7. Allow a completed chat run to be saved as a standard scenario and opened in Scenario Lab or Comparison where compatible.

### MVP success measures

- At least 90% of a curated set of supported prompts is routed to the correct model or safely declined.
- 100% of model executions have a preceding, user-confirmed assumption set.
- 100% of numeric claims in an answer are traceable to a returned model field or a labelled deterministic calculation.
- No unsupported model is executed through the chat route.
- Median time from submitted prompt to assumption proposal is under 3 seconds in the target environment.
- Median model execution plus first answer is under 12 seconds, excluding provider outages.
- At least 80% of pilot analysts can complete a supported scenario without opening model documentation.
- Accessibility checks meet WCAG 2.2 AA for the new page and its critical flow.

## 4. Non-goals

The MVP will not:

- expose PE, CGE, FPP, HFI, or unapproved experimental models;
- present AI-generated quantities as model outputs;
- autonomously execute a model on receipt of a prompt;
- make policy recommendations or claim that a result is an official forecast;
- browse the public internet or import external evidence into a run;
- modify model code, coefficients, source datasets, or registry artifacts;
- accept file uploads;
- support public or anonymous access;
- provide collaborative editing, shared live chats, or approval workflows;
- use chat history as training data;
- make hypothetical DFM Kalman updates in the initial release;
- replace Scenario Lab, Comparison, Model Explorer, or Data Registry.

## 5. Primary users and jobs

### Primary user

An authenticated CERR economist or policy analyst working at a desk, often while preparing a briefing, testing an argument, or responding to a time-sensitive internal question. The user understands macroeconomic concepts and expects compact, inspectable evidence.

### Primary user action

Translate a policy question into a transparent model run, verify the assumptions, and obtain an attributable result.

### Core jobs

- Explore: “What would a 2 percentage-point monetary tightening do to inflation and the output gap?”
- Retrieve: “What is the latest GDP nowcast and its uncertainty range?”
- Simulate: “What is the economy-wide output effect of UZS 5 trillion of infrastructure investment?”
- Refine: “Use a 16-quarter horizon instead,” followed by another confirmation.
- Compare: “Now run the same monetary shock at 1 and 3 percentage points.” Comparison support is limited to compatible saved runs in MVP.
- Hand off: save a confirmed run and open its structured representation in Scenario Lab or Comparison.

## 6. Model capability policy

| Model | MVP capability | Allowed actions | Important boundary |
|---|---|---|---|
| QPM | Runnable | Baseline forecast and impulse-response scenarios | Outputs are model scenarios, not forecasts unless explicitly using the baseline tool. |
| DFM | Read-only retrieval | Latest nowcast, confidence bands, factor/news information present in the approved artifact | No invented observations and no `dfm_kalman_update` in MVP. |
| I-O | Runnable | Final-demand shocks and sector information | Static 2022 structure; effects are not a time path or general-equilibrium response. |
| PE, CGE, FPP, HFI | Unavailable | Explain that the capability is not enabled and offer a supported alternative where valid | Never silently substitute one model for another. |

### Routing rules

1. Prefer one model per turn.
2. If a prompt contains multiple independently runnable questions, propose a multi-step plan listing each run; require confirmation of each assumption set or a single confirmation that visibly covers all listed runs.
3. If the intent is ambiguous between models, ask one focused clarifying question instead of choosing silently.
4. If required parameters are missing, use documented model defaults only when the assumption review labels them as defaults.
5. If the request is outside model scope, state the limitation and do not fabricate an estimate.
6. Model availability and readiness must be read from a server-controlled allowlist, not from the language model prompt alone.

## 7. Supported prompt taxonomy

### QPM

- Monetary-policy tightening/easing
- Demand, cost-push/inflation, exchange-rate, risk-premium, and external-demand shocks
- Baseline paths for inflation, policy rate, output gap, and depreciation
- Follow-ups changing shock size, sign, or horizon

### DFM

- Latest GDP growth nowcast
- Confidence interval or uncertainty question
- Existing factor contribution or news-decomposition question when returned by the approved artifact
- Data-vintage and freshness question

### I-O

- Consumption, government, investment, or export demand shock
- Economy-wide output, value-added, and employment effect
- Sector-specific demand shock using a valid sector code
- Sector multiplier or linkage lookup

### Unsupported or clarification-required examples

- “What will GDP be in 2035?” without a supported model/horizon
- “Optimize the policy rate” or other normative optimization
- “Update the nowcast using these unofficial numbers”
- Requests requiring PE, CGE, or FPP
- A mixed scenario whose channels cannot be combined without double counting

## 8. Experience and layout strategy

### Design direction

The page should feel authoritative, precise, and institutional: an analytical workbench with conversational input, not a consumer chatbot. It should follow the project’s warm-paper, editorial, data-dense direction and reuse existing trust-state, chart, attribution, and scenario patterns.

The memorable element should be the **assumption ledger**: every proposed and completed run visibly connects the user’s words to a model, parameter, unit, source/default status, and final value.

### Desktop layout

- Use the existing application shell and add **Policy Chat** to primary navigation after Scenario Lab.
- Use a two-region workspace within the main content area:
  - the dominant conversation timeline and composer;
  - a narrower persistent **Run ledger** showing current model, confirmation state, run history, data vintage, and saved status.
- Keep prose measure constrained while allowing charts and tables to use the full conversation width.
- Do not wrap every message in a floating card. User prompts may use a quiet tinted surface; analytical answers should read like compact report sections.

### Responsive behavior

- At narrower widths, the run ledger becomes an in-flow section immediately after the active assumption proposal.
- The composer remains reachable without covering results.
- Tables receive horizontal scrolling with visible row labels; charts adapt without hiding series or caveats.
- No critical action or provenance field is removed on mobile-sized layouts.

## 9. Core interaction flow

### 9.1 First entry

The empty state explains the three supported capabilities and offers 3–5 realistic prompts. It also states: “Policy Chat will show its interpretation before running a model.” No model runs on page load.

### 9.2 Prompt interpretation

1. User submits a prompt.
2. The user message is added to the timeline.
3. The backend classifies the intent and returns either:
   - an assumption proposal;
   - one clarification question;
   - a read-only DFM retrieval proposal;
   - an unsupported-capability response.
4. The frontend renders the proposal as an assumption ledger, not as unstructured prose.

### 9.3 Assumption review

The proposal displays:

- selected model and operation;
- plain-language scenario summary;
- each parameter’s label, value, unit, allowed range, and origin (`user stated`, `inferred`, or `model default`);
- horizon and baseline/reference period;
- data source and vintage where known before execution;
- model-specific caveat;
- warnings for any clamped, transformed, or unresolved value.

The user can edit permitted values inline, choose **Run model**, or choose **Revise question**. Editing a value invalidates any earlier confirmation. Pressing **Run model** is the explicit confirmation event.

### 9.4 Execution and response

1. The backend records the confirmed proposal and its hash.
2. It validates the parameters independently of the language model.
3. It calls only the allowlisted model operation.
4. It stores the raw tool response and attribution.
5. It requests a grounded explanation using only the normalized result payload.
6. The UI renders:
   - one-sentence answer;
   - key results with units and periods;
   - an appropriate chart or compact table;
   - interpretation separated from model facts;
   - assumptions, attribution, freshness, and caveats;
   - follow-up suggestions;
   - **Save scenario**, **Open in Scenario Lab**, and, when compatible, **Add to Comparison**.

### 9.5 Follow-up turns

- A follow-up may refer to the last confirmed run.
- A purely explanatory follow-up may be answered from the stored result without rerunning.
- Any follow-up that changes a parameter, model, data input, or operation generates a new assumption proposal and requires confirmation.
- The interface marks stale earlier results when a new proposal is pending.

## 10. Key states

| State | Required user experience |
|---|---|
| Empty | Supported scope, privacy notice, and realistic starter prompts. |
| Interpreting | Brief status with cancellable request; no fake progress percentage. |
| Needs clarification | One specific question and retained original prompt. |
| Awaiting confirmation | Editable assumption ledger; primary action is **Run model**. |
| Validation warning | Explain changed/rejected values and prevent execution when invalid. |
| Running | Identify the model being run and keep confirmed assumptions visible. |
| Answer ready | Results first, then interpretation, provenance, caveats, and actions. |
| Unsupported | Name the missing capability and supported alternatives; no generic apology loop. |
| Model unavailable | Preserve the confirmed proposal and offer retry; never replace with generated numbers. |
| Explanation unavailable | Show raw structured model results and state that narrative generation failed. |
| Session expired | Preserve unsent composer text locally, require sign-in, and do not expose prior content. |
| Empty history | Explain retention and start a new conversation. |
| Long conversation | Summarize old explanatory context server-side while retaining immutable run records. |

## 11. Content and response rules

### Voice

- Concise, analytical, neutral, and explicit about uncertainty.
- Prefer “The QPM scenario indicates…” over “The economy will…”.
- Use “percentage points” and “percent” correctly.
- Identify whether a value is a level, rate, change, cumulative effect, or deviation from baseline.

### Mandatory answer labels

- **Model result** for quantities returned by a tool.
- **Interpretation** for the language model’s explanation.
- **Assumptions** for confirmed inputs.
- **Limitations** for model and data caveats.
- **Source & vintage** for model/data provenance.

### Numeric grounding

- The explanation service receives a normalized result object with stable metric identifiers.
- Every numeric token in generated narrative must be checked against an allowlist derived from the result and confirmed inputs, allowing only formatting-equivalent variants and deterministic deltas.
- If grounding validation fails, regenerate once; if it fails again, show a deterministic template explanation.
- Do not allow the language model to calculate cross-model totals or combine effects unless a reviewed deterministic method exists.

## 12. Information architecture and navigation

- Add route `/policy-chat` through the existing lazy route pattern.
- Add `nav.policyChat` and `pages.policyChat.*` localization keys.
- Place the navigation item after Scenario Lab because chat is an alternate entry to scenario work, not a replacement for Overview.
- Deep-link a completed run to Scenario Lab using a server-issued run identifier or a supported serialized scenario reference; do not put sensitive prompt content in the URL.
- Add a “Start in Policy Chat” action from relevant Model Explorer and Scenario Lab contexts only after the core route is stable.

## 13. Technical architecture

```text
React Policy Chat page
        |
        | authenticated HTTPS /api/v1/policy-chat/*
        v
Policy Chat API / orchestrator
  |-- identity and authorization
  |-- conversation and run store
  |-- intent/schema generation via LLM provider
  |-- deterministic validation and model allowlist
  |-- QPM / DFM / I-O service adapters
  |-- result normalization and grounding checks
  |-- audit and telemetry
        |
        v
Existing policy-engine model implementations / approved artifacts
```

### Required backend boundary

The current registry API is read-only and permits only `GET`. Policy Chat requires a separate authenticated application API or a clearly separated router with stricter middleware. API credentials and model-provider keys must never be shipped to the Vite client.

The orchestrator may call the current Python model functions directly or use an MCP client internally. The public application contract should remain ordinary versioned HTTP/SSE so the React app is not coupled to MCP transport details.

### Provider abstraction

Define an internal interface for:

- `propose_run(conversation_context, prompt, capability_catalog)`;
- `explain_result(confirmed_proposal, normalized_result)`.

Provider-specific request/response handling stays behind this interface. Structured output must be schema-validated. A provider change must not alter model validation, authorization, persistence, or audit behavior.

## 14. API contract proposal

All endpoints require an authenticated internal user and enforce per-user access to conversations.

### `POST /api/v1/policy-chat/conversations`

Creates a conversation.

Response fields: `conversation_id`, `title`, `created_at`, `retention_expires_at`.

### `GET /api/v1/policy-chat/conversations`

Returns paginated conversation metadata for the current user. Default page size: 20; maximum: 100.

### `GET /api/v1/policy-chat/conversations/{conversation_id}`

Returns messages, proposals, run summaries, and audit-safe provenance for one authorized conversation.

### `POST /api/v1/policy-chat/conversations/{conversation_id}/turns`

Request:

```json
{
  "client_turn_id": "uuid",
  "message": "Raise the policy rate by 2 percentage points for 16 quarters.",
  "locale": "en"
}
```

Response is one of `proposal`, `clarification`, `unsupported`, or `informational_answer`. A proposal includes `proposal_id`, `model_id`, `operation`, typed parameters, parameter origins, warnings, and `proposal_hash`.

### `PATCH /api/v1/policy-chat/proposals/{proposal_id}`

Accepts only fields declared editable by the server schema. Returns a new `proposal_hash`. Server validation is authoritative.

### `POST /api/v1/policy-chat/proposals/{proposal_id}/execute`

Request:

```json
{
  "proposal_hash": "sha256:...",
  "confirmation": true,
  "client_request_id": "uuid"
}
```

The hash prevents execution of assumptions different from those displayed. The endpoint is idempotent on `client_request_id`. It returns a `run_id` and either streams status/result events or returns `202 Accepted` for polling.

### `GET /api/v1/policy-chat/runs/{run_id}`

Returns status, normalized result, explanation, attribution, warnings, and compatible downstream actions. Raw provider reasoning is never returned or stored.

### `POST /api/v1/policy-chat/runs/{run_id}/save-scenario`

Creates a server-backed saved scenario compatible with the Scenario Lab/Comparison contract. Browser-local `scenarioStore` data may be imported explicitly later but is not silently migrated.

### Streaming

Use Server-Sent Events for status and answer delivery if supported by the deployment environment. Stream status and prose blocks, but publish quantitative result components only after the complete result payload has passed validation.

## 15. Core data contracts

### Run proposal

```ts
type PolicyChatRunProposal = {
  proposal_id: string
  conversation_id: string
  model_id: 'qpm' | 'dfm' | 'io'
  operation: 'qpm_impulse_response' | 'qpm_baseline_forecast' | 'dfm_nowcast' |
    'io_demand_shock' | 'io_sector_info'
  summary: string
  parameters: Array<{
    key: string
    label: string
    value: string | number | boolean | null
    unit: string | null
    origin: 'user_stated' | 'inferred' | 'model_default'
    editable: boolean
    allowed_range?: { min: number; max: number }
  }>
  warnings: Array<{ code: string; message: string; blocking: boolean }>
  capability_version: string
  proposal_hash: string
  created_at: string
}
```

### Run record

```ts
type PolicyChatRunRecord = {
  run_id: string
  proposal_id: string
  proposal_hash: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  model_attribution: ModelAttribution[]
  confirmed_parameters: PolicyChatRunProposal['parameters']
  normalized_result: unknown
  explanation: {
    summary: string
    interpretation: string[]
    limitations: string[]
    grounding_status: 'verified' | 'deterministic_fallback'
  } | null
  started_at: string | null
  completed_at: string | null
}
```

Final production schemas should use discriminated unions per operation rather than a single `unknown` result.

## 16. Model adapters and validation

### QPM adapter

- Map only documented shock types and baseline parameters.
- Enforce server-side parameter ranges already documented by the MCP tool.
- Preserve signed shock semantics and expose transformations in the ledger.
- Normalize time-series outputs into metric IDs, quarter index, value, unit, and baseline/deviation semantics.

### DFM adapter

- Call only `dfm_nowcast` in MVP.
- Surface artifact vintage, generation timestamp, confidence bands, and validation/readiness warnings.
- Reject prompts that supply hypothetical observations or request recalibration.

### I-O adapter

- Validate demand category, amount in billion UZS, distribution method, and sector code.
- Resolve sector names to codes through deterministic sector lookup; require clarification if multiple sectors match.
- State that results use the 2022 I-O structure and do not capture price adjustment or general equilibrium.

### Capability manifest

Maintain a versioned server-side manifest containing enabled models, operations, JSON schemas, parameter ranges, default labels, caveats, and readiness state. Both the language model context and deterministic validator use the same manifest, while the validator remains authoritative.

## 17. Authentication, authorization, and data handling

- Integrate with the organization’s chosen identity provider using OIDC or an equivalent centrally managed mechanism.
- Require authentication for the route and every API call.
- Minimum roles: `policy_chat_user`, `policy_chat_reviewer`, and `policy_chat_admin`.
- Users may access their own conversations; reviewer/admin access must be explicit and audited.
- Store prompt text, proposals, confirmations, tool inputs, raw tool outputs, and final responses in an approved internal datastore.
- Define a retention period before pilot launch; recommended starting point is 90 days for conversations and longer retention for explicitly saved scenario run artifacts if governance approves.
- Encrypt transport and stored data; secrets belong in the backend secret manager.
- Redact credentials, obvious personal identifiers, and restricted free text from application logs.
- Do not send model source files, unrelated conversation history, user identity fields, or confidential documents to the LLM provider.
- Display a concise internal-data notice beside the composer.

## 18. Safety and governance controls

1. **Allowlist enforcement:** only enabled operation IDs can execute.
2. **Confirmation hash:** execution must match the proposal visible to the user.
3. **Independent validation:** never trust generated tool arguments without schema and semantic checks.
4. **Attribution:** every result retains model/version/run/data metadata.
5. **Grounded narrative:** numeric and causal claims are checked against approved result fields and model caveats.
6. **No silent fallback:** a failed tool call cannot become a language-model estimate.
7. **Prompt-injection resistance:** capability descriptions and tool outputs are treated as data; retrieved content cannot alter system policy or tool allowlists.
8. **Audit events:** record proposal creation/edit, confirmation, execution, failure, save, and access by privileged reviewers.
9. **Rate and cost controls:** per-user request limits, maximum context, maximum generated tokens, and provider timeouts.
10. **Kill switch:** operations and the entire chat feature can be disabled server-side without a frontend redeploy.

## 19. Accessibility and localization

- Support English, Russian, and Uzbek using existing `react-i18next` patterns.
- Store stable enum values; localize labels only at presentation boundaries.
- Treat Latin and Cyrillic model/sector aliases as search inputs, while preserving canonical codes.
- Announce interpretation, validation, run, and failure states through appropriate live regions without reading the entire answer repeatedly.
- Keep keyboard focus on the active workflow step: composer, clarification input, first invalid assumption, or answer heading.
- Assumption editing must work without drag gestures or color-only cues.
- Charts require accessible titles, summaries, and tabular alternatives.
- Respect reduced-motion preferences; use motion only for meaningful state transitions.

## 20. Observability

Track without putting sensitive prompt text into general telemetry:

- route decision and confidence bucket;
- clarification, unsupported, proposal, confirmation, cancellation, success, and failure counts;
- model and operation usage;
- interpretation, execution, and explanation latency;
- validation and grounding failures;
- retries and idempotency hits;
- save/open-in-lab actions;
- provider token usage and estimated cost;
- user feedback on answer usefulness and assumption correctness.

Use correlation IDs across frontend request, orchestrator turn, model run, and audit record.

## 21. Testing strategy

### Contract and unit tests

- Proposal and result schema validation for every enabled operation.
- Parameter range, default-origin, unit-conversion, and proposal-hash tests.
- Model allowlist and role authorization tests.
- Numeric-grounding validator tests, including percent/percentage-point edge cases.
- Sector name/code resolution tests in all supported scripts/languages.
- Idempotent execution and stale-proposal rejection tests.

### Golden prompt suite

Maintain versioned fixtures covering:

- at least 25 QPM prompts;
- at least 15 DFM questions;
- at least 25 I-O prompts;
- ambiguous prompts;
- unsupported model requests;
- adversarial instructions and prompt injection;
- multilingual and mixed-language prompts;
- follow-ups that do and do not require reruns.

Each fixture declares expected route, required clarification, parameter values/origins, and whether execution is allowed.

### Integration tests

- Authenticated conversation lifecycle.
- Proposal edit → hash change → confirmation → model call → stored result.
- Model/provider timeout and recovery.
- Narrative failure with deterministic-result fallback.
- Save scenario and downstream Scenario Lab/Comparison compatibility.

### End-to-end tests

- Keyboard-only happy path for one QPM and one I-O scenario.
- DFM retrieval path.
- Unsupported capability path.
- Expired session and unauthorized conversation access.
- Responsive layout and accessible chart alternative.

### Pilot evaluation

Run a structured analyst pilot using real but non-sensitive questions. Review routing accuracy, assumption corrections, result comprehension, and whether labels prevent users from confusing scenario outputs with forecasts.

## 22. Delivery plan

### Phase 0 — Governance and contract decisions

- Select identity provider, LLM provider/deployment, datastore, retention, and hosting environment.
- Approve the QPM/DFM/I-O capability manifest and caveat language.
- Define saved-scenario ownership and reviewer access.
- Establish the golden prompt suite and pilot evaluation rubric.

**Exit criterion:** signed-off capability and data-handling contract.

### Phase 1 — Deterministic backend foundation

- Add authenticated chat API skeleton and conversation/run persistence.
- Implement the capability manifest, typed adapters, validation, confirmation hash, idempotency, and audit events.
- Add QPM, DFM read-only, and I-O execution without an LLM by using direct test payloads.

**Exit criterion:** all allowed model operations can be invoked only through validated, confirmed API proposals.

### Phase 2 — Interpretation and grounding

- Add provider abstraction and structured proposal generation.
- Add clarification and unsupported-intent behavior.
- Add grounded result explanation and deterministic fallback.
- Pass the golden prompt and security suites at agreed thresholds.

**Exit criterion:** routing and numeric-grounding targets are met in CI/evaluation.

### Phase 3 — React experience

- Add route, navigation, empty state, conversation timeline, composer, assumption ledger, result rendering, and run ledger.
- Reuse existing chart, trust state, attribution, and scenario contracts where compatible.
- Add localization, keyboard behavior, responsive states, and error recovery.

**Exit criterion:** full authenticated E2E flow passes for QPM, DFM, and I-O.

### Phase 4 — Scenario integration and internal pilot

- Add save/open-in-Scenario-Lab and compatible Comparison handoff.
- Add observability dashboards, feedback capture, rate limits, and kill switch.
- Pilot with a small analyst group and resolve high-severity comprehension/governance issues.

**Exit criterion:** product owner, model owner, security, and pilot reviewers approve internal release.

### Phase 5 — Post-MVP candidates

- Reviewed multi-model scenario plans and synthesis.
- Team-shared conversations and review workflow.
- DFM observation updates using approved data-ingestion rules.
- Additional models enabled one at a time through the capability manifest and model-owner approval.
- Exportable policy-chat brief with immutable run references.

## 23. MVP acceptance criteria

The MVP is complete only when:

1. Unauthenticated users cannot load chat data or call chat APIs.
2. Only QPM, `dfm_nowcast`, and I-O operations are enabled.
3. Every executable prompt produces an editable, typed assumption proposal.
4. No execution occurs without a matching explicit confirmation and proposal hash.
5. Invalid and stale proposals are rejected server-side.
6. Each successful answer displays model, version/run attribution, data vintage, assumptions, and limitations.
7. Every displayed numeric result originates from a validated model response or labelled deterministic calculation.
8. Provider or narrative failures never erase a successful model result.
9. Unsupported prompts are declined without fabricated estimates.
10. A supported completed run can be saved and opened in the appropriate structured product surface.
11. English, Russian, and Uzbek critical flows are available.
12. Accessibility, contract, integration, security, golden-prompt, and E2E test gates pass.
13. Administrators can disable an operation or the feature without a frontend release.
14. Audit records connect the user prompt, displayed proposal, confirmation, exact tool input, raw output, and final answer.

## 24. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Fluent narrative creates false confidence | Separate result and interpretation; mandatory attribution/caveats; grounded numeric validation. |
| Wrong model routing | Golden prompts, clarification threshold, user-visible model selection, and editable proposal. |
| Hidden assumption changes | Parameter origin labels, proposal hash, immutable confirmed run record. |
| Cross-model double counting | One-model preference and no unreviewed aggregation in MVP. |
| Static frontend deployment cannot secure keys or identity | Deploy a separate authenticated backend; keep secrets server-side. |
| Browser-local scenario records conflict with internal accounts | Introduce server-backed run records; make any import explicit. |
| Model/data availability failure | Preserve proposal, return structured failure, retry safely, never synthesize substitute numbers. |
| Cost or latency growth from long conversations | Limit context, summarize prose, retain structured run records, cache eligible read-only DFM responses. |
| Sensitive text reaches third-party provider | Approved provider/deployment, minimized context, policy notice, redaction, retention controls. |

## 25. Decisions still required before implementation

These do not block approval of the feature direction, but Phase 0 must resolve them:

1. Which organizational identity provider and role source will be used?
2. Which LLM provider/deployment is approved for internal economic-policy prompts?
3. What are the final conversation and saved-run retention periods?
4. Should reviewer roles see conversations only when shared, or under a documented supervisory-access policy?
5. Where will the authenticated API and datastore be hosted, given that GitHub Pages remains a static frontend host?
6. Which existing Scenario Lab contract becomes the canonical server-backed saved-scenario format?

## 26. Recommended implementation references

During implementation, consult the project design context in `.impeccable.md` and the Impeccable references for spatial design, interaction design, responsive design, motion, typography, color/contrast, and UX writing. The most important are interaction design for the confirmation ledger and spatial design for the desktop conversation/run-ledger relationship.

## 27. Design-brief confirmation

The proposed direction is:

- internal and authenticated;
- limited to QPM, read-only DFM, and I-O;
- assumption review and explicit confirmation before execution;
- institutional, compact, and provenance-forward;
- backed by a secure orchestrator rather than a browser-only chatbot;
- integrated with, but not a replacement for, Scenario Lab and Comparison.

The product direction was confirmed on 2026-07-17. The local MVP uses deterministic routing and explanations; production deployment still requires the organization to configure its trusted identity proxy, retention policy, and hosting controls.
