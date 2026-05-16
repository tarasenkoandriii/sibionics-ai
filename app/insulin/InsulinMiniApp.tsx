"use client";

import { ChangeEvent, useRef, useState } from "react";

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

type InsulinEntry = {
  id: string;
  createdAt: string;
  title: string;
  editableText: string;
  result: InsulinAnalysisResult | null;
  expanded: boolean;
  warning?: string | null;
};

type Status = "idle" | "capturing" | "analyzing" | "error";

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
  } else {
    lines.push("");
    lines.push("Об'єкти на фото: не визначено");
  }

  if (result.insights?.length) {
    lines.push("");
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

function getInsulinTitle(result: InsulinAnalysisResult | null, fallbackIndex: number) {
  const summary = result?.insulin_summary;
  const dose = summary?.visible_total_dose_units && summary.visible_total_dose_units !== "не видно"
    ? ` · ${summary.visible_total_dose_units}`
    : "";

  return summary?.detected_type_label ? `${summary.detected_type_label}${dose}` : `Інсулін ${fallbackIndex}`;
}

export default function InsulinMiniApp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [entries, setEntries] = useState<InsulinEntry[]>([]);

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
        const message = payload?.userMessage || payload?.error || "Не вдалося розпізнати інсулін. Спробуйте зробити чіткіше фото етикетки або шкали дози.";
        throw new Error(message);
      }

      const apiResult = payload.result || null;
      const apiWarning = payload?.code === "AI_TEMPORARILY_UNAVAILABLE" || payload?.fallback === "grok_capacity"
        ? payload.warning || "Grok тимчасово перевантажений, тому показано fallback-відповідь. Для точного розпізнавання повторіть аналіз пізніше."
        : null;

      const entry: InsulinEntry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toLocaleString("uk-UA", { dateStyle: "short", timeStyle: "short" }),
        title: getInsulinTitle(apiResult, entries.length + 1),
        editableText: buildEditableText(apiResult),
        result: apiResult,
        expanded: true,
        warning: apiWarning
      };

      setEntries((current) => [entry, ...current.map((item) => ({ ...item, expanded: false }))]);
      setWarning(apiWarning);
      setStatus("idle");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не вдалося розпізнати інсулін. Спробуйте повторити пізніше.");
      setStatus("error");
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      setStatus("idle");
      return;
    }

    void analyzeInsulinPhoto(file);
  };

  const toggleEntry = (id: string) => {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, expanded: !entry.expanded } : entry)));
  };

  const updateEntryText = (id: string, editableText: string) => {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, editableText } : entry)));
  };

  const deleteEntry = (id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  };

  return (
    <main className="meals-mini-app-page insulin-mini-app-page">
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

      <section className="meals-mini-app-hero meals-inline-hero">
        <button
          type="button"
          className="install-photo-fab meals-inline-camera-button"
          onClick={openCamera}
          aria-label="Зробити фото інсуліну"
          disabled={status === "analyzing"}
        >
          <span aria-hidden="true">📷</span>
        </button>

        <span className="kicker">Grok Insulin AI</span>
        <h1>Мій інсулін</h1>
        <p>
          Додавайте записи інсуліну прямо на сторінці: зробіть фото ручки, упаковки або шкали дози,
          дочекайтесь розпізнавання Grok AI, перевірте результат і відредагуйте текст вручну.
        </p>
      </section>

      <section className="meals-mini-app-card meals-inline-add-section">
        <div>
          <h2>Додати інсулін</h2>
          <p>
            Натисніть кнопку з фотоапаратом справа вгорі сторінки або кнопку нижче. Grok AI спробує визначити,
            чи це швидкий, повільний, змішаний інсулін або обидва типи на фото, а також видиму дозу, якщо її можна прочитати.
          </p>
        </div>
        <button type="button" className="btn btn-primary meals-mini-app-add-button" onClick={openCamera} disabled={status === "analyzing"}>
          📷 Додати інсулін
        </button>
      </section>

      {status === "analyzing" && (
        <section className="meals-mini-app-card meals-inline-state meals-inline-loading">
          <span className="install-photo-spinner" />
          <p>Grok AI розпізнає тип інсуліну та видиму дозу на фото...</p>
        </section>
      )}

      {status === "error" && (
        <section className="meals-mini-app-card meals-inline-state meals-inline-error">
          <h2>Помилка розпізнавання</h2>
          <p>{error}</p>
          <button type="button" className="btn btn-secondary" onClick={openCamera}>
            Зробити інше фото
          </button>
        </section>
      )}

      {warning && <section className="meals-mini-app-card meals-inline-warning">{warning}</section>}

      <section className="meals-mini-app-card meals-inline-summary">
        <h2>Підсумок сторінки</h2>
        <div className="meals-inline-summary-grid">
          <div>
            <strong>{entries.length}</strong>
            <span>записів інсуліну</span>
          </div>
          <div>
            <strong>{entries.filter((entry) => entry.result?.insulin_summary?.detected_type === "fast").length}</strong>
            <span>швидких</span>
          </div>
          <div>
            <strong>{entries.filter((entry) => entry.result?.insulin_summary?.detected_type === "slow").length}</strong>
            <span>повільних</span>
          </div>
        </div>
        <p className="muted">Підсумок базується на відповідях AI та не є медичною рекомендацією або розрахунком дози.</p>
      </section>

      <section className="meals-mini-app-card meals-inline-list-section">
        <h2>Історія на цій сторінці</h2>
        {!entries.length && (
          <div className="meals-inline-empty">
            <p>Поки що немає доданих записів інсуліну.</p>
            <p className="muted">Зробіть фото ручки або упаковки, щоб перший результат зʼявився тут як expandable block.</p>
          </div>
        )}

        <div className="meals-inline-list">
          {entries.map((entry) => (
            <article key={entry.id} className="meals-inline-entry">
              <button type="button" className="meals-inline-entry-header" onClick={() => toggleEntry(entry.id)} aria-expanded={entry.expanded}>
                <span>
                  <strong>{entry.title}</strong>
                  <small>{entry.createdAt}</small>
                </span>
                <span aria-hidden="true">{entry.expanded ? "−" : "+"}</span>
              </button>

              {entry.expanded && (
                <div className="meals-inline-entry-body">
                  {entry.warning && <div className="meals-inline-warning">{entry.warning}</div>}
                  <label>
                    <span>Редагований результат API</span>
                    <textarea
                      value={entry.editableText}
                      onChange={(event) => updateEntryText(entry.id, event.target.value)}
                      rows={16}
                      aria-label="Редагований результат API"
                    />
                  </label>
                  <div className="meals-inline-entry-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => toggleEntry(entry.id)}>
                      Згорнути
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => deleteEntry(entry.id)}>
                      Видалити
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="meals-mini-app-card meals-inline-note">
        <h2>Важливо</h2>
        <p>
          Розпізнавання інсуліну по фото може помилятися. Воно не призначає препарат, не рекомендує дозу і не замінює
          призначення лікаря. Завжди звіряйте назву, тип і фактичну дозу вручну перед використанням.
        </p>
      </section>
    </main>
  );
}
