import { NextResponse } from "next/server";
import { createWayForPayCheckout } from "@/lib/wayforpay";
import { getSubscriptionPlan } from "@/lib/subscription-plans";
import { readSubscription, saveSubscription, saveSubscriptionCheckout } from "@/lib/subscriptions";
import { sendTelegramMessage } from "@/lib/telegram-bot";

export const runtime = "nodejs";

function assertAdmin(request: Request) {
  const token = process.env.ORDER_ADMIN_TOKEN;
  if (!token) throw new Error("ORDER_ADMIN_TOKEN is not configured");
  const header = request.headers.get("authorization") || "";
  if (header !== `Bearer ${token}`) throw new Error("Unauthorized");
}

export async function POST(request: Request) {
  try {
    assertAdmin(request);
    const body = await request.json();
    const subscriptionId = String(body.subscriptionId || "").trim();
    const subscription = await readSubscription(subscriptionId);
    if (!subscription) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

    const plan = getSubscriptionPlan(subscription.planId);
    if (!plan || plan.priceUah <= 0) return NextResponse.json({ error: "Plan is not billable" }, { status: 400 });

    const paymentOrderId = `SUBR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const checkout = await createWayForPayCheckout({
      orderId: paymentOrderId,
      amountUah: plan.priceUah,
      items: [
        {
          sku: `SUBSCRIPTION-RENEWAL-${plan.id}`,
          name: `GlucoMind GS3 ${plan.name.en} renewal`,
          quantity: 1,
          unitPriceUah: plan.priceUah,
          lineTotalUah: plan.priceUah
        }
      ],
      customerName: subscription.customer.name,
      customerPhone: subscription.customer.phone,
      customerEmail: subscription.customer.email,
      locale: subscription.customer.locale || "ua",
      regularMode: "monthly",
      regularBehavior: "preset",
      regularAmount: plan.priceUah,
      regularOn: 1
    });

    await saveSubscriptionCheckout({
      paymentOrderId,
      subscriptionId,
      planId: plan.id,
      status: "pending",
      amountUah: plan.priceUah,
      checkoutUrl: checkout.checkoutUrl,
      customer: subscription.customer,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      raw: checkout.raw
    });

    const updated = await saveSubscription({
      ...subscription,
      status: "past_due",
      lastPaymentOrderId: paymentOrderId,
      lastCheckoutUrl: checkout.checkoutUrl,
      paymentHistory: [
        ...subscription.paymentHistory,
        {
          paymentOrderId,
          status: "pending",
          amountUah: plan.priceUah,
          createdAt: new Date().toISOString()
        }
      ]
    });

    sendTelegramMessage(
      `🔁 <b>WayForPay subscription renewal invoice</b>\n\n<b>Subscription:</b> <code>${subscriptionId}</code>\n<b>Order:</b> <code>${paymentOrderId}</code>\n<b>Checkout:</b> ${checkout.checkoutUrl}`
    ).catch((error) => console.error("telegram_subscription_invoice_failed", error));

    return NextResponse.json({ ok: true, subscription: updated, checkoutUrl: checkout.checkoutUrl, paymentOrderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Subscription invoice error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
