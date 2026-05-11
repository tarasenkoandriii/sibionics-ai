import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OrderRecord } from "@/lib/order-types";

function getOrderDir() {
  return process.env.ORDER_STORE_DIR || path.join(process.cwd(), ".data", "orders");
}

function safeOrderFileName(orderId: string) {
  return `${orderId.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
}

function getOrderPath(orderId: string) {
  return path.join(getOrderDir(), safeOrderFileName(orderId));
}

async function ensureOrderDir() {
  await mkdir(getOrderDir(), { recursive: true });
}

export async function saveOrder(order: OrderRecord) {
  await ensureOrderDir();
  const now = new Date().toISOString();
  const normalized: OrderRecord = {
    ...order,
    updatedAt: now,
    createdAt: order.createdAt || now
  };

  const filePath = getOrderPath(order.orderId);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
  await rename(tmpPath, filePath);
  return normalized;
}

export async function readOrder(orderId: string): Promise<OrderRecord | null> {
  try {
    const raw = await readFile(getOrderPath(orderId), "utf8");
    return JSON.parse(raw) as OrderRecord;
  } catch (error: any) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function updateOrder(
  orderId: string,
  updater: (order: OrderRecord) => OrderRecord | Promise<OrderRecord>
) {
  const current = await readOrder(orderId);
  if (!current) return null;
  const next = await updater(current);
  return saveOrder(next);
}
