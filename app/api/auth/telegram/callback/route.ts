import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  exchangeTelegramCode,
  getTelegramRedirectUri,
  requireTelegramEnv,
  verifyTelegramIdToken
} from "@/lib/telegram";
import { createCookieOptions, getSessionMaxAgeSeconds, LEGACY_TELEGRAM_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME, signSession } from "@/lib/session";
import { normalizeLocale } from "@/lib/i18n";
import { upsertTelegramUser } from "@/lib/saas-users";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const origin = url.origin;
    const cookieStore = await cookies();
    const expectedState = cookieStore.get("tg_oidc_state")?.value || cookieStore.get("tg_state")?.value;
    const codeVerifier = cookieStore.get("tg_oidc_verifier")?.value || cookieStore.get("tg_code_verifier")?.value;
    const locale = normalizeLocale(cookieStore.get("tg_oidc_locale")?.value || "ua");

    if (!code || !state) {
      return NextResponse.json({ error: "Missing Telegram code or state" }, { status: 400 });
    }

    if (!expectedState || !codeVerifier || expectedState !== state) {
      return NextResponse.json({ error: "Invalid Telegram state" }, { status: 400 });
    }

    const { clientId, clientSecret } = requireTelegramEnv();
    const redirectUri = getTelegramRedirectUri(origin);
    const tokens = await exchangeTelegramCode({
      clientId,
      clientSecret,
      code,
      redirectUri,
      codeVerifier
    });

    const claims = await verifyTelegramIdToken(tokens.id_token, clientId);
    const user = await upsertTelegramUser({
      telegramId: claims.sub,
      username: claims.preferred_username,
      firstName: claims.given_name || claims.name,
      lastName: claims.family_name,
      photoUrl: claims.picture,
      locale,
      source: "telegram-oidc"
    });

    const maxAge = getSessionMaxAgeSeconds();
    const session = signSession({
      sub: user.telegramId,
      uid: user.id,
      telegramId: user.telegramId,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.telegramId,
      preferred_username: user.username,
      picture: user.photoUrl,
      role: user.role,
      locale: user.locale,
      onboardingCompleted: user.onboardingCompleted,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      authSource: "telegram-oidc",
      maxAgeSeconds: maxAge
    });

    const nextPath = user.onboardingCompleted ? `/${user.locale}/dashboard` : `/${user.locale}/onboarding`;
    const response = NextResponse.redirect(new URL(nextPath, request.url));
    const cookieOptions = createCookieOptions(maxAge);
    response.cookies.set(SESSION_COOKIE_NAME, session, cookieOptions);
    response.cookies.set(LEGACY_TELEGRAM_SESSION_COOKIE_NAME, session, cookieOptions);
    response.cookies.delete("tg_oidc_state");
    response.cookies.delete("tg_oidc_verifier");
    response.cookies.delete("tg_oidc_locale");
    response.cookies.delete("tg_state");
    response.cookies.delete("tg_code_verifier");

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram callback error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
