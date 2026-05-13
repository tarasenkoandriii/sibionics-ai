import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "app_session";
export const LEGACY_TELEGRAM_SESSION_COOKIE_NAME = "tg_session";

export type SessionRole = "user" | "admin" | "doctor";
export type SessionSubscriptionStatus = "trial" | "active" | "past_due" | "cancelled" | "pending_payment" | "payment_failed";

export type TelegramSession = {
  sub: string;
  uid?: string;
  telegramId?: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  role?: SessionRole;
  locale?: string;
  onboardingCompleted?: boolean;
  subscriptionStatus?: SessionSubscriptionStatus;
  subscriptionPlan?: string;
  authSource?: "telegram-miniapp" | "telegram-oidc" | "legacy";
  iat: number;
  exp?: number;
};

export type CreateSessionInput = Omit<TelegramSession, "iat" | "exp"> & {
  iat?: number;
  maxAgeSeconds?: number;
};

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret === "change-me-long-random-string") {
    throw new Error("Set AUTH_SESSION_SECRET to a long random value before enabling Telegram login.");
  }
  return secret;
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

export function getSessionMaxAgeSeconds() {
  return Number(process.env.AUTH_SESSION_MAX_AGE_SECONDS || 60 * 60 * 24 * 30);
}

export function signSession(payload: CreateSessionInput | TelegramSession) {
  const now = Math.floor(Date.now() / 1000);
  const maxAgeSeconds = "maxAgeSeconds" in payload && payload.maxAgeSeconds ? payload.maxAgeSeconds : getSessionMaxAgeSeconds();
  const normalized: TelegramSession = {
    ...payload,
    iat: payload.iat || now,
    exp: (payload as TelegramSession).exp || now + maxAgeSeconds
  };
  delete (normalized as any).maxAgeSeconds;

  const body = base64url(JSON.stringify(normalized));
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

export function verifySession(token?: string | null): TelegramSession | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = crypto
    .createHmac("sha256", getSessionSecret())
    .update(body)
    .digest("base64url");

  if (signature.length !== expected.length) return null;
  const ok = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!ok) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TelegramSession;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createCookieOptions(maxAge = getSessionMaxAgeSeconds()) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge
  };
}
