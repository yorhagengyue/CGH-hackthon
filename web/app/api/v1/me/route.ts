import { one } from "@/lib/db";
import { isResponse, json, requireApi } from "@/lib/api";
export async function GET(req: Request) {
  const s = await requireApi(req); if (isResponse(s)) return s;
  const acting = s.actingPatientId ? await one<{ id: number; name: string }>("SELECT id, name FROM users WHERE id = $1", [s.actingPatientId]) : null;
  return json({ user: s.user, acting_patient_id: s.actingPatientId, acting_patient: acting });
}
