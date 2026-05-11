import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildTelegramAuthUrl,
  createPkcePair,
  createState,
  getTelegramRedirectUri,
  requireTelegramEnv
} from "@/lib/telegram";

export async function GET(request: Request) {
  try {
    const { clientId } = requireTelegramEnv();
    const origin = new URL(request.url).origin;
    const redirectUri = getTelegramRedirectUri(origin);
    const state = createState();
    const pkce = createPkcePair();
    const cookieStore = await cookies();

    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/"
    };

    cookieStore.set("tg_state", state, cookieOptions);
    cookieStore.set("tg_code_verifier", pkce.verifier, cookieOptions);

    return NextResponse.redirect(
      buildTelegramAuthUrl({
        clientId,
        redirectUri,
        state,
        challenge: pkce.challenge
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram auth is not configured";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
