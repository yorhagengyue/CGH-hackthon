// GET /api/v1/patient/link-requests  -> caregivers waiting for this patient's Allow
import { pendingRequests } from "@/lib/care";
import { isResponse, json, requireApi } from "@/lib/api";
export async function GET(req: Request) {
  const s = await requireApi(req, "patient"); if (isResponse(s)) return s;
  return json({ requests: await pendingRequests(s.user.id) });
}
