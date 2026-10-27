import { db, one } from "@/lib/db";
import { notifyApp } from "@/lib/notify";
import { body, error, isResponse, json, requireApi } from "@/lib/api";
const SOD = "date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore'";
export async function GET(req: Request) {
  const s = await requireApi(req, "caregiver"); if (isResponse(s)) return s;
  const q = await db();
  const parents = await q(
    `SELECT u.id, u.name, c.relationship,
       (SELECT a.scheduled_at::text FROM appointments a WHERE a.patient_id = u.id AND a.status='scheduled' AND a.scheduled_at >= ${SOD} ORDER BY a.scheduled_at LIMIT 1) AS next_at,
       (SELECT a.id FROM appointments a WHERE a.patient_id = u.id AND a.status='scheduled' AND a.scheduled_at >= ${SOD} ORDER BY a.scheduled_at LIMIT 1) AS next_id,
       (SELECT s.id FROM appointments a JOIN surveys s ON s.appointment_id = a.id WHERE a.patient_id = u.id AND a.status='scheduled' AND a.scheduled_at >= ${SOD} ORDER BY a.scheduled_at LIMIT 1) AS next_done,
       (SELECT COUNT(*)::int FROM surveys s WHERE s.patient_id = u.id) AS n_surveys
     FROM care_links c JOIN users u ON u.id = c.patient_id WHERE c.caregiver_id = $1 ORDER BY u.name`, [s.user.id]);
  return json({ parents, acting_patient_id: s.actingPatientId });
}
/** Link another parent by NRIC (same as linkParentAction). */
export async function POST(req: Request) {
  const s = await requireApi(req, "caregiver"); if (isResponse(s)) return s;
  const b = await body<{ parent_nric?: string; relationship?: string }>(req);
  const parent = await one<{ id: number; name: string }>("SELECT id, name FROM users WHERE login_id = $1 AND role = 'patient'", [String(b.parent_nric ?? "").trim().toUpperCase()]);
  if (!parent) return error("No patient with that NRIC.", 404);
  const q = await db();
  const rel = String(b.relationship || "child");
  await q("INSERT INTO care_links(caregiver_id, patient_id, relationship) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [s.user.id, parent.id, rel]);
  await notifyApp(q, parent.id, "link", `${s.user.name} (${rel}) is now linked to your account and can help you with questionnaires.`);
  return json({ ok: true, patient: parent }, 201);
}
