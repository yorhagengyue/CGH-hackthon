// One-off: replace queued reminders with the questionnaire reminders (day before 09:00 + 2 hours before) for every future appointment.
import { readFileSync } from "node:fs";
import pg from "pg";
const envFile = (() => { try { return readFileSync(new URL("../.env.local", import.meta.url), "utf8"); } catch { return ""; } })();
const url = process.env.DATABASE_URL ?? envFile.match(/^DATABASE_URL=(.*)$/m)?.[1];
const base = process.env.APP_URL ?? envFile.match(/^APP_URL=(.*)$/m)?.[1] ?? "http://localhost:3000";
const pool = new pg.Pool({ connectionString: url, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;
const fmt = (iso) => new Date(iso).toLocaleString("en-SG", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" });
try {
  const a = await q("DELETE FROM notifications WHERE channel='sms' AND sent_at IS NULL RETURNING id");
  const b = await q("DELETE FROM notifications WHERE channel='app' AND kind='appointment' RETURNING id");
  const appts = await q("SELECT id, patient_id, scheduled_at::text FROM appointments WHERE status='scheduled' AND scheduled_at >= now() - interval '1 hour'");
  let n = 0;
  for (const ap of appts) {
    const when = fmt(ap.scheduled_at);
    const msg = `CGH Physiotherapy: you have not yet done your questionnaire for your visit on ${when}. Please complete it before the visit: ${base}/survey?appt=${ap.id}`;
    const cg = await q("SELECT caregiver_id FROM care_links WHERE patient_id = $1 AND status = 'accepted'", [ap.patient_id]);
    const sg = new Date(new Date(ap.scheduled_at).toLocaleString("en-US", { timeZone: "Asia/Singapore" }));
    const dayBefore = new Date(`${new Date(sg.getTime() - 86400000).toLocaleDateString("en-CA")}T09:00:00+08:00`);
    for (const [kind, sendAt] of [["reminder_1d", dayBefore], ["reminder_2h", new Date(new Date(ap.scheduled_at).getTime() - 2 * 3600 * 1000)]]) {
      await q(`INSERT INTO notifications(user_id, appointment_id, channel, kind, message, send_at) VALUES ($1,$2,'sms',$3,$4,$5)`, [ap.patient_id, ap.id, kind, msg, sendAt.toISOString()]); n++;
      for (const c of cg) { await q(`INSERT INTO notifications(user_id, appointment_id, channel, kind, message, send_at) VALUES ($1,$2,'sms',$3,$4,$5)`, [c.caregiver_id, ap.id, kind, `[For your parent] ${msg}`, sendAt.toISOString()]); n++; }
    }
    await q(`INSERT INTO notifications(user_id, appointment_id, channel, kind, message, send_at, sent_at) VALUES ($1,$2,'app','questionnaire',$3,now(),now())`, [ap.patient_id, ap.id, `Please fill in your questionnaire before your visit on ${when}.`]);
  }
  await q(`DELETE FROM notifications WHERE channel='sms' AND sent_at IS NULL AND appointment_id IN (SELECT appointment_id FROM surveys WHERE appointment_id IS NOT NULL)`);
  console.log(`removed ${a.length} queued SMS + ${b.length} appointment notices; queued ${n} questionnaire reminders for ${appts.length} appointments`);
} finally { await pool.end(); }
