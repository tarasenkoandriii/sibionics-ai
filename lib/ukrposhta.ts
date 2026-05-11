import type { OrderRecord, ShipmentResult } from "@/lib/order-types";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function getApiBase() {
  return process.env.UKRPOSHTA_API_BASE || "https://www.ukrposhta.ua/ecom/0.0.1";
}

function getFormsBase() {
  return process.env.UKRPOSHTA_FORMS_BASE || "https://www.ukrposhta.ua/forms/ecom/0.0.1";
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("380")) return digits;
  if (digits.startsWith("0")) return `38${digits}`;
  return digits;
}

function splitHumanName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[1] || parts[0] || "Покупець";
  const lastName = parts[0] && parts.length > 1 ? parts[0] : "Клієнт";
  const middleName = parts.length > 2 ? parts.slice(2).join(" ") : undefined;
  return { firstName, lastName, middleName };
}

function extractPostalCode(order: OrderRecord) {
  const value = order.delivery.postalCode || order.delivery.branch || "";
  const match = value.match(/\b\d{5}\b/);
  return match?.[0];
}

function getToken() {
  return requireEnv("UKRPOSHTA_COUNTERPARTY_TOKEN");
}

function getBearer() {
  return requireEnv("UKRPOSHTA_BEARER");
}

function appendToken(path: string, token?: string) {
  const base = getApiBase().replace(/\/$/, "");
  const url = new URL(`${base}/${path.replace(/^\//, "")}`);
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

async function ukrposhtaRequest<T>(path: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const response = await fetch(appendToken(path, options.token), {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getBearer()}`,
      "User-Agent": "Sibionics GS3 Next.js site"
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store"
  });

  const rawText = await response.text();
  let payload: any = rawText;
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      // Keep raw text.
    }
  }

  if (!response.ok) {
    const message = typeof payload === "string" ? payload : JSON.stringify(payload);
    throw new Error(`Ukrposhta HTTP ${response.status}: ${message.slice(0, 700)}`);
  }

  return payload as T;
}

function getStickerUrl(barcodeOrUuid: string) {
  const includeUrl = process.env.UKRPOSHTA_INCLUDE_LABEL_URL === "true";
  if (!includeUrl) return undefined;
  const base = getFormsBase().replace(/\/$/, "");
  const url = new URL(`${base}/shipments/${barcodeOrUuid}/sticker`);
  url.searchParams.set("token", getToken());
  return url.toString();
}

export async function createUkrposhtaShipment(order: OrderRecord): Promise<ShipmentResult> {
  const token = getToken();
  const postalCode = extractPostalCode(order);
  if (!postalCode) {
    throw new Error("Для ТТН Укрпочты нужен индекс отделения получателя, например 01001.");
  }

  const address = await ukrposhtaRequest<any>("/addresses", {
    method: "POST",
    body: {
      postcode: postalCode,
      country: "UA",
      city: order.delivery.city || undefined,
      description: order.delivery.branch || undefined
    }
  });

  const addressId = address?.id;
  if (!addressId) throw new Error("Ukrposhta did not return recipient address id.");

  const name = splitHumanName(order.customer.name);
  const recipient = await ukrposhtaRequest<any>("/clients", {
    method: "POST",
    token,
    body: {
      type: "INDIVIDUAL",
      name: order.customer.name,
      firstName: name.firstName,
      lastName: name.lastName,
      middleName: name.middleName,
      addressId,
      phoneNumber: normalizePhone(order.customer.phone),
      email: order.customer.email || undefined,
      externalId: order.orderId
    }
  });

  const recipientUuid = recipient?.uuid;
  if (!recipientUuid) throw new Error("Ukrposhta did not return recipient uuid.");

  const senderUuid = process.env.UKRPOSHTA_SENDER_UUID || process.env.UKRPOSHTA_COUNTERPARTY_UUID;
  if (!senderUuid) throw new Error("Missing UKRPOSHTA_SENDER_UUID or UKRPOSHTA_COUNTERPARTY_UUID");

  const senderAddressId = process.env.UKRPOSHTA_SENDER_ADDRESS_ID
    ? Number(process.env.UKRPOSHTA_SENDER_ADDRESS_ID)
    : undefined;
  const weight = Number(process.env.UKRPOSHTA_DEFAULT_WEIGHT_GRAMS || 500);
  const length = Number(process.env.UKRPOSHTA_DEFAULT_LENGTH_CM || 20);

  const shipment = await ukrposhtaRequest<any>("/shipments", {
    method: "POST",
    token,
    body: {
      sender: { uuid: senderUuid },
      recipient: { uuid: recipientUuid },
      senderAddressId,
      recipientAddressId: addressId,
      deliveryType: process.env.UKRPOSHTA_DELIVERY_TYPE || "W2W",
      type: process.env.UKRPOSHTA_SHIPMENT_TYPE || "EXPRESS",
      paidByRecipient: process.env.UKRPOSHTA_PAID_BY_RECIPIENT === "true",
      sms: process.env.UKRPOSHTA_SMS !== "false",
      description: `Sibionics GS3 ${order.orderId}`.slice(0, 40),
      parcels: [
        {
          name: "Sibionics GS3",
          weight: Number.isFinite(weight) && weight > 0 ? weight : 500,
          length: Number.isFinite(length) && length > 0 ? length : 20,
          declaredPrice: Math.max(1, Math.round(order.amountUah)),
          description: "Sibionics GS3 CGM"
        }
      ]
    }
  });

  const barcode = shipment?.barcode || shipment?.parcels?.[0]?.barcode || shipment?.shipmentBarcode;
  const uuid = shipment?.uuid || shipment?.shipmentUuid;
  const trackingNumber = barcode || uuid;
  if (!trackingNumber) {
    throw new Error("Ukrposhta did not return barcode or shipment uuid.");
  }

  return {
    provider: "ukrposhta",
    status: "created",
    ttn: barcode || trackingNumber,
    trackingNumber,
    uuid,
    labelUrl: getStickerUrl(trackingNumber),
    raw: { address, recipient, shipment },
    createdAt: new Date().toISOString()
  };
}
