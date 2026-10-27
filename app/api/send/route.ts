import { NextResponse } from "next/server";
import { getPushDatabase } from "@/lib/push-db";
import {
  configureWebPush,
  hasValidAdminToken,
  isValidNotificationPath,
  type PushSubscriptionData,
  webPush
} from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.PUSH_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Set PUSH_ADMIN_TOKEN on the server to enable sending." }, { status: 503 });
  }
  if (!hasValidAdminToken(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "The admin token is missing or invalid." }, { status: 401 });
  }

  try {
    if (!configureWebPush()) {
      return NextResponse.json({ error: "Configure VAPID keys before sending notifications." }, { status: 503 });
    }
  } catch (error) {
    console.error("Web Push configuration error:", error);
    return NextResponse.json({ error: "Web Push configuration is invalid." }, { status: 500 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const data = payload as { title?: unknown; body?: unknown; url?: unknown } | null;
  const title = typeof data?.title === "string" ? data.title.trim() : "";
  const body = typeof data?.body === "string" ? data.body.trim() : "";
  const url = data?.url === undefined ? "/" : data.url;
  if (!title || title.length > 80 || !body || body.length > 180 || !isValidNotificationPath(url)) {
    return NextResponse.json({
      error: "Add a title (up to 80 characters), message (up to 180), and a same-site path."
    }, { status: 400 });
  }

  try {
    const sql = getPushDatabase();
    const subscriptions = await sql`SELECT endpoint, subscription_json FROM subscriptions` as {
      endpoint: string;
      subscription_json: PushSubscriptionData | string;
    }[];
    if (subscriptions.length === 0) {
      return NextResponse.json({ error: "No browsers are subscribed yet." }, { status: 409 });
    }

    const notification = JSON.stringify({ title, body, url });
    const results = await Promise.all(subscriptions.map(async row => {
      try {
        const subscription = typeof row.subscription_json === "string"
          ? JSON.parse(row.subscription_json) as PushSubscriptionData
          : row.subscription_json;
        await webPush.sendNotification(subscription, notification, { TTL: 3600 });
        return { endpoint: row.endpoint, sent: true };
      } catch (error) {
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error
          ? error.statusCode
          : undefined;
        if (statusCode === 404 || statusCode === 410) {
          return { endpoint: row.endpoint, sent: false, expired: true };
        }
        console.error("Push delivery failed:", error);
        return { endpoint: row.endpoint, sent: false };
      }
    }));

    const expiredEndpoints = results.filter(result => result.expired).map(result => result.endpoint);
    if (expiredEndpoints.length > 0) {
      await Promise.all(expiredEndpoints.map(endpoint =>
        sql`DELETE FROM subscriptions WHERE endpoint = ${endpoint}`
      ));
    }

    const sent = results.filter(result => result.sent).length;
    const [count] = await sql`SELECT COUNT(*)::int AS count FROM subscriptions`;
    return NextResponse.json({
      sent,
      failed: results.length - sent,
      subscribers: count.count
    }, { status: sent > 0 ? 200 : 502 });
  } catch (error) {
    console.error("Could not send push notifications:", error);
    return NextResponse.json({ error: "Could not send push notifications." }, { status: 500 });
  }
}
