import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  exchangeTelegramCode,
  getTelegramRedirectUri,
  requireTelegramEnv,
  verifyTelegramIdToken
} from "@/lib/telegram";
import { signSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const origin = url.origin;
    const cookieStore = await cookies();
    const expectedState = cookieStore.get("tg_state")?.value;
    const codeVerifier = cookieStore.get("tg_code_verifier")?.value;

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
    const session = signSession({
      sub: claims.sub,
      name: claims.name,
      preferred_username: claims.preferred_username,
      picture: claims.picture,
      iat: Math.floor(Date.now() / 1000)
    });

    const response = NextResponse.redirect(new URL("/?telegram=connected", request.url));
    response.cookies.set("tg_session", session, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60,
      path: "/"
    });
    response.cookies.delete("tg_state");
    response.cookies.delete("tg_code_verifier");

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram callback error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
