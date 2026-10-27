import { db } from "@/lib/db";
import { isResponse, json, requireApi, viewedPatientId } from "@/lib/api";
export async function POST(req: Request) {
  const s = await requireApi(req); if (isResponse(s)) return s;
  const uid = viewedPatientId(s) ?? s.user.id;
  const q = await db();
  await q("UPDATE notifications SET read_at = now() WHERE user_id = $1 AND channel='app' AND read_at IS NULL", [uid]);
  return json({ ok: true });
}
