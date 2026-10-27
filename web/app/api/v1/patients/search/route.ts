// GET /api/v1/patients/search?q=knee&region=Knee&min_age=50&max_age=70&postop=3-6   (or postop_min / postop_max in months)
// Physiotherapists see their own patients; doctors and HOD see everybody.
import { isResponse, json, requireApi } from "@/lib/api";
import { parseSearch, searchPatients } from "@/lib/search";
export async function GET(req: Request) {
  const s = await requireApi(req, "physio", "doctor", "hod"); if (isResponse(s)) return s;
  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const params = parseSearch(sp, s.user.role === "physio" ? "mine" : "all", s.user.id);
  const rows = await searchPatients(params);
  return json({ count: rows.length, params: { ...params, physioId: undefined }, patients: rows.map(({ ...r }) => { delete (r as Record<string, unknown>)._flags; return r; }) });
}
