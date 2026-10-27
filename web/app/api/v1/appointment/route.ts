// Same as createAppointmentAction. Body: {referral_id, scheduled_at (ISO)}
import { db, one } from "@/lib/db";
import { scheduleReminders } from "@/lib/notify";
import { body, error, isResponse, json, requireApi } from "@/lib/api";
export async function POST(req: Request) {
  const s = await requireApi(req, "physio", "doctor", "hod"); if (isResponse(s)) return s;
  const b = await body<{ referral_id?: number; scheduled_at?: string }>(req);
  const referralId = Number(b.referral_id); const when = new Date(String(b.scheduled_at ?? ""));
  if (!referralId || isNaN(when.getTime())) return error("Pick a date and time.");
  const r = await one<{ id: number; patient_id: number; physio_id: number | null }>("SELECT id, patient_id, physio_id FROM referrals WHERE id = $1", [referralId]);
  if (!r) return error("Referral not found.", 404);
  if (s.user.role === "physio" && r.physio_id && r.physio_id !== s.user.id) return error("This patient is not referred to you.", 403);
  const q = await db();
  const n = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM appointments WHERE referral_id = $1", [referralId]);
  const [a] = await q(`INSERT INTO appointments(referral_id, patient_id, physio_id, scheduled_at, kind) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [referralId, r.patient_id, r.physio_id ?? (s.user.role === "physio" ? s.user.id : null), when.toISOString(), n && n.n > 0 ? "follow-up" : "initial"]);
  await scheduleReminders(q, a.id as number, r.patient_id, when.toISOString());
  return json({ ok: true, appointment_id: a.id, message: "Appointment scheduled. SMS reminders queued for 7 and 3 days before." }, 201);
}
