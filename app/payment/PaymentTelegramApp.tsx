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

export default function PaymentTelegramApp() {
  const locale = "ua" as const;
  const dict = getDictionary(locale);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    const webApp = (window as any).Telegram?.WebApp;

    if (!webApp) return;

    webApp.ready();
    webApp.expand();
    setTelegramUser(webApp.initDataUnsafe?.user ?? null);

    if (webApp.themeParams?.bg_color) {
      document.documentElement.style.setProperty("--tg-bg-color", webApp.themeParams.bg_color);
    }
  }, []);

  return (
    <main>
      <section className="page-hero compact">
        <div className="container">
          <span className="kicker">Telegram Mini App</span>
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
