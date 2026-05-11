import type { OrderItem } from "@/lib/order-types";

export const ORDER_PRICING = {
  currency: "UAH",
  sensor: {
    sku: "sibionics-gs3-sensor-first",
    additionalSku: "sibionics-gs3-sensor-additional",
    name: "Сенсор Sibionics GS3",
    firstName: "Сенсор Sibionics GS3 — первый",
    additionalName: "Сенсор Sibionics GS3 — второй и последующие",
    firstUnitPriceUah: 900,
    additionalUnitPriceUah: 800,
    minQuantity: 1,
    maxQuantity: 100
  },
  transponder: {
    sku: "sibionics-gs3-transponder",
    name: "Транспондер Sibionics GS3",
    unitPriceUah: 500,
    maxQuantity: 1
  },
  tapeGift: {
    sku: "sibionics-gs3-tape-gift",
    name: "Тейпы для фиксации Sibionics GS3 — подарок",
    unitPriceUah: 0,
    minSensorQuantity: 2,
    quantityPerSensor: 1
  }
} as const;

export type ProductOrderDraft = {
  sensorQty: number;
  includeTransponder: boolean;
};

export type ProductOrderSummary = ProductOrderDraft & {
  firstSensorQty: number;
  additionalSensorQty: number;
  sensorSubtotalUah: number;
  transponderSubtotalUah: number;
  hasFreeTapes: boolean;
  freeTapeQty: number;
  items: OrderItem[];
  totalUah: number;
  currency: typeof ORDER_PRICING.currency;
};

export function moneyUah(amount: number) {
  return `${amount.toLocaleString("uk-UA")} грн`;
}

export function normalizeSensorQty(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return ORDER_PRICING.sensor.minQuantity;
  return Math.max(
    ORDER_PRICING.sensor.minQuantity,
    Math.min(ORDER_PRICING.sensor.maxQuantity, Math.floor(parsed))
  );
}

export function normalizeIncludeTransponder(value: unknown, defaultValue = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();
    if (["true", "1", "yes", "on", "include", "with"].includes(normalized)) return true;
    if (["false", "0", "no", "off", "without", "none"].includes(normalized)) return false;
  }
  return defaultValue;
}

export function calculateSensorSubtotal(sensorQty: number) {
  const normalizedQty = normalizeSensorQty(sensorQty);
  const firstSensorQty = normalizedQty >= 1 ? 1 : 0;
  const additionalSensorQty = Math.max(0, normalizedQty - firstSensorQty);

  return {
    firstSensorQty,
    additionalSensorQty,
    totalUah:
      firstSensorQty * ORDER_PRICING.sensor.firstUnitPriceUah +
      additionalSensorQty * ORDER_PRICING.sensor.additionalUnitPriceUah
  };
}

export function sensorPricingLabel() {
  return `1-й сенсор — ${moneyUah(ORDER_PRICING.sensor.firstUnitPriceUah)}, 2-й и последующие — ${moneyUah(
    ORDER_PRICING.sensor.additionalUnitPriceUah
  )}/шт.`;
}

export function calculateProductOrder(input: Partial<ProductOrderDraft>): ProductOrderSummary {
  const sensorQty = normalizeSensorQty(input.sensorQty);
  const includeTransponder = normalizeIncludeTransponder(input.includeTransponder, true);
  const { firstSensorQty, additionalSensorQty, totalUah: sensorSubtotalUah } = calculateSensorSubtotal(sensorQty);
  const transponderSubtotalUah = includeTransponder ? ORDER_PRICING.transponder.unitPriceUah : 0;
  const hasFreeTapes = sensorQty >= ORDER_PRICING.tapeGift.minSensorQuantity;
  const freeTapeQty = hasFreeTapes ? sensorQty * ORDER_PRICING.tapeGift.quantityPerSensor : 0;

  const items: OrderItem[] = [];

  if (firstSensorQty > 0) {
    items.push({
      sku: ORDER_PRICING.sensor.sku,
      name: ORDER_PRICING.sensor.firstName,
      quantity: firstSensorQty,
      unitPriceUah: ORDER_PRICING.sensor.firstUnitPriceUah,
      lineTotalUah: firstSensorQty * ORDER_PRICING.sensor.firstUnitPriceUah
    });
  }

  if (additionalSensorQty > 0) {
    items.push({
      sku: ORDER_PRICING.sensor.additionalSku,
      name: ORDER_PRICING.sensor.additionalName,
      quantity: additionalSensorQty,
      unitPriceUah: ORDER_PRICING.sensor.additionalUnitPriceUah,
      lineTotalUah: additionalSensorQty * ORDER_PRICING.sensor.additionalUnitPriceUah
    });
  }

  if (includeTransponder) {
    items.push({
      sku: ORDER_PRICING.transponder.sku,
      name: ORDER_PRICING.transponder.name,
      quantity: ORDER_PRICING.transponder.maxQuantity,
      unitPriceUah: ORDER_PRICING.transponder.unitPriceUah,
      lineTotalUah: ORDER_PRICING.transponder.unitPriceUah
    });
  }

  if (hasFreeTapes) {
    items.push({
      sku: ORDER_PRICING.tapeGift.sku,
      name: ORDER_PRICING.tapeGift.name,
      quantity: freeTapeQty,
      unitPriceUah: ORDER_PRICING.tapeGift.unitPriceUah,
      lineTotalUah: 0
    });
  }

  return {
    sensorQty,
    includeTransponder,
    firstSensorQty,
    additionalSensorQty,
    sensorSubtotalUah,
    transponderSubtotalUah,
    hasFreeTapes,
    freeTapeQty,
    items,
    totalUah: items.reduce((sum, item) => sum + item.lineTotalUah, 0),
    currency: ORDER_PRICING.currency
  };
}
