import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { db, one } from "@/lib/db";
import { patientBundle } from "@/lib/data";
import { PlainProgress } from "@/components/PlainProgress";
import { VERDICT_TEXT, verdict } from "@/lib/plain";
import { Card, Pill, fmtDT, fmtD, age, startOfTodaySG } from "@/components/ui";
import { markReadAction } from "../actions";

export default async function PatientPage({ searchParams }: { searchParams: Promise<{ tab?: string; done?: string }> }) {
  const s = await session(); if (!s) redirect("/login");
  const { tab = "home", done } = await searchParams;
  const patientId = s.user.role === "caregiver" ? s.actingPatientId : s.user.role === "patient" ? s.user.id : null;
  if (s.user.role === "caregiver" && !patientId) redirect("/caregiver");
  if (!patientId) redirect("/");
  const b = await patientBundle(patientId); if (!b) redirect("/");
  const q = await db();
  const notes = await q<{ id: number; kind: string; message: string; send_at: string; read_at: string | null; channel: string }>(`SELECT id, kind, message, send_at::text, read_at::text, channel FROM notifications WHERE user_id = $1 AND (channel='app' OR sent_at IS NOT NULL) ORDER BY send_at DESC LIMIT 30`, [patientId]);
  const unread = notes.filter((n) => n.channel === "app" && !n.read_at).length;
  const next = b.appointments.find((a) => a.status === "scheduled" && new Date(a.scheduled_at) >= startOfTodaySG());
  const pending = b.appointments.filter((a) => a.status === "scheduled" && !a.survey_id && new Date(a.scheduled_at) >= startOfTodaySG());
  const cur = b.surveys.at(-1) ?? null, prev = b.surveys.at(-2) ?? null;
  return <div>
    {s.user.role === "caregiver" && <div className="mb-3 bg-warn-bg rounded-lg px-3 py-2 text-sm">You are viewing <b>{b.patient.name}</b>'s page as their caregiver. <a href="/caregiver" className="underline">Switch parent</a></div>}
    <h1 className="text-[30px]">{s.user.role === "caregiver" ? b.patient.name : `Hello, ${b.patient.name}`}</h1>
    <div className="h-4" />
    {done && <div className="mb-3 bg-ok-bg rounded-lg px-3 py-2 text-sm">Thank you, your questionnaire has been sent to your physiotherapist.</div>}
    {tab === "home" && (() => { const v = verdict(cur, prev); const t = VERDICT_TEXT[v]; const today = next && new Date(next.scheduled_at).toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }) === new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
      return <div className="max-w-xl">
        <div className="bg-white rounded-2xl shadow-card p-6">
          {next ? <>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{today ? "Today" : "Next visit"}</div>
            <div className="text-[28px] font-extrabold text-cgh-ink mt-1 leading-tight">{fmtDT(next.scheduled_at)}</div>
            <div className="text-lg text-slate-700 mt-1">with {next.physio_name ?? "your physiotherapist"}</div>
            <div className="mt-5">{!next.survey_id ? <a href={`/survey?appt=${next.id}`} className="inline-block px-6 py-3 rounded-xl bg-cgh-blue text-white font-bold text-base hover:bg-cgh-blue-dark">Fill in questionnaire</a>
              : today ? <a href="/patient?tab=progress" className="inline-block px-6 py-3 rounded-xl bg-cgh-blue text-white font-bold text-base hover:bg-cgh-blue-dark">Begin session</a>
              : <Pill ok>Questionnaire received</Pill>}</div>
          </> : <>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Next visit</div>
            <div className="text-[28px] font-extrabold text-cgh-ink mt-1 leading-tight">Nothing booked yet</div>
            <div className="text-lg text-slate-700 mt-1">Your clinic will send you an SMS when a visit is booked.</div>
          </>}
        </div>
        {cur && <p className={`mt-4 text-lg font-bold ${t.tone === "ok" ? "text-ok" : t.tone === "warn" ? "text-warn" : "text-slate-700"}`}>{v === "first" ? "Your first questionnaire is in." : t.title}</p>}
      </div>; })()}
    {tab === "survey" && <Card title="Questionnaire (EQ-5D-5L)">{pending.length ? <div className="space-y-2">{pending.map((a) => <div key={a.id} className="flex items-center justify-between text-sm"><span>For your appointment on <b>{fmtDT(a.scheduled_at)}</b></span><a href={`/survey?appt=${a.id}`} className="px-3 py-1.5 rounded bg-cgh-blue text-white text-xs font-semibold">Start</a></div>)}</div> : <div className="text-sm text-slate-600">No questionnaire due right now. You can still record how you feel today: <a href="/survey" className="underline text-cgh-blue">fill an extra entry</a>.</div>}</Card>}
    {tab === "progress" && <PlainProgress patientId={patientId} caregiver={s.user.role === "caregiver"} />}
    {tab === "calendar" && <Card title="Calendar"><table className="tbl"><thead><tr><th>When</th><th>Visit</th><th>Physiotherapist</th><th>Questionnaire</th></tr></thead><tbody>{[...b.appointments].reverse().map((a) => <tr key={a.id} ><td>{fmtDT(a.scheduled_at)}</td><td>{a.kind} <span className="text-slate-400">· {a.status}</span></td><td>{a.physio_name ?? "—"}</td><td>{a.survey_id ? <Pill ok>done</Pill> : a.status === "scheduled" ? <a href={`/survey?appt=${a.id}`} className="underline text-cgh-blue">fill now</a> : "—"}</td></tr>)}</tbody></table></Card>}
    {tab === "notifications" && <Card title="Notifications" right={<form action={markReadAction}><button className="underline">Mark all as read</button></form>}>{notes.map((n) => <div key={n.id} className={`text-sm py-2 border-b border-slate-100 last:border-0 ${n.channel === "app" && !n.read_at ? "font-semibold" : ""}`}><span className="text-xs text-slate-400 mr-2">{fmtDT(n.send_at)} · {n.channel.toUpperCase()}</span>{n.message}</div>)}{notes.length === 0 && <p className="text-slate-500 text-sm">None.</p>}</Card>}
    {tab === "profile" && <Card title="Personal particulars"><dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm"><dt className="text-slate-500">Name</dt><dd>{b.patient.name}</dd><dt className="text-slate-500">NRIC</dt><dd>{b.patient.login_id.slice(0, 1)}****{b.patient.login_id.slice(-4)}</dd><dt className="text-slate-500">Birthday</dt><dd>{fmtD(b.patient.birthday)} ({age(b.patient.birthday) ?? "-"} y)</dd><dt className="text-slate-500">Gender</dt><dd>{b.patient.gender ?? "—"}</dd><dt className="text-slate-500">Mobile</dt><dd>{b.patient.phone ?? "—"}</dd><dt className="text-slate-500">Address</dt><dd>{b.patient.address ?? "—"}</dd><dt className="text-slate-500">Condition</dt><dd>{b.referrals[0] ? `${b.referrals[0].diagnosis} · ${b.referrals[0].region} · physiotherapist ${b.referrals[0].physio_name ?? "to be assigned"}` : "—"}</dd><dt className="text-slate-500">Caregivers</dt><dd>{b.caregivers.length ? b.caregivers.map((c) => `${c.name} (${c.relationship})`).join(", ") : "none linked"}</dd></dl></Card>}
  </div>;
}
