import { one } from "@/lib/db";
import { error, forbidden, isResponse, json, patientDetail, requireApi } from "@/lib/api";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireApi(req); if (isResponse(s)) return s;
  const id = Number((await params).id);
  if (!id) return error("Bad id.");
  if (s.user.role === "patient" && s.user.id !== id) return forbidden();
  if (s.user.role === "caregiver" && !(await one("SELECT 1 FROM care_links WHERE caregiver_id = $1 AND patient_id = $2", [s.user.id, id]))) return forbidden();
  if (s.user.role === "physio" && !(await one("SELECT 1 FROM referrals WHERE physio_id = $1 AND patient_id = $2", [s.user.id, id]))) return error("This patient is not referred to you.", 403);
  const staff = ["doctor", "physio", "hod"].includes(s.user.role);
  const d = await patientDetail(id, staff);
  if (!d) return error("Patient not found.", 404);
  return json(d);
}
