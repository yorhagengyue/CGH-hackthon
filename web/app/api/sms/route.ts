// Cron endpoint: GET /api/sms?key=CRON_SECRET  -> sends everything due. Vercel Cron can hit this hourly.
import { db } from "@/lib/db";
import { dispatchDue } from "@/lib/notify";
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && key !== process.env.CRON_SECRET) return new Response("forbidden", { status: 403 });
  const n = await dispatchDue(await db());
  return Response.json({ sent: n });
}
