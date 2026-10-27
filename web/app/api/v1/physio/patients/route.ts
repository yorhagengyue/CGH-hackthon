import { db } from "@/lib/db";
import { isResponse, json, mask, requireApi } from "@/lib/api";
export async function GET(req: Request) {
  const s = await requireApi(req, "physio"); if (isResponse(s)) return s;
  const q = await db();
  const rows = await q<{ id: number; name: string; login_id: string; diagnosis: string; region: string; n: number; last: string | null; next: string | null }>(
    `SELECT u.id, u.name, u.login_id, r.diagnosis, r.region, (SELECT COUNT(*)::int FROM surveys s WHERE s.patient_id = u.id) AS n,
       (SELECT MAX(s.submitted_at)::text FROM surveys s WHERE s.patient_id = u.id) AS last,
       (SELECT MIN(a.scheduled_at)::text FROM appointments a WHERE a.patient_id = u.id AND a.status='scheduled' AND a.scheduled_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore') AS next
     FROM referrals r JOIN users u ON u.id = r.patient_id WHERE r.physio_id = $1 AND r.status='active' ORDER BY u.name`, [s.user.id]);
  return json({ patients: rows.map((r) => ({ ...r, masked_id: mask(r.login_id), login_id: undefined })) });
}
