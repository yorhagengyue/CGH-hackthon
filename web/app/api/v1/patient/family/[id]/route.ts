// DELETE /api/v1/patient/family/:link_id  -> remove a family member (or withdraw a pending request)
import { removeFamily } from "@/lib/care";
import { error, isResponse, json, requireApi } from "@/lib/api";
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireApi(req, "patient"); if (isResponse(s)) return s;
  const { id } = await ctx.params;
  if (!(await removeFamily(s.user.id, Number(id)))) return error("Not found.", 404);
  return json({ ok: true });
}
