import { NextResponse } from "next/server";
import { buildMockTimeline, predictGlucose } from "@/lib/cgm";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const minutes = Math.max(30, Math.min(24 * 60, Number(searchParams.get("minutes") || 180)));
  const step = Math.max(1, Math.min(15, Number(searchParams.get("step") || 5)));
  const readings = buildMockTimeline(minutes, step);
  const prediction = predictGlucose(readings, { engine: "mock" });

  return NextResponse.json({ readings, prediction, source: "mock", generatedAt: new Date().toISOString() });
}
