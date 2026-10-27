import { session } from "@/lib/auth";
import { parseSearch } from "@/lib/search";
import { exportPatients } from "@/lib/hod-export";

export async function GET(req: Request) {
  const s = await session();
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!s) return new Response("Please log in again.", { status: 401, headers });
  if (s.user.role !== "hod") return new Response("Not allowed.", { status: 403, headers });
  const params = parseSearch(Object.fromEntries(new URL(req.url).searchParams.entries()), "all");
  return new Response(await exportPatients(params), { headers: {
    ...headers,
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="cgh-physio-proms.csv"',
  } });
}
