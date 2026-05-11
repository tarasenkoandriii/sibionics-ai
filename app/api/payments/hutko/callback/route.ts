import { NextResponse } from "next/server";
import { createShipmentForOrderSafe, shouldAutoCreateTtn } from "@/lib/delivery";
import { parseHutkoCallbackBody, verifyHutkoSignature } from "@/lib/hutko";
import type { OrderRecord } from "@/lib/order-types";
import { readOrder, saveOrder } from "@/lib/order-store";
import { notifyPaymentStatus, notifyShipmentStatus, sendTelegramMessage } from "@/lib/telegram-bot";
import {
  activateSubscriptionFromCheckout,
  formatSubscriptionEvent,
  markSubscriptionCheckoutFailed,
  readSubscriptionCheckout
} from "@/lib/subscriptions";

export const runtime = "nodejs";

function getSecretKey() {
  const secret = process.env.HUTKO_SECRET_KEY;
  if (!secret) throw new Error("Missing HUTKO_SECRET_KEY");
  return secret;
}

function getOrderId(data: Record<string, unknown>) {
  return String(data.order_id || data.orderId || data.order || "").trim();
}

function getPaymentStatus(data: Record<string, unknown>) {
  return String(data.order_status || data.status || data.payment_status || "").toLowerCase();
}

async function markOrderFromCallback(
  order: OrderRecord,
  data: Record<string, unknown>,
  approved: boolean
): Promise<OrderRecord> {
  return saveOrder({
    ...order,
    status: approved ? "paid" : order.status === "pending_payment" ? "payment_failed" : order.status,
    paymentStatus: getPaymentStatus(data),
    payment: {
      ...order.payment,
      callbackRaw: data,
      paidAt: approved ? new Date().toISOString() : order.payment?.paidAt
    }
  });
}

export async function POST(request: Request) {
  try {
    const data = (await parseHutkoCallbackBody(request)) as Record<string, unknown>;
    const valid = verifyHutkoSignature(getSecretKey(), data as any);
    const orderStatus = getPaymentStatus(data);
    const approved = valid && orderStatus === "approved";
    const orderId = getOrderId(data);

    let order = orderId ? await readOrder(orderId) : null;

    if (!order) {
      const subscriptionCheckout = orderId ? await readSubscriptionCheckout(orderId) : null;

      if (subscriptionCheckout) {
        const subscription = approved
          ? await activateSubscriptionFromCheckout(orderId, data)
          : await markSubscriptionCheckoutFailed(orderId, data);

        if (subscription) {
          sendTelegramMessage(
            formatSubscriptionEvent(subscription, approved ? "Hutko subscription approved" : "Hutko subscription not approved")
          ).catch((error) => console.error("telegram_subscription_payment_notification_failed", error));
        }

        return NextResponse.json({
          ok: true,
          valid,
          approved,
          orderFound: false,
          subscriptionFound: true,
          subscription
        });
      }

      console.warn("hutko_callback_order_not_found", {
        valid,
        approved,
        order_id: orderId,
        order_status: data.order_status,
        amount: data.amount,
        currency: data.currency
      });

      return NextResponse.json({ ok: true, valid, approved, orderFound: false, subscriptionFound: false });
    }

    order = await markOrderFromCallback(order, data, approved);
    notifyPaymentStatus(order, valid, approved).catch((error) => console.error("telegram_payment_notification_failed", error));

    let shipment = order.shipment;

    if (approved && shouldAutoCreateTtn()) {
      if (order.shipment?.status === "created" && order.shipment.trackingNumber) {
        shipment = order.shipment;
      } else {
        shipment = await createShipmentForOrderSafe(order);
        order = await saveOrder({
          ...order,
          status: shipment.status === "created" ? "ttn_created" : "ttn_failed",
          shipment
        });
        notifyShipmentStatus(order, shipment).catch((error) => console.error("telegram_shipment_notification_failed", error));
      }
    }

    console.info("hutko_callback", {
      valid,
      approved,
      order_id: orderId,
      order_status: data.order_status,
      amount: data.amount,
      currency: data.currency,
      shipment_status: shipment?.status,
      ttn: shipment?.ttn || shipment?.trackingNumber
    });

    return NextResponse.json({
      ok: true,
      valid,
      approved,
      orderId,
      shipment: shipment
        ? {
            status: shipment.status,
            provider: shipment.provider,
            ttn: shipment.ttn,
            trackingNumber: shipment.trackingNumber,
            uuid: shipment.uuid,
            errors: shipment.errors,
            warnings: shipment.warnings
          }
        : null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Callback error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Hutko callback endpoint is ready." });
}
