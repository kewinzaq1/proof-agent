import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { profiles, type FocusArea } from "../../../db/schema";

type ProfileInput = {
  displayName?: string;
  lifeSeason?: string;
  focusAreas?: FocusArea[];
  lifeSnapshot?: string;
  desiredShift?: string;
  checkInRhythm?: string;
};

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const [profile] = await getDb().select().from(profiles).where(eq(profiles.email, user.email)).limit(1);
  return NextResponse.json({ profile: profile ?? null });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const input = (await request.json()) as ProfileInput;
  const focusAreas = Array.isArray(input.focusAreas) ? input.focusAreas.slice(0, 3) : [];
  if (
    !input.displayName?.trim() ||
    !input.lifeSeason?.trim() ||
    focusAreas.length === 0 ||
    !input.lifeSnapshot?.trim() ||
    !input.desiredShift?.trim() ||
    !input.checkInRhythm?.trim()
  ) {
    return NextResponse.json({ error: "Complete each onboarding step." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const profile = {
    email: user.email,
    displayName: input.displayName.trim().slice(0, 80),
    lifeSeason: input.lifeSeason.trim().slice(0, 60),
    focusAreas,
    lifeSnapshot: input.lifeSnapshot.trim().slice(0, 1000),
    desiredShift: input.desiredShift.trim().slice(0, 600),
    checkInRhythm: input.checkInRhythm.trim().slice(0, 40),
    createdAt: now,
    updatedAt: now,
  };

  await getDb().insert(profiles).values(profile).onConflictDoUpdate({
    target: profiles.email,
    set: {
      displayName: profile.displayName,
      lifeSeason: profile.lifeSeason,
      focusAreas: profile.focusAreas,
      lifeSnapshot: profile.lifeSnapshot,
      desiredShift: profile.desiredShift,
      checkInRhythm: profile.checkInRhythm,
      updatedAt: now,
    },
  });

  return NextResponse.json({ profile });
}
