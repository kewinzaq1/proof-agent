# Proof

**Stop trying to fix yourself. Start learning yourself.**

Proof is a self-correcting behavioral agent built for the 2026 Loop Engineering Hackathon. It turns one behavior someone wants to change into one tiny experiment, observes what actually happened, and updates both its belief and its next action.

## The loop

```text
Observe → Hypothesize → Experiment → Reflect → Update
   ↑                                            │
   └────────────── new evidence ────────────────┘
```

The demo completes the entire loop in one sitting:

1. Choose one repeated behavior.
2. Describe the moment it usually happens.
3. Receive a working hypothesis and one sub-five-minute experiment.
4. Report what happened, including a missed attempt.
5. Watch the confidence, explanation, and next experiment change.

Failure is evidence in Proof. The agent changes the plan instead of judging the user.

## Sponsor integrations

The production request path uses three sponsor tools in one verifiable chain:

```text
Proof website → Pomerium → Proof agent on Akash → Zero capability
```

The UI only displays **Pomerium → Akash → Zero** when the agent has verified a signed Pomerium identity assertion and Zero has returned the reasoning result. Local fallbacks are labeled honestly and do not claim sponsor usage.

### Pomerium — identity-aware agent gateway

The website authenticates to the protected agent route with a Pomerium Zero service account. Pomerium evaluates the route policy and forwards a signed `X-Pomerium-Jwt-Assertion`. The agent verifies that assertion against Pomerium's JWKS, issuer, and audience before accepting a coaching request.

This keeps private behavioral reflections away from a bearer-token-only public endpoint and makes the security layer part of the product—not a logo in the footer. See `pomerium/README.md` for the route and service-account setup.

### Zero — reasoning capability layer

The `agent/` service sends the planning and reflection passes through a low-cost LLM capability discovered and paid for through Zero. The selected capability costs about $0.001 per call and is invoked through the official Zero CLI. Each response returns the Zero run ID and the UI marks live responses as **Powered by Zero**.

The frontend always has a deterministic fallback. If the paid capability or network fails during judging, the same full loop remains demoable and is labeled **Proof local loop** rather than pretending a sponsor call succeeded.

### Akash — portable agent runtime

`deploy.yaml` contains an Akash SDL definition for the containerized Proof agent. The public website can remain lightweight while the Zero-enabled agent service runs as a portable container on decentralized compute.

## Three-sponsor activation checklist

The checked-in integrations are ready, but they only count as live usage after the external services are configured:

1. Publish the `agent/` image and deploy `deploy.yaml` on Akash.
2. Put the resulting Akash provider URL behind a Pomerium Zero route with identity headers enabled.
3. Create a Pomerium service account allowed by that route and configure its raw JWT as `POMERIUM_SERVICE_ACCOUNT_JWT` on the website.
4. Configure the Pomerium JWKS, issuer, and audience values on the Akash agent.
5. Fund/authenticate Zero and run one complete plan-and-reflect loop.

When the live chain succeeds, the result screen becomes the demo evidence: **Pomerium → Akash → Zero**.

## Run locally

```bash
npm install
npm run dev
```

Open `/experiment` to run the product flow.

The app works immediately with its deterministic reasoning fallback. To use the sponsor-backed service:

1. Install and authenticate the official Zero CLI.
2. Fund the Zero wallet with enough USDC for the selected capability.
3. Start the service in `agent/` with `ZERO_SESSION_TOKEN` available.
4. Complete the Pomerium setup in `pomerium/README.md`.
5. Set the Pomerium route as `PROOF_AGENT_URL` for the web app.

See `agent/README.md` for the runtime values and Akash deployment notes.

## Project structure

```text
app/experiment/      Interactive five-stage product flow
app/api/coach/       Agent gateway with graceful fallback
lib/coach.ts         Deterministic demo-safe loop
agent/               Zero-enabled container service
deploy.yaml          Akash SDL deployment definition
```

## Product rules

- One goal at a time.
- One hypothesis at a time.
- One experiment at a time.
- No diagnoses.
- No motivational filler.
- Never repeat advice without incorporating new evidence.
- A missed experiment changes the model, not the user’s worth.
