"use client";

import { ChangeEvent, useRef, useState } from "react";

type AnalysisResult = {
  summary?: string;
  insights?: string[];
  possible_risks?: string[];
  recommended_next_steps?: string[];
  confidence?: "low" | "medium" | "high";
  medical_disclaimer?: string;
};

type CheckStatus = "idle" | "capturing" | "analyzing" | "done" | "error";

const TEXT = {
  topButtonLabel: "Зробити фото установки сенсора",
  bottomButton: "перевірити якість установки сенсора",
  analyzing: "AI перевіряє фото установки...",
  title: "Результат перевірки установки",
  retry: "Зробити інше фото",
  close: "Закрити",
  confidence: "Рівень впевненості",
  summary: "Висновок",
  insights: "Що видно на фото",
  risks: "Можливі ризики",
  nextSteps: "Рекомендації",
  disclaimer:
    "AI-аналіз по фото не є медичною діагностикою. Він оцінює тільки видимі ознаки установки сенсора та фіксації тейпа.",
  genericError: "Не вдалося виконати AI-перевірку. Спробуйте зробити чіткіше фото або повторіть пізніше.",
};

function getConfidenceLabel(confidence?: string) {
  if (confidence === "high") return "високий";
  if (confidence === "medium") return "середній";
  if (confidence === "low") return "низький";
  return "не визначено";
}

function ResultList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;

  return (
    <section>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default function SensorInstallPhotoCheck() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<CheckStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openCamera = () => {
    setStatus("capturing");
    setError(null);
    inputRef.current?.click();
  };

  const analyzePhoto = async (file: File) => {
    setStatus("analyzing");
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("mode", "sensor_tape");
    formData.append("image", file);

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || TEXT.genericError);
      }

      setResult(payload.result || null);
      setStatus("done");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : TEXT.genericError);
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

    void analyzePhoto(file);
  };

  const hasBottomSheet = status === "analyzing" || status === "done" || status === "error";

  return (
    <>
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
        className="install-photo-fab"
        onClick={openCamera}
        aria-label={TEXT.topButtonLabel}
        disabled={status === "analyzing"}
      >
        <span aria-hidden="true">📷</span>
      </button>

      <div className="install-photo-bottom-bar">
        <button
          type="button"
          className="install-photo-primary-button"
          onClick={openCamera}
          disabled={status === "analyzing"}
        >
          <span aria-hidden="true">📷</span>
          {status === "analyzing" ? TEXT.analyzing : TEXT.bottomButton}
        </button>
      </div>

      {hasBottomSheet && (
        <aside className="install-photo-result-sheet" aria-live="polite">
          <div className="install-photo-result-handle" />
          <div className="install-photo-result-header">
            <div>
              <span className="kicker">AI Photo Check</span>
              <h2>{TEXT.title}</h2>
            </div>
            <button type="button" onClick={() => setStatus("idle")} aria-label={TEXT.close}>
              ×
            </button>
          </div>

          {status === "analyzing" && (
            <div className="install-photo-loading">
              <span className="install-photo-spinner" />
              <p>{TEXT.analyzing}</p>
            </div>
          )}

          {status === "error" && (
            <div className="install-photo-error">
              <strong>Помилка перевірки</strong>
              <p>{error || TEXT.genericError}</p>
              <button type="button" className="btn btn-secondary" onClick={openCamera}>
                {TEXT.retry}
              </button>
            </div>
          )}

          {status === "done" && result && (
            <div className="install-photo-result-content">
              <section>
                <h3>{TEXT.summary}</h3>
                <p>{result.summary || "AI не зміг сформувати короткий висновок по фото."}</p>
                <p className="install-photo-confidence">
                  {TEXT.confidence}: <strong>{getConfidenceLabel(result.confidence)}</strong>
                </p>
              </section>

              <ResultList title={TEXT.insights} items={result.insights} />
              <ResultList title={TEXT.risks} items={result.possible_risks} />
              <ResultList title={TEXT.nextSteps} items={result.recommended_next_steps} />

              <p className="install-photo-disclaimer">
                {result.medical_disclaimer || TEXT.disclaimer}
              </p>

              <button type="button" className="btn btn-secondary" onClick={openCamera}>
                {TEXT.retry}
              </button>
            </div>
          )}
        </aside>
      )}
    </>
  );
}
