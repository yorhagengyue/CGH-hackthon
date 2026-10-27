import { db } from "@/lib/db";
import { isResponse, json, requireApi, viewedPatientId } from "@/lib/api";
export async function GET(req: Request) {
  const s = await requireApi(req); if (isResponse(s)) return s;
  const uid = viewedPatientId(s) ?? s.user.id;   // caregivers see their parent's inbox, like the web
  const q = await db();
  const notifications = await q(`SELECT id, kind, channel, message, send_at::text, read_at::text, appointment_id FROM notifications WHERE user_id = $1 AND (channel='app' OR sent_at IS NOT NULL) ORDER BY send_at DESC LIMIT 50`, [uid]);
  const unread = notifications.filter((n) => n.channel === "app" && !n.read_at).length;
  return json({ notifications, unread });
}
