"use client";

import { ChangeEvent, Dispatch, KeyboardEvent, SetStateAction, useRef, useState } from "react";

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

function parseDoseUnits(value?: string) {
  if (!value) return 0;

  const normalized = value.replace(",", ".");
  const match = normalized.match(/\d+(?:\.\d+)?/);
  if (!match) return 0;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}


function normalizeDoseInputValue(value: string) {
  if (value.trim() === "") return 0;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function clampDoseValue(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function updateDoseWithKeyboard(
  event: KeyboardEvent<HTMLInputElement>,
  currentValue: number,
  setValue: (value: number) => void
) {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

  event.preventDefault();

  const direction = event.key === "ArrowUp" ? 1 : -1;
  setValue(Math.max(0, currentValue + direction));
}

function normalizeInsulinType(value?: string) {
  const normalized = (value || "").toLowerCase();

  if (/(slow|long|basal|background|повіль|медлен|длитель|довг|пролонг|базал|тресиба|лантус|левемір|левемир|тужео)/.test(normalized)) {
    return "slow";
  }

  if (/(fast|rapid|short|bolus|meal|швид|быстр|коротк|ультра|новорапід|новорапид|хумалог|апідра|апидра|фіасп|фиасп)/.test(normalized)) {
    return "fast";
  }

  if (/(mixed|both|mix|обидва|оба|змішан|смешан)/.test(normalized)) {
    return "mixed";
  }

  return "unknown";
}

function getDoseUnitsByType(result: InsulinAnalysisResult | null) {
  const summary = result?.insulin_summary;
  const summaryType = normalizeInsulinType(`${summary?.detected_type || ""} ${summary?.detected_type_label || ""}`);
  const totalDose = parseDoseUnits(summary?.visible_total_dose_units);

  const items = Array.isArray(result?.insulin_items) ? result?.insulin_items ?? [] : [];
  const itemTotals = items.reduce(
    (totals, item) => {
      const dose = parseDoseUnits(item.visible_dose_units);
      if (!dose) return totals;

      const itemType = normalizeInsulinType(`${item.type || ""} ${item.type_label || ""} ${item.name || ""}`);
      if (itemType === "slow") totals.slow += dose;
      if (itemType === "fast") totals.fast += dose;

      return totals;
    },
    { slow: 0, fast: 0 }
  );

  if (itemTotals.slow || itemTotals.fast) {
    return { ...itemTotals, detected: true };
  }

  if (summaryType === "slow" && totalDose) return { slow: totalDose, fast: 0, detected: true };
  if (summaryType === "fast" && totalDose) return { slow: 0, fast: totalDose, detected: true };

  return { slow: 0, fast: 0, detected: false };
}

type DoseStepperProps = {
  value: number;
  setValue: Dispatch<SetStateAction<number>>;
  label: string;
  onSave: () => void;
};

function DoseStepper({ value, setValue, label, onSave }: DoseStepperProps) {
  const decrement = () => setValue((current) => clampDoseValue(current - 1));
  const increment = () => setValue((current) => clampDoseValue(current + 1));
  const clear = () => setValue(0);

  return (
    <div className="insulin-dose-field">
      <span className="insulin-dose-label">{label}</span>
      <div className="insulin-dose-stepper" role="group" aria-label={label}>
        <button
          type="button"
          className="insulin-dose-stepper-button"
          onClick={decrement}
          aria-label={`Зменшити ${label}`}
        >
          −
        </button>
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(normalizeDoseInputValue(event.target.value))}
          onKeyDown={(event) => updateDoseWithKeyboard(event, value, (nextValue) => setValue(nextValue))}
          aria-label={label}
        />
        <button
          type="button"
          className="insulin-dose-stepper-button"
          onClick={increment}
          aria-label={`Збільшити ${label}`}
        >
          +
        </button>
      </div>
      <div className="insulin-dose-stepper-actions">
        <button type="button" onClick={clear}>Clear</button>
        <span aria-hidden="true">|</span>
        <button type="button" onClick={onSave}>Save</button>
      </div>
    </div>
  );
}

export default function InsulinMiniApp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [entries, setEntries] = useState<InsulinEntry[]>([]);
  const [slowUnits, setSlowUnits] = useState(0);
  const [fastUnits, setFastUnits] = useState(0);

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

      const detectedUnits = getDoseUnitsByType(apiResult);

      if (detectedUnits.detected) {
        setSlowUnits(detectedUnits.slow);
        setFastUnits(detectedUnits.fast);
      }

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
          <h2>Розпізнати інсулін</h2>
          <p>
            Натисніть кнопку з фотоапаратом справа вгорі сторінки або кнопку нижче. Grok AI спробує визначити,
            чи це швидкий, повільний, змішаний інсулін або обидва типи на фото, а також видиму дозу, якщо її можна прочитати.
          </p>
        </div>
        <button type="button" className="btn btn-primary meals-mini-app-add-button" onClick={openCamera} disabled={status === "analyzing"}>
          📷 Розпізнати інсулін
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

      <section className="meals-mini-app-card meals-inline-list-section">
        <h2>Результат распознавания AI</h2>
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
                  <textarea
                    value={entry.editableText}
                    onChange={(event) => updateEntryText(entry.id, event.target.value)}
                    rows={16}
                    aria-label="Результат распознавания AI"
                  />
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

      <section className="meals-mini-app-card meals-inline-summary insulin-dose-summary">
        <h2>Доза інсуліна(-ів)</h2>
        <p className="muted">(за потреби відредагуйте)</p>
        <div className="meals-inline-summary-grid insulin-dose-summary-grid">
          <DoseStepper
            value={slowUnits}
            setValue={setSlowUnits}
            label="одиниць повільного"
            onSave={() => setWarning("Дозу повільного інсуліну записано на цій сторінці. Перевірте значення перед використанням.")}
          />
          <DoseStepper
            value={fastUnits}
            setValue={setFastUnits}
            label="одиниць швидкого"
            onSave={() => setWarning("Дозу швидкого інсуліну записано на цій сторінці. Перевірте значення перед використанням.")}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary meals-mini-app-add-button"
          onClick={() => setWarning("Дозу інсуліна(-ів) записано на цій сторінці. Перевірте значення перед використанням.")}
        >
          Записати
        </button>
        <p className="muted">Доза базується на відповідях AI та може бути відредагована вручну. Це не є медичною рекомендацією або розрахунком дози.</p>
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
