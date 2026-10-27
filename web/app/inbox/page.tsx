import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, Pill, fmtDT } from "@/components/ui";
import { markReadAction } from "../actions";

/** Staff notifications: alerts first, then questionnaire submissions, referrals. */
export default async function Inbox() {
  const s = await session(); if (!s || !["physio", "doctor", "hod"].includes(s.user.role)) redirect("/login");
  const q = await db();
  const notes = await q<{ id: number; kind: string; message: string; send_at: string; read_at: string | null; appointment_id: number | null; patient_id: number | null }>(
    `SELECT n.id, n.kind, n.message, n.send_at::text, n.read_at::text, n.appointment_id, a.patient_id FROM notifications n LEFT JOIN appointments a ON a.id = n.appointment_id
     WHERE n.user_id = $1 AND n.channel = 'app' ORDER BY (n.read_at IS NULL) DESC, (n.kind = 'alert') DESC, n.send_at DESC LIMIT 100`, [s.user.id]);
  return <div className="max-w-3xl mx-auto"><Card title="Notifications" right={<form action={markReadAction}><input type="hidden" name="back" value="/inbox" /><button className="underline">Mark all as read</button></form>}>
    {notes.length === 0 && <p className="text-sm text-slate-500">Nothing yet.</p>}
    <div className="divide-y divide-slate-100">{notes.map((n) => <div key={n.id} className={`py-3 flex items-start gap-3 ${!n.read_at ? "font-semibold" : ""}`}>
      <div className="w-28 shrink-0">{n.kind === "alert" ? <Pill tone="danger">Needs attention</Pill> : <Pill tone="neutral">{n.kind}</Pill>}</div>
      <div className="flex-1"><div>{n.message}</div><div className="text-xs text-slate-400 font-normal">{fmtDT(n.send_at)}{n.patient_id && <> · <a href={`/patients/${n.patient_id}`} className="text-cgh-blue font-bold">Open patient</a></>}</div></div>
    </div>)}</div>
  </Card></div>;
}
