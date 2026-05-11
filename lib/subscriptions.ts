import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSubscriptionPlan, type SubscriptionPlanId } from "@/lib/subscription-plans";

export type SubscriptionStatus = "pending_payment" | "active" | "past_due" | "cancelled" | "payment_failed";

export type SubscriptionCustomer = {
  name: string;
  phone?: string;
  email?: string;
  telegramId?: string;
  telegramUsername?: string;
  locale?: string;
};

export type SubscriptionRecord = {
  subscriptionId: string;
  planId: SubscriptionPlanId;
  status: SubscriptionStatus;
  customer: SubscriptionCustomer;
  createdAt: string;
  updatedAt: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  lastPaymentOrderId?: string;
  lastCheckoutUrl?: string;
  paymentHistory: Array<{
    paymentOrderId: string;
    status: "pending" | "approved" | "failed";
    amountUah: number;
    createdAt: string;
    paidAt?: string;
    raw?: unknown;
  }>;
};

export type SubscriptionCheckoutRecord = {
  paymentOrderId: string;
  subscriptionId: string;
  planId: SubscriptionPlanId;
  status: "pending" | "approved" | "failed";
  amountUah: number;
  checkoutUrl?: string;
  customer: SubscriptionCustomer;
  createdAt: string;
  updatedAt: string;
  raw?: unknown;
};

function getDataDir(name: string) {
  return path.join(process.env.ORDER_STORE_DIR || path.join(process.cwd(), ".data"), name);
}

function safeName(value: string) {
  return `${value.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
}

async function writeJson(filePath: string, data: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpPath, JSON.stringify(data, null, 2), "utf8");
  await rename(tmpPath, filePath);
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error: any) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function subscriptionPath(subscriptionId: string) {
  return path.join(getDataDir("subscriptions"), safeName(subscriptionId));
}

function checkoutPath(paymentOrderId: string) {
  return path.join(getDataDir("subscription-checkouts"), safeName(paymentOrderId));
}

function addPeriod(now = new Date()) {
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);
  return end;
}

export function createSubscriptionId() {
  return `SUBS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function saveSubscription(record: SubscriptionRecord) {
  const now = new Date().toISOString();
  const normalized = { ...record, updatedAt: now, createdAt: record.createdAt || now };
  await writeJson(subscriptionPath(record.subscriptionId), normalized);
  return normalized;
}

export async function readSubscription(subscriptionId: string) {
  return readJson<SubscriptionRecord>(subscriptionPath(subscriptionId));
}

export async function saveSubscriptionCheckout(record: SubscriptionCheckoutRecord) {
  const now = new Date().toISOString();
  const normalized = { ...record, updatedAt: now, createdAt: record.createdAt || now };
  await writeJson(checkoutPath(record.paymentOrderId), normalized);
  return normalized;
}

export async function readSubscriptionCheckout(paymentOrderId: string) {
  return readJson<SubscriptionCheckoutRecord>(checkoutPath(paymentOrderId));
}

export async function createPendingSubscription(input: {
  subscriptionId: string;
  planId: SubscriptionPlanId;
  customer: SubscriptionCustomer;
  paymentOrderId: string;
  checkoutUrl?: string;
  amountUah: number;
}) {
  const now = new Date().toISOString();
  return saveSubscription({
    subscriptionId: input.subscriptionId,
    planId: input.planId,
    status: "pending_payment",
    customer: input.customer,
    createdAt: now,
    updatedAt: now,
    lastPaymentOrderId: input.paymentOrderId,
    lastCheckoutUrl: input.checkoutUrl,
    paymentHistory: [
      {
        paymentOrderId: input.paymentOrderId,
        status: "pending",
        amountUah: input.amountUah,
        createdAt: now
      }
    ]
  });
}

export async function activateFreeSubscription(input: {
  subscriptionId: string;
  planId: SubscriptionPlanId;
  customer: SubscriptionCustomer;
}) {
  const now = new Date();
  return saveSubscription({
    subscriptionId: input.subscriptionId,
    planId: input.planId,
    status: "active",
    customer: input.customer,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: addPeriod(now).toISOString(),
    paymentHistory: []
  });
}

export async function activateSubscriptionFromCheckout(paymentOrderId: string, raw?: unknown) {
  const checkout = await readSubscriptionCheckout(paymentOrderId);
  if (!checkout) return null;

  const plan = getSubscriptionPlan(checkout.planId);
  if (!plan) return null;

  const now = new Date();
  const current = await readSubscription(checkout.subscriptionId);
  const history = current?.paymentHistory || [];
  const existingIndex = history.findIndex((item) => item.paymentOrderId === paymentOrderId);
  const paymentEntry = {
    paymentOrderId,
    status: "approved" as const,
    amountUah: checkout.amountUah,
    createdAt: checkout.createdAt,
    paidAt: now.toISOString(),
    raw
  };

  const nextHistory = existingIndex >= 0
    ? history.map((item, index) => (index === existingIndex ? paymentEntry : item))
    : [...history, paymentEntry];

  await saveSubscriptionCheckout({ ...checkout, status: "approved", raw });

  return saveSubscription({
    subscriptionId: checkout.subscriptionId,
    planId: checkout.planId,
    status: "active",
    customer: checkout.customer,
    createdAt: current?.createdAt || checkout.createdAt,
    updatedAt: now.toISOString(),
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: addPeriod(now).toISOString(),
    lastPaymentOrderId: paymentOrderId,
    lastCheckoutUrl: checkout.checkoutUrl,
    paymentHistory: nextHistory
  });
}

export async function markSubscriptionCheckoutFailed(paymentOrderId: string, raw?: unknown) {
  const checkout = await readSubscriptionCheckout(paymentOrderId);
  if (!checkout) return null;
  await saveSubscriptionCheckout({ ...checkout, status: "failed", raw });

  const current = await readSubscription(checkout.subscriptionId);
  if (!current) return null;

  return saveSubscription({
    ...current,
    status: current.status === "active" ? "past_due" : "payment_failed",
    paymentHistory: current.paymentHistory.map((item) =>
      item.paymentOrderId === paymentOrderId ? { ...item, status: "failed", raw } : item
    )
  });
}

export function formatSubscriptionEvent(record: SubscriptionRecord, headline = "Subscription event") {
  const plan = getSubscriptionPlan(record.planId);
  const customer = record.customer;
  return [
    `🩺 <b>${headline}</b>`,
    ``,
    `<b>Subscription:</b> <code>${record.subscriptionId}</code>`,
    `<b>Plan:</b> ${plan?.name.ua || record.planId}`,
    `<b>Status:</b> ${record.status}`,
    `<b>Customer:</b> ${escapeHtml(customer.name || "—")}`,
    customer.phone ? `<b>Phone:</b> <code>${escapeHtml(customer.phone)}</code>` : null,
    customer.email ? `<b>Email:</b> ${escapeHtml(customer.email)}` : null,
    customer.telegramUsername ? `<b>Telegram:</b> @${escapeHtml(customer.telegramUsername)}` : null,
    record.currentPeriodEnd ? `<b>Paid until:</b> ${record.currentPeriodEnd}` : null,
    record.lastCheckoutUrl ? `<b>Checkout:</b> ${escapeHtml(record.lastCheckoutUrl)}` : null
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}
