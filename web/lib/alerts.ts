// A questionnaire that needs the clinician's attention before the visit.
import "server-only";
import { DIMS, DIM_LABEL, LEVEL_LABEL, type Dim } from "./eq5d";
import type { Survey } from "./data";
import { verdict } from "./plain";
import { notifyApp } from "./notify";

type Q = (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

/** Returns the reason text when the answers meet any alert rule, else null. */
export function flagReason(cur: Survey, prev: Survey | null): string | null {
  const reasons: string[] = [];
  if (cur.pain >= 7) reasons.push(`severe pain (${cur.pain}/10)`);
  if (cur.eq_vas <= 40) reasons.push(`very low self-rated health (${cur.eq_vas}/100)`);
  for (const d of DIMS as readonly Dim[]) if (cur[d] >= 4) reasons.push(`${DIM_LABEL[d].toLowerCase()}: ${LEVEL_LABEL[cur[d]].toLowerCase()}`);
  if (prev && verdict(cur, prev) === "worse") reasons.push("worse than last visit");
  return reasons.length ? reasons.join(", ") : null;
}

/** Mark the survey and tell the physiotherapist and the referring doctor (app notice, SMS outbox, push). */
export async function raiseAlert(q: Q, surveyId: number, patientId: number, appointmentId: number | null, reason: string) {
  await q("UPDATE surveys SET flagged = true, flag_reason = $1 WHERE id = $2", [reason, surveyId]);
  const p = (await q("SELECT name FROM users WHERE id = $1", [patientId]))[0];
  const appt = appointmentId ? (await q("SELECT scheduled_at::text AS scheduled_at, physio_id FROM appointments WHERE id = $1", [appointmentId]))[0] : null;
  const ref = (await q("SELECT physio_id, doctor_id FROM referrals WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 1", [patientId]))[0];
  const when = appt?.scheduled_at ? ` before ${new Date(String(appt.scheduled_at)).toLocaleString("en-SG", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" })}` : "";
  const msg = `${p?.name} reported ${reason}${when}. Open the clinic list.`;
  const targets = new Set<number>();
  for (const id of [appt?.physio_id, ref?.physio_id, ref?.doctor_id]) if (id) targets.add(Number(id));
  for (const uid of targets) {
    await notifyApp(q, uid, "alert", msg, appointmentId);
    await q(`INSERT INTO notifications(user_id, appointment_id, channel, kind, message, send_at) VALUES ($1,$2,'sms','alert',$3,now())`, [uid, appointmentId, `CGH Physio alert: ${msg}`]);
  }
}

/** After a survey is stored: compute the flag against the previous questionnaire and raise the alert if needed. */
export async function checkAlert(q: Q, surveyId: number, patientId: number, appointmentId: number | null): Promise<string | null> {
  const rows = await q(`SELECT s.*, s.submitted_at::text AS submitted_at, '' AS filled_by_name FROM surveys s WHERE s.patient_id = $1 AND s.id <= $2 ORDER BY s.submitted_at DESC, s.id DESC LIMIT 2`, [patientId, surveyId]) as unknown as Survey[];
  const cur = rows.find((r) => r.id === surveyId) ?? rows[0]; const prev = rows.find((r) => r.id !== surveyId) ?? null;
  if (!cur) return null;
  const reason = flagReason(cur, prev);
  if (reason) await raiseAlert(q, surveyId, patientId, appointmentId, reason);
  return reason;
}
