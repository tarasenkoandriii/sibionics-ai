import type { OrderRecord, ShipmentResult } from "@/lib/order-types";

type NovaPoshtaPayload = {
  success?: boolean;
  data?: any[];
  errors?: string[];
  warnings?: string[];
  info?: string[];
  messageCodes?: string[];
  errorCodes?: string[];
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function optionalEnv(name: string, fallback: string) {
  return process.env[name] || fallback;
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("380")) return digits;
  if (digits.startsWith("0")) return `38${digits}`;
  return digits;
}

function formatNovaDate(date = new Date()) {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function normalizeBranchName(branch: string) {
  const trimmed = branch.trim();
  const numberMatch = trimmed.match(/(?:№|#|відділення|отделение|warehouse|branch)?\s*(\d{1,6})/iu);
  if (numberMatch && trimmed.length <= 28) return numberMatch[1];
  return trimmed;
}

function compactDescription(order: OrderRecord) {
  const base = process.env.NOVA_POSHTA_DESCRIPTION || "Sibionics GS3 CGM";
  return `${base} ${order.orderId}`.slice(0, 100);
}

async function novaPoshtaRequest(modelName: string, calledMethod: string, methodProperties: Record<string, unknown>) {
  const response = await fetch(process.env.NOVA_POSHTA_API_URL || "https://api.novaposhta.ua/v2.0/json/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": "Sibionics GS3 Next.js site"
    },
    body: JSON.stringify({
      apiKey: requireEnv("NOVA_POSHTA_API_KEY"),
      modelName,
      calledMethod,
      methodProperties
    }),
    cache: "no-store"
  });

  const rawText = await response.text();
  let payload: NovaPoshtaPayload;
  try {
    payload = JSON.parse(rawText) as NovaPoshtaPayload;
  } catch {
    throw new Error(`Nova Poshta returned non-JSON response: ${rawText.slice(0, 500)}`);
  }

  if (!response.ok || payload.success === false) {
    const details = [
      ...(payload.errors || []),
      ...(payload.warnings || []),
      ...(payload.info || []),
      ...(payload.errorCodes || []),
      ...(payload.messageCodes || [])
    ].filter(Boolean);
    throw new Error(details.length ? details.join("; ") : `Nova Poshta HTTP ${response.status}`);
  }

  return payload;
}

export async function createNovaPoshtaShipment(order: OrderRecord): Promise<ShipmentResult> {
  const weight = Number(process.env.NOVA_POSHTA_DEFAULT_WEIGHT_KG || 0.5);
  const volume = process.env.NOVA_POSHTA_DEFAULT_VOLUME || "0.002";

  const methodProperties = {
    NewAddress: "1",
    PayerType: optionalEnv("NOVA_POSHTA_PAYER_TYPE", "Sender"),
    PaymentMethod: optionalEnv("NOVA_POSHTA_PAYMENT_METHOD", "Cash"),
    CargoType: optionalEnv("NOVA_POSHTA_CARGO_TYPE", "Parcel"),
    VolumeGeneral: volume,
    Weight: Number.isFinite(weight) && weight > 0 ? String(weight) : "0.5",
    ServiceType: optionalEnv("NOVA_POSHTA_SERVICE_TYPE", "WarehouseWarehouse"),
    SeatsAmount: optionalEnv("NOVA_POSHTA_SEATS_AMOUNT", "1"),
    Description: compactDescription(order),
    Cost: String(Math.max(1, Math.round(order.amountUah))),
    CitySender: requireEnv("NOVA_POSHTA_CITY_SENDER_REF"),
    Sender: requireEnv("NOVA_POSHTA_SENDER_REF"),
    SenderAddress: requireEnv("NOVA_POSHTA_SENDER_ADDRESS_REF"),
    ContactSender: requireEnv("NOVA_POSHTA_CONTACT_SENDER_REF"),
    SendersPhone: normalizePhone(requireEnv("NOVA_POSHTA_SENDER_PHONE")),
    RecipientCityName: order.delivery.city,
    RecipientArea: "",
    RecipientAreaRegions: "",
    RecipientAddressName: normalizeBranchName(order.delivery.branch),
    RecipientHouse: "",
    RecipientFlat: "",
    RecipientName: order.customer.name,
    RecipientType: "PrivatePerson",
    RecipientsPhone: normalizePhone(order.customer.phone),
    DateTime: process.env.NOVA_POSHTA_DATE || formatNovaDate()
  };

  const payload = await novaPoshtaRequest("InternetDocument", "save", methodProperties);
  const first = payload.data?.[0] || {};
  const ttn = first.IntDocNumber || first.Number || first.DocumentNumber;
  const uuid = first.Ref;

  if (!ttn) {
    throw new Error("Nova Poshta did not return IntDocNumber for created TTN");
  }

  return {
    provider: "nova_poshta",
    status: "created",
    ttn,
    trackingNumber: ttn,
    uuid,
    warnings: payload.warnings || [],
    raw: payload,
    createdAt: new Date().toISOString()
  };
}
