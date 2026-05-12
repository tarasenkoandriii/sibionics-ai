import { NextResponse } from "next/server";
import { buildMockTimeline, predictGlucose, type CgmPrediction, type CgmReading } from "@/lib/cgm";

export const runtime = "nodejs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

function extractOutputText(payload: any): string {
  if (typeof payload.output_text === "string") return payload.output_text;
  const parts: string[] = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") parts.push(content.text);
      if (typeof content.output_text === "string") parts.push(content.output_text);
    }
  }
  return parts.join("\n");
}

async function refineWithOpenAi(prediction: CgmPrediction, locale: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || process.env.CGM_AI_PREDICTION !== "true") return prediction;

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  `You are a cautious diabetes CGM analysis assistant. Locale: ${locale}. ` +
                  `Rewrite the summary and suggestedActions for this prediction. Do not prescribe medication. JSON only.\n` +
                  JSON.stringify(prediction)
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "CgmPredictionRefinement",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: { type: "string" },
                suggestedActions: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 }
              },
              required: ["summary", "suggestedActions"]
            }
          }
        },
        store: false,
        max_output_tokens: 700
      }),
      cache: "no-store"
    });

    if (!response.ok) return prediction;
    const payload = await response.json();
    const parsed = JSON.parse(extractOutputText(payload));
    return { ...prediction, engine: "openai" as const, summary: parsed.summary, suggestedActions: parsed.suggestedActions };
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
      engine: process.env.CGM_AI_PREDICTION === "true" ? "openai-ready" : "mock"
    });
    const prediction = await refineWithOpenAi(basePrediction, locale);

    return NextResponse.json({ prediction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prediction error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
