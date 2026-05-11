import crypto from "node:crypto";

export type HutkoCheckoutInput = {
  orderId: string;
  orderDescription: string;
  amountUah: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  delivery?: string;
  comment?: string;
  reservationData?: unknown;
};

export type HutkoCheckoutResult = {
  checkoutUrl: string;
  orderId: string;
  raw: unknown;
};

type HutkoParams = Record<string, string | number | boolean | null | undefined>;

const SIGN_SEPARATOR = "|";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function stringifyValue(value: unknown) {
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function createHutkoSignature(secretKey: string, params: HutkoParams) {
  const values = Object.keys(params)
    .filter((key) => key !== "signature" && key !== "response_signature_string")
    .sort()
    .map((key) => params[key])
    .filter((value) => value !== "" && value !== null && value !== undefined)
    .map(stringifyValue);

  return crypto
    .createHash("sha1")
    .update([secretKey, ...values].join(SIGN_SEPARATOR), "utf8")
    .digest("hex");
}

export function verifyHutkoSignature(secretKey: string, params: HutkoParams) {
  const received = params.signature;
  if (!received || typeof received !== "string") return false;

  const expected = createHutkoSignature(secretKey, { ...params, signature: undefined });
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

function toAmountMinor(amountUah: number) {
  if (!Number.isFinite(amountUah) || amountUah <= 0) {
    throw new Error("Order amount must be greater than zero");
  }
  return Math.round(amountUah * 100);
}

function getBaseSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export async function createHutkoCheckout(input: HutkoCheckoutInput): Promise<HutkoCheckoutResult> {
  const merchantId = requireEnv("HUTKO_MERCHANT_ID");
  const secretKey = requireEnv("HUTKO_SECRET_KEY");
  const domain = process.env.HUTKO_API_DOMAIN || "pay.hutko.org";
  const baseUrl = getBaseSiteUrl();

  const request: HutkoParams = {
    merchant_id: merchantId,
    order_id: input.orderId,
    order_desc: input.orderDescription,
    amount: toAmountMinor(input.amountUah),
    currency: "UAH",
    response_url: process.env.HUTKO_SUCCESS_URL || `${baseUrl}/?payment=success`,
    server_callback_url:
      process.env.HUTKO_CALLBACK_URL || `${baseUrl}/api/payments/hutko/callback`,
    sender_first_name: input.customerName || undefined,
    sender_phone: input.customerPhone || undefined,
    sender_email: input.customerEmail || undefined,
    reservation_data: Buffer.from(
      JSON.stringify(
        input.reservationData ?? {
          delivery: input.delivery || "",
          comment: input.comment || ""
        }
      ),
      "utf8"
    ).toString("base64")
  };

  request.signature = createHutkoSignature(secretKey, request);

  const response = await fetch(`https://${domain}/api/checkout/url/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": "Sibionics GS3 Next.js site"
    },
    body: JSON.stringify({ request }),
    cache: "no-store"
  });

  const rawText = await response.text();
  let payload: any;
  try {
    payload = JSON.parse(rawText);
  } catch {
    payload = { rawText };
  }

  if (!response.ok) {
    throw new Error(`Hutko returned HTTP ${response.status}: ${rawText}`);
  }

  const hutkoResponse = payload.response ?? payload;
  if (hutkoResponse.error_message) {
    throw new Error(String(hutkoResponse.error_message));
  }

  const checkoutUrl = hutkoResponse.checkout_url || hutkoResponse.checkoutUrl || hutkoResponse.url;
  if (!checkoutUrl) {
    throw new Error("Hutko response does not contain checkout_url");
  }

  return {
    checkoutUrl,
    orderId: input.orderId,
    raw: payload
  };
}

export async function parseHutkoCallbackBody(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await request.json();
    return data.request ?? data.response ?? data;
  }

  const formData = await request.formData();
  return Object.fromEntries(formData.entries()) as HutkoParams;
}
