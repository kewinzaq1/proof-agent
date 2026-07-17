import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createRemoteJWKSet, jwtVerify } from "jose";

const execFileAsync = promisify(execFile);
const port = Number(process.env.PORT ?? 8787);
const capability = process.env.ZERO_CAPABILITY_ID ?? "cap_MqjItdttzo4ViiV9uBkZC";
const token = process.env.PROOF_AGENT_TOKEN;
const requirePomerium = process.env.REQUIRE_POMERIUM === "true";
const trustPomeriumProxy = process.env.TRUST_POMERIUM_PROXY === "true";
const pomeriumJwksUrl = process.env.POMERIUM_JWKS_URL;
const pomeriumIssuer = process.env.POMERIUM_ISSUER;
const pomeriumAudience = process.env.POMERIUM_AUDIENCE;
const pomeriumJwks = pomeriumJwksUrl ? createRemoteJWKSet(new URL(pomeriumJwksUrl)) : null;

function json(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": process.env.PROOF_WEB_ORIGIN ?? "*",
    "access-control-allow-headers": "content-type, authorization, x-zero-access-token, x-zero-refresh-token, x-zero-user-id",
    "access-control-allow-methods": "POST, GET, OPTIONS",
  });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function callZero(prompt, stage, zeroEnv, maxTokens = 500) {
  const body = {
    model: "openai-gpt-4o-mini-2024-07-18",
    stream: false,
    messages: [
      { role: "system", content: "Return only strict JSON. Do not wrap it in markdown." },
      { role: "user", content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.25,
  };

  const { stdout } = await execFileAsync("zero", [
    "fetch",
    "--capability", capability,
    "--max-pay", "0.002",
    "--json",
    "--data", JSON.stringify(body),
  ], {
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
    env: zeroEnv,
  });

  const run = JSON.parse(stdout);
  if (!run.ok) throw new Error(`Zero run failed with ${run.status}`);
  const providerBody = typeof run.body === "string" ? JSON.parse(run.body) : run.body;
  const content = providerBody?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Zero capability returned no model content");
  const parsed = JSON.parse(content.replace(/^```json\s*|\s*```$/g, ""));
  return { data: parsed, trace: { stage, runId: run.runId } };
}

function clampConfidence(value) {
  const normalized = Number(value) <= 1 ? Number(value) * 100 : Number(value);
  return Math.max(5, Math.min(95, Math.round(Number.isFinite(normalized) ? normalized : 33)));
}

function normalizeHypotheses(items, previous = []) {
  return (Array.isArray(items) ? items : []).slice(0, 3).map((item, index) => {
    const prior = previous.find((candidate) => candidate.id === item.id);
    const confidence = clampConfidence(item.confidence);
    const previousConfidence = clampConfidence(item.previousConfidence ?? prior?.confidence ?? confidence);
    return {
      id: String(item.id || `h${index + 1}`),
      label: String(item.label || `Hypothesis ${index + 1}`),
      explanation: String(item.explanation || item.hypothesis || "This explanation still needs evidence."),
      confidence,
      previousConfidence,
      delta: confidence - previousConfidence,
      verdict: String(item.verdict || (confidence > previousConfidence + 8 ? "promoted" : confidence < previousConfidence - 18 ? "rejected" : confidence < previousConfidence - 5 ? "weakened" : "steady")),
      evidence: Array.isArray(item.evidence) ? item.evidence.slice(0, 2).map(String) : [],
    };
  });
}

async function runPlan(input, zeroEnv) {
  const observerPrompt = `You are the hypothesis generator inside Proof, a behavioral-science agent.
Generate exactly three distinct, testable explanations for the recurring pattern below.
One candidate may reflect the user's self-judgment, but treat it skeptically. The others must identify situational mechanisms.
Return ONLY JSON: {"hypotheses":[{"id":"h1","label":"2-5 words","explanation":"one precise sentence","confidence":number,"evidence":["specific clue from user"]},{"id":"h2",...},{"id":"h3",...}]}
Confidence values are 5-95 and should not sum to 100. Do not diagnose.

Pattern: ${input.goal}
Observation and longitudinal context: ${input.context ?? ""}`;
  const generated = await callZero(observerPrompt, "hypothesize", zeroEnv, 520);
  const hypotheses = normalizeHypotheses(generated.data.hypotheses);

  const criticPrompt = `You are the critic and experiment designer inside Proof.
Review three competing explanations. Select the one best supported by the user's actual words, record one falsifiable prediction, and design one experiment under five minutes that distinguishes it from the alternatives.
Return ONLY JSON: {"selectedHypothesisId":"h1","selectionReason":"one sentence citing evidence","prediction":"If this hypothesis is right, then...","experiment":{"title":"string","instruction":"one concrete action","duration":"string","reason":"explain what result would support or weaken the selected hypothesis"},"insight":"one warm sentence","learned":["string","string","string"]}
Never optimize for compliance. Optimize for information gained.

User pattern: ${input.goal}
Observation: ${input.context ?? ""}
Candidates: ${JSON.stringify(hypotheses)}`;
  const selected = await callZero(criticPrompt, "critic_select", zeroEnv, 480);
  const selectedId = hypotheses.some((item) => item.id === selected.data.selectedHypothesisId) ? selected.data.selectedHypothesisId : hypotheses[0]?.id;
  const winner = hypotheses.find((item) => item.id === selectedId) ?? hypotheses[0];
  return {
    hypotheses,
    selectedHypothesisId: selectedId,
    selectionReason: selected.data.selectionReason,
    prediction: selected.data.prediction,
    hypothesis: winner?.explanation,
    confidence: winner?.confidence,
    experiment: selected.data.experiment,
    insight: selected.data.insight,
    learned: selected.data.learned,
    provider: "zero",
    zeroRuns: [generated.trace, selected.trace],
  };
}

async function runReflection(input, zeroEnv) {
  const prior = normalizeHypotheses(input.priorHypotheses ?? []);
  const observerPrompt = `You are the evidence evaluator inside Proof. Reality has returned after an experiment.
Update all three competing hypotheses from the new evidence. Be willing to reject the previous winner and promote an alternative.
Return ONLY JSON: {"hypotheses":[{"id":"h1","label":"same label","explanation":"updated precise explanation","previousConfidence":number,"confidence":number,"verdict":"promoted|weakened|rejected|steady","evidence":["new evidence that caused this update"]},{"id":"h2",...},{"id":"h3",...}],"insight":"one sentence explaining what reality changed","learned":["string","string","string"]}
Confidence values are 5-95. A contradicted prediction must meaningfully lower confidence.

Original pattern: ${input.goal}
Original observation: ${input.context ?? ""}
Prior hypotheses: ${JSON.stringify(prior)}
Prior selected hypothesis: ${input.selectedHypothesisId ?? "unknown"}
Recorded prediction: ${input.prediction ?? "unknown"}
Experiment: ${input.experiment ?? ""}
Attempted: ${input.completed == null ? "unknown" : input.completed ? "yes" : "no"}
What actually happened: ${input.reflection ?? ""}`;
  const evaluated = await callZero(observerPrompt, "observe_update", zeroEnv, 600);
  const hypotheses = normalizeHypotheses(evaluated.data.hypotheses, prior);

  const designerPrompt = `You are the next-step selector inside Proof.
Given the evidence-updated hypotheses, select the strongest current explanation and design one new experiment under five minutes. It must test the newly selected explanation, not repeat old advice.
Return ONLY JSON: {"selectedHypothesisId":"h1","selectionReason":"one sentence","prediction":"If this updated hypothesis is right, then...","experiment":{"title":"string","instruction":"one concrete action","duration":"string","reason":"what evidence this will create"}}

Updated hypotheses: ${JSON.stringify(hypotheses)}
New evidence: ${input.reflection ?? ""}`;
  const selected = await callZero(designerPrompt, "redesign", zeroEnv, 420);
  const selectedId = hypotheses.some((item) => item.id === selected.data.selectedHypothesisId) ? selected.data.selectedHypothesisId : [...hypotheses].sort((a, b) => b.confidence - a.confidence)[0]?.id;
  const winner = hypotheses.find((item) => item.id === selectedId) ?? hypotheses[0];
  return {
    hypotheses,
    selectedHypothesisId: selectedId,
    selectionReason: selected.data.selectionReason,
    prediction: selected.data.prediction,
    hypothesis: winner?.explanation,
    confidence: winner?.confidence,
    experiment: selected.data.experiment,
    insight: evaluated.data.insight,
    learned: evaluated.data.learned,
    provider: "zero",
    zeroRuns: [evaluated.trace, selected.trace],
  };
}

async function withZeroSession(request, operation) {
  const accessToken = request.headers["x-zero-access-token"];
  const refreshToken = request.headers["x-zero-refresh-token"];
  const userId = request.headers["x-zero-user-id"];
  if (typeof accessToken !== "string" || typeof refreshToken !== "string" || typeof userId !== "string") {
    return operation(process.env);
  }

  const temporaryHome = await mkdtemp(join(tmpdir(), "proof-zero-"));
  const zeroDirectory = join(temporaryHome, ".zero");
  await mkdir(zeroDirectory, { recursive: true });
  await writeFile(join(zeroDirectory, "config.json"), JSON.stringify({
    session: { userId, authMethod: "workos", accessToken, refreshToken },
  }), { mode: 0o600 });
  try {
    return await operation({ ...process.env, HOME: temporaryHome });
  } finally {
    await rm(temporaryHome, { recursive: true, force: true });
  }
}

async function runLoop(input, zeroEnv) {
  return input.stage === "reflect" ? runReflection(input, zeroEnv) : runPlan(input, zeroEnv);
}

async function verifyPomerium(request) {
  if (!requirePomerium) return null;
  const assertion = request.headers["x-pomerium-jwt-assertion"];
  if (typeof assertion !== "string") throw new Error("Missing Pomerium identity assertion");

  // In the Akash deployment the agent has no public ingress: only the Pomerium
  // service on the private deployment network can reach it. Pomerium has already
  // authenticated and signed this assertion at the sole public boundary.
  if (trustPomeriumProxy) return { proxyVerified: true };

  if (!pomeriumJwks || !pomeriumIssuer || !pomeriumAudience) {
    throw new Error("Pomerium verification is required but its JWKS, issuer, or audience is missing");
  }

  const { payload } = await jwtVerify(assertion, pomeriumJwks, {
    issuer: pomeriumIssuer,
    audience: pomeriumAudience,
  });
  return payload;
}

createServer(async (request, response) => {
  if (request.method === "OPTIONS") return json(response, 204, {});
  if (request.url === "/health") return json(response, 200, { ok: true, service: "proof-agent", provider: "zero", loopVersion: "competing-hypotheses-v1" });
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
    const result = await withZeroSession(request, (zeroEnv) => runLoop(input, zeroEnv));
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
