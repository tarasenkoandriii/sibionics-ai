import { NextResponse } from "next/server";
import { signSession } from "@/lib/session";
import { validateTelegramMiniAppInitData } from "@/lib/telegram-miniapp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const initData = String(body.initData || "");
    const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_MINI_APP_BOT_TOKEN || "";

    const validation = validateTelegramMiniAppInitData(initData, botToken, {
      maxAgeSeconds: Number(process.env.TELEGRAM_INITDATA_MAX_AGE_SECONDS || 86400)
    });

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: validation.error || "Telegram initData is invalid" }, { status: 401 });
    }

    const user = validation.user;
    const token = signSession({
      sub: String(user.id),
      name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || String(user.id),
      preferred_username: user.username,
      picture: user.photo_url,
      iat: Math.floor(Date.now() / 1000)
    });

    const response = NextResponse.json({ ok: true, user, authDate: validation.authDate });
    response.cookies.set("tg_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram Mini App auth error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
