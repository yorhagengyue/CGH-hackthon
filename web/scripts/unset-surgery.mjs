// One-off: about 30% of referrals had no surgery (deterministic by id); the demo father keeps his.
import { readFileSync } from "node:fs";
import pg from "pg";
const envFile = (() => { try { return readFileSync(new URL("../.env.local", import.meta.url), "utf8"); } catch { return ""; } })();
const url = process.env.DATABASE_URL ?? envFile.match(/^DATABASE_URL=(.*)$/m)?.[1];
const pool = new pg.Pool({ connectionString: url, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
try {
  const r = await pool.query(`UPDATE referrals SET surgery_date = NULL, notes = 'Referred for outpatient physiotherapy.' WHERE id % 10 IN (3, 6, 9) AND patient_id <> (SELECT id FROM users WHERE login_id = 'S1234567A') RETURNING id`);
  const t = await pool.query("SELECT COUNT(*)::int AS all, COUNT(surgery_date)::int AS with_date FROM referrals");
  console.log(`no surgery now: ${r.rowCount}; referrals ${t.rows[0].all}, with surgery date ${t.rows[0].with_date}`);
} finally { await pool.end(); }
