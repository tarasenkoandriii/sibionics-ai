import crypto from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

export type PkcePair = {
  verifier: string;
  challenge: string;
};

export function requireTelegramEnv() {
  const clientId = process.env.TELEGRAM_CLIENT_ID;
  const clientSecret = process.env.TELEGRAM_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Telegram login is not configured. Set TELEGRAM_CLIENT_ID and TELEGRAM_CLIENT_SECRET.");
  }
  return { clientId, clientSecret };
}

export function createPkcePair(): PkcePair {
  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createState() {
  return crypto.randomBytes(24).toString("base64url");
}

export function getTelegramRedirectUri(origin: string) {
  return process.env.TELEGRAM_REDIRECT_URI || `${origin}/api/auth/telegram/callback`;
}

export function buildTelegramAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}) {
  const url = new URL("https://oauth.telegram.org/auth");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

export async function exchangeTelegramCode(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  const response = await fetch("https://oauth.telegram.org/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64")}`
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      code_verifier: params.codeVerifier
    }),
    cache: "no-store"
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Telegram token exchange failed: ${JSON.stringify(data)}`);
  }

  if (!data.id_token) {
    throw new Error("Telegram response does not contain id_token");
  }

  return data as { access_token: string; token_type: string; expires_in: number; id_token: string };
}

export async function verifyTelegramIdToken(idToken: string, clientId: string) {
  const JWKS = createRemoteJWKSet(new URL("https://oauth.telegram.org/.well-known/jwks.json"));
  const result = await jwtVerify(idToken, JWKS, {
    issuer: "https://oauth.telegram.org",
    audience: clientId
  });

  return result.payload as {
    sub: string;
    name?: string;
    preferred_username?: string;
    picture?: string;
    iat?: number;
    exp?: number;
  };
}
