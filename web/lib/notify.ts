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

export interface DispatchSummary {
  processed: number;
  sent: number;
  simulated: number;
  failed: number;
}

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  from: string;
}

async function sendWithTwilio(config: TwilioConfig, to: string, message: string) {
  const { accountSid, authToken, from } = config;
  const body = new URLSearchParams({ To: to, From: from, Body: message });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    console.error(`Twilio rejected SMS with HTTP ${response.status}.`);
    throw new Error(`Twilio rejected the SMS (HTTP ${response.status}).`);
  }
}

export async function dispatchDue(q: Q): Promise<DispatchSummary> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  const hasAnyTwilioConfig = Boolean(accountSid || authToken || from);
  if (hasAnyTwilioConfig && (!accountSid || !authToken || !from)) {
    throw new Error("Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM together.");
  }
  const config = accountSid && authToken && from ? { accountSid, authToken, from } : null;
  const due = await q(`SELECT n.id, n.message, u.phone FROM notifications n JOIN users u ON u.id = n.user_id WHERE n.channel='sms' AND n.sent_at IS NULL AND n.send_at <= now()`);
  const summary: DispatchSummary = { processed: due.length, sent: 0, simulated: 0, failed: 0 };

  for (const d of due) {
    if (!d.phone) {
      console.error(`SMS notification ${String(d.id)} has no recipient phone number.`);
      summary.failed += 1;
      continue;
    }

    try {
      if (config) {
        await sendWithTwilio(config, String(d.phone), String(d.message));
      }

      await q("UPDATE notifications SET sent_at = now() WHERE id = $1", [d.id]);
      if (config) {
        summary.sent += 1;
      } else {
        summary.simulated += 1;
      }
    } catch (error) {
      summary.failed += 1;
      console.error(`Could not process SMS notification ${String(d.id)}:`, error);
    }
  }

  return summary;
}
