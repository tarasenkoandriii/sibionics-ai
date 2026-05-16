"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

type InsulinItem = {
  name?: string;
  type?: "slow" | "fast" | "mixed" | "both" | "unknown" | string;
  type_label?: string;
  visible_dose_units?: string;
  dose_source?: string;
  confidence?: "low" | "medium" | "high" | string;
};

type InsulinSummary = {
  detected_type?: "slow" | "fast" | "mixed" | "both" | "unknown" | string;
  detected_type_label?: string;
  visible_total_dose_units?: string;
  confidence?: "low" | "medium" | "high" | string;
};

type InsulinAnalysisResult = {
  summary?: string;
  insulin_items?: InsulinItem[];
  insulin_summary?: InsulinSummary;
  insights?: string[];
  possible_risks?: string[];
  recommended_next_steps?: string[];
  confidence?: "low" | "medium" | "high" | string;
  medical_disclaimer?: string;
};

type AiAnalyzeResponse = {
  result?: InsulinAnalysisResult;
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
    title: "Відмітити інсулін",
    intro: "Зробіть фото інсулінової ручки, упаковки або шкали дози. Grok AI спробує розпізнати тип інсуліну — швидкий, повільний або обидва — і лише видиму на фото дозу. Після відповіді текст можна відредагувати вручну.",
    cameraLabel: "Зробити фото інсуліну",
    cameraHint: "Натисніть кнопку з фотоапаратом справа зверху, щоб сфотографувати інсулін.",
    analyzing: "Grok AI розпізнає тип інсуліну та видиму дозу на фото...",
    editableTitle: "Редагований результат API",
    close: "Закрити",
    retry: "Зробити інше фото",
    genericError: "Не вдалося розпізнати інсулін. Спробуйте зробити чіткіше фото етикетки або шкали дози.",
    warningFallback: "Grok тимчасово перевантажений, тому показано fallback-відповідь. Для точного розпізнавання повторіть аналіз пізніше."
  },
  ru: {
    title: "Отметить инсулин",
    intro: "Сделайте фото инсулиновой ручки, упаковки или шкалы дозы. Grok AI попробует распознать тип инсулина — быстрый, медленный или оба — и только видимую на фото дозу. После ответа текст можно отредактировать вручную.",
    cameraLabel: "Сделать фото инсулина",
    cameraHint: "Нажмите кнопку с фотоаппаратом справа сверху, чтобы сфотографировать инсулин.",
    analyzing: "Grok AI распознает тип инсулина и видимую дозу на фото...",
    editableTitle: "Редактируемый результат API",
    close: "Закрыть",
    retry: "Сделать другое фото",
    genericError: "Не удалось распознать инсулин. Попробуйте сделать более четкое фото этикетки или шкалы дозы.",
    warningFallback: "Grok временно перегружен, поэтому показан fallback-ответ. Для точного распознавания повторите анализ позже."
  },
  pl: {
    title: "Zapisz insulinę",
    intro: "Zrób zdjęcie pena, opakowania lub skali dawki. Grok AI spróbuje rozpoznać typ insuliny — szybka, długa lub oba typy — oraz wyłącznie dawkę widoczną na zdjęciu. Po odpowiedzi tekst można edytować ręcznie.",
    cameraLabel: "Zrób zdjęcie insuliny",
    cameraHint: "Naciśnij przycisk aparatu w prawym górnym rogu, aby sfotografować insulinę.",
    analyzing: "Grok AI rozpoznaje typ insuliny i dawkę widoczną na zdjęciu...",
    editableTitle: "Edytowalny wynik API",
    close: "Zamknij",
    retry: "Zrób inne zdjęcie",
    genericError: "Nie udało się rozpoznać insuliny. Zrób wyraźniejsze zdjęcie etykiety lub skali dawki.",
    warningFallback: "Grok jest tymczasowo przeciążony, dlatego pokazano odpowiedź fallback. Powtórz analizę później."
  },
  en: {
    title: "Log insulin",
    intro: "Take a photo of the insulin pen, package, or dose scale. Grok AI will try to identify the insulin type — fast, slow, or both — and only the dose visible in the photo. You can edit the text after the API response.",
    cameraLabel: "Take an insulin photo",
    cameraHint: "Tap the camera button in the top-right corner to photograph the insulin.",
    analyzing: "Grok AI is identifying the insulin type and visible dose in the photo...",
    editableTitle: "Editable API result",
    close: "Close",
    retry: "Take another photo",
    genericError: "Insulin recognition failed. Try taking a clearer photo of the label or dose scale.",
    warningFallback: "Grok is temporarily overloaded, so a fallback answer is shown. Repeat later for accurate recognition."
  }
};

function buildEditableText(result: InsulinAnalysisResult | null) {
  if (!result) return "";

  const lines: string[] = [];
  lines.push("Результат розпізнавання інсуліну");
  lines.push("");

  if (result.summary) {
    lines.push(`Коротко: ${result.summary}`);
    lines.push("");
  }

  const summary = result.insulin_summary;
  lines.push("Загальний висновок:");
  lines.push(`Тип: ${summary?.detected_type_label || "не визначено"}`);
  lines.push(`Видима доза: ${summary?.visible_total_dose_units || "не видно"}`);
  lines.push(`Впевненість: ${summary?.confidence || result.confidence || "не визначено"}`);

  const items = Array.isArray(result.insulin_items) ? result.insulin_items : [];
  if (items.length) {
    lines.push("");
    lines.push("Об'єкти на фото:");
    items.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.name || "Інсулін / ручка"}`);
      lines.push(`   Тип: ${item.type_label || item.type || "не визначено"}`);
      lines.push(`   Видима доза: ${item.visible_dose_units || "не видно"}`);
      lines.push(`   Джерело дози: ${item.dose_source || "не визначено"}`);
      lines.push(`   Впевненість: ${item.confidence || "не визначено"}`);
      lines.push("");
    });
  }

  if (result.insights?.length) {
    lines.push("Коментар:");
    result.insights.forEach((item) => lines.push(`- ${item}`));
  }

  if (result.possible_risks?.length) {
    lines.push("");
    lines.push("Ризики помилки:");
    result.possible_risks.forEach((item) => lines.push(`- ${item}`));
  }

  if (result.medical_disclaimer) {
    lines.push("");
    lines.push(result.medical_disclaimer);
  }

  return lines.join("\n").trim();
}

export function InsulinPhotoAnalysisModal({ locale, open, onClose }: { locale: Locale; open: boolean; onClose: () => void }) {
  const text = copy[locale] || copy.ua;
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [result, setResult] = useState<InsulinAnalysisResult | null>(null);
  const [editableText, setEditableText] = useState("");

  const hasResponse = useMemo(() => status === "done" && editableText.trim().length > 0, [editableText, status]);

  if (!open) return null;

  const openCamera = () => {
    setStatus("capturing");
    setError(null);
    setWarning(null);
    inputRef.current?.click();
  };

  const analyzeInsulinPhoto = async (file: File) => {
    setStatus("analyzing");
    setError(null);
    setWarning(null);
    setResult(null);
    setEditableText("");

    const formData = new FormData();
    formData.append("mode", "insulin_photo");
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

    void analyzeInsulinPhoto(file);
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
          <span className="kicker">Grok Insulin AI</span>
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
