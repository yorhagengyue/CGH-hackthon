// POST /api/v1/patient/link-requests/:id  {accept: true|false}
import { respondLink } from "@/lib/care";
import { body, error, isResponse, json, requireApi } from "@/lib/api";
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireApi(req, "patient"); if (isResponse(s)) return s;
  const { id } = await ctx.params;
  const b = await body<{ accept?: boolean }>(req);
  const r = await respondLink(Number(id), s.user.id, b.accept === true);
  if (!r.ok) return error("Request not found.", 404);
  return json({ ok: true, status: b.accept ? "accepted" : "declined" });
}
