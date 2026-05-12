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

type SenderRefs = {
  citySenderRef: string;
  senderRef: string;
  senderAddressRef: string;
  contactSenderRef: string;
  senderAddressSource: string;
};

type RecipientRefs = {
  cityRef: string;
  cityName: string;
  warehouseRef: string;
  warehouseDescription: string;
  recipientRef: string;
  contactRecipientRef: string;
};

type RecipientNameParts = {
  firstName: string;
  lastName: string;
  middleName: string;
};

export class NovaPoshtaApiError extends Error {
  payload: NovaPoshtaPayload;
  status: number;
  errors: string[];
  warnings: string[];
  info: string[];
  errorCodes: string[];
  messageCodes: string[];

  constructor(message: string, payload: NovaPoshtaPayload = {}, status = 0) {
    super(message);
    this.name = "NovaPoshtaApiError";
    this.payload = payload;
    this.status = status;
    this.errors = payload.errors || [];
    this.warnings = payload.warnings || [];
    this.info = payload.info || [];
    this.errorCodes = payload.errorCodes || [];
    this.messageCodes = payload.messageCodes || [];
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function optionalEnv(name: string, fallback: string) {
  return process.env[name] || fallback;
}

function normalizePhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
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

function compactDescription(order: OrderRecord) {
  const base = process.env.NOVA_POSHTA_DESCRIPTION || "Sibionics GS3 CGM";
  return `${base} ${order.orderId}`.slice(0, 100);
}

function normalizeBranchName(branch: string) {
  const trimmed = String(branch || "").trim();
  const numberMatch = trimmed.match(/(?:№|#|відділення|отделение|warehouse|branch)?\s*(\d{1,6})/iu);
  if (numberMatch && trimmed.length <= 40) return numberMatch[1];
  return trimmed;
}

function splitCustomerName(fullName: string): RecipientNameParts {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);

  return {
    lastName: parts[0] || "Клієнт",
    firstName: parts[1] || parts[0] || "Тест",
    middleName: parts.slice(2).join(" ") || ""
  };
}

function defaultKyivCityRef() {
  return "8d5a980d-391c-11dd-90d9-001a92567626";
}

function defaultKyivWarehouseRef() {
  return "1ec09d88-e1c2-11e3-8c4a-0050568002cf";
}

function collectNovaPoshtaMessages(payload: NovaPoshtaPayload) {
  return [
    ...(payload.errors || []),
    ...(payload.warnings || []),
    ...(payload.info || []),
    ...(payload.errorCodes || []),
    ...(payload.messageCodes || [])
  ].filter(Boolean);
}

async function novaPoshtaRequest(
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, unknown>
) {
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
    const details = collectNovaPoshtaMessages(payload);
    throw new NovaPoshtaApiError(details.length ? details.join("; ") : `Nova Poshta HTTP ${response.status}`, payload, response.status);
  }

  return payload;
}

async function getSenderCounterparty() {
  const payload = await novaPoshtaRequest("Counterparty", "getCounterparties", {
    CounterpartyProperty: "Sender",
    Page: "1"
  });

  const sender = Array.isArray(payload.data) ? payload.data[0] : null;
  if (!sender?.Ref) {
    throw new Error("Nova Poshta did not return sender counterparty. Check the API key account settings.");
  }

  return sender;
}

async function getSenderContact(senderRef: string, senderPhone: string) {
  const payload = await novaPoshtaRequest("Counterparty", "getCounterpartyContactPersons", {
    Ref: senderRef,
    Page: "1"
  });

  const contacts = Array.isArray(payload.data) ? payload.data : [];
  const contact =
    contacts.find(item => normalizePhone(item.Phones || item.Phone || "") === senderPhone) || contacts[0];

  if (!contact?.Ref) {
    throw new Error("Nova Poshta did not return sender contact person for this API key.");
  }

  return contact;
}

async function getSenderAddress(senderRef: string) {
  const payload = await novaPoshtaRequest("Counterparty", "getCounterpartyAddresses", {
    Ref: senderRef,
    CounterpartyProperty: "Sender",
    Page: "1"
  });

  const addresses = Array.isArray(payload.data) ? payload.data : [];
  const address = addresses[0];

  if (address?.Ref) {
    return {
      ref: address.Ref,
      cityRef:
        address.CityRef ||
        address.SettlementRef ||
        address.City ||
        address.Settlement ||
        process.env.NOVA_POSHTA_SENDER_CITY_REF ||
        defaultKyivCityRef(),
      source: "counterparty-address"
    };
  }

  return {
    ref:
      process.env.NOVA_POSHTA_SENDER_WAREHOUSE_REF ||
      process.env.NOVA_POSHTA_SENDER_ADDRESS_REF ||
      defaultKyivWarehouseRef(),
    cityRef: process.env.NOVA_POSHTA_SENDER_CITY_REF || defaultKyivCityRef(),
    source: "env-or-default-sender-warehouse"
  };
}

async function resolveSenderRefs(): Promise<SenderRefs> {
  const senderPhone = normalizePhone(requireEnv("NOVA_POSHTA_SENDER_PHONE"));

  const envRefs = {
    citySenderRef: process.env.NOVA_POSHTA_CITY_SENDER_REF,
    senderRef: process.env.NOVA_POSHTA_SENDER_REF,
    senderAddressRef: process.env.NOVA_POSHTA_SENDER_ADDRESS_REF,
    contactSenderRef: process.env.NOVA_POSHTA_CONTACT_SENDER_REF
  };

  if (envRefs.citySenderRef && envRefs.senderRef && envRefs.senderAddressRef && envRefs.contactSenderRef) {
    return {
      citySenderRef: envRefs.citySenderRef,
      senderRef: envRefs.senderRef,
      senderAddressRef: envRefs.senderAddressRef,
      contactSenderRef: envRefs.contactSenderRef,
      senderAddressSource: "env-main-config"
    };
  }

  const sender = await getSenderCounterparty();
  const contact = await getSenderContact(sender.Ref, senderPhone);
  const address = await getSenderAddress(sender.Ref);

  return {
    citySenderRef: address.cityRef,
    senderRef: sender.Ref,
    senderAddressRef: address.ref,
    contactSenderRef: contact.Ref,
    senderAddressSource: address.source
  };
}

async function resolveRecipientCity(order: OrderRecord) {
  const cityRef = order.delivery.novaCityRef || process.env.NP_TEST_RECIPIENT_CITY_REF;

  if (cityRef) {
    const payload = await novaPoshtaRequest("Address", "getCities", {
      Ref: cityRef,
      Page: "1",
      Limit: "1"
    });

    const cities = Array.isArray(payload.data) ? payload.data : [];
    const city = cities.find(item => item.Ref === cityRef) || cities[0];
    if (city?.Ref) return city;
  }

  const payload = await novaPoshtaRequest("Address", "getCities", {
    FindByString: order.delivery.city || "Київ",
    Page: "1",
    Limit: "1"
  });

  const city = Array.isArray(payload.data) ? payload.data[0] : null;
  if (!city?.Ref) {
    throw new Error(
      `Nova Poshta did not return recipient city. Provide delivery.novaCityRef or check city: ${order.delivery.city}`
    );
  }

  return city;
}

async function resolveRecipientWarehouse(order: OrderRecord, cityRef: string) {
  const warehouseRef = order.delivery.novaWarehouseRef || process.env.NP_TEST_RECIPIENT_WAREHOUSE_REF;

  if (warehouseRef) {
    const payload = await novaPoshtaRequest("AddressGeneral", "getWarehouses", {
      CityRef: cityRef,
      Ref: warehouseRef,
      Page: "1",
      Limit: "1"
    });

    const warehouses = Array.isArray(payload.data) ? payload.data : [];
    const warehouse = warehouses.find(item => item.Ref === warehouseRef) || warehouses[0];
    if (warehouse?.Ref) return warehouse;
  }

  const branchSearch = normalizeBranchName(order.delivery.branch);
  const payload = await novaPoshtaRequest("AddressGeneral", "getWarehouses", {
    CityRef: cityRef,
    FindByString: branchSearch,
    Page: "1",
    Limit: "1"
  });

  const warehouse = Array.isArray(payload.data) ? payload.data[0] : null;
  if (!warehouse?.Ref) {
    throw new Error(
      `Nova Poshta did not return recipient warehouse. Provide delivery.novaWarehouseRef or check branch: ${order.delivery.branch}`
    );
  }

  return warehouse;
}

async function createRecipientCounterparty(order: OrderRecord, cityRef: string) {
  const nameParts = splitCustomerName(order.customer.name);
  const phone = normalizePhone(order.customer.phone);

  const payload = await novaPoshtaRequest("Counterparty", "save", {
    CounterpartyProperty: "Recipient",
    CounterpartyType: "PrivatePerson",
    FirstName: nameParts.firstName,
    MiddleName: nameParts.middleName,
    LastName: nameParts.lastName,
    Phone: phone,
    CityRef: cityRef
  });

  const first = Array.isArray(payload.data) ? payload.data[0] || {} : {};
  const recipientRef = first.Ref;
  const contactRecipientRef =
    first.ContactPerson?.data?.[0]?.Ref ||
    first.ContactPersons?.[0]?.Ref ||
    first.ContactPersonRef;

  if (!recipientRef || !contactRecipientRef) {
    throw new NovaPoshtaApiError("Nova Poshta did not return recipient counterparty/contact refs", payload, 200);
  }

  return {
    recipientRef,
    contactRecipientRef
  };
}

async function resolveRecipientRefs(order: OrderRecord): Promise<RecipientRefs> {
  const city = await resolveRecipientCity(order);
  const warehouse = await resolveRecipientWarehouse(order, city.Ref);
  const recipient = await createRecipientCounterparty(order, city.Ref);

  return {
    cityRef: city.Ref,
    cityName: city.Description || city.DescriptionRu || city.DescriptionTranslit || order.delivery.city || "",
    warehouseRef: warehouse.Ref,
    warehouseDescription: warehouse.Description || warehouse.DescriptionRu || order.delivery.branch || "",
    recipientRef: recipient.recipientRef,
    contactRecipientRef: recipient.contactRecipientRef
  };
}

function buildInternetDocumentPayload(order: OrderRecord, senderRefs: SenderRefs, recipientRefs: RecipientRefs) {
  return {
    NewAddress: "1",
    PayerType: optionalEnv("NOVA_POSHTA_PAYER_TYPE", "Recipient"),
    PaymentMethod: optionalEnv("NOVA_POSHTA_PAYMENT_METHOD", "Cash"),
    CargoType: optionalEnv("NOVA_POSHTA_CARGO_TYPE", "Parcel"),
    VolumeGeneral: optionalEnv("NOVA_POSHTA_DEFAULT_VOLUME", "0.002"),
    Weight: optionalEnv("NOVA_POSHTA_DEFAULT_WEIGHT_KG", "0.5"),
    ServiceType: optionalEnv("NOVA_POSHTA_SERVICE_TYPE", "WarehouseWarehouse"),
    SeatsAmount: optionalEnv("NOVA_POSHTA_SEATS_AMOUNT", "1"),
    Description: compactDescription(order),
    Cost: String(Math.max(1, Math.round(order.amountUah))),
    CitySender: senderRefs.citySenderRef,
    Sender: senderRefs.senderRef,
    SenderAddress: senderRefs.senderAddressRef,
    ContactSender: senderRefs.contactSenderRef,
    SendersPhone: normalizePhone(requireEnv("NOVA_POSHTA_SENDER_PHONE")),
    CityRecipient: recipientRefs.cityRef,
    Recipient: recipientRefs.recipientRef,
    RecipientAddress: recipientRefs.warehouseRef,
    ContactRecipient: recipientRefs.contactRecipientRef,
    RecipientsPhone: normalizePhone(order.customer.phone),
    DateTime: process.env.NOVA_POSHTA_DATE || formatNovaDate()
  };
}

export async function createNovaPoshtaShipment(order: OrderRecord): Promise<ShipmentResult> {
  const senderRefs = await resolveSenderRefs();
  const recipientRefs = await resolveRecipientRefs(order);
  const methodProperties = buildInternetDocumentPayload(order, senderRefs, recipientRefs);

  const payload = await novaPoshtaRequest("InternetDocument", "save", methodProperties);
  const first = payload.data?.[0] || {};
  const ttn = first.IntDocNumber || first.Number || first.DocumentNumber;
  const uuid = first.Ref;

  if (!ttn) {
    throw new NovaPoshtaApiError("Nova Poshta did not return IntDocNumber for created TTN", payload, 200);
  }

  return {
    provider: "nova_poshta",
    status: "created",
    ttn,
    trackingNumber: ttn,
    uuid,
    warnings: payload.warnings || [],
    raw: {
      payload,
      senderAddressSource: senderRefs.senderAddressSource,
      recipientCityRef: recipientRefs.cityRef,
      recipientWarehouseRef: recipientRefs.warehouseRef
    },
    createdAt: new Date().toISOString()
  };
}
