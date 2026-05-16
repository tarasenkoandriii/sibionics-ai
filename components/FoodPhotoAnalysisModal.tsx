"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

type MealItem = {
  name?: string;
  type?: string;
  quantity?: string;
  calories_kcal?: number | string;
  protein_g?: number | string;
  fat_g?: number | string;
  carbs_g?: number | string;
  confidence?: "low" | "medium" | "high" | string;
};

type MealTotals = {
  calories_kcal?: number | string;
  carbs_g?: number | string;
  protein_g?: number | string;
  fat_g?: number | string;
};

type FoodAnalysisResult = {
  summary?: string;
  meal_items?: MealItem[];
  meal_totals?: MealTotals;
  insights?: string[];
  possible_risks?: string[];
  recommended_next_steps?: string[];
  confidence?: "low" | "medium" | "high" | string;
  medical_disclaimer?: string;
};

type AiAnalyzeResponse = {
  result?: FoodAnalysisResult;
  error?: string;
  userMessage?: string;
  code?: string;
  warning?: string;
  fallback?: string;
};

type Status = "idle" | "capturing" | "analyzing" | "done" | "error";

const copy: Record<Locale, {
  title: string;
  intro: string;
  cameraLabel: string;
  cameraHint: string;
  analyzing: string;
  editableTitle: string;
  close: string;
  retry: string;
  genericError: string;
  warningFallback: string;
}> = {
  ua: {
    title: "Додати їжу",
    intro: "Зробіть фото прийому їжі. Grok AI розпізнає страви, приблизну кількість, калорії, білки, жири та вуглеводи. Після відповіді текст можна відредагувати вручну.",
    cameraLabel: "Зробити фото їжі",
    cameraHint: "Натисніть кнопку з фотоапаратом справа зверху, щоб сфотографувати їжу.",
    analyzing: "Grok AI розпізнає страви та розраховує приблизні макроси...",
    editableTitle: "Редагований результат API",
    close: "Закрити",
    retry: "Зробити інше фото",
    genericError: "Не вдалося розпізнати їжу. Спробуйте зробити чіткіше фото або повторіть пізніше.",
    warningFallback: "Grok тимчасово перевантажений, тому показано fallback-відповідь. Для точного розпізнавання повторіть аналіз пізніше."
  },
  ru: {
    title: "Добавить еду",
    intro: "Сделайте фото приема пищи. Grok AI распознает блюда, примерное количество, калории, белки, жиры и углеводы. После ответа текст можно отредактировать вручную.",
    cameraLabel: "Сделать фото еды",
    cameraHint: "Нажмите кнопку с фотоаппаратом справа сверху, чтобы сфотографировать еду.",
    analyzing: "Grok AI распознает блюда и рассчитывает примерные макросы...",
    editableTitle: "Редактируемый результат API",
    close: "Закрыть",
    retry: "Сделать другое фото",
    genericError: "Не удалось распознать еду. Попробуйте сделать более четкое фото или повторите позже.",
    warningFallback: "Grok временно перегружен, поэтому показан fallback-ответ. Для точного распознавания повторите анализ позже."
  },
  pl: {
    title: "Dodaj posiłek",
    intro: "Zrób zdjęcie posiłku. Grok AI rozpozna dania, przybliżone ilości, kalorie, białko, tłuszcze i węglowodany. Po odpowiedzi tekst można edytować ręcznie.",
    cameraLabel: "Zrób zdjęcie posiłku",
    cameraHint: "Naciśnij przycisk aparatu w prawym górnym rogu, aby sfotografować posiłek.",
    analyzing: "Grok AI rozpoznaje dania i szacuje makroskładniki...",
    editableTitle: "Edytowalny wynik API",
    close: "Zamknij",
    retry: "Zrób inne zdjęcie",
    genericError: "Nie udało się rozpoznać posiłku. Zrób wyraźniejsze zdjęcie lub spróbuj później.",
    warningFallback: "Grok jest tymczasowo przeciążony, dlatego pokazano odpowiedź fallback. Powtórz analizę później."
  },
  en: {
    title: "Add food",
    intro: "Take a photo of the meal. Grok AI will identify dishes, approximate quantity, calories, protein, fat, and carbs. You can edit the text after the API response.",
    cameraLabel: "Take a meal photo",
    cameraHint: "Tap the camera button in the top-right corner to photograph the meal.",
    analyzing: "Grok AI is identifying dishes and estimating macros...",
    editableTitle: "Editable API result",
    close: "Close",
    retry: "Take another photo",
    genericError: "Food recognition failed. Try taking a clearer photo or repeat later.",
    warningFallback: "Grok is temporarily overloaded, so a fallback answer is shown. Repeat later for accurate recognition."
  }
};

function formatValue(value: unknown, unit: string) {
  if (value === undefined || value === null || value === "") return "—";
  return `${value} ${unit}`;
}

function buildEditableText(result: FoodAnalysisResult | null) {
  if (!result) return "";

  const lines: string[] = [];
  lines.push("Результат розпізнавання їжі");
  lines.push("");

  if (result.summary) {
    lines.push(`Коротко: ${result.summary}`);
    lines.push("");
  }

  const items = Array.isArray(result.meal_items) ? result.meal_items : [];
  if (items.length) {
    lines.push("Страви:");
    items.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.name || "Невідома страва"}`);
      lines.push(`   Тип: ${item.type || "не визначено"}`);
      lines.push(`   Кількість: ${item.quantity || "не визначено"}`);
      lines.push(`   Калорії: ${formatValue(item.calories_kcal, "ккал")}`);
      lines.push(`   Білки: ${formatValue(item.protein_g, "г")}`);
      lines.push(`   Жири: ${formatValue(item.fat_g, "г")}`);
      lines.push(`   Вуглеводи: ${formatValue(item.carbs_g, "г")}`);
      lines.push("");
    });
  } else {
    lines.push("Страви: не визначено");
    lines.push("");
  }

  lines.push("Разом за прийом їжі:");
  lines.push(`Калорії: ${formatValue(result.meal_totals?.calories_kcal, "ккал")}`);
  lines.push(`Вуглеводи: ${formatValue(result.meal_totals?.carbs_g, "г")}`);
  lines.push(`Білки: ${formatValue(result.meal_totals?.protein_g, "г")}`);
  lines.push(`Жири: ${formatValue(result.meal_totals?.fat_g, "г")}`);

  if (result.insights?.length) {
    lines.push("");
    lines.push("Коментар:");
    result.insights.forEach((item) => lines.push(`- ${item}`));
  }

  if (result.medical_disclaimer) {
    lines.push("");
    lines.push(result.medical_disclaimer);
  }

  return lines.join("\n").trim();
}

export function FoodPhotoAnalysisModal({ locale, open, onClose }: { locale: Locale; open: boolean; onClose: () => void }) {
  const text = copy[locale] || copy.ua;
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);
  const [editableText, setEditableText] = useState("");

  const hasResponse = useMemo(() => status === "done" && editableText.trim().length > 0, [editableText, status]);

  if (!open) return null;

  const openCamera = () => {
    setStatus("capturing");
    setError(null);
    setWarning(null);
    inputRef.current?.click();
  };

  const analyzeFoodPhoto = async (file: File) => {
    setStatus("analyzing");
    setError(null);
    setWarning(null);
    setResult(null);
    setEditableText("");

    const formData = new FormData();
    formData.append("mode", "food_photo");
    formData.append("image", file);

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json().catch(() => ({}))) as AiAnalyzeResponse;

      if (!response.ok) {
        const message = payload?.userMessage || payload?.error || text.genericError;
        throw new Error(message);
      }

      if (payload?.code === "AI_TEMPORARILY_UNAVAILABLE" || payload?.fallback === "grok_capacity") {
        setWarning(payload.warning || text.warningFallback);
      }

      const apiResult = payload.result || null;
      setResult(apiResult);
      setEditableText(buildEditableText(apiResult));
      setStatus("done");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : text.genericError);
      setStatus("error");
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      setStatus(result ? "done" : "idle");
      return;
    }

    void analyzeFoodPhoto(file);
  };

  return (
    <div className="food-modal-backdrop" role="dialog" aria-modal="true" aria-label={text.title}>
      <div className="food-modal-panel">
        <input
          ref={inputRef}
          className="install-photo-input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          aria-hidden="true"
          tabIndex={-1}
        />

        <button
          type="button"
          className="install-photo-fab food-modal-camera-button"
          onClick={openCamera}
          aria-label={text.cameraLabel}
          disabled={status === "analyzing"}
        >
          <span aria-hidden="true">📷</span>
        </button>

        <button type="button" className="food-modal-close" onClick={onClose} aria-label={text.close}>
          ×
        </button>

        <div className="food-modal-copy-block">
          <span className="kicker">Grok Food AI</span>
          <h2>{text.title}</h2>
          <p>{text.intro}</p>
          <p className="muted">{text.cameraHint}</p>
        </div>

        {status === "analyzing" && (
          <div className="food-modal-state food-modal-loading">
            <span className="install-photo-spinner" />
            <p>{text.analyzing}</p>
          </div>
        )}

        {status === "error" && (
          <div className="food-modal-state food-modal-error">
            <strong>Помилка розпізнавання</strong>
            <p>{error || text.genericError}</p>
            <button type="button" className="btn btn-secondary" onClick={openCamera}>
              {text.retry}
            </button>
          </div>
        )}

        {warning && <div className="food-modal-warning">{warning}</div>}

        {hasResponse && (
          <div className="food-modal-result-editor">
            <h3>{text.editableTitle}</h3>
            <textarea
              value={editableText}
              onChange={(event) => setEditableText(event.target.value)}
              rows={16}
              aria-label={text.editableTitle}
            />
          </div>
        )}
      </div>
    </div>
  );
}
