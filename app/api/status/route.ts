import { NextResponse } from "next/server";
import { getPushDatabase } from "@/lib/push-db";
import { configureWebPush } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configured = configureWebPush();
    const sql = getPushDatabase();
    const [row] = await sql`SELECT COUNT(*)::int AS count FROM subscriptions`;
    return NextResponse.json({
      configured,
      publicKey: configured ? process.env.VAPID_PUBLIC_KEY : null,
      subscribers: row.count
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not read Web Push status:", error);
    return NextResponse.json({ error: "Could not read Web Push status." }, { status: 500 });
  }
}
