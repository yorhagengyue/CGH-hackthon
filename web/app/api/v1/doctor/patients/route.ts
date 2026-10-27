import { db } from "@/lib/db";
import { isResponse, json, mask, requireApi } from "@/lib/api";
const REGIONS = ["Knee", "Shoulder", "Lower back", "Neck", "Hip", "Ankle / foot", "Hand / wrist", "Elbow", "Other"];
/** GET /api/v1/doctor/patients?q=  → patients (latest referral), physios (for the referral sheet), regions. */
export async function GET(req: Request) {
  const s = await requireApi(req, "doctor", "hod"); if (isResponse(s)) return s;
  const search = new URL(req.url).searchParams.get("q") ?? "";
  const q = await db();
  const physios = await q("SELECT id, name FROM users WHERE role='physio' ORDER BY name");
  const rows = await q<{ login_id: string }>(
    `SELECT u.id, u.name, u.login_id, r.id AS referral_id, r.diagnosis, r.region, r.physio_id, p.name AS physio, r.status, r.created_at::text AS referred,
       (SELECT COUNT(*)::int FROM surveys s WHERE s.patient_id = u.id) AS n, (SELECT MAX(s.submitted_at)::text FROM surveys s WHERE s.patient_id = u.id) AS last
     FROM users u LEFT JOIN LATERAL (SELECT * FROM referrals r WHERE r.patient_id = u.id ORDER BY r.created_at DESC LIMIT 1) r ON true LEFT JOIN users p ON p.id = r.physio_id
     WHERE u.role='patient' AND ($1 = '' OR u.name ILIKE '%' || $1 || '%' OR u.login_id ILIKE '%' || $1 || '%' OR r.diagnosis ILIKE '%' || $1 || '%') ORDER BY r.created_at DESC NULLS LAST, u.name LIMIT 100`, [search]);
  return json({ patients: rows.map((r) => ({ ...r, masked_id: mask(r.login_id), login_id: undefined })), physios, regions: REGIONS });
}
