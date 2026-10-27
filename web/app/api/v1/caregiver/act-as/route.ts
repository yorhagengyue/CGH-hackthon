import { db, one } from "@/lib/db";
import { bearer, body, error, isResponse, json, requireApi } from "@/lib/api";
export async function POST(req: Request) {
  const s = await requireApi(req, "caregiver"); if (isResponse(s)) return s;
  const { patient_id } = await body<{ patient_id?: number | null }>(req);
  const pid = patient_id == null ? null : Number(patient_id);
  if (pid != null) {
    const link = await one<{ status: string }>("SELECT status FROM care_links WHERE caregiver_id = $1 AND patient_id = $2", [s.user.id, pid]);
    if (!link) return error("That patient is not linked to you.", 403);
    if (link.status === "pending") return Response.json({ error: "Waiting for approval", message: "Waiting for approval", status: "pending" }, { status: 403 });
    if (link.status !== "accepted") return error("Your parent did not allow this.", 403);
  }
  const q = await db();
  await q("UPDATE sessions SET acting_patient_id = $1 WHERE token = $2", [pid, bearer(req)]);
  return json({ ok: true, acting_patient_id: pid });
}
