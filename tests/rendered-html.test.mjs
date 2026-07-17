import assert from "node:assert/strict";
import test from "node:test";

async function request(path = "/", init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html", ...(init.headers ?? {}) },
      ...init,
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Proof landing page and live prototype link", async () => {
  const response = await request();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Proof — Turn self-doubt into evidence<\/title>/i);
  assert.match(html, /Stop trying to fix yourself/);
  assert.match(html, /href="\/experiment"/);
  assert.match(html, /THE SELF-CORRECTING LOOP/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("protects the personal experiment area with Proof sign-in", async () => {
  const response = await request("/experiment");
  assert.ok([302, 307, 308].includes(response.status));
  assert.match(response.headers.get("location") ?? "", /\/login\?return_to=/);
});

test("renders the simple Proof account screen", async () => {
  const response = await request("/login");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Create a private place for your check-ins/);
  assert.match(html, /Create account/);
});

test("coach fallback still returns a complete loop", async () => {
  const { runLocalCoach } = await import("../lib/coach.ts");
  const result = runLocalCoach({ stage: "plan", goal: "stop scrolling before bed", context: "After dinner I reach for my phone." });
  assert.equal(result.provider, "proof");
  assert.match(result.hypothesis, /scrolling|transition/i);
  assert.equal(typeof result.confidence, "number");
  assert.ok(result.experiment?.instruction);
});
