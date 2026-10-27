// Web Push (VAPID). Subscriptions live in push_subscriptions; sending is best-effort.
import "server-only";
type Q = (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

export const pushEnabled = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

export async function sendPushToUser(q: Q, userId: number, title: string, body: string, url = "/"): Promise<number> {
  if (!pushEnabled()) return 0;
  const subs = await q("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1", [userId]);
  if (!subs.length) return 0;
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hat@cgh.com.sg", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  let n = 0;
  for (const s of subs) {
    try { await webpush.sendNotification({ endpoint: String(s.endpoint), keys: { p256dh: String(s.p256dh), auth: String(s.auth) } }, JSON.stringify({ title, body, url })); n++; }
    catch (e: unknown) { const code = (e as { statusCode?: number }).statusCode; if (code === 404 || code === 410) await q("DELETE FROM push_subscriptions WHERE id = $1", [s.id]); }
  }
  return n;
}
