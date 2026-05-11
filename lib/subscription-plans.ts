import type { Locale } from "@/lib/i18n";

export type SubscriptionPlanId = "starter" | "pro" | "family" | "clinic";
export type BillingPeriod = "month" | "year";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  priceUah: number;
  billingPeriod: BillingPeriod;
  limits: {
    patients: number;
    aiMessagesPerMonth: number;
    cgmRetentionDays: number;
  };
  popular?: boolean;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  features: Record<Locale, string[]>;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    priceUah: 0,
    billingPeriod: "month",
    limits: { patients: 1, aiMessagesPerMonth: 30, cgmRetentionDays: 7 },
    name: { ua: "Starter", ru: "Starter", pl: "Starter", en: "Starter" },
    description: {
      ua: "Демо для одного користувача",
      ru: "Демо для одного пользователя",
      pl: "Demo dla jednej osoby",
      en: "Demo for one user"
    },
    features: {
      ua: ["Mock CGM stream", "30 AI-повідомлень", "Базовий прогноз"],
      ru: ["Mock CGM stream", "30 AI-сообщений", "Базовый прогноз"],
      pl: ["Mock CGM stream", "30 wiadomości AI", "Podstawowa prognoza"],
      en: ["Mock CGM stream", "30 AI messages", "Basic prediction"]
    }
  },
  {
    id: "pro",
    priceUah: 399,
    billingPeriod: "month",
    limits: { patients: 1, aiMessagesPerMonth: 300, cgmRetentionDays: 90 },
    popular: true,
    name: { ua: "Pro", ru: "Pro", pl: "Pro", en: "Pro" },
    description: {
      ua: "Для власника CGM і щоденного AI-супроводу",
      ru: "Для владельца CGM и ежедневного AI-сопровождения",
      pl: "Dla użytkownika CGM i codziennego wsparcia AI",
      en: "For one CGM user with daily AI guidance"
    },
    features: {
      ua: ["Realtime dashboard", "AI voice doctor", "Фотоаналіз їжі й аналізів", "Telegram Mini App"],
      ru: ["Realtime dashboard", "AI voice doctor", "Фотоанализ еды и анализов", "Telegram Mini App"],
      pl: ["Realtime dashboard", "AI voice doctor", "Analiza zdjęć posiłków i wyników", "Telegram Mini App"],
      en: ["Realtime dashboard", "AI voice doctor", "Food and lab photo analysis", "Telegram Mini App"]
    }
  },
  {
    id: "family",
    priceUah: 699,
    billingPeriod: "month",
    limits: { patients: 4, aiMessagesPerMonth: 900, cgmRetentionDays: 180 },
    name: { ua: "Family", ru: "Family", pl: "Family", en: "Family" },
    description: {
      ua: "Для батьків, партнерів і сімейного доступу",
      ru: "Для родителей, партнеров и семейного доступа",
      pl: "Dla rodziców, partnerów i dostępu rodzinnego",
      en: "For caregivers, parents, and family access"
    },
    features: {
      ua: ["До 4 профілів", "Спільний доступ", "Telegram-сповіщення", "Розширені тренди"],
      ru: ["До 4 профилей", "Совместный доступ", "Telegram-уведомления", "Расширенные тренды"],
      pl: ["Do 4 profili", "Dostęp rodzinny", "Powiadomienia Telegram", "Rozszerzone trendy"],
      en: ["Up to 4 profiles", "Shared access", "Telegram alerts", "Advanced trends"]
    }
  },
  {
    id: "clinic",
    priceUah: 1499,
    billingPeriod: "month",
    limits: { patients: 25, aiMessagesPerMonth: 5000, cgmRetentionDays: 365 },
    name: { ua: "Clinic", ru: "Clinic", pl: "Clinic", en: "Clinic" },
    description: {
      ua: "Для лікаря, нутриціолога або невеликої клініки",
      ru: "Для врача, нутрициолога или небольшой клиники",
      pl: "Dla lekarza, dietetyka lub małej kliniki",
      en: "For clinicians, nutritionists, or small practices"
    },
    features: {
      ua: ["До 25 пацієнтів", "Панель ризиків", "Експорт звітів", "Пріоритетна підтримка"],
      ru: ["До 25 пациентов", "Панель рисков", "Экспорт отчетов", "Приоритетная поддержка"],
      pl: ["Do 25 pacjentów", "Panel ryzyka", "Eksport raportów", "Wsparcie priorytetowe"],
      en: ["Up to 25 patients", "Risk dashboard", "Report export", "Priority support"]
    }
  }
];

export function getSubscriptionPlan(planId: unknown) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
}
