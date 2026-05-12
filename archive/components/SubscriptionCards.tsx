"use client";

import { FormEvent, useState } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from "@/lib/subscription-plans";

type CustomerDraft = {
  name: string;
  phone: string;
  email: string;
};

export function SubscriptionCards({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [customer, setCustomer] = useState<CustomerDraft>({ name: "", phone: "", email: "" });
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlanId | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function activatePlan(planId: SubscriptionPlanId) {
    setLoadingPlan(planId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, locale, customer })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Subscription checkout failed");

      if (data.checkoutUrl) {
        setMessage(dict.pricing.success);
        window.location.href = data.checkoutUrl;
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
        <h3>{dict.pricing.customer}</h3>
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
