import { NextResponse } from "next/server";
import { LEGACY_TELEGRAM_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete(LEGACY_TELEGRAM_SESSION_COOKIE_NAME);
  return response;
}

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/ua", request.url));
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete(LEGACY_TELEGRAM_SESSION_COOKIE_NAME);
  return response;
}
