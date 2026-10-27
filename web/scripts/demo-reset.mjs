// Puts the demo family back into demo state without touching any other patient.
//   npm run demo:reset            (reads DATABASE_URL from .env.local or the environment)
// - daughter (S3456789C) -> father (S1234567A): pending again, with a fresh link_request notification
// - daughter -> mother (S2345678B): accepted
// - today's questionnaires for father and mother removed (so "Fill in questionnaire" shows again)
// - daughter's acting_patient_id cleared; her stale allowed/declined notifications removed
import { readFileSync } from "node:fs";
import pg from "pg";

const envFile = (() => { try { return readFileSync(new URL("../.env.local", import.meta.url), "utf8"); } catch { return ""; } })();
const url = process.env.DATABASE_URL ?? envFile.match(/^DATABASE_URL=(.*)$/m)?.[1];
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pool = new pg.Pool({ connectionString: url, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

const DAD = "S1234567A", MUM = "S2345678B", DAUGHTER = "S3456789C";
const SOD = "date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore'";

try {
  const ids = Object.fromEntries((await q("SELECT login_id, id, name FROM users WHERE login_id = ANY($1)", [[DAD, MUM, DAUGHTER]])).map((r) => [r.login_id, r]));
  if (!ids[DAD] || !ids[MUM] || !ids[DAUGHTER]) throw new Error("demo accounts missing - run the app once so the seed creates them");
  const dad = ids[DAD].id, mum = ids[MUM].id, dau = ids[DAUGHTER].id;

  // daughter -> father: pending + one fresh request notification
  const [link] = await q(`INSERT INTO care_links(caregiver_id, patient_id, relationship, status, responded_at) VALUES ($1,$2,'daughter','pending',NULL)
    ON CONFLICT (caregiver_id, patient_id) DO UPDATE SET status='pending', responded_at=NULL RETURNING id`, [dau, dad]);
  await q("DELETE FROM notifications WHERE kind='link_request' AND user_id = $1", [dad]);
  await q(`INSERT INTO notifications(user_id, channel, kind, message, send_at, sent_at, link_id) VALUES ($1,'app','link_request',$2,now(),now(),$3)`,
    [dad, `${ids[DAUGHTER].name} (your daughter) asks to help with your questionnaires. Allow?`, link.id]);
  // daughter -> mother: accepted
  await q(`INSERT INTO care_links(caregiver_id, patient_id, relationship, status, responded_at) VALUES ($1,$2,'daughter','accepted',now())
    ON CONFLICT (caregiver_id, patient_id) DO UPDATE SET status='accepted', responded_at=now()`, [dau, mum]);
  // today's questionnaires for the parents
  const del = await q(`DELETE FROM surveys WHERE patient_id = ANY($1) AND (submitted_at >= ${SOD} OR appointment_id IN (SELECT id FROM appointments WHERE patient_id = ANY($1) AND scheduled_at >= ${SOD} AND scheduled_at < ${SOD} + interval '1 day')) RETURNING id`, [[dad, mum]]);
  // daughter: stop acting as anyone, drop stale allowed/declined notices
  await q("UPDATE sessions SET acting_patient_id = NULL WHERE user_id = $1", [dau]);
  await q("DELETE FROM notifications WHERE user_id = $1 AND kind IN ('link_accepted','link_declined')", [dau]);

  const links = await q("SELECT p.login_id, c.status FROM care_links c JOIN users p ON p.id = c.patient_id WHERE c.caregiver_id = $1 ORDER BY p.login_id", [dau]);
  const pending = await q(`SELECT a.id, a.scheduled_at::text, u.login_id, (SELECT COUNT(*)::int FROM surveys s WHERE s.appointment_id = a.id) AS n FROM appointments a JOIN users u ON u.id = a.patient_id WHERE a.patient_id = ANY($1) AND a.scheduled_at >= ${SOD} ORDER BY a.scheduled_at`, [[dad, mum]]);
  console.log("links:", links.map((l) => `${l.login_id}=${l.status}`).join(", "));
  console.log("today's appointments:", pending.map((a) => `${a.login_id} ${a.scheduled_at.slice(11, 16)} surveys=${a.n}`).join("; "));
  console.log(`removed ${del.length} questionnaire(s) from today; daughter's acting patient cleared`);
} finally { await pool.end(); }
