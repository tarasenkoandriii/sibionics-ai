import { NextResponse } from "next/server";
import { createShipmentForOrderSafe } from "@/lib/delivery";
import { readOrder, saveOrder } from "@/lib/order-store";
import { notifyShipmentStatus } from "@/lib/telegram-bot";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const token = process.env.ORDER_ADMIN_TOKEN;
  if (!token) return false;
  const authorization = request.headers.get("authorization") || "";
  const headerToken = request.headers.get("x-admin-token") || "";
  return authorization === `Bearer ${token}` || headerToken === token;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Set ORDER_ADMIN_TOKEN and pass Authorization: Bearer <token>." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const orderId = String(body.orderId || "").trim();
    const force = Boolean(body.force);

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await readOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.shipment?.status === "created" && !force) {
      return NextResponse.json({ ok: true, orderId, shipment: order.shipment, skipped: true });
    }

    if (!force && !["paid", "ttn_failed", "ttn_created"].includes(order.status)) {
      return NextResponse.json(
        { error: "Order is not paid yet. Pass force=true only if you really need to create TTN manually." },
        { status: 409 }
      );
    }

    const shipment = await createShipmentForOrderSafe(order);
    const updatedOrder = await saveOrder({
      ...order,
      status: shipment.status === "created" ? "ttn_created" : "ttn_failed",
      shipment
    });

    notifyShipmentStatus(updatedOrder, shipment).catch((error) => console.error("telegram_manual_shipment_failed", error));

    return NextResponse.json({ ok: true, orderId, shipment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TTN creation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
