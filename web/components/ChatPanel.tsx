"use client";
import { useEffect, useRef, useState } from "react";
type Msg = { role: "user" | "assistant"; content: string; pending?: boolean };
const CHIPS = ["When is my next visit?", "How am I doing compared with last time?", "What did I answer last time?"];

/** The patient's "Ask" tab: quick questions, bubbles, streamed replies. */
export function ChatPanel({ firstName }: { firstName: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { fetch("/api/v1/chat").then((r) => r.ok ? r.json() : { messages: [] }).then((d) => setMsgs((d.messages ?? []).map((m: Msg) => ({ role: m.role, content: m.content })))).catch(() => undefined); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs]);
  const send = async (q: string) => {
    const content = q.trim(); if (!content || busy) return;
    setText(""); setBusy(true);
    const history: Msg[] = [...msgs, { role: "user", content }];
    setMsgs([...history, { role: "assistant", content: "", pending: true }]);
    try {
      const r = await fetch("/api/v1/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }) });
      if (!r.ok || !r.body) { const e = await r.json().catch(() => ({})); setMsgs([...history, { role: "assistant", content: e.error ?? e.message ?? `Sorry, something went wrong (${r.status}).` }]); return; }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let acc = "", buf = "", err = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim(); if (!t.startsWith("data:")) continue;
          const data = t.slice(5).trim(); if (data === "[DONE]") continue;
          try { const j = JSON.parse(data); if (j.delta) acc += j.delta; if (j.error) err = j.error; } catch { acc += data; }
        }
        setMsgs([...history, { role: "assistant", content: acc, pending: true }]);
      }
      setMsgs([...history, { role: "assistant", content: acc.trim() || err || "Sorry, I have no answer for that." }]);
    } catch { setMsgs([...history, { role: "assistant", content: "Sorry, I could not reach the assistant. Please try again." }]); }
    finally { setBusy(false); }
  };
  return <div className="max-w-xl flex flex-col" style={{ minHeight: "60vh" }}>
    <div className="flex flex-wrap gap-2 mb-3">{CHIPS.map((c) => <button key={c} type="button" disabled={busy} onClick={() => send(c)} className="px-3 py-2 rounded-full bg-white border border-slate-300 text-sm font-semibold text-cgh-blue hover:border-cgh-blue disabled:opacity-50">{c}</button>)}</div>
    <div className="flex-1 space-y-3 overflow-y-auto pb-24">
      {msgs.length === 0 && <div className="bg-white rounded-2xl shadow-card p-4 text-slate-700"><div className="font-bold text-cgh-ink">Hello {firstName}, ask me anything about your visits and questionnaires.</div><div className="text-sm text-slate-500 mt-1">I only know what is in this app. For medical advice, please ask your physiotherapist.</div></div>}
      {msgs.map((m, i) => <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-cgh-blue text-white rounded-br-md" : "bg-white shadow-card text-cgh-ink rounded-bl-md"}`}>{m.content}{m.pending && <span className="inline-block w-2 h-4 ml-1 align-middle bg-cgh-sky animate-pulse rounded-sm" />}</div></div>)}
      <div ref={end} />
    </div>
    <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="fixed md:sticky bottom-0 left-0 right-0 md:left-auto md:right-auto bg-[#f4f7fb]/95 backdrop-blur border-t border-slate-200 md:border-0 p-3 md:px-0 flex gap-2">
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your question" className="flex-1 h-12 rounded-xl border border-slate-300 px-4 text-base bg-white focus:outline-none focus:ring-2 focus:ring-cgh-sky/50" />
      <button disabled={busy || !text.trim()} className="h-12 px-5 rounded-xl bg-cgh-blue text-white font-bold disabled:opacity-50">Send</button>
    </form>
  </div>;
}
