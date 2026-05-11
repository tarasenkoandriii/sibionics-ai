import { NextResponse } from "next/server";
import { AI_MODES, type AiModeId } from "@/lib/product";
import { analysisSchema, getAnalysisPrompt } from "@/lib/ai-prompts";

const allowedModes = new Set<string>(AI_MODES.map((mode) => mode.id));
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

function getOpenAiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return key;
}

function getModel() {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

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

function parseJsonOutput(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("AI response is not valid JSON");
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const mode = String(form.get("mode") || "") as AiModeId;
    const file = form.get("image");

    if (!allowedModes.has(mode)) {
      return NextResponse.json({ error: "Неизвестный режим AI-анализа." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Загрузите изображение для анализа." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Файл должен быть изображением." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Размер изображения должен быть до 8 МБ." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    const prompt = getAnalysisPrompt(mode);
    const openAiResponse = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOpenAiKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: getModel(),
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: prompt
              },
              {
                type: "input_image",
                image_url: dataUrl
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "SugarPhotoAnalysis",
            strict: true,
            schema: analysisSchema
          }
        },
        max_output_tokens: 1300,
        store: false
      }),
      cache: "no-store"
    });

    const rawText = await openAiResponse.text();
    let payload: any;
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = { raw: rawText };
    }

    if (!openAiResponse.ok) {
      return NextResponse.json(
        { error: payload.error?.message || "OpenAI analysis failed", details: payload },
        { status: 502 }
      );
    }

    const text = extractOutputText(payload);
    const result = parseJsonOutput(text);

    return NextResponse.json({ result, mode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI analysis error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
