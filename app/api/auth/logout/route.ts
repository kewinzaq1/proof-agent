import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "../../../../db";
import { sessions } from "../../../../db/schema";
import { SESSION_COOKIE, tokenHashFromCookie } from "../../../proof-auth";

export async function POST() {
  const tokenHash = await tokenHashFromCookie();
  if (tokenHash) await getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
