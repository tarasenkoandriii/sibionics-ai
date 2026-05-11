import crypto from "node:crypto";

export type TelegramMiniAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
};

export type TelegramMiniAppValidation = {
  valid: boolean;
  user?: TelegramMiniAppUser;
  authDate?: number;
  queryId?: string;
  startParam?: string;
  error?: string;
  dataCheckString?: string;
};

function timingSafeHexEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export function validateTelegramMiniAppInitData(
  initData: string,
  botToken: string,
  options: { maxAgeSeconds?: number } = {}
): TelegramMiniAppValidation {
  if (!initData) return { valid: false, error: "initData is empty" };
  if (!botToken) return { valid: false, error: "bot token is not configured" };

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  if (!receivedHash) return { valid: false, error: "hash is missing" };

  params.delete("hash");
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!timingSafeHexEqual(receivedHash, expectedHash)) {
    return { valid: false, error: "invalid signature", dataCheckString };
  }

  const authDate = Number(params.get("auth_date") || 0);
  const maxAgeSeconds = options.maxAgeSeconds ?? 60 * 60 * 24;
  if (authDate && maxAgeSeconds > 0) {
    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    if (ageSeconds > maxAgeSeconds) {
      return { valid: false, error: "initData expired", authDate, dataCheckString };
    }
  }

  let user: TelegramMiniAppUser | undefined;
  const userRaw = params.get("user");
  if (userRaw) {
    try {
      user = JSON.parse(userRaw) as TelegramMiniAppUser;
    } catch {
      return { valid: false, error: "user JSON is invalid", dataCheckString };
    }
  }

  return {
    valid: true,
    user,
    authDate,
    queryId: params.get("query_id") || undefined,
    startParam: params.get("start_param") || undefined,
    dataCheckString
  };
}
