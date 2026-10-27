// Reminders: when an appointment is created we queue two SMS (7 days and 3 days before).
// dispatchDue() marks them sent (and really sends via Twilio when TWILIO_* env vars exist).
import "server-only";

type Q = (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-SG", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" });
}

export async function scheduleReminders(q: Q, appointmentId: number, patientId: number, scheduledAt: string) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const link = `${base}/survey?appt=${appointmentId}`;
  const when = fmt(scheduledAt);
  const rows: [string, number, string][] = [
    ["reminder_7d", 7, `CGH Physiotherapy: your appointment is on ${when}. Please complete your 2-minute health questionnaire before the visit: ${link}`],
    ["reminder_3d", 3, `Reminder: physiotherapy appointment on ${when}. If you have not yet done so, please complete your questionnaire: ${link}`],
  ];
  for (const [kind, days, message] of rows) {
    const sendAt = new Date(scheduledAt); sendAt.setDate(sendAt.getDate() - days); sendAt.setHours(9, 0, 0, 0);
    await q(`INSERT INTO notifications(user_id, appointment_id, channel, kind, message, send_at) VALUES ($1,$2,'sms',$3,$4,$5)`, [patientId, appointmentId, kind, message, sendAt.toISOString()]);
    // caregivers linked to the patient get the same SMS
    const cg = await q("SELECT caregiver_id FROM care_links WHERE patient_id = $1", [patientId]);
    for (const c of cg) await q(`INSERT INTO notifications(user_id, appointment_id, channel, kind, message, send_at) VALUES ($1,$2,'sms',$3,$4,$5)`, [c.caregiver_id, appointmentId, kind, `[For your parent] ${message}`, sendAt.toISOString()]);
  }
  await q(`INSERT INTO notifications(user_id, appointment_id, channel, kind, message, send_at, sent_at) VALUES ($1,$2,'app','appointment',$3,now(),now())`,
    [patientId, appointmentId, `New physiotherapy appointment on ${when}. You will get an SMS 7 days and 3 days before.`]);
}

export async function notifyApp(q: Q, userId: number, kind: string, message: string, appointmentId: number | null = null) {
  await q(`INSERT INTO notifications(user_id, appointment_id, channel, kind, message, send_at, sent_at) VALUES ($1,$2,'app',$3,$4,now(),now())`, [userId, appointmentId, kind, message]);
}

export async function dispatchDue(q: Q): Promise<number> {
  const due = await q(`SELECT n.id, n.message, u.phone FROM notifications n JOIN users u ON u.id = n.user_id WHERE n.channel='sms' AND n.sent_at IS NULL AND n.send_at <= now()`);
  for (const d of due) {
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
