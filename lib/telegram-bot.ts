import type { OrderRecord, ShipmentResult } from "@/lib/order-types";

export type TelegramSendResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  raw?: unknown;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(text: string, maxLength = 3900) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function money(amount: number) {
  return `${amount.toLocaleString("ru-RU")} грн`;
}

function itemLines(order: OrderRecord) {
  return order.items
    .map((item) => {
      const amount = item.lineTotalUah > 0 ? money(item.lineTotalUah) : "подарок";
      return `• ${escapeHtml(item.name)} × ${item.quantity} = <b>${escapeHtml(amount)}</b>`;
    })
    .join("\n");
}

function deliveryLines(order: OrderRecord) {
  const parts = [
    `<b>Служба:</b> ${escapeHtml(order.delivery.serviceLabel)}`,
    `<b>Город:</b> ${escapeHtml(order.delivery.city)}`,
    `<b>Отделение:</b> ${escapeHtml(order.delivery.branch || "—")}`
  ];

  if (order.delivery.postalCode) parts.push(`<b>Индекс:</b> ${escapeHtml(order.delivery.postalCode)}`);
  if (order.delivery.novaCityRef) parts.push(`<b>NP CityRef:</b> <code>${escapeHtml(order.delivery.novaCityRef)}</code>`);
  if (order.delivery.novaWarehouseRef) {
    parts.push(`<b>NP WarehouseRef:</b> <code>${escapeHtml(order.delivery.novaWarehouseRef)}</code>`);
  }

  return parts.join("\n");
}

function telegramPreferenceLines(order: OrderRecord) {
  if (!order.telegramPreferences) return "";

  return [
    "<b>Telegram опции:</b>",
    `• Уведомлять об изменениях: <b>${order.telegramPreferences.notifyOrderUpdates ? "да" : "нет"}</b>`,
    `• Добавить в группу: <b>${order.telegramPreferences.addToTelegramGroup ? "да" : "нет"}</b>`
  ].join("\n");
}

function customerLines(order: OrderRecord) {
  return [
    `<b>Имя:</b> ${escapeHtml(order.customer.name)}`,
    `<b>Телефон:</b> <code>${escapeHtml(order.customer.phone)}</code>`,
    order.customer.email ? `<b>Email:</b> ${escapeHtml(order.customer.email)}` : null
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatOrderCreatedMessage(order: OrderRecord) {
  const paymentLink = order.payment?.checkoutUrl
    ? `\n\n<b>Ссылка оплаты:</b> ${escapeHtml(order.payment.checkoutUrl)}`
    : "";
  const comment = order.comment ? `\n\n<b>Комментарий:</b>\n${escapeHtml(order.comment)}` : "";

  return truncate(`🧾 <b>Новый заказ Sibionics GS3</b>\n\n<b>№:</b> <code>${escapeHtml(order.orderId)}</code>\n<b>Статус:</b> ${escapeHtml(order.status)}\n<b>Сумма:</b> <b>${money(order.amountUah)}</b>\n\n<b>Товары:</b>\n${itemLines(order)}\n\n<b>Покупатель:</b>\n${customerLines(order)}\n\n<b>Доставка:</b>\n${deliveryLines(order)}${comment}${paymentLink}`);
}

export function formatPaymentMessage(order: OrderRecord, valid: boolean, approved: boolean) {
  const provider = order.paymentProvider === "wayforpay" ? "WayForPay" : "Hutko";
  return truncate(`💳 <b>${provider} callback</b>\n\n<b>№:</b> <code>${escapeHtml(order.orderId)}</code>\n<b>Подпись:</b> ${valid ? "✅ valid" : "⚠️ invalid"}\n<b>Оплата:</b> ${approved ? "✅ approved" : escapeHtml(order.paymentStatus || "not approved")}\n<b>Сумма:</b> <b>${money(order.amountUah)}</b>\n\n<b>Покупатель:</b>\n${customerLines(order)}\n\n<b>Доставка:</b>\n${deliveryLines(order)}`);
}

export function formatShipmentMessage(order: OrderRecord, shipment: ShipmentResult) {
  const lines = [
    `🚚 <b>ТТН ${shipment.status === "created" ? "создана" : "не создана"}</b>`,
    ``,
    `<b>№ заказа:</b> <code>${escapeHtml(order.orderId)}</code>`,
    `<b>Служба:</b> ${escapeHtml(order.delivery.serviceLabel)}`,
    shipment.ttn || shipment.trackingNumber
      ? `<b>ТТН:</b> <code>${escapeHtml(shipment.ttn || shipment.trackingNumber)}</code>`
      : null,
    shipment.uuid ? `<b>UUID:</b> <code>${escapeHtml(shipment.uuid)}</code>` : null,
    shipment.errors?.length ? `<b>Ошибки:</b> ${escapeHtml(shipment.errors.join("; "))}` : null,
    shipment.warnings?.length ? `<b>Предупреждения:</b> ${escapeHtml(shipment.warnings.join("; "))}` : null
  ].filter(Boolean);

  if (shipment.labelUrl && process.env.TELEGRAM_INCLUDE_LABEL_URL === "true") {
    lines.push(`<b>Стикер:</b> ${escapeHtml(shipment.labelUrl)}`);
  }

  return truncate(lines.join("\n"));
}

export async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ORDER_CHAT_ID;

  if (process.env.TELEGRAM_ORDER_NOTIFICATIONS === "false") {
    return { ok: true, skipped: true };
  }

  if (!token || !chatId) {
    return { ok: true, skipped: true, error: "TELEGRAM_BOT_TOKEN or TELEGRAM_ORDER_CHAT_ID is not configured" };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    }),
    cache: "no-store"
  });

  const rawText = await response.text();
  let payload: unknown = rawText;
  try {
    payload = JSON.parse(rawText);
  } catch {
    // Keep raw text in payload.
  }

  if (!response.ok) {
    return { ok: false, error: `Telegram sendMessage HTTP ${response.status}`, raw: payload };
  }

  return { ok: true, raw: payload };
}

export async function notifyOrderCreated(order: OrderRecord) {
  return sendTelegramMessage(formatOrderCreatedMessage(order));
}

export async function notifyPaymentStatus(order: OrderRecord, valid: boolean, approved: boolean) {
  return sendTelegramMessage(formatPaymentMessage(order, valid, approved));
}

export async function notifyShipmentStatus(order: OrderRecord, shipment: ShipmentResult) {
  return sendTelegramMessage(formatShipmentMessage(order, shipment));
}
