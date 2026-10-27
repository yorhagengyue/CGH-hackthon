// Authenticated dispatcher endpoint for Vercel Cron and external callers.
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { dispatchDue } from "@/lib/notify";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization?.startsWith("Bearer ")) return false;

  const provided = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

async function dispatch(request: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json({ error: "SMS dispatcher is not configured." }, { status: 503 });
  }
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await dispatchDue(await db());
    return Response.json(result, { status: result.failed > 0 ? 502 : 200 });
  } catch (error) {
    console.error("SMS dispatcher failed:", error);
    return Response.json({ error: "SMS dispatcher failed." }, { status: 500 });
  }
}

export const GET = dispatch;
export const POST = dispatch;
