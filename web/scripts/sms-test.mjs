// Dry-run / real test of the questionnaire reminder SMS.
//   node scripts/sms-test.mjs                      prints what would be sent for the demo father's next visit
//   node scripts/sms-test.mjs --send +6593688913   really sends that text to the number via Twilio and prints the SID
import { readFileSync } from "node:fs";
import pg from "pg";
const envFile = (() => { try { return readFileSync(new URL("../.env.local", import.meta.url), "utf8"); } catch { return ""; } })();
const env = (k) => process.env[k] ?? envFile.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1];
const url = env("DATABASE_URL"), base = env("APP_URL") ?? "http://localhost:3000";
const pool = new pg.Pool({ connectionString: url, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const fmt = (iso) => new Date(iso).toLocaleString("en-SG", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" });
try {
  const [a] = (await pool.query(`SELECT a.id, a.scheduled_at::text, u.phone FROM appointments a JOIN users u ON u.id = a.patient_id WHERE u.login_id = 'S1234567A' AND a.status = 'scheduled' ORDER BY a.scheduled_at DESC LIMIT 1`)).rows;
  const text = `CGH Physiotherapy: you have not yet done your questionnaire for your visit on ${fmt(a.scheduled_at)}. Please complete it before the visit: ${base}/survey?appt=${a.id}`;
  console.log("To (from the patient record):", a.phone); console.log("Text:", text); console.log("Length:", text.length, "chars");
  const i = process.argv.indexOf("--send");
  if (i < 0) { console.log("Dry run only. Add --send +65XXXXXXXX to really send."); }
  else {
    const to = process.argv[i + 1]; const sid = env("TWILIO_ACCOUNT_SID"), tok = env("TWILIO_AUTH_TOKEN"), from = env("TWILIO_FROM");
    if (!sid || !tok || !from) { console.error("Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM"); process.exit(2); }
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${sid}:${tok}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ To: to, From: from, Body: text }) });
    const d = await r.json().catch(() => ({}));
    console.log(r.ok ? `SENT sid=${d.sid} status=${d.status}` : `FAILED ${r.status}: ${d.message ?? JSON.stringify(d)}`);
  }
} finally { await pool.end(); }
