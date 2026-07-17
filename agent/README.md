# Proof agent service

The frontend works without this service, but calls it when `PROOF_AGENT_URL` is configured. The service delegates each plan/reflection pass to a pay-per-call LLM discovered through Zero.

## Required runtime values

- `ZERO_SESSION_TOKEN`: Zero agent session token.
- A funded Zero wallet (the selected capability costs approximately $0.001 per loop pass).
- `PROOF_AGENT_TOKEN`: optional shared secret between the site and this service.
- `PROOF_WEB_ORIGIN`: allowed browser origin.

The included `deploy.yaml` is an Akash SDL deployment definition. Replace the image URL with the published container before deploying.
