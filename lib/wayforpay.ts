import crypto from "node:crypto";
import type { OrderItem } from "@/lib/order-types";

export type WayForPayCheckoutInput = {
  orderId: string;
  amountUah: number;
  items: OrderItem[];
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryCity?: string;
  deliveryAddress?: string;
  comment?: string;
  locale?: string;
  returnUrl?: string;
  serviceUrl?: string;
  regularMode?: "none" | "monthly" | "yearly" | "client" | "once" | "daily" | "weekly" | "quarterly" | "bimonthly" | "halfyearly";
  regularBehavior?: "preset";
  regularAmount?: number;
  dateNext?: string;
  dateEnd?: string;
  regularCount?: number;
  regularOn?: 0 | 1;
};

export type WayForPayCheckoutResult = {
  checkoutUrl: string;
  orderId: string;
  raw: unknown;
  request: Record<string, unknown>;
};

type WayForPayCallbackData = Record<string, unknown>;

const TEST_MERCHANT_ACCOUNT = "test_merch_n1";
const TEST_SECRET_KEY = "flk3409refn54t54t*FNJRET";

function isTestMode() {
  return String(process.env.WAYFORPAY_USE_TEST_CREDENTIALS || "").toLowerCase() === "true";
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function getWayForPayCredentials() {
  if (isTestMode()) {
    return {
      merchantAccount: process.env.WAYFORPAY_MERCHANT_ACCOUNT || TEST_MERCHANT_ACCOUNT,
      secretKey: process.env.WAYFORPAY_MERCHANT_SECRET_KEY || TEST_SECRET_KEY
    };
  }

  return {
    merchantAccount: requireEnv("WAYFORPAY_MERCHANT_ACCOUNT"),
    secretKey: requireEnv("WAYFORPAY_MERCHANT_SECRET_KEY")
  };
}

function getBaseSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function getDomainName() {
  const configured = process.env.WAYFORPAY_MERCHANT_DOMAIN_NAME;
  if (configured) return configured;

  try {
    return new URL(getBaseSiteUrl()).host;
  } catch {
    return "localhost:3000";
  }
}

export function formatWayForPayAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) throw new Error("WayForPay amount must be greater than zero");
  return Number(value).toFixed(2).replace(/\.00$/, "");
}

function normalizeProductItems(items: OrderItem[]) {
  const payable = items.filter((item) => item.lineTotalUah > 0 && item.quantity > 0);
  if (!payable.length) throw new Error("WayForPay checkout requires at least one payable product item");

  return payable.map((item) => ({
    name: item.name,
    count: item.quantity,
    price: formatWayForPayAmount(item.unitPriceUah)
  }));
}

function splitName(name?: string) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "Customer",
    lastName: parts.slice(1).join(" ") || "GS3"
  };
}

export function createWayForPayPurchaseSignature(input: {
  secretKey: string;
  merchantAccount: string;
  merchantDomainName: string;
  orderReference: string;
  orderDate: number;
  amount: string;
  currency: string;
  productNames: string[];
  productCounts: Array<number | string>;
  productPrices: Array<number | string>;
}) {
  const baseString = [
    input.merchantAccount,
    input.merchantDomainName,
    input.orderReference,
    input.orderDate,
    input.amount,
    input.currency,
    ...input.productNames,
    ...input.productCounts.map(String),
    ...input.productPrices.map(String)
  ].join(";");

  return crypto.createHmac("md5", input.secretKey).update(baseString, "utf8").digest("hex");
}

export function createWayForPayCallbackSignature(secretKey: string, data: WayForPayCallbackData) {
  const baseString = [
    data.merchantAccount,
    data.orderReference,
    data.amount,
    data.currency,
    data.authCode,
    data.cardPan,
    data.transactionStatus,
    data.reasonCode
  ].map((value) => String(value ?? "")).join(";");

  return crypto.createHmac("md5", secretKey).update(baseString, "utf8").digest("hex");
}

export function verifyWayForPayCallback(secretKey: string, data: WayForPayCallbackData) {
  const received = String(data.merchantSignature || "");
  if (!received) return false;
  const expected = createWayForPayCallbackSignature(secretKey, data);
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export function createWayForPayServiceResponse(orderReference: string, secretKey: string) {
  const time = Math.floor(Date.now() / 1000);
  const status = "accept";
  const baseString = [orderReference, status, time].join(";");
  const signature = crypto.createHmac("md5", secretKey).update(baseString, "utf8").digest("hex");
  return { orderReference, status, time, signature };
}

function buildPurchaseParams(input: WayForPayCheckoutInput) {
  const { merchantAccount, secretKey } = getWayForPayCredentials();
  const merchantDomainName = getDomainName();
  const baseUrl = getBaseSiteUrl();
  const orderDate = Math.floor(Date.now() / 1000);
  const amount = formatWayForPayAmount(input.amountUah);
  const currency = "UAH";
  const products = normalizeProductItems(input.items);
  const { firstName, lastName } = splitName(input.customerName);

  const productNames = products.map((item) => item.name);
  const productCounts = products.map((item) => item.count);
  const productPrices = products.map((item) => item.price);
  const signature = createWayForPayPurchaseSignature({
    secretKey,
    merchantAccount,
    merchantDomainName,
    orderReference: input.orderId,
    orderDate,
    amount,
    currency,
    productNames,
    productCounts,
    productPrices
  });

  return {
    merchantAccount,
    merchantAuthType: "SimpleSignature",
    merchantDomainName,
    merchantTransactionType: "AUTO",
    merchantTransactionSecureType: "AUTO",
    merchantSignature: signature,
    apiVersion: 2,
    language: (input.locale || process.env.WAYFORPAY_LANGUAGE || "UA").toUpperCase(),
    returnUrl: input.returnUrl || process.env.WAYFORPAY_RETURN_URL || `${baseUrl}/?payment=success`,
    serviceUrl: input.serviceUrl || process.env.WAYFORPAY_SERVICE_URL || `${baseUrl}/api/payments/wayforpay/callback`,
    orderReference: input.orderId,
    orderDate,
    amount,
    currency,
    orderTimeout: Number(process.env.WAYFORPAY_ORDER_TIMEOUT_SECONDS || 49000),
    productName: productNames,
    productPrice: productPrices,
    productCount: productCounts,
    clientFirstName: firstName,
    clientLastName: lastName,
    clientEmail: input.customerEmail || undefined,
    clientPhone: input.customerPhone || undefined,
    clientCity: input.deliveryCity || undefined,
    clientAddress: input.deliveryAddress || undefined,
    defaultPaymentSystem: process.env.WAYFORPAY_DEFAULT_PAYMENT_SYSTEM || "card",
    paymentSystems: process.env.WAYFORPAY_PAYMENT_SYSTEMS || undefined,
    regularMode: input.regularMode,
    regularBehavior: input.regularBehavior,
    regularAmount: input.regularAmount ? formatWayForPayAmount(input.regularAmount) : undefined,
    dateNext: input.dateNext,
    dateEnd: input.dateEnd,
    regularCount: input.regularCount,
    regularOn: input.regularOn
  };
}

function appendParams(form: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  if (Array.isArray(value)) {
    for (const item of value) form.append(`${key}[]`, String(item));
    return;
  }
  form.append(key, String(value));
}

export async function createWayForPayCheckout(input: WayForPayCheckoutInput): Promise<WayForPayCheckoutResult> {
  const endpoint = process.env.WAYFORPAY_PURCHASE_URL || "https://secure.wayforpay.com/pay";
  const request = buildPurchaseParams(input);
  const form = new URLSearchParams();

  for (const [key, value] of Object.entries(request)) appendParams(form, key, value);

  const response = await fetch(`${endpoint}?behavior=offline`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      "User-Agent": "Sibionics GS3 Next.js site"
    },
    body: form.toString(),
    cache: "no-store"
  });

  const rawText = await response.text();
  let payload: any;
  try {
    payload = JSON.parse(rawText);
  } catch {
    payload = { rawText };
  }

  if (!response.ok) throw new Error(`WayForPay returned HTTP ${response.status}: ${rawText}`);

  const checkoutUrl = payload.url || payload.invoiceUrl || payload.checkoutUrl || payload.redirectUrl;
  if (!checkoutUrl) {
    const reason = payload.reason || payload.error || payload.rawText || "WayForPay response does not contain payment url";
    throw new Error(String(reason));
  }

  return {
    checkoutUrl,
    orderId: input.orderId,
    raw: payload,
    request
  };
}

export async function parseWayForPayCallbackBody(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return (await request.json()) as WayForPayCallbackData;

  const formData = await request.formData();
  return Object.fromEntries(formData.entries()) as WayForPayCallbackData;
}
