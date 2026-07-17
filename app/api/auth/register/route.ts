import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "../../../../db";
import { accounts } from "../../../../db/schema";
import { createSession, hashPassword, normalizeEmail, safeReturnPath, SESSION_AGE_SECONDS, SESSION_COOKIE, validEmail } from "../../../proof-auth";

export async function POST(request: Request) {
  const input = (await request.json()) as { displayName?: string; email?: string; password?: string; returnTo?: string };
  const displayName = input.displayName?.trim().slice(0, 80) ?? "";
  const email = normalizeEmail(input.email ?? "");
  const password = input.password ?? "";

  if (displayName.length < 2 || !validEmail(email) || password.length < 8) {
    return NextResponse.json({ error: "Use your name, a valid email, and at least 8 password characters." }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db.select({ email: accounts.email }).from(accounts).where(eq(accounts.email, email)).limit(1);
  if (existing) return NextResponse.json({ error: "An account already exists for this email. Try signing in." }, { status: 409 });

  const passwordRecord = await hashPassword(password);
  await db.insert(accounts).values({ email, displayName, passwordSalt: passwordRecord.salt, passwordHash: passwordRecord.hash, createdAt: new Date().toISOString() });
  const token = await createSession(email);
  const response = NextResponse.json({ user: { email, displayName }, returnTo: safeReturnPath(input.returnTo) });
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_AGE_SECONDS });
  return response;
}
