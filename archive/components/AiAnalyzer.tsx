"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { AI_MODES, type AiModeId } from "@/lib/product";
import type { Locale } from "@/lib/i18n";

type ExtractedValue = {
  label: string;
  value: string;
  unit: string;
  confidence: "low" | "medium" | "high";
};

type AiResult = {
  mode: string;
  summary: string;
  extracted_values: ExtractedValue[];
  insights: string[];
  possible_risks: string[];
  recommended_next_steps: string[];
  confidence: "low" | "medium" | "high";
  medical_disclaimer: string;
};

function confidenceLabel(value: AiResult["confidence"]) {
  if (value === "high") return "высокая";
  if (value === "medium") return "средняя";
  return "низкая";
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="result-section">
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function AiAnalyzer({ locale = "ua" }: { locale?: Locale }) {
  void locale;
  const [mode, setMode] = useState<AiModeId>("glucose_graph");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiResult | null>(null);

  const activeMode = useMemo(() => AI_MODES.find((item) => item.id === mode), [mode]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setResult(null);
    setError(null);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError("Сначала загрузите фото или скриншот.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("mode", mode);
      formData.append("image", file);

      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI-анализ не удался.");
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка AI-анализа.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-grid" id="ai">
      <form className="ai-panel" onSubmit={analyze}>
        <span className="kicker">AI-анализ по фото</span>
        <h2>Разбор сахара, сенсора, еды и анализов</h2>
        <p className="muted">
          Выберите режим, загрузите фото и получите структурированный разбор. AI не назначает лечение и не
          заменяет врача.
        </p>

        <div className="mode-grid" role="tablist" aria-label="Режимы AI-анализа">
          {AI_MODES.map((item) => (
            <button
              className={`mode-card ${item.id === mode ? "active" : ""}`}
              key={item.id}
              type="button"
              onClick={() => {
                setMode(item.id);
                setResult(null);
                setError(null);
              }}
              role="tab"
              aria-selected={item.id === mode}
            >
              <strong>
                {item.icon} {item.title}
              </strong>
              <span>{item.short}</span>
            </button>
          ))}
        </div>

        <div className="upload-box">
          <strong>{activeMode?.title}</strong>
          <span className="muted">Поддерживаются JPG, PNG, WEBP. Желательно загружать четкое фото без бликов.</span>
          <input className="input" type="file" accept="image/*" onChange={onFileChange} />
          {previewUrl ? (
            <div className="preview">
              <img src={previewUrl} alt="Предпросмотр загруженного файла" />
            </div>
          ) : null}
        </div>

        {error ? <div className="alert error">{error}</div> : null}

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", marginTop: 16 }}>
          {loading ? "AI анализирует…" : "Запустить AI-анализ"}
        </button>

        <p className="disclaimer" style={{ marginTop: 14 }}>
          Фото передается на сервер и в AI API для анализа. Не загружайте документы с лишними персональными данными.
        </p>
      </form>

      <aside className="summary-panel">
        {!result ? (
          <div className="result-box">
            <div className="result-section">
              <h4>Что умеет AI</h4>
              <ul>
                <li>Считывает видимые значения и стрелки тренда на скриншотах CGM.</li>
                <li>Оценивает фиксацию сенсора и тейпа по фото.</li>
                <li>Дает качественный прогноз влияния еды на глюкозную кривую.</li>
                <li>Извлекает HbA1c и другие показатели из фото анализов.</li>
              </ul>
            </div>
            <div className="alert info">
              Результат появится здесь. Для точности делайте фото ровно, с хорошим светом и без обрезанных строк.
            </div>
          </div>
        ) : (
          <div className="result-box">
            <div className="result-section">
              <h4>Кратко</h4>
              <p style={{ marginBottom: 8 }}>{result.summary}</p>
              <p className="muted" style={{ margin: 0 }}>
                Уверенность: {confidenceLabel(result.confidence)}
              </p>
            </div>

            {result.extracted_values.length ? (
              <div className="result-section">
                <h4>Извлеченные значения</h4>
                <table className="values-table">
                  <thead>
                    <tr>
                      <th>Показатель</th>
                      <th>Значение</th>
                      <th>Ед.</th>
                      <th>Увер.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.extracted_values.map((item, index) => (
                      <tr key={`${item.label}-${index}`}>
                        <td>{item.label}</td>
                        <td>{item.value}</td>
                        <td>{item.unit}</td>
                        <td>{confidenceLabel(item.confidence)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <ListBlock title="Выводы" items={result.insights} />
            <ListBlock title="На что обратить внимание" items={result.possible_risks} />
            <ListBlock title="Следующие шаги" items={result.recommended_next_steps} />

            <div className="alert info">{result.medical_disclaimer}</div>
          </div>
        )}
      </aside>
    </div>
  );
}
