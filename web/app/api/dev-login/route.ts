// Development only: GET /api/dev-login?as=P001&next=/physio  logs in as a demo account (for screenshots / quick role switching).
import { redirect } from "next/navigation";
import { login } from "@/lib/auth";
import { DEMO_PASSWORD } from "@/lib/seed";
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") return new Response("not available", { status: 404 });
  const u = new URL(req.url);
  const user = await login(u.searchParams.get("as") ?? "", DEMO_PASSWORD);
  if (!user) return new Response("unknown demo account", { status: 404 });
  redirect(u.searchParams.get("next") ?? "/");
}
