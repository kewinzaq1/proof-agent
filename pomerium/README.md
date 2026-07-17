# Pomerium gateway for Proof

Pomerium is the identity-aware front door between the Proof website and the coaching agent running on Akash.

## Configure the live route

1. Create a Pomerium Zero cluster and copy its starter domain.
2. Create a route whose **From** URL is the URL Proof will call and whose **To** URL is the Akash provider URL for `proof-agent`.
3. Enable **Pass Identity Headers** on the route.
4. Create a policy that allows only the Proof website service account.
5. Create that service account and save its JWT immediately.
6. Set the raw JWT as `POMERIUM_SERVICE_ACCOUNT_JWT` on the website. The gateway sends it as `Authorization: Bearer Pomerium-<JWT>`.
7. Set `PROOF_AGENT_URL` to the Pomerium route, never to the public Akash provider URL.

## Configure assertion verification on Akash

Set these values in `deploy.yaml` before deploying:

- `REQUIRE_POMERIUM=true`
- `POMERIUM_JWKS_URL=https://authenticate.<starter-domain>/.well-known/pomerium/jwks.json`
- `POMERIUM_ISSUER=<route-hostname>`
- `POMERIUM_AUDIENCE=<route-hostname>`

Pomerium forwards `X-Pomerium-Jwt-Assertion`. The agent verifies its signature, issuer, audience, and expiration with `jose`. Requests that bypass Pomerium receive `401`.

## Demo proof

Run a complete loop from the published website. A live response shows **Pomerium → Akash → Zero** only when:

- Pomerium supplied a valid signed assertion;
- the agent handled the request in the Akash runtime; and
- Zero returned the reasoning response.

If any part is unavailable, the website uses its deterministic fallback and labels it **Proof local loop**.
