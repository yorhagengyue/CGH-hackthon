// Same queries as app/hod/page.tsx so the numbers match the web.
import { db } from "@/lib/db";
import { clinicList } from "@/lib/data";
import { isResponse, json, mask, requireApi } from "@/lib/api";
export async function GET(req: Request) {
  const s = await requireApi(req, "hod"); if (isResponse(s)) return s;
  const q = await db();
  const kpi = (await q(`SELECT (SELECT COUNT(*)::int FROM users WHERE role='patient') AS patients, (SELECT COUNT(*)::int FROM surveys) AS surveys,
    (SELECT COUNT(*)::int FROM appointments WHERE scheduled_at::date = (now() AT TIME ZONE 'Asia/Singapore')::date AND status='scheduled') AS today,
    (SELECT COUNT(*)::int FROM appointments a JOIN surveys s ON s.appointment_id = a.id WHERE a.scheduled_at::date = (now() AT TIME ZONE 'Asia/Singapore')::date) AS today_done,
    (SELECT COUNT(*)::int FROM users WHERE role='physio') AS physios`))[0];
  const cohort = await q(`WITH fl AS (SELECT s.patient_id, r.region, FIRST_VALUE(s.index_value) OVER w AS i0, LAST_VALUE(s.index_value) OVER w AS i1, FIRST_VALUE(s.eq_vas) OVER w AS v0, LAST_VALUE(s.eq_vas) OVER w AS v1, FIRST_VALUE(s.pain) OVER w AS p0, LAST_VALUE(s.pain) OVER w AS p1, COUNT(*) OVER (PARTITION BY s.patient_id) AS n
      FROM surveys s JOIN LATERAL (SELECT region FROM referrals r WHERE r.patient_id = s.patient_id ORDER BY created_at DESC LIMIT 1) r ON true
      WINDOW w AS (PARTITION BY s.patient_id ORDER BY s.submitted_at ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING))
    SELECT region, COUNT(DISTINCT patient_id)::int AS n, ROUND(AVG(i1 - i0)::numeric, 3)::float AS d_index, ROUND(AVG(v1 - v0)::numeric, 1)::float AS d_vas, ROUND(AVG(p1 - p0)::numeric, 1)::float AS d_pain FROM fl WHERE n >= 2 GROUP BY region ORDER BY n DESC`);
  const by_physio = await q(`SELECT p.id, p.name, COUNT(DISTINCT r.patient_id)::int AS patients, (SELECT COUNT(*)::int FROM surveys s JOIN referrals rr ON rr.patient_id = s.patient_id AND rr.physio_id = p.id) AS surveys FROM users p LEFT JOIN referrals r ON r.physio_id = p.id WHERE p.role='physio' GROUP BY p.id, p.name ORDER BY p.name`);
  const today = await clinicList(null);
  const search = new URL(req.url).searchParams.get("q") ?? "";
  const patients = await q<{ login_id: string }>(
    `SELECT u.id, u.name, u.login_id, r.diagnosis, r.region, p.name AS physio, (SELECT COUNT(*)::int FROM surveys s WHERE s.patient_id = u.id) AS n, (SELECT MAX(s.submitted_at)::text FROM surveys s WHERE s.patient_id = u.id) AS last
     FROM users u LEFT JOIN LATERAL (SELECT * FROM referrals r WHERE r.patient_id = u.id ORDER BY r.created_at DESC LIMIT 1) r ON true LEFT JOIN users p ON p.id = r.physio_id
     WHERE u.role='patient' AND ($1 = '' OR u.name ILIKE '%' || $1 || '%' OR r.diagnosis ILIKE '%' || $1 || '%' OR p.name ILIKE '%' || $1 || '%') ORDER BY u.name`, [search]);
  return json({ kpi, cohort, by_physio, today, patients: patients.map((r) => ({ ...r, masked_id: mask(r.login_id), login_id: undefined })) });
}
