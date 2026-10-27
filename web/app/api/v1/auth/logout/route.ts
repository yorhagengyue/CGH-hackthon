import { db } from "@/lib/db";
import { bearer, json } from "@/lib/api";
export async function POST(req: Request) {
  const t = bearer(req);
  if (t) { const q = await db(); await q("DELETE FROM sessions WHERE token = $1", [t]); }
  return json({ ok: true });
}
