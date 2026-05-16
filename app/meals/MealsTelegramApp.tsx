"use client";

import { useEffect } from "react";

type TelegramMealsWebApp = {
  ready?: () => void;
  expand?: () => void;
};

function getTelegramWebApp(): TelegramMealsWebApp | undefined {
  return (window as typeof window & { Telegram?: { WebApp?: TelegramMealsWebApp } }).Telegram?.WebApp;
}

export default function MealsTelegramApp() {
  useEffect(() => {
    const webApp = getTelegramWebApp();
    webApp?.ready?.();
    webApp?.expand?.();
  }, []);

  return null;
}
