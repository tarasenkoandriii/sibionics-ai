import { NextResponse } from "next/server";
import { createShipmentForOrderSafe, shouldAutoCreateTtn } from "@/lib/delivery";
import type { OrderRecord } from "@/lib/order-types";
import { readOrder, saveOrder } from "@/lib/order-store";
import { notifyPaymentStatus, notifyShipmentStatus, sendTelegramMessage } from "@/lib/telegram-bot";
import {
  activateSubscriptionFromCheckout,
  formatSubscriptionEvent,
  markSubscriptionCheckoutFailed,
  readSubscriptionCheckout
} from "@/lib/subscriptions";
import {
  createWayForPayServiceResponse,
  getWayForPayCredentials,
  parseWayForPayCallbackBody,
  verifyWayForPayCallback
} from "@/lib/wayforpay";

export const runtime = "nodejs";

function getOrderId(data: Record<string, unknown>) {
  return String(data.orderReference || data.order_id || data.orderId || "").trim();
}

function getPaymentStatus(data: Record<string, unknown>) {
  return String(data.transactionStatus || data.order_status || data.status || "").toLowerCase();
}

async function markOrderFromCallback(order: OrderRecord, data: Record<string, unknown>, approved: boolean): Promise<OrderRecord> {
  return saveOrder({
    ...order,
    status: approved ? "paid" : order.status === "pending_payment" ? "payment_failed" : order.status,
    paymentStatus: getPaymentStatus(data),
    paymentProvider: "wayforpay",
    payment: {
      ...order.payment,
      wayforpayCallbackRaw: data,
      callbackRaw: data,
      paidAt: approved ? new Date().toISOString() : order.payment?.paidAt
    }
  });
}

export async function POST(request: Request) {
  let orderId = "";

  try {
    const data = (await parseWayForPayCallbackBody(request)) as Record<string, unknown>;
    const { secretKey } = getWayForPayCredentials();
    const valid = verifyWayForPayCallback(secretKey, data);
    const orderStatus = getPaymentStatus(data);
    const approved = valid && orderStatus === "approved";
    orderId = getOrderId(data);

    let order = orderId ? await readOrder(orderId) : null;

    if (!order) {
      const subscriptionCheckout = orderId ? await readSubscriptionCheckout(orderId) : null;

      if (subscriptionCheckout) {
        const subscription = approved
          ? await activateSubscriptionFromCheckout(orderId, data)
          : await markSubscriptionCheckoutFailed(orderId, data);

        if (subscription) {
          sendTelegramMessage(
            formatSubscriptionEvent(subscription, approved ? "WayForPay subscription approved" : "WayForPay subscription not approved")
          ).catch((error) => console.error("telegram_subscription_payment_notification_failed", error));
        }

        return NextResponse.json(createWayForPayServiceResponse(orderId, secretKey));
      }

      console.warn("wayforpay_callback_order_not_found", {
        valid,
        approved,
        orderReference: orderId,
        transactionStatus: data.transactionStatus,
        amount: data.amount,
        currency: data.currency
      });

      return NextResponse.json(createWayForPayServiceResponse(orderId || "unknown", secretKey));
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

    console.info("wayforpay_callback", {
      valid,
      approved,
      orderReference: orderId,
      transactionStatus: data.transactionStatus,
      amount: data.amount,
      currency: data.currency,
      shipment_status: shipment?.status,
      ttn: shipment?.ttn || shipment?.trackingNumber
    });

    return NextResponse.json(createWayForPayServiceResponse(orderId, secretKey));
  } catch (error) {
    const message = error instanceof Error ? error.message : "WayForPay callback error";
    return NextResponse.json({ ok: false, orderReference: orderId || undefined, error: message }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "WayForPay callback endpoint is ready." });
}
