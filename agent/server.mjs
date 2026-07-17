import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRemoteJWKSet, jwtVerify } from "jose";

const execFileAsync = promisify(execFile);
const port = Number(process.env.PORT ?? 8787);
const capability = process.env.ZERO_CAPABILITY_ID ?? "cap_MqjItdttzo4ViiV9uBkZC";
const token = process.env.PROOF_AGENT_TOKEN;
const requirePomerium = process.env.REQUIRE_POMERIUM === "true";
const pomeriumJwksUrl = process.env.POMERIUM_JWKS_URL;
const pomeriumIssuer = process.env.POMERIUM_ISSUER;
const pomeriumAudience = process.env.POMERIUM_AUDIENCE;
const pomeriumJwks = pomeriumJwksUrl ? createRemoteJWKSet(new URL(pomeriumJwksUrl)) : null;

function json(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": process.env.PROOF_WEB_ORIGIN ?? "*",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-allow-methods": "POST, GET, OPTIONS",
  });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function promptFor(input) {
  return `You are Proof, a behavioral scientist helping one person run tiny experiments on their own life.
Return ONLY valid JSON with this exact shape:
{"hypothesis":"string","confidence":number,"experiment":{"title":"string","instruction":"string","duration":"string","reason":"string"},"insight":"string","learned":["string","string","string"]}

Rules:
- Treat the user's self-judgment as a hypothesis, never a diagnosis.
- Propose exactly one action taking five minutes or less.
- Optimize for learning, not compliance or motivation.
- Use warm, precise language. Never claim certainty.
- For a reflection, explicitly update the hypothesis from the new evidence and change the next experiment.

Stage: ${input.stage}
Goal: ${input.goal}
Initial observation: ${input.context ?? ""}
Prior experiment: ${input.experiment ?? ""}
Attempted: ${input.completed == null ? "unknown" : input.completed ? "yes" : "no"}
Reflection: ${input.reflection ?? ""}`;
}

async function callZero(input) {
  const body = {
    input: {
      type: "http",
      method: "POST",
      bodyType: "json",
      body: {
        model: "google-gemma-3-27b-it",
        stream: false,
        messages: [
          { role: "system", content: "Return only strict JSON. Do not wrap it in markdown." },
          { role: "user", content: promptFor(input) },
        ],
        max_tokens: 500,
        temperature: 0.35,
      },
    },
  };

  const { stdout } = await execFileAsync("zero", [
    "fetch",
    "--capability", capability,
    "--max-pay", "0.002",
    "--json",
    "--data", JSON.stringify(body),
  ], {
    timeout: 20_000,
    maxBuffer: 1024 * 1024,
    env: process.env,
  });

  const run = JSON.parse(stdout);
  if (!run.ok) throw new Error(`Zero run failed with ${run.status}`);
  const providerBody = typeof run.body === "string" ? JSON.parse(run.body) : run.body;
  const content = providerBody?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Zero capability returned no model content");
  const parsed = JSON.parse(content.replace(/^```json\s*|\s*```$/g, ""));
  return { ...parsed, provider: "zero", zeroRunId: run.runId };
}

async function verifyPomerium(request) {
  if (!requirePomerium) return null;
  if (!pomeriumJwks || !pomeriumIssuer || !pomeriumAudience) {
    throw new Error("Pomerium verification is required but its JWKS, issuer, or audience is missing");
  }

  const assertion = request.headers["x-pomerium-jwt-assertion"];
  if (typeof assertion !== "string") throw new Error("Missing Pomerium identity assertion");

  const { payload } = await jwtVerify(assertion, pomeriumJwks, {
    issuer: pomeriumIssuer,
    audience: pomeriumAudience,
  });
  return payload;
}

createServer(async (request, response) => {
  if (request.method === "OPTIONS") return json(response, 204, {});
  if (request.url === "/health") return json(response, 200, { ok: true, service: "proof-agent", provider: "zero" });
  if (request.url !== "/coach" || request.method !== "POST") return json(response, 404, { error: "Not found" });
  if (token && request.headers["x-proof-agent-token"] !== token) return json(response, 401, { error: "Unauthorized" });

  let identity;
  try {
    identity = await verifyPomerium(request);
  } catch (error) {
    console.error("Pomerium verification failed", error instanceof Error ? error.message : error);
    return json(response, 401, { error: "A verified Pomerium service identity is required." });
  }

  try {
    const input = await readBody(request);
    const result = await callZero(input);
    return json(response, 200, {
      ...result,
      ...(identity ? {
        sponsorStack: {
          access: "pomerium",
          compute: "akash",
          reasoning: "zero",
          verified: true,
        },
      } : {}),
    });
  } catch (error) {
    console.error("Proof agent loop failed", error instanceof Error ? error.message : error);
    return json(response, 502, { error: "The Zero reasoning capability was unavailable." });
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`Proof agent listening on ${port}`);
});
