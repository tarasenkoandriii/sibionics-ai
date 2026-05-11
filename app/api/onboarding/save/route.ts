import { NextResponse } from "next/server";
import { createProfileId, saveOnboardingProfile } from "@/lib/onboarding";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (name.length < 2) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const profile = await saveOnboardingProfile({
      profileId: String(body.profileId || createProfileId()),
      locale: String(body.locale || "ua"),
      name,
      age: body.age ? Number(body.age) : undefined,
      diabetesType: String(body.diabetesType || "").trim() || undefined,
      therapy: String(body.therapy || "").trim() || undefined,
      cgmDevice: String(body.cgmDevice || "Sibionics GS3").trim(),
      lowThresholdMgDl: Math.max(40, Math.min(120, Number(body.lowThresholdMgDl || 70))),
      highThresholdMgDl: Math.max(120, Math.min(300, Number(body.highThresholdMgDl || 180))),
      goals: String(body.goals || "").trim() || undefined,
      telegramUsername: String(body.telegramUsername || "").trim().replace(/^@/, "") || undefined,
      createdAt: now,
      updatedAt: now
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onboarding save error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
