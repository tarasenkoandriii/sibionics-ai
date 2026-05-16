"use client";

import { useState } from "react";
import { FoodPhotoAnalysisModal } from "@/components/FoodPhotoAnalysisModal";
import { InsulinPhotoAnalysisModal } from "@/components/InsulinPhotoAnalysisModal";
import { getDictionary, type Locale } from "@/lib/i18n";

export function DashboardActions({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [isInsulinModalOpen, setIsInsulinModalOpen] = useState(false);

  return (
    <section className="dashboard-card quick-actions-card">
      <span className="kicker">workflow</span>
      <h2>{dict.dashboard.quickActions}</h2>
      <div className="quick-actions-grid">
        {dict.dashboard.actions.map((action, index) => {
          const isAddFoodAction = index === 0;
          const isInsulinAction = index === 1;
          const handleClick = isAddFoodAction
            ? () => setIsFoodModalOpen(true)
            : isInsulinAction
              ? () => setIsInsulinModalOpen(true)
              : undefined;

          return (
            <button
              className="quick-action"
              key={action}
              type="button"
              onClick={handleClick}
            >
              <span>＋</span>
              {action}
            </button>
          );
        })}
      </div>
      <p className="muted">
        These actions are wired as UI stubs so the project can later connect real meal logs, insulin logs, PDF exports, and clinician sharing.
      </p>

      <FoodPhotoAnalysisModal locale={locale} open={isFoodModalOpen} onClose={() => setIsFoodModalOpen(false)} />
      <InsulinPhotoAnalysisModal locale={locale} open={isInsulinModalOpen} onClose={() => setIsInsulinModalOpen(false)} />
    </section>
  );
}
