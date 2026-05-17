"use client";

import { useEffect, useState } from "react";
import { SubscriptionCards } from "@/components/SubscriptionCards";
import { getDictionary } from "@/lib/i18n";

type TelegramUser = {
  id?: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

function readTelegramUserFromInitData(initData?: string): TelegramUser | null {
  if (!initData) return null;

  try {
    const params = new URLSearchParams(initData);
    const rawUser = params.get("user");
    if (!rawUser) return null;
    return JSON.parse(rawUser) as TelegramUser;
  } catch {
    return null;
  }
}

function readTelegramUser(): TelegramUser | null {
  if (typeof window === "undefined") return null;

  const webApp = (window as any).Telegram?.WebApp;
  const unsafeUser = webApp?.initDataUnsafe?.user as TelegramUser | undefined;

  if (unsafeUser?.id) return unsafeUser;

  const initDataUser = readTelegramUserFromInitData(webApp?.initData);
  if (initDataUser?.id) return initDataUser;

  return null;
}

export default function PaymentTelegramApp() {
  const locale = "ua" as const;
  const dict = getDictionary(locale);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const syncTelegram = () => {
      if (cancelled) return;

      const webApp = (window as any).Telegram?.WebApp;

      if (webApp) {
        webApp.ready();
        webApp.expand();

        if (webApp.themeParams?.bg_color) {
          document.documentElement.style.setProperty("--tg-bg-color", webApp.themeParams.bg_color);
        }
      }

      const user = readTelegramUser();
      if (user?.id) {
        setTelegramUser(user);
        return;
      }

      attempts += 1;
      if (attempts < 30) {
        timeoutId = setTimeout(syncTelegram, 150);
      }
    };

    syncTelegram();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <main>
      <section className="page-hero compact">
        <div className="container">
          <span className="kicker">Оплата підписки</span>
          <h1>{dict.pricing.title}</h1>
          <p className="lead">{dict.pricing.lead}</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <SubscriptionCards locale={locale} telegramMiniApp telegramUser={telegramUser} />
        </div>
      </section>
    </main>
  );
}
