import { NextResponse } from "next/server";
import { AI_MODES, type AiModeId } from "@/lib/product";
import { analysisSchema, getAnalysisPrompt } from "@/lib/ai-prompts";

const allowedModes = new Set<string>(AI_MODES.map((mode) => mode.id));
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
const DEFAULT_MAX_IMAGE_MB = 1;
const DEFAULT_MAX_OUTPUT_TOKENS = 500;

function readBooleanEnv(name: string, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

function readPositiveNumberEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readPositiveIntegerEnv(name: string, fallback: number) {
  return Math.round(readPositiveNumberEnv(name, fallback));
}

function getOpenAiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return key;
}

function getModel() {
  return process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
}

function getMaxImageMb() {
  return readPositiveNumberEnv("AI_ANALYSIS_MAX_IMAGE_MB", DEFAULT_MAX_IMAGE_MB);
}

function getMaxImageBytes() {
  return Math.floor(getMaxImageMb() * 1024 * 1024);
}

function getMaxOutputTokens() {
  return readPositiveIntegerEnv("AI_ANALYSIS_MAX_OUTPUT_TOKENS", DEFAULT_MAX_OUTPUT_TOKENS);
}

function isMockAnalysisEnabled() {
  return readBooleanEnv("AI_ANALYSIS_MOCK", false);
}

function getMockAnalysis(mode: AiModeId) {
  const sensorTapeResult = {
    summary: "Демо-перевірка: AI_ANALYSIS_MOCK=true. Видимих критичних ознак проблеми не виявлено, але якість фіксації потрібно оцінити вручну перед використанням.",
    insights: [
      "Фото прийнято у режимі перевірки установки сенсора.",
      "У mock-режимі реальний аналіз зображення не виконується.",
      "Для справжньої оцінки вимкніть AI_ANALYSIS_MOCK і задайте OPENAI_API_KEY."
    ],
    possible_risks: [
      "Можливий перекіс сенсора або часткове відклеювання тейпа потрібно перевіряти на реальному AI-аналізі.",
      "По фото не можна гарантовано визначити положення вусика під шкірою."
    ],
    recommended_next_steps: [
      "Переконайтеся, що сенсор щільно прилягає до шкіри.",
      "Перевірте краї тейпа та додайте прозору фіксацію, якщо є ризик відклеювання.",
      "Якщо є біль, подразнення або нестабільні показання, зверніться до лікаря."
    ],
    confidence: "low",
    medical_disclaimer: "Mock-результат не є медичною діагностикою і не замінює консультацію лікаря."
  };

  return mode === "sensor_tape"
    ? sensorTapeResult
    : {
        summary: "Демо-результат AI_ANALYSIS_MOCK=true. Реальний AI-аналіз не виконувався.",
        insights: ["Файл успішно отримано endpoint-ом AI-аналізу."],
        possible_risks: ["Mock-режим не оцінює реальні ризики."],
        recommended_next_steps: ["Вимкніть AI_ANALYSIS_MOCK і задайте OPENAI_API_KEY для реального аналізу."],
        confidence: "low",
        medical_disclaimer: "Це тестовий результат, не медична діагностика."
      };
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

    const maxImageMb = getMaxImageMb();
    if (file.size > getMaxImageBytes()) {
      return NextResponse.json(
        { error: `Размер изображения должен быть до ${maxImageMb} МБ.`, maxImageMb },
        { status: 400 }
      );
    }

    if (isMockAnalysisEnabled()) {
      return NextResponse.json({
        result: getMockAnalysis(mode),
        mode,
        model: "local-ai-analysis-mock",
        mock: true,
        limits: {
          maxImageMb,
          maxOutputTokens: getMaxOutputTokens()
        }
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    const prompt = getAnalysisPrompt(mode);
    const model = getModel();
    const maxOutputTokens = getMaxOutputTokens();
    const openAiResponse = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOpenAiKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
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
        max_output_tokens: maxOutputTokens,
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
        { error: payload.error?.message || "OpenAI analysis failed", details: payload, model },
        { status: 502 }
      );
    }

    const text = extractOutputText(payload);
    const result = parseJsonOutput(text);

    return NextResponse.json({
      result,
      mode,
      model,
      mock: false,
      limits: {
        maxImageMb,
        maxOutputTokens
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI analysis error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
