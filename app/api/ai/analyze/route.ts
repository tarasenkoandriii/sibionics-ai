import { NextResponse } from "next/server";
import { AI_MODES, type AiModeId } from "@/lib/product";
import { analysisSchema, getAnalysisPrompt } from "@/lib/ai-prompts";
import { callGrokChatCompletion, extractGrokErrorMessage, extractGrokModelIds, getGrokVisionModels, isGrokRetryableModelError, isGrokTemporaryProviderError, listGrokModels, mergeGrokModelCandidates, parseJsonFromText, readBooleanEnv, readPositiveIntegerEnv, readPositiveNumberEnv } from "@/lib/grok";

const allowedModes = new Set<string>(AI_MODES.map((mode) => mode.id));
const DEFAULT_MAX_IMAGE_MB = 1;
const DEFAULT_MAX_OUTPUT_TOKENS = 500;
const DEFAULT_AUTO_DISCOVER_GROK_MODELS = true;
const DEFAULT_FALLBACK_ON_GROK_CAPACITY = true;

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

function isGrokModelAutoDiscoveryEnabled() {
  return readBooleanEnv("GROK_AUTO_DISCOVER_MODELS", DEFAULT_AUTO_DISCOVER_GROK_MODELS);
}

function shouldFallbackOnGrokCapacity() {
  return readBooleanEnv("AI_ANALYSIS_FALLBACK_ON_GROK_CAPACITY", DEFAULT_FALLBACK_ON_GROK_CAPACITY);
}

function getMockAnalysis(mode: AiModeId) {
  const sensorTapeResult = {
    summary: "Демо-перевірка: AI_ANALYSIS_MOCK=true. Видимих критичних ознак проблеми не виявлено, але якість фіксації потрібно оцінити вручну перед використанням.",
    insights: [
      "Фото прийнято у режимі перевірки установки сенсора.",
      "У mock-режимі реальний аналіз зображення не виконується.",
      "Для справжньої оцінки вимкніть AI_ANALYSIS_MOCK і задайте XAI_API_KEY."
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
        recommended_next_steps: ["Вимкніть AI_ANALYSIS_MOCK і задайте XAI_API_KEY для реального аналізу."],
        confidence: "low",
        medical_disclaimer: "Це тестовий результат, не медична діагностика."
      };
}

function getTemporaryUnavailableAnalysis(mode: AiModeId) {
  const base = getMockAnalysis(mode);

  if (mode === "sensor_tape") {
    return {
      ...base,
      summary: "AI-перевірка тимчасово недоступна через високе навантаження на Grok. Це fallback-результат: перевірте, чи сенсор щільно прилягає до шкіри, чи тейп не має складок і чи краї не відклеюються.",
      insights: [
        "Grok зараз перевантажений, тому реальний аналіз фото не завершився.",
        "Фото було прийнято backend endpoint-ом /api/ai/analyze.",
        "Для точної оцінки повторіть перевірку за кілька хвилин."
      ],
      possible_risks: [
        "Без реального AI-аналізу неможливо підтвердити перекіс сенсора, відклеювання тейпа або подразнення шкіри.",
        "Якщо є біль, кров, виражене почервоніння або нестабільні показання, не покладайтеся на fallback-результат."
      ],
      recommended_next_steps: [
        "Повторіть фото-перевірку через кілька хвилин.",
        "Візуально перевірте, чи немає зазору між сенсором і шкірою.",
        "Перевірте краї тейпа; за потреби додайте прозору фіксацію.",
        "При болю, сильному подразненні або сумнівах зверніться до лікаря."
      ],
      confidence: "low",
      medical_disclaimer: "Fallback-результат не є медичною діагностикою і не є повноцінним AI-аналізом фото."
    };
  }

  return {
    ...base,
    summary: "AI-перевірка тимчасово недоступна через високе навантаження на Grok. Повторіть спробу за кілька хвилин.",
    confidence: "low",
    medical_disclaimer: "Fallback-результат не є медичною діагностикою."
  };
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

    const prompt = `${getAnalysisPrompt(mode)}

Return strictly valid JSON matching this JSON Schema. Do not wrap it in markdown. Schema:
${JSON.stringify(analysisSchema)}`;
    let models = getGrokVisionModels();
    const modelDiscovery: { enabled: boolean; status?: number; error?: string; models?: string[] } = {
      enabled: isGrokModelAutoDiscoveryEnabled()
    };

    if (modelDiscovery.enabled) {
      try {
        const { response: modelsResponse, payload: modelsPayload } = await listGrokModels();
        modelDiscovery.status = modelsResponse.status;

        if (modelsResponse.ok) {
          const availableModels = extractGrokModelIds(modelsPayload);
          modelDiscovery.models = availableModels;
          models = mergeGrokModelCandidates(models, availableModels);
        } else {
          modelDiscovery.error = String(modelsPayload?.error?.message || modelsPayload?.error || "Unable to list Grok models");
        }
      } catch (error) {
        modelDiscovery.error = error instanceof Error ? error.message : "Unable to list Grok models";
      }
    }

    if (models.length === 0) {
      return NextResponse.json(
        {
          error: "No Grok chat model candidates configured for image analysis.",
          hint: "Set GROK_VISION_MODEL to a valid xAI chat model from npm run test:grok:models, for example GROK_VISION_MODEL=grok-4. Do not use image generation models like grok-imagine-image-pro or OpenRouter-style IDs like grok/compound-mini.",
          modelDiscovery
        },
        { status: 500 }
      );
    }

    const maxOutputTokens = getMaxOutputTokens();
    const attemptedModels: Array<{ model: string; status: number; error?: string; temporaryUnavailable?: boolean }> = [];
    let lastPayload: any = null;
    let hasTemporaryProviderError = false;

    for (const model of models) {
      const { response: grokResponse, payload } = await callGrokChatCompletion({
        model,
        maxTokens: maxOutputTokens,
        responseFormat: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } }
            ]
          }
        ]
      });

      if (grokResponse.ok) {
        const text = payload?.choices?.[0]?.message?.content || "";
        const result = parseJsonFromText(text);

        return NextResponse.json({
          result,
          mode,
          model,
          attemptedModels,
          modelDiscovery,
          mock: false,
          limits: {
            maxImageMb,
            maxOutputTokens
          }
        });
      }

      const error = extractGrokErrorMessage(payload) || "Grok analysis failed";
      const temporaryUnavailable = isGrokTemporaryProviderError(payload, grokResponse.status);
      if (temporaryUnavailable) hasTemporaryProviderError = true;

      attemptedModels.push({
        model,
        status: grokResponse.status,
        error: String(error),
        ...(temporaryUnavailable ? { temporaryUnavailable: true } : {})
      });
      lastPayload = payload;

      if (!isGrokRetryableModelError(payload) && !temporaryUnavailable) {
        break;
      }
    }

    if (hasTemporaryProviderError) {
      const message = "AI-перевірка тимчасово недоступна через високе навантаження. Повторіть спробу за кілька хвилин.";

      if (shouldFallbackOnGrokCapacity()) {
        return NextResponse.json({
          result: getTemporaryUnavailableAnalysis(mode),
          mode,
          model: attemptedModels.at(-1)?.model || models[0],
          attemptedModels,
          modelDiscovery,
          mock: true,
          fallback: "grok_capacity",
          warning: message,
          code: "AI_TEMPORARILY_UNAVAILABLE",
          limits: {
            maxImageMb,
            maxOutputTokens
          }
        });
      }

      return NextResponse.json(
        {
          error: message,
          userMessage: message,
          code: "AI_TEMPORARILY_UNAVAILABLE",
          details: lastPayload,
          model: attemptedModels.at(-1)?.model || models[0],
          attemptedModels,
          modelDiscovery
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: extractGrokErrorMessage(lastPayload) || "Grok analysis failed",
        details: lastPayload,
        model: attemptedModels.at(-1)?.model || models[0],
        attemptedModels,
        modelDiscovery
      },
      { status: 502 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI analysis error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
