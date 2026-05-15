"use client";

import { useEffect } from "react";

type TelegramInstallWebApp = {
  ready?: () => void;
  expand?: () => void;
};

function getTelegramWebApp(): TelegramInstallWebApp | undefined {
  return (window as typeof window & { Telegram?: { WebApp?: TelegramInstallWebApp } }).Telegram?.WebApp;
}

export default function InstallTelegramApp() {
  useEffect(() => {
    const webApp = getTelegramWebApp();
    webApp?.ready?.();
    webApp?.expand?.();
  }, []);

  return null;
}
