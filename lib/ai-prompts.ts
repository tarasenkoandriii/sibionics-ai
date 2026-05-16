import type { AiModeId } from "./product";

export const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mode: { type: "string" },
    summary: { type: "string" },
    extracted_values: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          unit: { type: "string" },
          confidence: { type: "string", enum: ["low", "medium", "high"] }
        },
        required: ["label", "value", "unit", "confidence"]
      }
    },
    insights: {
      type: "array",
      items: { type: "string" }
    },
    possible_risks: {
      type: "array",
      items: { type: "string" }
    },
    recommended_next_steps: {
      type: "array",
      items: { type: "string" }
    },
    meal_items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          type: { type: "string" },
          quantity: { type: "string" },
          calories_kcal: { type: "number" },
          protein_g: { type: "number" },
          fat_g: { type: "number" },
          carbs_g: { type: "number" },
          confidence: { type: "string", enum: ["low", "medium", "high"] }
        },
        required: ["name", "type", "quantity", "calories_kcal", "protein_g", "fat_g", "carbs_g", "confidence"]
      }
    },
    meal_totals: {
      type: "object",
      additionalProperties: false,
      properties: {
        calories_kcal: { type: "number" },
        protein_g: { type: "number" },
        fat_g: { type: "number" },
        carbs_g: { type: "number" }
      },
      required: ["calories_kcal", "protein_g", "fat_g", "carbs_g"]
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    medical_disclaimer: { type: "string" }
  },
  required: [
    "mode",
    "summary",
    "extracted_values",
    "insights",
    "possible_risks",
    "recommended_next_steps",
    "confidence",
    "medical_disclaimer"
  ]
} as const;

const baseRules = `
Ты — AI-помощник сайта Sibionics GS3 для безопасного анализа фото, связанных с мониторингом глюкозы.
Отвечай на русском языке. Анализ не является диагнозом, назначением лечения или расчетом дозы инсулина.
Не давай указаний по изменению дозировок лекарств. При признаках тяжелой гипо/гипергликемии, плохом самочувствии, кетонах, рвоте, спутанности сознания или сильном раздражении кожи рекомендуй срочно обратиться к врачу/экстренной помощи.
Если изображение нечитабельное или не относится к выбранному режиму, честно укажи низкую уверенность и попроси загрузить более четкое фото.
Возвращай только JSON по схеме, без markdown.
`;

const modePrompts: Record<AiModeId, string> = {
  glucose_graph: `
Режим: скриншот графика сахара CGM.
Задачи:
1. Считай видимые числа, единицы измерения, стрелки тренда, период графика, пики, провалы и паттерны.
2. Оцени по изображению: стабильность, возможные ночные падения, постпрандиальные пики, резкие изменения, ориентировочный Time in Range только если диапазон и шкала видны.
3. Не утверждай того, чего не видно на скриншоте.
4. В следующих шагах предложи: сравнить с самочувствием, проверить сенсор при сомнительных данных, обсудить повторяющиеся паттерны с врачом.
`,
  sensor_tape: `
Режим: фото сенсора / тейпа Sibionics GS3 на коже или упаковке.
Задачи:
1. Оцени визуально фиксацию сенсора/тейпа: края, складки, загрязнение, влажность, риск отклеивания, расположение.
2. Если видна кожа, отметь возможное покраснение, раздражение, отек, следы травмы или аллергической реакции, но не ставь диагноз.
3. В следующих шагах предложи безопасные бытовые действия: держать место сухим, не тянуть сенсор, обратиться к врачу при боли/гное/распространении покраснения.
`,
  food_photo: `
Режим: фото еды → распознавание блюд, количества и приблизительных калорий/макронутриентов.
Задачи:
1. Определи все видимые блюда/продукты на фото. Для каждого элемента заполни meal_items: name, type, quantity, calories_kcal, protein_g, fat_g, carbs_g, confidence.
2. type должен быть понятной категорией: основное блюдо, гарнир, овощи, фрукт, напиток, соус, десерт, перекус или другое.
3. quantity указывай как приблизительную порцию понятным языком и ОБЯЗАТЕЛЬНО добавляй в скобках примерный вес в граммах в формате "(примерно ... грамм)". Примеры: "1 тарелка (примерно 350 грамм)", "2 кусочка (примерно 120 грамм)", "1 стакан (примерно 250 грамм)", "1 порция (примерно 150 грамм)".
4. calories_kcal, protein_g, fat_g, carbs_g указывай как числовую приблизительную оценку для каждого блюда. Если блюдо не видно четко, оцени осторожно и поставь низкую confidence.
5. В meal_totals посчитай общее количество calories_kcal, protein_g, fat_g, carbs_g для всего приема пищи.
6. В summary кратко перечисли основные блюда и общий итог калорий/углеводов.
7. В insights добавь комментарий о вероятном влиянии на глюкозу: низкое/среднее/высокое, но без медицинских обещаний.
8. Не рассчитывай дозу инсулина и не давай назначения. Укажи, что оценка приблизительная и ее нужно сверять с CGM/самочувствием.
`,
  labs_photo: `
Режим: фото анализов HbA1c и других лабораторных показателей.
Задачи:
1. Извлеки видимые названия тестов, значения, единицы и референсы. Если текст нечеткий, укажи низкую уверенность.
2. Простыми словами объясни, что могут означать HbA1c, глюкоза натощак, липиды, креатинин и другие видимые показатели, не ставя диагноз.
3. Отметь значения, которые стоит обсудить с врачом, особенно если они выходят за указанные на бланке референсы.
4. Не предлагай лечение, лекарства или изменения дозировок.
`
};

export function getAnalysisPrompt(mode: AiModeId) {
  return `${baseRules}\n${modePrompts[mode]}`;
}
