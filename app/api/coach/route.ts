import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getProofUser } from "../../proof-auth";
import { getDb } from "../../../db";
import { checkIns, profiles } from "../../../db/schema";
import { runLocalCoach, type CoachRequest, type CoachResponse } from "../../../lib/coach";

export async function POST(request: Request) {
  const user = await getProofUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const input = (await request.json()) as CoachRequest;
  if (!input.goal?.trim() || !["plan", "reflect"].includes(input.stage)) {
    return NextResponse.json({ error: "A goal and valid stage are required." }, { status: 400 });
  }

  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.email, user.email)).limit(1);
  if (!profile) return NextResponse.json({ error: "Finish onboarding first." }, { status: 409 });

  const recent = await db
    .select({ goal: checkIns.goal, insight: checkIns.insight, hypothesis: checkIns.hypothesis })
    .from(checkIns)
    .where(eq(checkIns.userEmail, user.email))
    .orderBy(desc(checkIns.updatedAt))
    .limit(3);

  const memory = [
    `Life season: ${profile.lifeSeason}.`,
    `Focus areas: ${profile.focusAreas.join(", ")}.`,
    `Life snapshot: ${profile.lifeSnapshot}`,
    `Desired shift: ${profile.desiredShift}`,
    recent.length
      ? `Previous learning: ${recent.map((item) => item.insight || item.hypothesis).join(" | ")}`
      : "This is the first check-in; hold every conclusion lightly.",
  ].join("\n");

  const enrichedInput: CoachRequest = {
    ...input,
    context: `${input.context ?? ""}\n\nLONGITUDINAL USER CONTEXT\n${memory}`,
  };

  let result: CoachResponse | null = null;
  const agentUrl = process.env.PROOF_AGENT_URL;
  if (agentUrl) {
    try {
      const response = await fetch(`${agentUrl.replace(/\/$/, "")}/coach`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env.POMERIUM_SERVICE_ACCOUNT_JWT
            ? { authorization: `Bearer Pomerium-${process.env.POMERIUM_SERVICE_ACCOUNT_JWT}` }
            : {}),
          ...(process.env.PROOF_AGENT_TOKEN
            ? { "x-proof-agent-token": process.env.PROOF_AGENT_TOKEN }
            : {}),
          ...(process.env.ZERO_ACCESS_TOKEN ? { "x-zero-access-token": process.env.ZERO_ACCESS_TOKEN } : {}),
          ...(process.env.ZERO_REFRESH_TOKEN ? { "x-zero-refresh-token": process.env.ZERO_REFRESH_TOKEN } : {}),
          ...(process.env.ZERO_USER_ID ? { "x-zero-user-id": process.env.ZERO_USER_ID } : {}),
        },
        body: JSON.stringify(enrichedInput),
        signal: AbortSignal.timeout(25_000),
      });

      if (response.ok) result = (await response.json()) as CoachResponse;
    } catch {
      // Keep the check-in available if a sponsor service is temporarily unavailable.
    }
  }

  result ??= runLocalCoach(enrichedInput);
  const completeFallback = runLocalCoach(enrichedInput);
  result.hypotheses = Array.isArray(result.hypotheses) && result.hypotheses.length === 3 ? result.hypotheses : completeFallback.hypotheses;
  result.selectedHypothesisId ||= completeFallback.selectedHypothesisId;
  result.selectionReason ||= completeFallback.selectionReason;
  result.prediction ||= completeFallback.prediction;
  if (typeof result.confidence === "number") {
    result.confidence = Math.max(0, Math.min(100, Math.round(result.confidence <= 1 ? result.confidence * 100 : result.confidence)));
  }

  const now = new Date().toISOString();
  const checkInId = input.checkInId || crypto.randomUUID();
  result.checkInId = checkInId;

  const record = {
    id: checkInId,
    userEmail: user.email,
    stage: input.stage,
    goal: input.goal.trim().slice(0, 500),
    observation: (input.context ?? "").trim().slice(0, 2000),
    reflection: input.reflection?.trim().slice(0, 2000) || null,
    completed: typeof input.completed === "boolean" ? input.completed : null,
    hypothesis: result.hypothesis,
    confidence: result.confidence,
    hypotheses: result.hypotheses,
    selectedHypothesisId: result.selectedHypothesisId,
    selectionReason: result.selectionReason,
    prediction: result.prediction,
    experimentTitle: result.experiment.title,
    experimentInstruction: result.experiment.instruction,
    experimentDuration: result.experiment.duration,
    insight: result.insight ?? null,
    learned: result.learned ?? null,
    provider: result.provider,
    zeroRuns: result.zeroRuns ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(checkIns).values(record).onConflictDoUpdate({
    target: checkIns.id,
    set: { ...record, createdAt: undefined },
  });

  return NextResponse.json(result);
}
