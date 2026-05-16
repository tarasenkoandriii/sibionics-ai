"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";

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

type MealEntry = {
  id: string;
  createdAt: string;
  title: string;
  editableText: string;
  result: FoodAnalysisResult | null;
  expanded: boolean;
  warning?: string | null;
};

type Status = "idle" | "capturing" | "analyzing" | "error";

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

function getMealTitle(result: FoodAnalysisResult | null, fallbackIndex: number) {
  const items: MealItem[] = Array.isArray(result?.meal_items) ? result.meal_items : [];
  const names = items
    .map((item) => item.name)
    .filter(Boolean)
    .slice(0, 2)
    .join(" + ");

  return names || `Прийом їжі ${fallbackIndex}`;
}

export default function MealsMiniApp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [meals, setMeals] = useState<MealEntry[]>([]);

  const totals = useMemo(() => {
    return meals.reduce(
      (acc, meal) => {
        const resultTotals = meal.result?.meal_totals;
        acc.calories += Number(resultTotals?.calories_kcal || 0);
        acc.carbs += Number(resultTotals?.carbs_g || 0);
        return acc;
      },
      { calories: 0, carbs: 0 }
    );
  }, [meals]);

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
        const message = payload?.userMessage || payload?.error || "Не вдалося розпізнати їжу. Спробуйте зробити чіткіше фото або повторіть пізніше.";
        throw new Error(message);
      }

      const apiResult = payload.result || null;
      const apiWarning = payload?.code === "AI_TEMPORARILY_UNAVAILABLE" || payload?.fallback === "grok_capacity"
        ? payload.warning || "Grok тимчасово перевантажений, тому показано fallback-відповідь. Для точного розпізнавання повторіть аналіз пізніше."
        : null;

      const entry: MealEntry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toLocaleString("uk-UA", { dateStyle: "short", timeStyle: "short" }),
        title: getMealTitle(apiResult, meals.length + 1),
        editableText: buildEditableText(apiResult),
        result: apiResult,
        expanded: true,
        warning: apiWarning
      };

      setMeals((current) => [entry, ...current.map((meal) => ({ ...meal, expanded: false }))]);
      setWarning(apiWarning);
      setStatus("idle");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не вдалося розпізнати їжу. Спробуйте повторити пізніше.");
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

    void analyzeFoodPhoto(file);
  };

  const toggleMeal = (id: string) => {
    setMeals((current) => current.map((meal) => (meal.id === id ? { ...meal, expanded: !meal.expanded } : meal)));
  };

  const updateMealText = (id: string, editableText: string) => {
    setMeals((current) => current.map((meal) => (meal.id === id ? { ...meal, editableText } : meal)));
  };

  const deleteMeal = (id: string) => {
    setMeals((current) => current.filter((meal) => meal.id !== id));
  };

  return (
    <main className="meals-mini-app-page">
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
          aria-label="Зробити фото їжі"
          disabled={status === "analyzing"}
        >
          <span aria-hidden="true">📷</span>
        </button>

        <span className="kicker">Grok Food AI</span>
        <h1>Мої прийоми їжі</h1>
        <p>
          Додавайте прийоми їжі прямо на сторінці: зробіть фото, дочекайтесь розпізнавання Grok AI,
          перевірте результат, відредагуйте текст і залиште тільки потрібні записи.
        </p>
      </section>

      <section className="meals-mini-app-card meals-inline-add-section">
        <div>
          <h2>Додати їжу</h2>
          <p>
            Натисніть кнопку з фотоапаратом справа вгорі сторінки або кнопку нижче. Grok AI визначить назви та типи страв,
            кількість із приблизною вагою в грамах, калорії, білки, жири та вуглеводи.
          </p>
        </div>
        <button type="button" className="btn btn-primary meals-mini-app-add-button" onClick={openCamera} disabled={status === "analyzing"}>
          📷 Додати їжу
        </button>
      </section>

      {status === "analyzing" && (
        <section className="meals-mini-app-card meals-inline-state meals-inline-loading">
          <span className="install-photo-spinner" />
          <p>Grok AI розпізнає страви та розраховує приблизні макроси...</p>
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
            <strong>{meals.length}</strong>
            <span>прийомів їжі</span>
          </div>
          <div>
            <strong>{Math.round(totals.calories)}</strong>
            <span>ккал приблизно</span>
          </div>
          <div>
            <strong>{Math.round(totals.carbs)}</strong>
            <span>г вуглеводів</span>
          </div>
        </div>
        <p className="muted">Підсумок базується на відповідях AI та може змінитися після ручного редагування тексту.</p>
      </section>

      <section className="meals-mini-app-card meals-inline-list-section">
        <h2>Історія на цій сторінці</h2>
        {!meals.length && (
          <div className="meals-inline-empty">
            <p>Поки що немає доданих прийомів їжі.</p>
            <p className="muted">Зробіть фото страви, щоб перший результат зʼявився тут як expandable block.</p>
          </div>
        )}

        <div className="meals-inline-list">
          {meals.map((meal) => (
            <article key={meal.id} className="meals-inline-entry">
              <button type="button" className="meals-inline-entry-header" onClick={() => toggleMeal(meal.id)} aria-expanded={meal.expanded}>
                <span>
                  <strong>{meal.title}</strong>
                  <small>{meal.createdAt}</small>
                </span>
                <span aria-hidden="true">{meal.expanded ? "−" : "+"}</span>
              </button>

              {meal.expanded && (
                <div className="meals-inline-entry-body">
                  {meal.warning && <div className="meals-inline-warning">{meal.warning}</div>}
                  <label>
                    <span>Редагований результат API</span>
                    <textarea
                      value={meal.editableText}
                      onChange={(event) => updateMealText(meal.id, event.target.value)}
                      rows={16}
                      aria-label="Редагований результат API"
                    />
                  </label>
                  <div className="meals-inline-entry-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => toggleMeal(meal.id)}>
                      Згорнути
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => deleteMeal(meal.id)}>
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
          Розпізнавання їжі по фото є приблизним. Воно не замінює підрахунок вуглеводів за етикетками,
          кухонними вагами або рекомендаціями лікаря.
        </p>
      </section>
    </main>
  );
}
