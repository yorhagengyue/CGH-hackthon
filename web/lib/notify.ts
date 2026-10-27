// Reminders: when an appointment is created we queue two SMS (7 days and 3 days before).
// dispatchDue() marks them sent (and really sends via Twilio when TWILIO_* env vars exist).
import "server-only";
import { sendPushToUser } from "./push";

type Q = (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-SG", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" });
}

export async function scheduleReminders(q: Q, appointmentId: number, patientId: number, scheduledAt: string) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const link = `${base}/survey?appt=${appointmentId}`;
  const when = fmt(scheduledAt);
  const msg = `CGH Physiotherapy: you have not yet done your questionnaire for your visit on ${when}. Please complete it before the visit: ${link}`;
  const cg = await q("SELECT caregiver_id FROM care_links WHERE patient_id = $1 AND status = 'accepted'", [patientId]);
  const slots: [string, number][] = [["reminder_7d", 7 * 24], ["reminder_1d", 24], ["reminder_2h", 2]];
  for (const [kind, hours] of slots) {
    const sendAt = new Date(new Date(scheduledAt).getTime() - hours * 3600 * 1000);
    if (hours >= 24) sendAt.setHours(9, 0, 0, 0);
    await q(`INSERT INTO notifications(user_id, appointment_id, channel, kind, message, send_at) VALUES ($1,$2,'sms',$3,$4,$5)`, [patientId, appointmentId, kind, msg, sendAt.toISOString()]);
    for (const c of cg) await q(`INSERT INTO notifications(user_id, appointment_id, channel, kind, message, send_at) VALUES ($1,$2,'sms',$3,$4,$5)`, [c.caregiver_id, appointmentId, kind, `[For your parent] ${msg}`, sendAt.toISOString()]);
  }
  await q(`INSERT INTO notifications(user_id, appointment_id, channel, kind, message, send_at, sent_at) VALUES ($1,$2,'app','questionnaire',$3,now(),now())`,
    [patientId, appointmentId, `Please fill in your questionnaire before your visit on ${when}.`]);
}

export async function notifyApp(q: Q, userId: number, kind: string, message: string, appointmentId: number | null = null) {
  await q(`INSERT INTO notifications(user_id, appointment_id, channel, kind, message, send_at, sent_at) VALUES ($1,$2,'app',$3,$4,now(),now())`, [userId, appointmentId, kind, message]);
  if (kind !== "alert") await sendPushToUser(q, userId, "CGH Physio", message, "/patient?tab=notifications").catch(() => undefined);
}

export async function dispatchDue(q: Q): Promise<number> {
  // a reminder is only for a questionnaire that is still not done: drop the ones whose appointment already has one
  await q(`DELETE FROM notifications WHERE channel='sms' AND sent_at IS NULL AND appointment_id IN (SELECT appointment_id FROM surveys WHERE appointment_id IS NOT NULL)`);
  const due = await q(`SELECT n.id, n.message, n.user_id, n.kind, u.phone FROM notifications n JOIN users u ON u.id = n.user_id WHERE n.channel='sms' AND n.sent_at IS NULL AND n.send_at <= now()`);
  for (const d of due) {
    if (String(d.kind).startsWith("reminder")) await sendPushToUser(q, Number(d.user_id), "Questionnaire reminder", String(d.message).replace(/https?:\S+/, "").trim(), "/patient").catch(() => undefined);
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM && d.phone) {
      const body = new URLSearchParams({ To: String(d.phone), From: process.env.TWILIO_FROM, Body: String(d.message) });
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: "POST", headers: { Authorization: "Basic " + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" }, body,
      }).catch(() => undefined);
    }
    await q("UPDATE notifications SET sent_at = now() WHERE id = $1", [d.id]);
  }
  return due.length;
}
