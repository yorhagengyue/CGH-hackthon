// "Ask": a chat assistant that only knows what is in the patient's own record. DeepSeek, streamed.
import "server-only";
import { db } from "./db";
import { patientBundle, flagsFor } from "./data";
import { familyOf } from "./care";
import { DIMS, QUESTIONS, type Dim } from "./eq5d";
import { DIM_SHORT, VERDICT_TEXT, plainDiagnosis, verdict } from "./plain";

export type ChatMsg = { role: "user" | "assistant"; content: string };

const fmt = (iso: string) => new Date(iso).toLocaleString("en-SG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" });
const fmtD = (iso: string) => new Date(iso).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" });

/** Everything the assistant may know about this patient, as plain text for the system prompt. */
export async function patientContext(patientId: number, askedBy: { name: string; role: string }): Promise<string> {
  const b = await patientBundle(patientId);
  if (!b) return "No patient record.";
  const q = await db();
  const fam = await familyOf(patientId);
  const unread = await q<{ message: string; send_at: string }>("SELECT message, send_at::text FROM notifications WHERE user_id = $1 AND channel='app' AND read_at IS NULL AND kind <> 'link_request' ORDER BY send_at DESC LIMIT 10", [patientId]);
  const today = new Date().toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Singapore" });
  const ref = b.referrals[0];
  const lines: string[] = [
    `Today is ${today} (Singapore).`,
    `Patient: ${b.patient.name}, ${b.patient.gender ?? "gender not recorded"}${b.patient.birthday ? `, born ${fmtD(b.patient.birthday)}` : ""}.`,
    askedBy.role === "caregiver" ? `The person asking is ${askedBy.name}, a family member helping the patient.` : `The person asking is the patient.`,
    ref ? `Condition: ${plainDiagnosis(ref.diagnosis)} (${ref.region}). Physiotherapist: ${ref.physio_name ?? "not assigned yet"}. Referred by ${ref.doctor_name} on ${fmtD(ref.created_at)}.${ref.surgery_date ? ` Surgery on ${fmtD(ref.surgery_date)}.` : ""}` : "No referral on record.",
    "",
    "Appointments:",
    ...(b.appointments.length ? b.appointments.map((a) => `- ${fmt(a.scheduled_at)}, ${a.kind} visit with ${a.physio_name ?? "physiotherapist to be confirmed"}, status ${a.status}, questionnaire ${a.survey_id ? "done" : "not done yet"}`) : ["- none"]),
    "",
    "Questionnaires (EQ-5D-5L), oldest first:",
  ];
  b.surveys.forEach((s, i) => {
    const prev = i > 0 ? b.surveys[i - 1] : null;
    const v = verdict(s, prev);
    lines.push(`- ${fmt(s.submitted_at)}, filled in by ${s.filled_by_name}. ${VERDICT_TEXT[v].title.replace("You are", "Patient is")}.`);
    for (const d of DIMS as readonly Dim[]) lines.push(`    ${DIM_SHORT[d]}: "${QUESTIONS[d].opts[s[d] - 1]}" (level ${s[d]} of 5)`);
    lines.push(`    Pain ${s.pain} out of 10. Overall health ${s.eq_vas} out of 100.${s.flagged ? ` Flagged for the clinician: ${s.flag_reason}.` : ""}`);
  });
  if (!b.surveys.length) lines.push("- none yet");
  const cur = b.surveys.at(-1) ?? null, prev = b.surveys.at(-2) ?? null;
  if (cur && prev) { const f = flagsFor(cur, prev); lines.push("", `Change since the previous questionnaire: pain ${f.pain || "n/a"}, overall health ${f.vas || "n/a"}, EQ-5D index ${f.index || "n/a"}.`); }
  lines.push("", "Family members who may help:", ...(fam.length ? fam.map((m) => `- ${m.name}, ${m.relationship}, ${m.status === "accepted" ? "approved" : "waiting for approval"}`) : ["- none"]));
  lines.push("", "Unread notifications:", ...(unread.length ? unread.map((n) => `- ${fmt(n.send_at)}: ${n.message}`) : ["- none"]));
  return lines.join("\n");
}

export const SYSTEM_RULES = `You are "Ask", the assistant inside the CGH Physiotherapy app. You answer questions from the patient (or a family member helping them) using ONLY the patient record below.
Rules:
- Use simple English, one to three short sentences. Be warm and concrete. Refer to dates and numbers exactly as in the record.
- Answer only from the record. If something is not in the record, say you don't have that information in the app. Never invent appointments, results or advice.
- Do not give medication doses, do not change exercises or the treatment plan, do not diagnose. For such questions reply: "I can't advise on that here. Please ask your physiotherapist at your next visit." and add "I have noted your question for them."
- If the person mentions chest pain, difficulty breathing, fainting, a fall with injury, or thoughts of self-harm or suicide, reply first: "Please call 995 now (or 1767 Samaritans of Singapore if you are having thoughts of harming yourself)." Then say the physiotherapist will be informed.
- Explain the questionnaire in words (for example "slight problems walking"), not in index numbers.`;

const REFER = /ask your physiotherapist/i;
const sse = (obj: unknown) => `data: ${typeof obj === "string" ? obj : JSON.stringify(obj)}\n\n`;

/** Stream a reply from DeepSeek and store the exchange. `onDone` gets the full assistant text. */
export async function streamChat(patientId: number, author: { id: number; name: string; role: string }, history: ChatMsg[]): Promise<ReadableStream<Uint8Array>> {
  const q = await db();
  const last = [...history].reverse().find((m) => m.role === "user");
  let userMsgId: number | null = null;
  if (last) { const [r] = await q("INSERT INTO chat_messages(patient_id, author_id, role, content) VALUES ($1,$2,'user',$3) RETURNING id", [patientId, author.id, last.content.slice(0, 2000)]); userMsgId = Number(r.id); }
  const context = await patientContext(patientId, author);
  const key = process.env.DEEPSEEK_API_KEY;
  const enc = new TextEncoder();
  if (!key) return new ReadableStream({ start(c) { c.enqueue(enc.encode(sse({ error: "Ask is not configured on this server yet (missing DEEPSEEK_API_KEY)." }) + sse("[DONE]"))); c.close(); } });
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "deepseek-chat", temperature: 0.3, stream: true, max_tokens: 400,
      messages: [{ role: "system", content: `${SYSTEM_RULES}\n\n=== PATIENT RECORD ===\n${context}` }, ...history.slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))] }),
  });
  if (!res.ok || !res.body) { const t = await res.text().catch(() => ""); return new ReadableStream({ start(c) { c.enqueue(enc.encode(sse({ error: `Sorry, Ask is unavailable right now (${res.status}). ${t.slice(0, 120)}` }) + sse("[DONE]"))); c.close(); } }); }
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ""; let full = "";
  return new ReadableStream({
    async pull(c) {
      const { done, value } = await reader.read();
      if (done) {
        if (full.trim()) await q("INSERT INTO chat_messages(patient_id, author_id, role, content) VALUES ($1,NULL,'assistant',$2)", [patientId, full.trim()]);
        if (userMsgId && REFER.test(full)) await q("UPDATE chat_messages SET for_clinician = true WHERE id = $1", [userMsgId]);
        c.enqueue(enc.encode(sse("[DONE]"))); c.close(); return;
      }
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n"); buf = parts.pop() ?? "";
      for (const line of parts) {
        const t = line.trim(); if (!t.startsWith("data:")) continue;
        const data = t.slice(5).trim(); if (data === "[DONE]") continue;
        try { const delta = JSON.parse(data).choices?.[0]?.delta?.content; if (delta) { full += delta; c.enqueue(enc.encode(sse({ delta }))); } } catch { /* partial line */ }
      }
    },
    cancel() { reader.cancel().catch(() => undefined); },
  });
}

export async function chatHistory(patientId: number, limit = 40): Promise<(ChatMsg & { id: number; created_at: string; for_clinician: boolean })[]> {
  const q = await db();
  const rows = await q<{ id: number; role: "user" | "assistant"; content: string; created_at: string; for_clinician: boolean }>("SELECT id, role, content, created_at::text, for_clinician FROM chat_messages WHERE patient_id = $1 ORDER BY id DESC LIMIT $2", [patientId, limit]);
  return rows.reverse();
}

/** Questions the assistant referred to the physiotherapist, for the staff patient page. */
export async function questionsForClinician(patientId: number) {
  const q = await db();
  return q<{ id: number; content: string; created_at: string }>("SELECT id, content, created_at::text FROM chat_messages WHERE patient_id = $1 AND role = 'user' AND for_clinician ORDER BY id DESC LIMIT 10", [patientId]);
}
