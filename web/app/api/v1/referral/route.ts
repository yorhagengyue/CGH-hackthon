// Same as createReferralAction. Body: {patient_id | nric, diagnosis, region?, physio_id?, first_appt?, notes?}
import { db, one } from "@/lib/db";
import { regionFromDiagnosis } from "@/lib/eq5d";
import { notifyApp, scheduleReminders } from "@/lib/notify";
import { body, error, isResponse, json, requireApi } from "@/lib/api";
type Body = { patient_id?: number; nric?: string; diagnosis?: string; region?: string; physio_id?: number | null; first_appt?: string | null; notes?: string };
export async function POST(req: Request) {
  const s = await requireApi(req, "doctor"); if (isResponse(s)) return s;
  const b = await body<Body>(req);
  const p = b.patient_id ? await one<{ id: number; name: string }>("SELECT id, name FROM users WHERE id = $1 AND role='patient'", [Number(b.patient_id)])
    : await one<{ id: number; name: string }>("SELECT id, name FROM users WHERE login_id = $1 AND role='patient'", [String(b.nric ?? "").trim().toUpperCase()]);
  if (!p) return error("No registered patient with that NRIC. Ask them to register first.", 404);
  const dx = String(b.diagnosis ?? "").trim(); if (!dx) return error("Diagnosis is required.");
  const physio = Number(b.physio_id) || null;
  const q = await db();
  const [r] = await q(`INSERT INTO referrals(patient_id, doctor_id, physio_id, diagnosis, region, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [p.id, s.user.id, physio, dx, String(b.region || "") || regionFromDiagnosis(dx), String(b.notes || "")]);
  let appointment_id: number | null = null;
  if (b.first_appt) {
    const when = new Date(b.first_appt); if (isNaN(when.getTime())) return error("Bad appointment date.");
    const [a] = await q(`INSERT INTO appointments(referral_id, patient_id, physio_id, scheduled_at, kind) VALUES ($1,$2,$3,$4,'initial') RETURNING id`, [r.id, p.id, physio, when.toISOString()]);
    appointment_id = a.id as number;
    await scheduleReminders(q, appointment_id, p.id, when.toISOString());
  }
  await notifyApp(q, p.id, "referral", `Dr ${s.user.name} referred you to physiotherapy for: ${dx}.`);
  if (physio) await notifyApp(q, physio, "referral", `New referral: ${p.name} – ${dx}.`);
  return json({ ok: true, referral_id: r.id, appointment_id, message: `Referral created for ${p.name}.` }, 201);
}
