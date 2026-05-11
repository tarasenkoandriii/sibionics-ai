import { NextResponse } from "next/server";
import { readSubscription } from "@/lib/subscriptions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subscriptionId = String(searchParams.get("subscriptionId") || "").trim();

  if (!subscriptionId) {
    return NextResponse.json({ error: "subscriptionId is required" }, { status: 400 });
  }

  const subscription = await readSubscription(subscriptionId);
  if (!subscription) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  return NextResponse.json({ subscription });
}
