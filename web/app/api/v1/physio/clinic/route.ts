import { clinicList } from "@/lib/data";
import { age, isResponse, json, mask, requireApi } from "@/lib/api";
/** GET /api/v1/physio/clinic?day=YYYY-MM-DD  (defaults to today, Singapore time). HOD gets the whole department. */
export async function GET(req: Request) {
  const s = await requireApi(req, "physio", "hod", "doctor"); if (isResponse(s)) return s;
  const day = new URL(req.url).searchParams.get("day");
  const date = day ? new Date(day + "T00:00:00+08:00") : new Date();
  const list = await clinicList(s.user.role === "physio" ? s.user.id : null, date);
  return json({ day: date.toISOString(), rows: list.map((r) => ({ ...r, age: age(r.birthday), masked_id: null, flagged: !!r.cur?.flagged, flag_reason: r.cur?.flag_reason ?? null })), submitted: list.filter((r) => r.cur).length, total: list.length });
}
