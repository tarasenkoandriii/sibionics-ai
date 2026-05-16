"use client";

import { useEffect } from "react";

type TelegramInsulinWebApp = {
  ready?: () => void;
  expand?: () => void;
};

function getTelegramWebApp(): TelegramInsulinWebApp | undefined {
  return (window as typeof window & { Telegram?: { WebApp?: TelegramInsulinWebApp } }).Telegram?.WebApp;
}

export default function InsulinTelegramApp() {
  useEffect(() => {
    const webApp = getTelegramWebApp();
    webApp?.ready?.();
    webApp?.expand?.();
  }, []);

  return null;
}
