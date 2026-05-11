"use client";

import { useEffect, useMemo, useState } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";

type MiniAppUser = {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: { user?: MiniAppUser };
  ready?: () => void;
  expand?: () => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function MiniAppLogin({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [initData, setInitData] = useState("");
  const [user, setUser] = useState<MiniAppUser | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isTelegram = useMemo(() => Boolean(initData), [initData]);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    webApp?.expand?.();
    setInitData(webApp?.initData || "");
    setUser(webApp?.initDataUnsafe?.user || null);
  }, []);

  async function verify() {
    setLoading(true);
    setStatus(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/telegram/miniapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Telegram verification failed");
      setStatus(dict.miniApp.verified);
      setUser(data.user || user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Telegram error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="dashboard-card miniapp-card">
      <div className="card-heading-row">
        <div>
          <span className="kicker">Telegram WebApp</span>
          <h2>{dict.miniApp.title}</h2>
          <p className="muted">{dict.miniApp.lead}</p>
        </div>
      </div>

      <div className="miniapp-user-card">
        {user?.photo_url ? <img src={user.photo_url} alt="Telegram avatar" /> : <div className="avatar-placeholder">TG</div>}
        <div>
          <strong>{user?.first_name || dict.miniApp.demo} {user?.last_name || ""}</strong>
          <span>{user?.username ? `@${user.username}` : isTelegram ? `ID ${user?.id}` : dict.miniApp.notTelegram}</span>
        </div>
      </div>

      <button className="btn btn-primary" type="button" onClick={verify} disabled={loading || !initData}>
        {loading ? dict.common.loading : dict.miniApp.verify}
      </button>

      {!initData ? <div className="alert info">{dict.miniApp.notTelegram}</div> : null}
      {status ? <div className="alert success">{status}</div> : null}
      {error ? <div className="alert error">{error}</div> : null}
    </section>
  );
}
