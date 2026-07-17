import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "../../../../db";
import { accounts } from "../../../../db/schema";
import { createSession, normalizeEmail, passwordMatches, safeReturnPath, SESSION_AGE_SECONDS, SESSION_COOKIE } from "../../../proof-auth";

export async function POST(request: Request) {
  const input = (await request.json()) as { email?: string; password?: string; returnTo?: string };
  const email = normalizeEmail(input.email ?? "");
  const [account] = await getDb().select().from(accounts).where(eq(accounts.email, email)).limit(1);
  if (!account || !(await passwordMatches(input.password ?? "", account.passwordSalt, account.passwordHash))) {
    return NextResponse.json({ error: "That email and password don’t match." }, { status: 401 });
  }

  const token = await createSession(account.email);
  const response = NextResponse.json({ user: { email: account.email, displayName: account.displayName }, returnTo: safeReturnPath(input.returnTo) });
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_AGE_SECONDS });
  return response;
}
