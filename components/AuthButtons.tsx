"use client";

import { useEffect, useState } from "react";
import { type Locale } from "@/lib/i18n";

type AuthState = {
  authenticated: boolean;
  user?: {
    firstName?: string;
    lastName?: string;
    username?: string;
    telegramId?: string;
    onboardingCompleted?: boolean;
  };
};

export function AuthButtons({ locale }: { locale: Locale }) {
  const [state, setState] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (mounted) setState(res.ok ? data : { authenticated: false });
      })
      .catch(() => mounted && setState({ authenticated: false }))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = `/${locale}`;
  }

  if (loading) {
    return <span className="auth-pill muted">Optional login...</span>;
  }

  if (state?.authenticated) {
    const user = state.user;
    const label = user?.firstName || user?.username || "Telegram";
    return (
      <div className="auth-actions">
        <a className="auth-pill" href={`/${locale}/dashboard`}>TG · {label}</a>
        <button className="auth-link-button" type="button" onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <div className="auth-actions">
      <a className="auth-pill" href={`/api/auth/telegram/oidc/start?locale=${locale}`}>Login Telegram <span className="auth-optional-label">optional</span></a>
    </div>
  );
}
