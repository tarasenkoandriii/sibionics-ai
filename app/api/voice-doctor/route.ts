import { NextResponse } from "next/server";
import { buildMockTimeline, predictGlucose } from "@/lib/cgm";
import { normalizeLocale } from "@/lib/i18n";
import { callGrokChatCompletion, extractGrokText, getGrokMaxOutputTokens, getGrokModel, hasGrokApiKey } from "@/lib/grok";

export const runtime = "nodejs";

function fallbackVoiceDoctorAnswer(message: string, locale: string) {
  const readings = buildMockTimeline(180, 5);
  const prediction = predictGlucose(readings);
  const current = prediction.current;

  const intro =
    locale === "en"
      ? `I see a demo CGM value of ${current.valueMgDl} mg/dL (${current.valueMmolL} mmol/L), trend ${current.trendArrow}.`
      : locale === "pl"
        ? `Widzę demo wartość CGM ${current.valueMgDl} mg/dL (${current.valueMmolL} mmol/L), trend ${current.trendArrow}.`
        : locale === "ru"
          ? `Вижу демо-показатель CGM ${current.valueMgDl} mg/dL (${current.valueMmolL} ммоль/л), тренд ${current.trendArrow}.`
          : `Бачу демо-показник CGM ${current.valueMgDl} mg/dL (${current.valueMmolL} ммоль/л), тренд ${current.trendArrow}.`;

  const safety =
    locale === "en"
      ? "This is not a diagnosis or treatment plan. For dangerous low/high glucose symptoms, follow your clinician-approved plan and seek urgent care if needed."
      : locale === "pl"
        ? "To nie jest diagnoza ani plan leczenia. Przy niebezpiecznych objawach hipo/hiper stosuj plan od lekarza i w razie potrzeby szukaj pilnej pomocy."
        : locale === "ru"
          ? "Это не диагноз и не план лечения. При опасных симптомах гипо/гипергликемии используйте план врача и при необходимости обращайтесь за срочной помощью."
          : "Це не діагноз і не план лікування. При небезпечних симптомах гіпо/гіпер дійте за планом лікаря і за потреби звертайтеся по термінову допомогу.";

  return `${intro}\n\nВаше питання: ${message}\n\n${prediction.summary}\n${prediction.suggestedActions.map((item) => `• ${item}`).join("\n")}\n\n${safety}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body.message || "").trim();
    const locale = normalizeLocale(body.locale);

    if (!message) {
      return NextResponse.json({ error: "Message is empty" }, { status: 400 });
    }

    if (!hasGrokApiKey()) {
      return NextResponse.json({ text: fallbackVoiceDoctorAnswer(message, locale), model: "local-safe-mock" });
    }

    const readings = buildMockTimeline(180, 5);
    const prediction = predictGlucose(readings, { engine: "grok-ready" });

    const model = getGrokModel();
    const { response, payload, raw } = await callGrokChatCompletion({
      model,
      maxTokens: getGrokMaxOutputTokens(700),
      messages: [
        {
          role: "system",
          content:
            "You are an AI Diabetes Voice Doctor widget for a CGM SaaS product. " +
            "Answer in the user locale, be concise and practical, do not diagnose, prescribe, calculate insulin doses, or replace a clinician. " +
            "If symptoms or CGM readings are dangerous, recommend urgent professional care."
        },
        {
          role: "user",
          content: JSON.stringify({ locale, message, cgmPrediction: prediction, history: body.history || [] })
        }
      ]
    });

    if (!response.ok) {
      return NextResponse.json({
        text: fallbackVoiceDoctorAnswer(message, locale),
        model: "local-safe-mock",
        warning: payload.error?.message || raw
      });
    }

    return NextResponse.json({ text: extractGrokText(payload), model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI voice doctor error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
