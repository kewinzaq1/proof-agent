import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { checkIns } from "../../../db/schema";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const history = await getDb()
    .select()
    .from(checkIns)
    .where(and(eq(checkIns.userEmail, user.email), eq(checkIns.stage, "reflect")))
    .orderBy(desc(checkIns.updatedAt))
    .limit(8);

  return NextResponse.json({ history });
}
