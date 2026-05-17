"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from "@/lib/subscription-plans";

type CustomerDraft = {
  name: string;
  phone: string;
  email: string;
};

type TelegramUserDraft = {
  id?: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type SubscriptionCardsProps = {
  locale: Locale;
  telegramMiniApp?: boolean;
  telegramUser?: TelegramUserDraft | null;
};

function getTelegramDisplayName(user?: TelegramUserDraft | null) {
  if (!user) return "";
  if (user.username) return `@${String(user.username).replace(/^@/, "")}`;
  return [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
}

function getTelegramPaymentSuffix(user?: TelegramUserDraft | null) {
  const username = getTelegramDisplayName(user) || "користувача Telegram";
  const telegramId = user?.id ? String(user.id) : "невідомий";
  return ` для ${username} id#${telegramId}`;
}

function openTelegramPaymentUrl(url: string) {
  const webApp = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : null;

  if (webApp?.openLink) {
    webApp.openLink(url);
    return;
  }

  window.location.href = url;
}

export function SubscriptionCards({ locale, telegramMiniApp = false, telegramUser = null }: SubscriptionCardsProps) {
  const dict = getDictionary(locale);
  const [customer, setCustomer] = useState<CustomerDraft>({ name: "", phone: "", email: "" });
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlanId | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paymentTitle = useMemo(() => {
    if (!telegramMiniApp) return dict.pricing.customer;
    return `${dict.pricing.customer}${getTelegramPaymentSuffix(telegramUser)}`;
  }, [dict.pricing.customer, telegramMiniApp, telegramUser]);

  useEffect(() => {
    if (!telegramMiniApp || !telegramUser) return;

    const telegramName = getTelegramDisplayName(telegramUser);
    if (!telegramName) return;

    setCustomer((previous) => {
      if (previous.name.trim()) return previous;
      return { ...previous, name: telegramName };
    });
  }, [telegramMiniApp, telegramUser]);

  async function activatePlan(planId: SubscriptionPlanId) {
    setLoadingPlan(planId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          locale,
          customer,
          telegramId: telegramUser?.id ? String(telegramUser.id) : undefined,
          telegramUsername: telegramUser?.username ? String(telegramUser.username).replace(/^@/, "") : undefined,
          source: telegramMiniApp ? "telegram_payment_mini_app" : "pricing_page"
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Subscription checkout failed");

      if (data.checkoutUrl) {
        setMessage(dict.pricing.success);
        if (telegramMiniApp) {
          openTelegramPaymentUrl(data.checkoutUrl);
        } else {
          window.location.href = data.checkoutUrl;
        }
      } else {
        setMessage(`${dict.common.active}: ${data.subscription?.subscriptionId || data.subscriptionId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscription error");
    } finally {
      setLoadingPlan(null);
    }
  }

  function onCustomerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <div className="subscription-section">
      <form className="customer-panel" onSubmit={onCustomerSubmit}>
        <h3>{paymentTitle}</h3>
        <div className="form-grid three">
          <label>
            {dict.pricing.name}
            <input className="input" value={customer.name} onChange={(event) => setCustomer((previous) => ({ ...previous, name: event.target.value }))} required />
          </label>
          <label>
            {dict.pricing.phone}
            <input className="input" value={customer.phone} onChange={(event) => setCustomer((previous) => ({ ...previous, phone: event.target.value }))} />
          </label>
          <label>
            {dict.pricing.email}
            <input className="input" type="email" value={customer.email} onChange={(event) => setCustomer((previous) => ({ ...previous, email: event.target.value }))} />
          </label>
        </div>
      </form>

      <div className="pricing-grid">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <article className={`pricing-card ${plan.popular ? "popular" : ""}`} key={plan.id}>
            {plan.popular ? <span className="popular-badge">Popular</span> : null}
            <h3>{plan.name[locale]}</h3>
            <p className="muted">{plan.description[locale]}</p>
            <div className="plan-price">
              <strong>{plan.priceUah === 0 ? "0" : plan.priceUah.toLocaleString("uk-UA")}</strong>
              <span>грн / {dict.pricing.billing}</span>
            </div>
            <ul>
              {plan.features[locale].map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button className="btn btn-primary" type="button" disabled={loadingPlan !== null} onClick={() => activatePlan(plan.id)}>
              {loadingPlan === plan.id ? dict.common.loading : plan.priceUah === 0 ? dict.pricing.free : dict.pricing.pay}
            </button>
          </article>
        ))}
      </div>

      {message ? <div className="alert success">{message}</div> : null}
      {error ? <div className="alert error">{error}</div> : null}
    </div>
  );
}
