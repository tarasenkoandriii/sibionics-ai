import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createProfileId, saveOnboardingProfile } from "@/lib/onboarding";
import { createCookieOptions, getSessionMaxAgeSeconds, LEGACY_TELEGRAM_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME, signSession, verifySession } from "@/lib/session";
import { readUserByTelegramId, saveUser } from "@/lib/saas-users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (name.length < 2) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value || cookieStore.get(LEGACY_TELEGRAM_SESSION_COOKIE_NAME)?.value;
    const session = verifySession(sessionToken);
    const profile = await saveOnboardingProfile({
      profileId: String(body.profileId || createProfileId()),
      locale: String(body.locale || session?.locale || "ua"),
      name,
      age: body.age ? Number(body.age) : undefined,
      diabetesType: String(body.diabetesType || "").trim() || undefined,
      therapy: String(body.therapy || "").trim() || undefined,
      cgmDevice: String(body.cgmDevice || "Sibionics GS3").trim(),
      lowThresholdMgDl: Math.max(40, Math.min(120, Number(body.lowThresholdMgDl || 70))),
      highThresholdMgDl: Math.max(120, Math.min(300, Number(body.highThresholdMgDl || 180))),
      goals: String(body.goals || "").trim() || undefined,
      telegramUsername: String(body.telegramUsername || session?.preferred_username || "").trim().replace(/^@/, "") || undefined,
      createdAt: now,
      updatedAt: now
    });

    let user = null;
    const telegramId = session?.telegramId || session?.sub;
    if (telegramId) {
      const current = await readUserByTelegramId(telegramId);
      if (current) {
        user = await saveUser({
          ...current,
          firstName: current.firstName || name,
          locale: profile.locale,
          onboardingCompleted: true
        });
      }
    }

    const response = NextResponse.json({ ok: true, profile, user });
    if (session && user) {
      const maxAge = getSessionMaxAgeSeconds();
      const token = signSession({
        ...session,
        uid: user.id,
        locale: user.locale,
        onboardingCompleted: true,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        maxAgeSeconds: maxAge
      });
      const cookieOptions = createCookieOptions(maxAge);
      response.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions);
      response.cookies.set(LEGACY_TELEGRAM_SESSION_COOKIE_NAME, token, cookieOptions);
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onboarding save error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
