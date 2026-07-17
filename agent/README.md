# Proof agent service

The frontend works without this service, but calls it when `PROOF_AGENT_URL` is configured. The service delegates each plan/reflection pass to a pay-per-call LLM discovered through Zero.

## Required runtime values

- `ZERO_SESSION_TOKEN`: Zero agent session token.
- A funded Zero wallet (the selected capability costs approximately $0.001 per loop pass).
- `PROOF_AGENT_TOKEN`: optional shared secret between the site and this service.
- `PROOF_WEB_ORIGIN`: allowed browser origin.
- `REQUIRE_POMERIUM=true`: require a verified Pomerium assertion on every coaching request.
- `POMERIUM_JWKS_URL`: JWKS endpoint published by the Pomerium cluster.
- `POMERIUM_ISSUER`: expected route issuer (normally the route hostname).
- `POMERIUM_AUDIENCE`: expected route audience (normally the route hostname).
- `TRUST_POMERIUM_PROXY=true`: for the Akash topology where the agent has no public ingress and only the Pomerium service can reach it on the private deployment network.

The included `deploy.yaml` is an Akash SDL deployment definition. Replace the image URL with the published container before deploying.

The website sends its optional shared secret in `X-Proof-Agent-Token` because the standard `Authorization` header is reserved for the Pomerium service-account credential at the gateway.
