import { db } from "@/lib/db";
import { isResponse, json, requireApi, requireViewedPatient, viewedPatientId } from "@/lib/api";
export async function GET(req: Request) {
  const s = await requireApi(req); if (isResponse(s)) return s;
  let uid = s.user.id;
  if (viewedPatientId(s) && s.user.role === "caregiver") { const pid = await requireViewedPatient(s); if (isResponse(pid)) return pid; uid = pid; }
  else if (s.user.role === "patient") uid = s.user.id;
  const q = await db();
  const notifications = await q(`SELECT id, kind, channel, message, send_at::text, read_at::text, appointment_id, link_id FROM notifications WHERE user_id = $1 AND (channel='app' OR sent_at IS NOT NULL) ORDER BY send_at DESC LIMIT 50`, [uid]);
  const unread = notifications.filter((n) => n.channel === "app" && !n.read_at).length;
  return json({ notifications, unread });
}
