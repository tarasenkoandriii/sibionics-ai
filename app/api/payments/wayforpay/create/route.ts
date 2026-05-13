import { NextResponse } from "next/server";
import { calculateProductOrder } from "@/lib/order-config";
import {
  getDeliveryServiceLabel,
  normalizeDeliveryService,
  type DeliveryDetails,
  type OrderItem,
  type OrderRecord
} from "@/lib/order-types";
import { saveOrder } from "@/lib/order-store";
import { notifyOrderCreated } from "@/lib/telegram-bot";
import { createWayForPayCheckout } from "@/lib/wayforpay";

export const runtime = "nodejs";

const PHONE_RE = /^[+\d][\d\s().-]{6,}$/;
const POSTAL_CODE_RE = /^\d{5}$/;

function summarizeOrder(items: OrderItem[]) {
  return items.map((item) => `${item.name} x${item.quantity}`).join(", ");
}

export async function POST(request: Request) {
  let order: OrderRecord | null = null;

  try {
    const body = await request.json();

    const legacySensorQty = Number(body.kitQty || 0) + Number(body.extraSensorQty || 0);
    const requestedSensorQty = body.sensorQty ?? (legacySensorQty > 0 ? legacySensorQty : 1);
    const orderSummary = calculateProductOrder({
      sensorQty: requestedSensorQty,
      includeTransponder: body.includeTransponder
    });
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();
    const allowUkrposhta = Boolean(process.env.UKRPOSHTA_BEARER?.trim());
    const deliveryService = allowUkrposhta ? normalizeDeliveryService(body.delivery) : "nova_poshta";
    const city = String(body.city || "").trim();
    const branch = String(body.branch || "").trim();
    const postalCode = String(body.postalCode || "").trim();
    const novaCityRef = String(body.novaCityRef || "").trim();
    const novaWarehouseRef = String(body.novaWarehouseRef || "").trim();
    const comment = String(body.comment || "").trim();
    const locale = String(body.locale || "ua").trim();
    const notifyOrderUpdatesInTelegram = body.notifyOrderUpdatesInTelegram === true;
    const addToTelegramGroup = body.addToTelegramGroup === true;

    if (name.length < 2) return NextResponse.json({ error: "Укажите имя получателя." }, { status: 400 });
    if (!PHONE_RE.test(phone)) return NextResponse.json({ error: "Укажите корректный телефон." }, { status: 400 });
    if (!city) return NextResponse.json({ error: "Укажите город доставки." }, { status: 400 });
    if (deliveryService === "nova_poshta" && !branch) {
      return NextResponse.json({ error: "Укажите отделение или почтомат Новой почты." }, { status: 400 });
    }
    if (deliveryService === "ukrposhta" && !POSTAL_CODE_RE.test(postalCode)) {
      return NextResponse.json({ error: "Для Укрпочты укажите индекс отделения из 5 цифр." }, { status: 400 });
    }

    const items = orderSummary.items;
    const amountUah = orderSummary.totalUah;
    const orderId = `GS3-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const delivery: DeliveryDetails = {
      service: deliveryService,
      serviceLabel: getDeliveryServiceLabel(deliveryService),
      city,
      branch,
      postalCode: postalCode || undefined,
      novaCityRef: novaCityRef || undefined,
      novaWarehouseRef: novaWarehouseRef || undefined
    };

    order = {
      orderId,
      createdAt: now,
      updatedAt: now,
      status: "pending_payment",
      amountUah,
      currency: "UAH",
      customer: { name, phone, email: email || undefined },
      delivery,
      productOrder: {
        sensorQty: orderSummary.sensorQty,
        firstSensorQty: orderSummary.firstSensorQty,
        additionalSensorQty: orderSummary.additionalSensorQty,
        sensorSubtotalUah: orderSummary.sensorSubtotalUah,
        includeTransponder: orderSummary.includeTransponder,
        transponderSubtotalUah: orderSummary.transponderSubtotalUah,
        hasFreeTapes: orderSummary.hasFreeTapes,
        freeTapeQty: orderSummary.freeTapeQty
      },
      items,
      comment: comment || undefined,
      telegramPreferences: {
        notifyOrderUpdates: notifyOrderUpdatesInTelegram,
        addToTelegramGroup
      }
    };

    await saveOrder(order);

    const result = await createWayForPayCheckout({
      orderId,
      amountUah,
      items,
      customerName: name,
      customerPhone: phone,
      customerEmail: email || undefined,
      deliveryCity: city,
      deliveryAddress: `${delivery.serviceLabel}; ${branch || postalCode}`,
      comment: [summarizeOrder(items), comment].filter(Boolean).join(". "),
      locale
    });

    order = await saveOrder({
      ...order,
      paymentProvider: "wayforpay",
      payment: {
        checkoutUrl: result.checkoutUrl,
        wayforpayRaw: result.raw,
        wayforpayRequest: result.request
      }
    });

    notifyOrderCreated(order).catch((error) => console.error("telegram_order_notification_failed", error));

    return NextResponse.json({
      checkoutUrl: result.checkoutUrl,
      orderId: result.orderId,
      amountUah,
      provider: "wayforpay"
    });
  } catch (error) {
    if (order) {
      await saveOrder({ ...order, status: "payment_failed", paymentStatus: "create_checkout_failed" }).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "WayForPay payment error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
