// One-off: give every referral without one a surgery date 1-18 months ago (deterministic by id). Existing dates are kept.
import { readFileSync } from "node:fs";
import pg from "pg";
const envFile = (() => { try { return readFileSync(new URL("../.env.local", import.meta.url), "utf8"); } catch { return ""; } })();
const url = process.env.DATABASE_URL ?? envFile.match(/^DATABASE_URL=(.*)$/m)?.[1];
const pool = new pg.Pool({ connectionString: url, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
try {
  await pool.query("ALTER TABLE referrals ADD COLUMN IF NOT EXISTS surgery_date DATE");
  const r = await pool.query(`UPDATE referrals SET surgery_date = (CURRENT_DATE - ((1 + (id * 7) % 18) || ' months')::interval - ((id * 11) % 27 || ' days')::interval)::date, notes = 'Post-operative rehabilitation.'
    WHERE surgery_date IS NULL RETURNING id, surgery_date`);
  const t = await pool.query("SELECT COUNT(*)::int AS all, COUNT(surgery_date)::int AS with_date FROM referrals");
  console.log(`referrals: ${t.rows[0].all}, with surgery date: ${t.rows[0].with_date}`);
  console.log(`backfilled ${r.rowCount} referrals with a surgery date`);
} finally { await pool.end(); }
