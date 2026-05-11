import type { OrderRecord, ShipmentResult } from "@/lib/order-types";
import { createNovaPoshtaShipment } from "@/lib/nova-poshta";
import { createUkrposhtaShipment } from "@/lib/ukrposhta";

export function shouldAutoCreateTtn() {
  return process.env.DELIVERY_AUTO_CREATE_TTN !== "false";
}

export async function createShipmentForOrder(order: OrderRecord): Promise<ShipmentResult> {
  if (order.delivery.service === "ukrposhta") {
    return createUkrposhtaShipment(order);
  }

  return createNovaPoshtaShipment(order);
}

export async function createShipmentForOrderSafe(order: OrderRecord): Promise<ShipmentResult> {
  try {
    return await createShipmentForOrder(order);
  } catch (error) {
    return {
      provider: order.delivery.service,
      status: "failed",
      errors: [error instanceof Error ? error.message : "Unknown shipment creation error"],
      createdAt: new Date().toISOString()
    };
  }
}
