import { ORDER_PRICING, sensorPricingLabel } from "@/lib/order-config";

export type ProductImage = {
  src: string;
  alt: string;
};

export const PRODUCT = {
  id: "sibionics-gs3-kit",
  name: "Sibionics GS3",
  title: "Сенсор Sibionics GS3 до 2027 года",
  currency: "UAH",
  condition: "Новое",
  compatibility: "Android",
  durationDays: 14,
  updateFrequency: "каждую минуту",
  delivery: ["Новая почта", "Укрпочта"],
  kit: ["сенсор", "тейп", "транспондер опционально"],
  badges: ["CGM", "Bluetooth", "14 дней", "Android"],
  description:
    `Sibionics GS3 для непрерывного мониторинга глюкозы: ${sensorPricingLabel()}, транспондер опционально +${ORDER_PRICING.transponder.unitPriceUah} грн, тейпы в подарок при заказе от ${ORDER_PRICING.tapeGift.minSensorQuantity} сенсоров. Данные передаются на смартфон по Bluetooth, без постоянного сканирования.`,
  images: [
    {
      src: "/product/sibionics-gs3-hero.webp",
      alt: "Sibionics GS3 комплект, смартфон и упаковка"
    },
    {
      src: "/product/sibionics-gs3-box-front.webp",
      alt: "Упаковка Sibionics GS3"
    },
    {
      src: "/product/sibionics-gs3-sensor-kit.webp",
      alt: "Компонент сенсора Sibionics CGM System"
    },
    {
      src: "/product/sibionics-gs3-transmitter.webp",
      alt: "Транспондер Sibionics CGM System"
    }
  ] satisfies ProductImage[]
};

export const AI_MODES = [
  {
    id: "glucose_graph",
    title: "Скриншот графика сахара",
    short: "Тренды, пики, падения, ориентировочный Time in Range по видимому графику.",
    icon: "↗"
  },
  {
    id: "sensor_tape",
    title: "Фото сенсора / тейпа",
    short: "Проверка фиксации, края тейпа, возможное раздражение, риск отклеивания.",
    icon: "◎"
  },
  {
    id: "food_photo",
    title: "Фото еды → прогноз глюкозы",
    short: "Оценка углеводов, жиров, белков и вероятного влияния на CGM-кривую.",
    icon: "🍽"
  },
  {
    id: "insulin_photo",
    title: "Фото инсулина",
    short: "Распознавание типа инсулина на фото и видимой дозы без медицинских рекомендаций.",
    icon: "💉"
  },
  {
    id: "labs_photo",
    title: "Фото анализов HbA1c и др.",
    short: "Извлечение показателей, понятный разбор и вопросы для врача.",
    icon: "🧾"
  }
] as const;

export type AiModeId = (typeof AI_MODES)[number]["id"];
