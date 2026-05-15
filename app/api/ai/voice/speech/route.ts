import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = String(body.text || "").trim().slice(0, 3000);

    if (!text) {
      return NextResponse.json({ error: "Text is empty" }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: "Server TTS is disabled in Grok mode; use browser speechSynthesis fallback",
        provider: "grok",
        fallback: "browser-speechSynthesis"
      },
      { status: 503 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "TTS error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
