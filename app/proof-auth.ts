import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "../db";
import { accounts, sessions } from "../db/schema";

export const SESSION_COOKIE = "proof_session";
export const SESSION_AGE_SECONDS = 60 * 60 * 24 * 30;

export type ProofUser = { email: string; displayName: string };

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function hashPassword(password: string, salt?: string) {
  const saltBytes = salt ? base64UrlToBytes(salt) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: 100_000 }, key, 256);
  return { salt: bytesToBase64Url(saltBytes), hash: bytesToBase64Url(new Uint8Array(bits)) };
}

export async function passwordMatches(password: string, salt: string, expectedHash: string) {
  const { hash } = await hashPassword(password, salt);
  if (hash.length !== expectedHash.length) return false;
  let mismatch = 0;
  for (let index = 0; index < hash.length; index += 1) mismatch |= hash.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  return mismatch === 0;
}

export async function createSession(userEmail: string) {
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const now = new Date();
  await getDb().insert(sessions).values({
    tokenHash: await sha256(token),
    userEmail,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_AGE_SECONDS * 1000).toISOString(),
  });
  return token;
}

export async function getProofUser(): Promise<ProofUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const [session] = await db.select().from(sessions).where(eq(sessions.tokenHash, await sha256(token))).limit(1);
  if (!session || session.expiresAt <= new Date().toISOString()) return null;
  const [account] = await db.select().from(accounts).where(eq(accounts.email, session.userEmail)).limit(1);
  return account ? { email: account.email, displayName: account.displayName } : null;
}

export async function requireProofUser(returnTo: string): Promise<ProofUser> {
  const user = await getProofUser();
  if (user) return user;
  redirect(`/login?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`);
}

export function safeReturnPath(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/experiment";
  return value;
}

export async function tokenHashFromCookie() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? sha256(token) : null;
}
