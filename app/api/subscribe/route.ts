import { NextResponse } from "next/server";
import { getPushDatabase } from "@/lib/push-db";
import { isValidSubscription } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let subscription: unknown;
  try {
    subscription = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isValidSubscription(subscription)) {
    return NextResponse.json({ error: "A valid HTTPS push subscription is required." }, { status: 400 });
  }

  try {
    const sql = getPushDatabase();
    await sql`
      INSERT INTO subscriptions (endpoint, subscription_json)
      VALUES (${subscription.endpoint}, ${JSON.stringify(subscription)}::jsonb)
      ON CONFLICT (endpoint) DO UPDATE SET subscription_json = EXCLUDED.subscription_json
    `;
    const [row] = await sql`SELECT COUNT(*)::int AS count FROM subscriptions`;
    return NextResponse.json({ saved: true, subscribers: row.count }, { status: 201 });
  } catch (error) {
    console.error("Could not save push subscription:", error);
    return NextResponse.json({ error: "Could not save push subscription." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const endpoint = (payload as { endpoint?: unknown } | null)?.endpoint;
  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "A subscription endpoint is required." }, { status: 400 });
  }

  try {
    const sql = getPushDatabase();
    await sql`DELETE FROM subscriptions WHERE endpoint = ${endpoint}`;
    const [row] = await sql`SELECT COUNT(*)::int AS count FROM subscriptions`;
    return NextResponse.json({ removed: true, subscribers: row.count });
  } catch (error) {
    console.error("Could not remove push subscription:", error);
    return NextResponse.json({ error: "Could not remove push subscription." }, { status: 500 });
  }
}
