import { NextResponse } from "next/server";
import { runLocalCoach, type CoachRequest, type CoachResponse } from "../../../lib/coach";

export async function POST(request: Request) {
  const input = (await request.json()) as CoachRequest;

  if (!input.goal?.trim() || !["plan", "reflect"].includes(input.stage)) {
    return NextResponse.json({ error: "A goal and valid stage are required." }, { status: 400 });
  }

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
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(15_000),
      });

      if (response.ok) {
        const result = (await response.json()) as CoachResponse;
        return NextResponse.json(result);
      }
    } catch {
      // The deterministic loop keeps the demo usable if the sponsor service is unavailable.
    }
  }

  return NextResponse.json(runLocalCoach(input));
}
