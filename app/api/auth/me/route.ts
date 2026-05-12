import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, LEGACY_TELEGRAM_SESSION_COOKIE_NAME, verifySession } from "@/lib/session";
import { readUserByTelegramId } from "@/lib/saas-users";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || cookieStore.get(LEGACY_TELEGRAM_SESSION_COOKIE_NAME)?.value;
    const session = verifySession(token);
    if (!session?.telegramId && !session?.sub) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await readUserByTelegramId(session.telegramId || session.sub);
    return NextResponse.json({ authenticated: true, session, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Session read error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
