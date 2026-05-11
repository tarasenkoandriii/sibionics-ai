import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = String(body.text || "").trim().slice(0, 3000);

    if (!text) {
      return NextResponse.json({ error: "Text is empty" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured; use browser speechSynthesis fallback" }, { status: 503 });
    }

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        voice: process.env.OPENAI_TTS_VOICE || "marin",
        input: text,
        format: "mp3"
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const raw = await response.text();
      return NextResponse.json({ error: raw || `TTS HTTP ${response.status}` }, { status: 502 });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TTS error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
