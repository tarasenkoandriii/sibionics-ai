import { NextResponse } from "next/server";
import { buildMockTimeline, predictGlucose, type CgmPrediction, type CgmReading } from "@/lib/cgm";
import { callGrokChatCompletion, extractGrokText, getGrokMaxOutputTokens, getGrokModel, hasGrokApiKey, parseJsonFromText } from "@/lib/grok";

export const runtime = "nodejs";

async function refineWithGrok(prediction: CgmPrediction, locale: string) {
  if (!hasGrokApiKey() || process.env.CGM_AI_PREDICTION !== "true") return prediction;

  try {
    const model = getGrokModel();
    const { response, payload } = await callGrokChatCompletion({
      model,
      maxTokens: getGrokMaxOutputTokens(700),
      responseFormat: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a cautious diabetes CGM analysis assistant. Do not diagnose, prescribe, or calculate insulin doses. Return valid JSON only."
        },
        {
          role: "user",
          content:
            `Locale: ${locale}. Rewrite the summary and suggestedActions for this prediction. ` +
            `JSON schema: {"summary":"string","suggestedActions":["string"]}.\n` +
            JSON.stringify(prediction)
        }
      ]
    });

    if (!response.ok) return prediction;
    const parsed = parseJsonFromText(extractGrokText(payload));
    return { ...prediction, engine: "grok" as const, summary: parsed.summary, suggestedActions: parsed.suggestedActions };
  } catch {
    return prediction;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const readings = Array.isArray(body.readings) && body.readings.length ? (body.readings as CgmReading[]) : buildMockTimeline();
    const locale = String(body.locale || "ua");
    const mealCarbsGrams = Number(body.mealCarbsGrams || 0);
    const activeInsulinUnits = Number(body.activeInsulinUnits || 0);

    const basePrediction = predictGlucose(readings, {
      mealCarbsGrams,
      activeInsulinUnits,
      engine: process.env.CGM_AI_PREDICTION === "true" ? "grok-ready" : "mock"
    });
    const prediction = await refineWithGrok(basePrediction, locale);

    return NextResponse.json({ prediction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prediction error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
