// Same rules as submitSurveyAction: one submission per appointment, index computed here, never on the phone.
import { db, one } from "@/lib/db";
import { indexValue, type Dim } from "@/lib/eq5d";
import { notifyApp } from "@/lib/notify";
import { checkAlert } from "@/lib/alerts";
import { body, error, isResponse, json, requireApi, requireViewedPatient } from "@/lib/api";
type Body = { appt?: number | null; mo?: number; sc?: number; ua?: number; pd?: number; ad?: number; eq_vas?: number; pain?: number };
export async function POST(req: Request) {
  const s = await requireApi(req, "patient", "caregiver"); if (isResponse(s)) return s;
  const patientId = await requireViewedPatient(s); if (isResponse(patientId)) return patientId;
  const b = await body<Body>(req);
  const lv = {} as Record<Dim, number>;
  for (const d of ["mo", "sc", "ua", "pd", "ad"] as Dim[]) { lv[d] = Number(b[d]); if (!(lv[d] >= 1 && lv[d] <= 5)) return error("Please answer every question."); }
  const vas = b.eq_vas != null && !isNaN(Number(b.eq_vas)) ? Number(b.eq_vas) : null;   // optional since the EQ-VAS page was removed
  const pain = Number(b.pain);
  if (!(pain >= 0 && pain <= 10)) return error("Please rate your pain.");
  const apptId = Number(b.appt) || null;
  const q = await db();
  if (apptId) {
    const a = await one("SELECT 1 FROM appointments WHERE id = $1 AND patient_id = $2", [apptId, patientId]);
    if (!a) return error("Appointment not found.", 404);
    if (await one("SELECT 1 FROM surveys WHERE appointment_id = $1", [apptId])) return error("Already submitted for this appointment.", 409);
  }
  const index = indexValue(lv);
  const [row] = await q(`INSERT INTO surveys(appointment_id, patient_id, filled_by, mo, sc, ua, pd, ad, eq_vas, pain, index_value) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, submitted_at::text`,
    [apptId, patientId, s.user.id, lv.mo, lv.sc, lv.ua, lv.pd, lv.ad, vas, pain, index]);
  await checkAlert(q, Number(row.id), patientId, apptId);
  if (apptId) {
    const a = await one<{ physio_id: number | null }>("SELECT physio_id FROM appointments WHERE id = $1", [apptId]);
    if (a?.physio_id) await notifyApp(q, a.physio_id, "survey", `A patient submitted their pre-visit questionnaire.`, apptId);
  }
  return json({ id: row.id, index_value: index, submitted_at: row.submitted_at }, 201);
}
