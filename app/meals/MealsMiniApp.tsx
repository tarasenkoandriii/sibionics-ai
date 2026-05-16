"use client";

import { useState } from "react";
import { FoodPhotoAnalysisModal } from "@/components/FoodPhotoAnalysisModal";

export default function MealsMiniApp() {
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);

  return (
    <main className="meals-mini-app-page">
      <section className="meals-mini-app-hero">
        <span className="kicker">Grok Food AI</span>
        <h1>Додати їжу</h1>
        <p>
          Сфотографуйте прийом їжі, щоб Grok AI визначив назви страв, їх тип, приблизну кількість,
          калорії, білки, жири та вуглеводи. Після відповіді результат можна відредагувати вручну.
        </p>
        <button type="button" className="btn btn-primary meals-mini-app-add-button" onClick={() => setIsFoodModalOpen(true)}>
          ＋ Додати їжу
        </button>
      </section>

      <section className="meals-mini-app-card">
        <h2>Як це працює</h2>
        <ol>
          <li>Натисніть “Додати їжу”.</li>
          <li>У модальному вікні натисніть кнопку з фотоапаратом справа зверху.</li>
          <li>Зробіть фото страви й дочекайтеся відповіді Grok AI.</li>
          <li>Перевірте та відредагуйте результат перед використанням.</li>
        </ol>
        <p className="muted">Оцінка калорій і вуглеводів по фото є приблизною та не розраховує дозу інсуліну.</p>
      </section>

      <FoodPhotoAnalysisModal locale="ua" open={isFoodModalOpen} onClose={() => setIsFoodModalOpen(false)} />
    </main>
  );
}
