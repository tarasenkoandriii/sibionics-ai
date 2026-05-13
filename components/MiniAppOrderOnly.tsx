"use client";

import { useEffect } from "react";
import { CheckoutForm } from "@/components/CheckoutForm";

export function MiniAppOrderOnly({ allowUkrposhta = false }: { allowUkrposhta?: boolean }) {
  useEffect(() => {
    const webApp = (window as any).Telegram?.WebApp;
    webApp?.ready?.();
    webApp?.expand?.();
  }, []);

  return (
    <CheckoutForm
      allowUkrposhta={allowUkrposhta}
      defaultNotifyOrderUpdatesInTelegram
      defaultAddToTelegramGroup
      compactHeader
    />
  );
}
