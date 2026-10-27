// GET  /api/v1/patient/family                 -> accepted + pending family members of the logged-in patient
// POST /api/v1/patient/family {nric, relationship} -> patient adds a registered caregiver; accepted at once
import { addFamilyByPatient, familyOf } from "@/lib/care";
import { body, error, isResponse, json, requireApi } from "@/lib/api";
export async function GET(req: Request) {
  const s = await requireApi(req, "patient"); if (isResponse(s)) return s;
  const fam = await familyOf(s.user.id);
  return json({ family: fam, accepted: fam.filter((f) => f.status === "accepted"), pending: fam.filter((f) => f.status === "pending") });
}
export async function POST(req: Request) {
  const s = await requireApi(req, "patient"); if (isResponse(s)) return s;
  const b = await body<{ nric?: string; relationship?: string }>(req);
  const r = await addFamilyByPatient({ id: s.user.id, name: s.user.name, gender: s.user.gender }, String(b.nric ?? ""), String(b.relationship || "family member"));
  if ("error" in r) return error(r.error, r.error.startsWith("Ask them") ? 404 : 400);
  return json({ ok: true, name: r.name, status: "accepted", family: await familyOf(s.user.id) }, 201);
}
