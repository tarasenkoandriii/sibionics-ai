import type { DeliveryService, OrderRecord, ShipmentResult } from "@/lib/order-types";
import { createNovaPoshtaShipment } from "@/lib/nova-poshta";
import { createUkrposhtaShipment } from "@/lib/ukrposhta";

type ShipmentErrorLike = Error & {
  payload?: unknown;
  errors?: string[];
  warnings?: string[];
  info?: string[];
  errorCodes?: string[];
  messageCodes?: string[];
};

export function shouldAutoCreateTtn() {
  return process.env.DELIVERY_AUTO_CREATE_TTN !== "false";
}

export async function createShipmentForOrder(order: OrderRecord): Promise<ShipmentResult> {
  if (order.delivery.service === "ukrposhta") {
    return createUkrposhtaShipment(order);
  }

  return createNovaPoshtaShipment(order);
}

function normalizeShipmentError(error: unknown, provider: DeliveryService): ShipmentResult {
  const shipmentError = error as Partial<ShipmentErrorLike> | undefined;
  const fallbackMessage = error instanceof Error ? error.message : "Unknown shipment creation error";
  const errors = shipmentError?.errors?.length ? shipmentError.errors : [fallbackMessage];

  return {
    provider,
    status: "failed",
    errors,
    warnings: shipmentError?.warnings || [],
    raw: {
      message: fallbackMessage,
      payload: shipmentError?.payload,
      info: shipmentError?.info || [],
      errorCodes: shipmentError?.errorCodes || [],
      messageCodes: shipmentError?.messageCodes || []
    },
    createdAt: new Date().toISOString()
  };
}

export async function createShipmentForOrderSafe(order: OrderRecord): Promise<ShipmentResult> {
  try {
    return await createShipmentForOrder(order);
  } catch (error) {
    return normalizeShipmentError(error, order.delivery.service);
  }
}
