// Questionnaire reminders by SMS (Twilio) and in-app notices.
// Reminders go out the day before at 09:00 and 2 hours before the visit, only while the questionnaire is still not done.
// Twilio sending + bearer-protected dispatcher merged from Dylan's temp/sms-api (0404e4a).
import "server-only";

type Q = (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-SG", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" });
}

/** Singapore 09:00 on the day before, as an ISO instant. */
function dayBeforeAt9(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  const sg = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Singapore" }));
  const dayStr = new Date(sg.getTime() - 86400000).toLocaleDateString("en-CA");
  return new Date(`${dayStr}T09:00:00+08:00`).toISOString();
}

export function reminderText(scheduledAt: string, appointmentId: number): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `CGH Physiotherapy: you have not yet done your questionnaire for your visit on ${fmt(scheduledAt)}. Please complete it before the visit: ${base}/survey?appt=${appointmentId}`;
}

export async function scheduleReminders(q: Q, appointmentId: number, patientId: number, scheduledAt: string) {
  const msg = reminderText(scheduledAt, appointmentId);
  const cg = await q("SELECT caregiver_id FROM care_links WHERE patient_id = $1 AND status = 'accepted'", [patientId]);
  const slots: [string, string][] = [
    ["reminder_1d", dayBeforeAt9(scheduledAt)],
    ["reminder_2h", new Date(new Date(scheduledAt).getTime() - 2 * 3600 * 1000).toISOString()],
  ];
  for (const [kind, sendAt] of slots) {
    await q(`INSERT INTO notifications(user_id, appointment_id, channel, kind, message, send_at) VALUES ($1,$2,'sms',$3,$4,$5)`, [patientId, appointmentId, kind, msg, sendAt]);
    for (const c of cg) await q(`INSERT INTO notifications(user_id, appointment_id, channel, kind, message, send_at) VALUES ($1,$2,'sms',$3,$4,$5)`, [c.caregiver_id, appointmentId, kind, `[For your parent] ${msg}`, sendAt]);
  }
  await q(`INSERT INTO notifications(user_id, appointment_id, channel, kind, message, send_at, sent_at) VALUES ($1,$2,'app','questionnaire',$3,now(),now())`,
    [patientId, appointmentId, `Please fill in your questionnaire before your visit on ${fmt(scheduledAt)}.`]);
}

export async function notifyApp(q: Q, userId: number, kind: string, message: string, appointmentId: number | null = null) {
  await q(`INSERT INTO notifications(user_id, appointment_id, channel, kind, message, send_at, sent_at) VALUES ($1,$2,'app',$3,$4,now(),now())`, [userId, appointmentId, kind, message]);
}

// ---------- Twilio ----------

export interface DispatchSummary { processed: number; sent: number; simulated: number; failed: number; errors: string[] }
export interface TwilioConfig { accountSid: string; authToken: string; from: string }

export function twilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID, authToken = process.env.TWILIO_AUTH_TOKEN, from = process.env.TWILIO_FROM;
  if (accountSid || authToken || from) { if (!accountSid || !authToken || !from) throw new Error("Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM together."); return { accountSid, authToken, from }; }
  return null;
}

/** Sends one SMS; returns the Twilio message SID. Throws with Twilio's own error text on rejection. */
export async function sendWithTwilio(config: TwilioConfig, to: string, message: string): Promise<string> {
  const body = new URLSearchParams({ To: to, From: config.from, Body: message });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body, signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json().catch(() => ({})) as { sid?: string; message?: string; code?: number };
  if (!response.ok) throw new Error(`Twilio ${response.status}${data.code ? ` (code ${data.code})` : ""}: ${data.message ?? "rejected"}`);
  return data.sid ?? "";
}

export async function dispatchDue(q: Q): Promise<DispatchSummary> {
  const config = twilioConfig();
  // a reminder is only for a questionnaire that is still not done: drop the ones whose appointment already has one
  await q(`DELETE FROM notifications WHERE channel='sms' AND sent_at IS NULL AND kind LIKE 'reminder%' AND appointment_id IN (SELECT appointment_id FROM surveys WHERE appointment_id IS NOT NULL)`);
  const due = await q(`SELECT n.id, n.message, n.user_id, n.kind, u.phone FROM notifications n JOIN users u ON u.id = n.user_id WHERE n.channel='sms' AND n.sent_at IS NULL AND n.send_at <= now() ORDER BY n.send_at`);
  const summary: DispatchSummary = { processed: due.length, sent: 0, simulated: 0, failed: 0, errors: [] };
  for (const d of due) {
    if (!d.phone) { summary.failed++; summary.errors.push(`notification ${d.id}: no phone number`); continue; }
    try {
      if (config) { const sid = await sendWithTwilio(config, String(d.phone), String(d.message)); await q("UPDATE notifications SET sent_at = now(), provider_ref = $2 WHERE id = $1", [d.id, sid]); summary.sent++; }
      else { await q("UPDATE notifications SET sent_at = now() WHERE id = $1", [d.id]); summary.simulated++; }
    } catch (e) { summary.failed++; summary.errors.push(`notification ${d.id}: ${(e as Error).message}`); }
  }
  return summary;
}
