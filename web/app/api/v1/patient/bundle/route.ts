import { db } from "@/lib/db";
import { error, isResponse, json, patientDetail, requireApi, requireViewedPatient } from "@/lib/api";
export async function GET(req: Request) {
  const s = await requireApi(req, "patient", "caregiver"); if (isResponse(s)) return s;
  const pid = await requireViewedPatient(s); if (isResponse(pid)) return pid;
  const d = await patientDetail(pid, false);
  if (!d) return error("Patient not found.", 404);
  const q = await db();
  const unread = (await q<{ n: number }>("SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND channel='app' AND read_at IS NULL", [pid]))[0].n;
  return json({ ...d, unread });
}
