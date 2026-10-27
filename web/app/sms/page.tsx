import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, Pill, fmtDT } from "@/components/ui";
import { dispatchSmsAction } from "../actions";

export default async function Sms() {
  const s = await session(); if (!s || !["doctor", "physio", "hod"].includes(s.user.role)) redirect("/login");
  const q = await db();
  const rows = await q<{ id: number; kind: string; message: string; send_at: string; sent_at: string | null; name: string; phone: string | null; role: string; provider_ref: string | null }>(`SELECT n.id, n.kind, n.message, n.send_at::text, n.sent_at::text, n.provider_ref, u.name, u.phone, u.role FROM notifications n JOIN users u ON u.id = n.user_id WHERE n.channel='sms' ORDER BY n.send_at DESC LIMIT 200`);
  const due = rows.filter((r) => !r.sent_at && new Date(r.send_at) <= new Date()).length;
  const cfg = [process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, process.env.TWILIO_FROM];
  const live = cfg.every(Boolean), partial = cfg.some(Boolean) && !live;
  return <Card title="SMS outbox" right={<span className="flex items-center gap-2">{live ? `Twilio connected · from ${process.env.TWILIO_FROM}` : partial ? "Twilio configuration incomplete" : "Simulated (set TWILIO_* to send for real)"} · {due} due now <form action={dispatchSmsAction}><button className="px-2 py-1 rounded bg-cgh-blue text-white text-xs">Run dispatcher</button></form></span>}>
    <p className="text-xs text-slate-500 mb-2">Reminders go out the day before at 09:00 and 2 hours before a visit, to the patient and each approved caregiver, only while the questionnaire is still not done. Alerts to staff are sent at once. The dispatcher runs every hour on Vercel Cron (`POST /api/sms`, bearer CRON_SECRET).</p>
    <table className="tbl"><thead><tr><th>Scheduled</th><th>Status</th><th>To</th><th>Type</th><th>Message</th></tr></thead><tbody>
      {rows.map((r) => <tr key={r.id} className="border-t border-slate-100 align-top"><td className="py-1.5 whitespace-nowrap">{fmtDT(r.send_at)}</td><td>{r.sent_at ? <><Pill ok>sent {fmtDT(r.sent_at)}</Pill>{r.provider_ref && <div className="text-[10px] text-slate-400 font-mono">{r.provider_ref}</div>}</> : new Date(r.send_at) <= new Date() ? <Pill ok={false}>due</Pill> : <span className="text-xs text-slate-400">queued</span>}</td><td className="whitespace-nowrap">{r.name}<div className="text-xs text-slate-500">{r.phone ?? "no phone"} · {r.role}</div></td><td className="text-xs">{r.kind}</td><td className="text-slate-700">{r.message}</td></tr>)}
    </tbody></table></Card>;
}
