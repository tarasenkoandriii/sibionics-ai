export type Locale = "ua" | "ru" | "pl" | "en";

export const DEFAULT_LOCALE: Locale = "ua";
export const LOCALES: Locale[] = ["ua", "ru", "pl", "en"];

export const LOCALE_LABELS: Record<Locale, string> = {
  ua: "Українська",
  ru: "Русский",
  pl: "Polski",
  en: "English"
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as string[]).includes(value);
}

export function normalizeLocale(value: unknown): Locale {
  if (isLocale(value)) return value;
  return DEFAULT_LOCALE;
}

export function localePath(locale: Locale, suffix = "") {
  const normalizedSuffix = suffix ? `/${suffix.replace(/^\/+/, "")}` : "";
  return `/${locale}${normalizedSuffix}`;
}

export const dictionaries = {
  ua: {
    common: {
      appName: "GlucoMind GS3",
      tagline: "CGM + AI для щоденного контролю глюкози",
      dashboard: "Дашборд",
      onboarding: "Онбординг",
      pricing: "Підписка",
      miniApp: "Telegram Mini App",
      installation: "Установка",
      buy: "Купити GS3",
      start: "Почати",
      tryDemo: "Відкрити демо",
      status: "Статус",
      active: "Активно",
      demoMode: "Демо-режим",
      save: "Зберегти",
      continue: "Далі",
      back: "Назад",
      loading: "Завантаження...",
      medicalNotice:
        "AI не є лікарем, не ставить діагноз і не призначає лікування. При небезпечних симптомах, дуже низькому або високому цукрі зверніться до лікаря або екстреної допомоги."
    },
    nav: {
      home: "Головна",
      dashboard: "Дашборд",
      onboarding: "Онбординг",
      pricing: "Плани",
      miniApp: "Mini App",
      installation: "Установка",
      setup: "Налаштування"
    },
    home: {
      kicker: "Dexcom-style SaaS · Sibionics GS3 · AI layer",
      title: "AI Diabetes SaaS для CGM, голосового лікаря і підписок через WayForPay",
      lead:
        "Готовий Next.js-скелет для Sibionics GS3: realtime-потік глюкози, AI-прогноз, голосовий помічник, Telegram Mini App login, українська мова за замовчуванням і multi-language UI.",
      primaryCta: "Перейти в дашборд",
      secondaryCta: "Налаштувати профіль",
      metrics: ["Realtime CGM", "AI voice doctor", "WayForPay billing", "Telegram Mini App"],
      featureTitle: "Що вже імплементовано",
      featureLead: "Логіка працює локально в demo/mock режимі та готова до підключення реальних ключів API.",
      features: [
        ["CGM stream", "SSE-потік кожні кілька секунд, графік, тренд, ризики і прогноз на 30/60/120 хв."],
        ["AI doctor", "Текстовий і голосовий діалог з медичними safety-обмеженнями та fallback без ключа Grok."],
        ["Telegram Mini App", "Перевірка initData через HMAC, створення сесії і підтримка WebApp SDK."],
        ["WayForPay subscriptions", "Плани підписки, checkout через WayForPay, callback-активація та Telegram-нотифікації."],
        ["i18n", "Українська за замовчуванням, також російська, польська й англійська."],
        ["Dashboard", "CGM, AI prediction, voice doctor, підписка і швидкі дії в одному кабінеті."]
      ]
    },
    dashboard: {
      title: "CGM дашборд",
      lead: "Демо-пацієнт з realtime-потоком глюкози, AI-ready прогнозом і голосовим лікарем.",
      glucoseNow: "Глюкоза зараз",
      timeInRange: "Time in Range",
      prediction: "Прогноз",
      stream: "Потік CGM",
      startStream: "Запустити stream",
      stopStream: "Пауза",
      riskLow: "Низько",
      riskInRange: "В діапазоні",
      riskHigh: "Високо",
      updated: "Оновлено",
      mockBadge: "mock + AI-ready",
      quickActions: "Швидкі дії",
      actions: ["Додати їжу", "Відмітити інсулін", "Експорт PDF", "Поділитися з лікарем"]
    },
    doctor: {
      title: "AI голосовий лікар",
      lead: "Поставте питання голосом або текстом. Помічник враховує поточний CGM-контекст і відповідає обережно.",
      placeholder: "Наприклад: чому цукор росте після вечері?",
      ask: "Запитати AI",
      speak: "Озвучити",
      record: "Говорити",
      stop: "Стоп",
      empty: "Напишіть або продиктуйте питання.",
      fallback: "Браузерна озвучка використана як fallback."
    },
    onboarding: {
      title: "Онбординг пацієнта",
      lead: "Зберіть базові дані для персоналізованого дашборду, AI-підказок і підписок.",
      steps: ["Профіль", "Діабет", "CGM", "Цілі"],
      fields: {
        name: "Імʼя",
        age: "Вік",
        diabetesType: "Тип діабету",
        therapy: "Терапія",
        device: "CGM-пристрій",
        low: "Низький поріг, mg/dL",
        high: "Високий поріг, mg/dL",
        goals: "Цілі",
        telegram: "Telegram username"
      },
      saved: "Профіль збережено. Можна відкривати дашборд.",
      submit: "Зберегти онбординг"
    },
    pricing: {
      title: "Плани підписки",
      lead: "WayForPay використовується як єдина платіжка. Без ключів API кнопки працюють у demo/error-safe режимі.",
      customer: "Дані для платежу",
      name: "Імʼя",
      phone: "Телефон",
      email: "Email",
      pay: "Оплатити через WayForPay",
      free: "Активувати безкоштовно",
      billing: "місяць",
      success: "Checkout створено. Перенаправляємо на WayForPay..."
    },
    miniApp: {
      title: "Telegram Mini App login",
      lead: "Сторінка читає Telegram.WebApp.initData, відправляє її на backend і створює захищену сесію після HMAC-перевірки.",
      notTelegram: "Відкрийте цю сторінку всередині Telegram Mini App або використовуйте demo view.",
      verify: "Перевірити Telegram session",
      verified: "Telegram-сесію підтверджено",
      demo: "Demo user"
    }
  },
  ru: {
    common: {
      appName: "GlucoMind GS3",
      tagline: "CGM + AI для ежедневного контроля глюкозы",
      dashboard: "Дашборд",
      onboarding: "Онбординг",
      pricing: "Подписка",
      miniApp: "Telegram Mini App",
      installation: "Установка",
      buy: "Купить GS3",
      start: "Начать",
      tryDemo: "Открыть демо",
      status: "Статус",
      active: "Активно",
      demoMode: "Демо-режим",
      save: "Сохранить",
      continue: "Далее",
      back: "Назад",
      loading: "Загрузка...",
      medicalNotice:
        "AI не является врачом, не ставит диагноз и не назначает лечение. При опасных симптомах, очень низком или высоком сахаре обратитесь к врачу или в экстренную помощь."
    },
    nav: {
      home: "Главная",
      dashboard: "Дашборд",
      onboarding: "Онбординг",
      pricing: "Планы",
      miniApp: "Mini App",
      installation: "Установка",
      setup: "Настройка"
    },
    home: {
      kicker: "Dexcom-style SaaS · Sibionics GS3 · AI layer",
      title: "AI Diabetes SaaS для CGM, голосового врача и подписок через WayForPay",
      lead:
        "Готовый Next.js-скелет для Sibionics GS3: realtime-поток глюкозы, AI-прогноз, голосовой помощник, Telegram Mini App login, украинский по умолчанию и multi-language UI.",
      primaryCta: "Перейти в дашборд",
      secondaryCta: "Настроить профиль",
      metrics: ["Realtime CGM", "AI voice doctor", "WayForPay billing", "Telegram Mini App"],
      featureTitle: "Что уже имплементировано",
      featureLead: "Логика работает локально в demo/mock режиме и готова к подключению реальных API-ключей.",
      features: [
        ["CGM stream", "SSE-поток каждые несколько секунд, график, тренд, риски и прогноз на 30/60/120 мин."],
        ["AI doctor", "Текстовый и голосовой диалог с медицинскими safety-ограничениями и fallback без ключа Grok."],
        ["Telegram Mini App", "Проверка initData через HMAC, создание сессии и поддержка WebApp SDK."],
        ["WayForPay subscriptions", "Планы подписки, checkout через WayForPay, callback-активация и Telegram-нотификации."],
        ["i18n", "Украинский по умолчанию, также русский, польский и английский."],
        ["Dashboard", "CGM, AI prediction, voice doctor, подписка и быстрые действия в одном кабинете."]
      ]
    },
    dashboard: {
      title: "CGM дашборд",
      lead: "Демо-пациент с realtime-потоком глюкозы, AI-ready прогнозом и голосовым врачом.",
      glucoseNow: "Глюкоза сейчас",
      timeInRange: "Time in Range",
      prediction: "Прогноз",
      stream: "Поток CGM",
      startStream: "Запустить stream",
      stopStream: "Пауза",
      riskLow: "Низко",
      riskInRange: "В диапазоне",
      riskHigh: "Высоко",
      updated: "Обновлено",
      mockBadge: "mock + AI-ready",
      quickActions: "Быстрые действия",
      actions: ["Добавить еду", "Отметить инсулин", "Экспорт PDF", "Поделиться с врачом"]
    },
    doctor: {
      title: "AI голосовой врач",
      lead: "Задайте вопрос голосом или текстом. Помощник учитывает текущий CGM-контекст и отвечает осторожно.",
      placeholder: "Например: почему сахар растет после ужина?",
      ask: "Спросить AI",
      speak: "Озвучить",
      record: "Говорить",
      stop: "Стоп",
      empty: "Напишите или продиктуйте вопрос.",
      fallback: "Браузерная озвучка использована как fallback."
    },
    onboarding: {
      title: "Онбординг пациента",
      lead: "Соберите базовые данные для персонализированного дашборда, AI-подсказок и подписок.",
      steps: ["Профиль", "Диабет", "CGM", "Цели"],
      fields: {
        name: "Имя",
        age: "Возраст",
        diabetesType: "Тип диабета",
        therapy: "Терапия",
        device: "CGM-устройство",
        low: "Низкий порог, mg/dL",
        high: "Высокий порог, mg/dL",
        goals: "Цели",
        telegram: "Telegram username"
      },
      saved: "Профиль сохранен. Можно открывать дашборд.",
      submit: "Сохранить онбординг"
    },
    pricing: {
      title: "Планы подписки",
      lead: "WayForPay используется как единственная платежка. Без API-ключей кнопки работают в demo/error-safe режиме.",
      customer: "Данные для платежа",
      name: "Имя",
      phone: "Телефон",
      email: "Email",
      pay: "Оплатить через WayForPay",
      free: "Активировать бесплатно",
      billing: "месяц",
      success: "Checkout создан. Перенаправляем на WayForPay..."
    },
    miniApp: {
      title: "Telegram Mini App login",
      lead: "Страница читает Telegram.WebApp.initData, отправляет ее на backend и создает защищенную сессию после HMAC-проверки.",
      notTelegram: "Откройте эту страницу внутри Telegram Mini App или используйте demo view.",
      verify: "Проверить Telegram session",
      verified: "Telegram-сессия подтверждена",
      demo: "Demo user"
    }
  },
  pl: {
    common: {
      appName: "GlucoMind GS3",
      tagline: "CGM + AI do codziennej kontroli glukozy",
      dashboard: "Panel",
      onboarding: "Onboarding",
      pricing: "Subskrypcja",
      miniApp: "Telegram Mini App",
      installation: "Instalacja",
      buy: "Kup GS3",
      start: "Start",
      tryDemo: "Otwórz demo",
      status: "Status",
      active: "Aktywne",
      demoMode: "Tryb demo",
      save: "Zapisz",
      continue: "Dalej",
      back: "Wstecz",
      loading: "Ładowanie...",
      medicalNotice:
        "AI nie jest lekarzem, nie diagnozuje i nie przepisuje leczenia. Przy groźnych objawach, bardzo niskiej lub wysokiej glukozie skontaktuj się z lekarzem albo pomocą ratunkową."
    },
    nav: {
      home: "Start",
      dashboard: "Panel",
      onboarding: "Onboarding",
      pricing: "Plany",
      miniApp: "Mini App",
      installation: "Instalacja",
      setup: "Konfiguracja"
    },
    home: {
      kicker: "Dexcom-style SaaS · Sibionics GS3 · AI layer",
      title: "AI Diabetes SaaS dla CGM, lekarza głosowego i płatności WayForPay",
      lead:
        "Gotowy szkielet Next.js dla Sibionics GS3: strumień glukozy realtime, prognozy AI, asystent głosowy, Telegram Mini App login, ukraiński domyślnie i UI w wielu językach.",
      primaryCta: "Przejdź do panelu",
      secondaryCta: "Ustaw profil",
      metrics: ["Realtime CGM", "AI voice doctor", "WayForPay billing", "Telegram Mini App"],
      featureTitle: "Co jest już zaimplementowane",
      featureLead: "Logika działa lokalnie w trybie demo/mock i jest gotowa na prawdziwe klucze API.",
      features: [
        ["CGM stream", "SSE co kilka sekund, wykres, trend, ryzyka i prognoza 30/60/120 min."],
        ["AI doctor", "Dialog tekstowy i głosowy z ograniczeniami bezpieczeństwa medycznego i fallbackiem bez klucza Grok."],
        ["Telegram Mini App", "Walidacja initData przez HMAC, sesja i obsługa WebApp SDK."],
        ["WayForPay subscriptions", "Plany, checkout przez WayForPay, aktywacja callbackiem i powiadomienia Telegram."],
        ["i18n", "Ukraiński domyślnie, także rosyjski, polski i angielski."],
        ["Dashboard", "CGM, AI prediction, voice doctor, subskrypcja i szybkie akcje w jednym panelu."]
      ]
    },
    dashboard: {
      title: "Panel CGM",
      lead: "Pacjent demo ze strumieniem realtime, prognozą AI-ready i lekarzem głosowym.",
      glucoseNow: "Glukoza teraz",
      timeInRange: "Time in Range",
      prediction: "Prognoza",
      stream: "Strumień CGM",
      startStream: "Uruchom stream",
      stopStream: "Pauza",
      riskLow: "Nisko",
      riskInRange: "W zakresie",
      riskHigh: "Wysoko",
      updated: "Aktualizacja",
      mockBadge: "mock + AI-ready",
      quickActions: "Szybkie akcje",
      actions: ["Dodaj posiłek", "Zapisz insulinę", "Eksport PDF", "Udostępnij lekarzowi"]
    },
    doctor: {
      title: "Głosowy lekarz AI",
      lead: "Zadaj pytanie głosem lub tekstem. Asystent uwzględnia bieżący kontekst CGM i odpowiada ostrożnie.",
      placeholder: "Np. dlaczego glukoza rośnie po kolacji?",
      ask: "Zapytaj AI",
      speak: "Odczytaj",
      record: "Mów",
      stop: "Stop",
      empty: "Napisz lub podyktuj pytanie.",
      fallback: "Użyto odczytu w przeglądarce jako fallback."
    },
    onboarding: {
      title: "Onboarding pacjenta",
      lead: "Zbierz dane bazowe dla spersonalizowanego panelu, wskazówek AI i subskrypcji.",
      steps: ["Profil", "Cukrzyca", "CGM", "Cele"],
      fields: {
        name: "Imię",
        age: "Wiek",
        diabetesType: "Typ cukrzycy",
        therapy: "Terapia",
        device: "Urządzenie CGM",
        low: "Niski próg, mg/dL",
        high: "Wysoki próg, mg/dL",
        goals: "Cele",
        telegram: "Telegram username"
      },
      saved: "Profil zapisany. Możesz otworzyć panel.",
      submit: "Zapisz onboarding"
    },
    pricing: {
      title: "Plany subskrypcji",
      lead: "WayForPay jest jedyną bramką płatności. Bez kluczy API przyciski działają w trybie demo/error-safe.",
      customer: "Dane płatnika",
      name: "Imię",
      phone: "Telefon",
      email: "Email",
      pay: "Zapłać przez WayForPay",
      free: "Aktywuj bezpłatnie",
      billing: "miesiąc",
      success: "Checkout utworzony. Przekierowanie do WayForPay..."
    },
    miniApp: {
      title: "Telegram Mini App login",
      lead: "Strona odczytuje Telegram.WebApp.initData, wysyła je do backendu i tworzy bezpieczną sesję po walidacji HMAC.",
      notTelegram: "Otwórz tę stronę w Telegram Mini App albo użyj widoku demo.",
      verify: "Sprawdź Telegram session",
      verified: "Sesja Telegram potwierdzona",
      demo: "Demo user"
    }
  },
  en: {
    common: {
      appName: "GlucoMind GS3",
      tagline: "CGM + AI for daily glucose control",
      dashboard: "Dashboard",
      onboarding: "Onboarding",
      pricing: "Subscription",
      miniApp: "Telegram Mini App",
      installation: "Installation",
      buy: "Buy GS3",
      start: "Start",
      tryDemo: "Open demo",
      status: "Status",
      active: "Active",
      demoMode: "Demo mode",
      save: "Save",
      continue: "Continue",
      back: "Back",
      loading: "Loading...",
      medicalNotice:
        "AI is not a doctor, does not diagnose, and does not prescribe treatment. For dangerous symptoms, very low or high glucose, contact a clinician or emergency care."
    },
    nav: {
      home: "Home",
      dashboard: "Dashboard",
      onboarding: "Onboarding",
      pricing: "Plans",
      miniApp: "Mini App",
      installation: "Installation",
      setup: "Setup"
    },
    home: {
      kicker: "Dexcom-style SaaS · Sibionics GS3 · AI layer",
      title: "AI Diabetes SaaS for CGM, voice doctor, and WayForPay subscriptions",
      lead:
        "A ready Next.js skeleton for Sibionics GS3: realtime glucose stream, AI prediction, voice assistant, Telegram Mini App login, Ukrainian default, and multi-language UI.",
      primaryCta: "Open dashboard",
      secondaryCta: "Configure profile",
      metrics: ["Realtime CGM", "AI voice doctor", "WayForPay billing", "Telegram Mini App"],
      featureTitle: "What is implemented",
      featureLead: "The logic works locally in demo/mock mode and is ready for real API keys.",
      features: [
        ["CGM stream", "SSE updates every few seconds, chart, trend, risk flags, and 30/60/120 min prediction."],
        ["AI doctor", "Text and voice dialogue with medical safety guardrails and no-key fallback."],
        ["Telegram Mini App", "initData HMAC validation, session creation, and WebApp SDK support."],
        ["WayForPay subscriptions", "Plans, WayForPay checkout, callback activation, and Telegram notifications."],
        ["i18n", "Ukrainian by default, plus Russian, Polish, and English."],
        ["Dashboard", "CGM, AI prediction, voice doctor, subscription, and quick actions in one workspace."]
      ]
    },
    dashboard: {
      title: "CGM dashboard",
      lead: "Demo patient with realtime glucose stream, AI-ready prediction, and voice doctor.",
      glucoseNow: "Glucose now",
      timeInRange: "Time in Range",
      prediction: "Prediction",
      stream: "CGM stream",
      startStream: "Start stream",
      stopStream: "Pause",
      riskLow: "Low",
      riskInRange: "In range",
      riskHigh: "High",
      updated: "Updated",
      mockBadge: "mock + AI-ready",
      quickActions: "Quick actions",
      actions: ["Add meal", "Log insulin", "Export PDF", "Share with doctor"]
    },
    doctor: {
      title: "AI voice doctor",
      lead: "Ask by voice or text. The assistant uses current CGM context and responds cautiously.",
      placeholder: "For example: why is glucose rising after dinner?",
      ask: "Ask AI",
      speak: "Speak",
      record: "Talk",
      stop: "Stop",
      empty: "Write or dictate a question.",
      fallback: "Browser speech was used as fallback."
    },
    onboarding: {
      title: "Patient onboarding",
      lead: "Collect baseline data for a personalized dashboard, AI hints, and subscriptions.",
      steps: ["Profile", "Diabetes", "CGM", "Goals"],
      fields: {
        name: "Name",
        age: "Age",
        diabetesType: "Diabetes type",
        therapy: "Therapy",
        device: "CGM device",
        low: "Low threshold, mg/dL",
        high: "High threshold, mg/dL",
        goals: "Goals",
        telegram: "Telegram username"
      },
      saved: "Profile saved. You can open the dashboard.",
      submit: "Save onboarding"
    },
    pricing: {
      title: "Subscription plans",
      lead: "WayForPay is the only payment provider. Without API keys the buttons work in demo/error-safe mode.",
      customer: "Payment details",
      name: "Name",
      phone: "Phone",
      email: "Email",
      pay: "Pay with WayForPay",
      free: "Activate free",
      billing: "month",
      success: "Checkout created. Redirecting to WayForPay..."
    },
    miniApp: {
      title: "Telegram Mini App login",
      lead: "The page reads Telegram.WebApp.initData, sends it to the backend, and creates a secure session after HMAC validation.",
      notTelegram: "Open this page inside Telegram Mini App or use the demo view.",
      verify: "Verify Telegram session",
      verified: "Telegram session verified",
      demo: "Demo user"
    }
  }
} as const;

export type Dictionary = (typeof dictionaries)[Locale];

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

export function speechLocale(locale: Locale) {
  if (locale === "ua") return "uk-UA";
  if (locale === "ru") return "ru-RU";
  if (locale === "pl") return "pl-PL";
  return "en-US";
}
