import { NextResponse } from "next/server";
import { createCookieOptions, getSessionMaxAgeSeconds, LEGACY_TELEGRAM_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME, signSession } from "@/lib/session";
import { validateTelegramMiniAppInitData } from "@/lib/telegram-miniapp";
import { upsertTelegramUser } from "@/lib/saas-users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const initData = String(body.initData || "");
    const locale = String(body.locale || "ua");
    const botToken = process.env.TELEGRAM_MINI_APP_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "";

    const validation = validateTelegramMiniAppInitData(initData, botToken, {
      maxAgeSeconds: Number(process.env.TELEGRAM_INITDATA_MAX_AGE_SECONDS || 86400)
    });

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: validation.error || "Telegram initData is invalid" }, { status: 401 });
    }

    const tgUser = validation.user;
    const user = await upsertTelegramUser({
      telegramId: tgUser.id,
      username: tgUser.username,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      photoUrl: tgUser.photo_url,
      locale,
      source: "telegram-miniapp"
    });

    const maxAge = getSessionMaxAgeSeconds();
    const token = signSession({
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
      authSource: "telegram-miniapp",
      maxAgeSeconds: maxAge
    });

    const nextPath = user.onboardingCompleted ? `/${user.locale}/dashboard` : `/${user.locale}/onboarding`;
    const response = NextResponse.json({ ok: true, user, authDate: validation.authDate, nextPath });
    const cookieOptions = createCookieOptions(maxAge);
    response.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions);
    response.cookies.set(LEGACY_TELEGRAM_SESSION_COOKIE_NAME, token, cookieOptions);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram Mini App auth error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
