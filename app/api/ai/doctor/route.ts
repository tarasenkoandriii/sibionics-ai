import { NextResponse } from "next/server";
import { buildMockTimeline, predictGlucose } from "@/lib/cgm";
import { normalizeLocale } from "@/lib/i18n";
import { callGrokChatCompletion, extractGrokText, getGrokMaxOutputTokens, getGrokModel, hasGrokApiKey } from "@/lib/grok";

export const runtime = "nodejs";


function fallbackAnswer(message: string, locale: string) {
  const readings = buildMockTimeline(180, 5);
  const prediction = predictGlucose(readings);
  const current = prediction.current;

  const intro = locale === "en"
    ? `I see a demo CGM value of ${current.valueMgDl} mg/dL (${current.valueMmolL} mmol/L), trend ${current.trendArrow}.`
    : locale === "pl"
      ? `Widzę demo wartość CGM ${current.valueMgDl} mg/dL (${current.valueMmolL} mmol/L), trend ${current.trendArrow}.`
      : locale === "ru"
        ? `Вижу демо-показатель CGM ${current.valueMgDl} mg/dL (${current.valueMmolL} mmol/L), тренд ${current.trendArrow}.`
        : `Бачу демо-показник CGM ${current.valueMgDl} mg/dL (${current.valueMmolL} mmol/L), тренд ${current.trendArrow}.`;

  const safety = locale === "en"
    ? "This is not a diagnosis or treatment plan. For real hypo/hyper symptoms, use your clinician-approved plan and seek urgent care if needed."
    : locale === "pl"
      ? "To nie jest diagnoza ani plan leczenia. Przy realnych objawach hipo/hiper stosuj plan od lekarza i w razie potrzeby szukaj pomocy pilnej."
      : locale === "ru"
        ? "Это не диагноз и не план лечения. При реальных симптомах гипо/гипер используйте план врача и при необходимости обращайтесь за срочной помощью."
        : "Це не діагноз і не план лікування. При реальних симптомах гіпо/гіпер дійте за планом лікаря і за потреби звертайтеся по термінову допомогу.";

  return `${intro}\n\nПитання / question: ${message}\n\n${prediction.summary}\n${prediction.suggestedActions.map((item) => `• ${item}`).join("\n")}\n\n${safety}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body.message || "").trim();
    const locale = normalizeLocale(body.locale);

    if (!message) {
      return NextResponse.json({ error: "Message is empty" }, { status: 400 });
    }

    const readings = buildMockTimeline(180, 5);
    const prediction = predictGlucose(readings, { engine: "grok-ready" });

    if (!hasGrokApiKey()) {
      return NextResponse.json({ answer: fallbackAnswer(message, locale), model: "local-safe-mock", prediction });
    }

    const model = getGrokModel();
    const { response, payload, raw } = await callGrokChatCompletion({
      model,
      maxTokens: getGrokMaxOutputTokens(900),
      messages: [
        {
          role: "system",
          content:
            "You are an AI diabetes education assistant inside a CGM SaaS dashboard. " +
            "Be helpful, concise, cautious, and localized. Do not diagnose, prescribe, dose insulin, or replace a clinician. " +
            "For urgent low/high glucose symptoms, advise urgent professional care."
        },
        {
          role: "user",
          content: JSON.stringify({ locale, message, cgmPrediction: prediction })
        }
      ]
    });

    if (!response.ok) {
      return NextResponse.json({ answer: fallbackAnswer(message, locale), model: "local-safe-mock", warning: payload.error?.message || raw, prediction });
    }

    return NextResponse.json({ answer: extractGrokText(payload), model, prediction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI doctor error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
