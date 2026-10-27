// POST /api/push/subscribe {subscription}  (web, cookie session) — DELETE removes it. The iOS app has native push instead.
import { session } from "@/lib/auth";
import { db } from "@/lib/db";
export async function POST(req: Request) {
  const s = await session(); if (!s) return new Response("login", { status: 401 });
  const b = await req.json().catch(() => null) as { subscription?: { endpoint: string; keys: { p256dh: string; auth: string } } } | null;
  const sub = b?.subscription; if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return new Response("bad subscription", { status: 400 });
  const q = await db();
  await q(`INSERT INTO push_subscriptions(user_id, endpoint, p256dh, auth) VALUES ($1,$2,$3,$4) ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`, [s.user.id, sub.endpoint, sub.keys.p256dh, sub.keys.auth]);
  return Response.json({ ok: true });
}
export async function DELETE(req: Request) {
  const s = await session(); if (!s) return new Response("login", { status: 401 });
  const b = await req.json().catch(() => null) as { endpoint?: string } | null;
  const q = await db(); await q("DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2", [s.user.id, b?.endpoint ?? ""]);
  return Response.json({ ok: true });
}
