import crypto from "node:crypto";

export type TelegramSession = {
  sub: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  iat: number;
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

export function signSession(payload: TelegramSession) {
  const body = base64url(JSON.stringify(payload));
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
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
