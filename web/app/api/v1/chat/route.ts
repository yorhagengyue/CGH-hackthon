// POST /api/v1/chat {messages:[{role, content}]} -> Server-Sent Events: data: {"delta":"…"} per chunk, data: [DONE] at the end, data: {"error":"…"} on failure. GET -> history.
// Works with the web cookie session or an iOS Bearer token. Caregivers must be acting as an approved parent.
import { session } from "@/lib/auth";
import { apiSession, isResponse, json, requireViewedPatient, unauthorized } from "@/lib/api";
import { chatHistory, streamChat, type ChatMsg } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function who(req: Request) { return (await apiSession(req)) ?? (await session()); }

export async function GET(req: Request) {
  const s = await who(req); if (!s) return unauthorized();
  const pid = await requireViewedPatient(s); if (isResponse(pid)) return pid;
  return json({ messages: await chatHistory(pid) });
}

export async function POST(req: Request) {
  const s = await who(req); if (!s) return unauthorized();
  if (!["patient", "caregiver"].includes(s.user.role)) return json({ error: "Patients and family only." }, 403);
  const pid = await requireViewedPatient(s); if (isResponse(pid)) return pid;
  const b = await req.json().catch(() => ({})) as { messages?: ChatMsg[]; message?: string };
  const messages: ChatMsg[] = Array.isArray(b.messages) && b.messages.length ? b.messages.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") : b.message ? [{ role: "user", content: String(b.message) }] : [];
  if (!messages.length) return json({ error: "Send messages:[{role, content}]." }, 400);
  const stream = await streamChat(pid, { id: s.user.id, name: s.user.name, role: s.user.role }, messages);
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" } });
}
