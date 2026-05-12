import { NextResponse } from "next/server";
import { createWayForPayCheckout } from "@/lib/wayforpay";
import { getSubscriptionPlan, type SubscriptionPlanId } from "@/lib/subscription-plans";
import {
  activateFreeSubscription,
  createPendingSubscription,
  createSubscriptionId,
  saveSubscriptionCheckout,
  type SubscriptionCustomer
} from "@/lib/subscriptions";
import { sendTelegramMessage } from "@/lib/telegram-bot";

export const runtime = "nodejs";

function normalizeCustomer(input: any, locale: string): SubscriptionCustomer {
  const customer = input?.customer || {};
  return {
    name: String(customer.name || input?.name || "Demo customer").trim() || "Demo customer",
    phone: String(customer.phone || input?.phone || "").trim() || undefined,
    email: String(customer.email || input?.email || "").trim() || undefined,
    telegramId: String(input?.telegramId || "").trim() || undefined,
    telegramUsername: String(input?.telegramUsername || "").trim().replace(/^@/, "") || undefined,
    locale
  };
}

function htmlEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const planId = String(body.planId || "pro") as SubscriptionPlanId;
    const locale = String(body.locale || "ua");
    const plan = getSubscriptionPlan(planId);

    if (!plan) {
      return NextResponse.json({ error: "Unknown subscription plan" }, { status: 400 });
    }

    const customer = normalizeCustomer(body, locale);
    const subscriptionId = createSubscriptionId();

    if (plan.priceUah === 0) {
      const subscription = await activateFreeSubscription({ subscriptionId, planId, customer });
      sendTelegramMessage(
        `🩺 <b>Free subscription activated</b>\n\n<b>Subscription:</b> <code>${subscription.subscriptionId}</code>\n<b>Plan:</b> ${htmlEscape(plan.name.ua)}\n<b>Customer:</b> ${htmlEscape(customer.name)}`
      ).catch((error) => console.error("telegram_subscription_free_failed", error));
      return NextResponse.json({ ok: true, subscription });
    }

    const paymentOrderId = `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    await saveSubscriptionCheckout({
      paymentOrderId,
      subscriptionId,
      planId,
      status: "pending",
      amountUah: plan.priceUah,
      customer,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const checkout = await createWayForPayCheckout({
      orderId: paymentOrderId,
      amountUah: plan.priceUah,
      items: [
        {
          sku: `SUBSCRIPTION-${planId}`,
          name: `GlucoMind GS3 ${plan.name.en} subscription`,
          quantity: 1,
          unitPriceUah: plan.priceUah,
          lineTotalUah: plan.priceUah
        }
      ],
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      locale,
      regularMode: "monthly",
      regularBehavior: "preset",
      regularAmount: plan.priceUah,
      regularOn: 1
    });

    await saveSubscriptionCheckout({
      paymentOrderId,
      subscriptionId,
      planId,
      status: "pending",
      amountUah: plan.priceUah,
      checkoutUrl: checkout.checkoutUrl,
      customer,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      raw: checkout.raw
    });

    const subscription = await createPendingSubscription({
      subscriptionId,
      planId,
      customer,
      paymentOrderId,
      checkoutUrl: checkout.checkoutUrl,
      amountUah: plan.priceUah
    });

    sendTelegramMessage(
      `🩺 <b>New WayForPay subscription checkout</b>\n\n<b>Subscription:</b> <code>${subscriptionId}</code>\n<b>Payment order:</b> <code>${paymentOrderId}</code>\n<b>Plan:</b> ${htmlEscape(plan.name.ua)}\n<b>Amount:</b> ${plan.priceUah} грн\n<b>Customer:</b> ${htmlEscape(customer.name)}\n<b>Checkout:</b> ${htmlEscape(checkout.checkoutUrl)}`
    ).catch((error) => console.error("telegram_subscription_checkout_failed", error));

    return NextResponse.json({ ok: true, subscription, checkoutUrl: checkout.checkoutUrl, paymentOrderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Subscription create error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
