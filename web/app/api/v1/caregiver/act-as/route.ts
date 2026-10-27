import { db, one } from "@/lib/db";
import { bearer, body, error, isResponse, json, requireApi } from "@/lib/api";
export async function POST(req: Request) {
  const s = await requireApi(req, "caregiver"); if (isResponse(s)) return s;
  const { patient_id } = await body<{ patient_id?: number | null }>(req);
  const pid = patient_id == null ? null : Number(patient_id);
  if (pid != null) {
    const ok = await one("SELECT 1 FROM care_links WHERE caregiver_id = $1 AND patient_id = $2", [s.user.id, pid]);
    if (!ok) return error("That patient is not linked to you.", 403);
  }
  const q = await db();
  await q("UPDATE sessions SET acting_patient_id = $1 WHERE token = $2", [pid, bearer(req)]);
  return json({ ok: true, acting_patient_id: pid });
}
