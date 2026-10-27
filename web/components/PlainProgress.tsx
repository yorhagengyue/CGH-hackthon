import { patientBundle, type Survey } from "@/lib/data";
import { DIMS, DIM_ICON, VERDICT_TEXT, dimChange, dimName, dimPhrase, verdict } from "@/lib/plain";
import { Card, LV_BG, Pill, TrendChart, fmtD, fmtDT, startOfTodaySG } from "./ui";

const dLabel = (iso: string) => new Date(iso).toLocaleDateString("en-SG", { day: "numeric", month: "short", timeZone: "Asia/Singapore" });
const TONE_BG = { ok: "bg-ok-bg text-ok", neutral: "bg-cgh-mist text-cgh-blue", warn: "bg-warn-bg text-warn" };
const ICON = {
  ok: "M4 12l5 5L20 7", neutral: "M5 12h14", warn: "M12 5v9m0 4h.01", first: "M12 3v18M3 12h18",
};

export function VerdictCard({ cur, prev, compact = false }: { cur: Survey | null; prev: Survey | null; compact?: boolean }) {
  const v = verdict(cur, prev); const t = VERDICT_TEXT[v];
  const icon = v === "first" ? ICON.first : ICON[t.tone];
  return <div className={`rounded-2xl ${TONE_BG[t.tone]} ${compact ? "px-4 py-3" : "px-5 py-4"} flex items-center gap-3`}>
    <span className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center shrink-0"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg></span>
    <div><div className={`font-extrabold ${compact ? "text-base" : "text-lg"}`}>{t.title}</div>{cur && <div className="text-xs opacity-80">Based on your answers on {fmtD(cur.submitted_at)}{prev ? ` compared with ${fmtD(prev.submitted_at)}` : ""}</div>}</div>
  </div>;
}

export function Dots({ level }: { level: number }) {
  return <span className="inline-flex gap-1" aria-label={`level ${level} of 5`}>{[1, 2, 3, 4, 5].map((n) => <span key={n} className={`w-3.5 h-3.5 rounded-full ${n <= level ? LV_BG[level] + " ring-1 ring-black/5" : "bg-slate-200"}`} />)}</span>;
}

export function VisitStrip({ surveys }: { surveys: Survey[] }) {
  const last = surveys.slice(-6);
  if (!last.length) return <p className="text-sm text-slate-500">Your visits will appear here after your first questionnaire.</p>;
  return <div className="flex gap-2 overflow-x-auto pb-1">{last.map((s, i) => {
    const prev = i === 0 ? (surveys.length > 6 ? surveys[surveys.length - 7] : null) : last[i - 1];
    const v = verdict(s, prev); const t = VERDICT_TEXT[v];
    const dot = { ok: "bg-ok", neutral: "bg-slate-400", warn: "bg-warn" }[t.tone];
    return <div key={s.id} className="min-w-[96px] flex-1 rounded-xl bg-slate-50 px-3 py-2.5 text-center"><div className="text-xs text-slate-500">{dLabel(s.submitted_at)}</div><div className={`w-3 h-3 rounded-full mx-auto my-1.5 ${dot}`} /><div className="text-sm font-bold">{v === "first" ? "First" : t.short}</div></div>;
  })}</div>;
}

function Bar({ value, max, prev, label }: { value: number; max: number; prev: number | null; label: string }) {
  return <div className="relative h-3 rounded-full bg-slate-200 overflow-visible mt-2" aria-label={label}>
    <div className="h-3 rounded-full bg-cgh-blue" style={{ width: `${(value / max) * 100}%` }} />
    {prev != null && <div className="absolute -top-1 h-5 w-0.5 bg-cgh-ink/70" style={{ left: `calc(${(prev / max) * 100}% - 1px)` }}><span className="absolute top-5 -translate-x-1/2 text-[10px] text-slate-500 whitespace-nowrap">last time</span></div>}
  </div>;
}

/** The patient's (or caregiver's) plain-language view of the latest questionnaire. */
export async function PlainProgress({ patientId, caregiver = false }: { patientId: number; caregiver?: boolean }) {
  const b = await patientBundle(patientId);
  if (!b) return <p>Patient not found.</p>;
  const { surveys, appointments } = b;
  const cur = surveys.at(-1) ?? null, prev = surveys.at(-2) ?? null;
  const upcoming = appointments.filter((a) => a.status === "scheduled" && new Date(a.scheduled_at) >= startOfTodaySG());
  return <div className="grid lg:grid-cols-[1fr_360px] gap-4">
    <div className="space-y-4">
      <VerdictCard cur={cur} prev={prev} />
      {cur ? <>
        <Card title="How you answered" right={`on ${fmtD(cur.submitted_at)}`}>
          <div className="divide-y divide-slate-100">{DIMS.map((d) => <div key={d} className="py-3 flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-cgh-mist text-cgh-blue flex items-center justify-center shrink-0"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={DIM_ICON[d]} /></svg></span>
            <div className="flex-1 min-w-0"><div className="text-xs font-bold uppercase tracking-wide text-slate-500">{dimName(d)}</div><div className="font-semibold text-cgh-ink">{dimPhrase(d, cur[d])}</div>{prev && <div className="text-xs text-slate-500 mt-0.5">{dimChange(cur[d], prev[d])}</div>}</div>
            <Dots level={cur[d]} />
          </div>)}</div>
          <div className="pt-4 mt-1 border-t border-slate-100">
            <div className="font-semibold">Pain today: <span className="text-cgh-ink font-extrabold">{cur.pain} out of 10</span>{prev && <span className="text-xs text-slate-500 font-normal ml-2">{cur.pain < prev.pain ? "less than last time" : cur.pain > prev.pain ? "more than last time" : "same as last time"} ({prev.pain})</span>}</div>
            <div className="grid grid-cols-10 gap-1 mt-2">{Array.from({ length: 10 }, (_, i) => <div key={i} className={`h-3 rounded ${i < cur.pain ? (cur.pain >= 7 ? "bg-danger" : cur.pain >= 4 ? "bg-warn" : "bg-ok") : "bg-slate-200"}`} />)}</div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>No pain</span><span>Worst pain</span></div>
          </div>
          <div className="pt-4 mt-3 border-t border-slate-100">
            <div className="font-semibold">You rated your health <span className="text-cgh-ink font-extrabold">{cur.eq_vas} out of 100</span></div>
            <Bar value={cur.eq_vas} max={100} prev={prev?.eq_vas ?? null} label="health rating" />
            <div className="flex justify-between text-[10px] text-slate-400 mt-5"><span>Worst health</span><span>Best health</span></div>
          </div>
        </Card>
        <Card title="Your visits" right="each box is one questionnaire"><VisitStrip surveys={surveys} /></Card>
        {caregiver && <Card title="Pain over visits" right="0 = no pain, 10 = worst pain"><TrendChart points={surveys.map((s) => ({ x: dLabel(s.submitted_at), y: s.pain }))} max={10} min={0} color="#b91c1c" label="" /></Card>}
        <Card title="Previous answers" tight><table className="tbl"><thead><tr><th>Date</th><th>How it went</th><th>Filled by</th></tr></thead><tbody>
          {[...surveys].reverse().map((s, i, arr) => { const p = arr[i + 1] ?? null; const v = verdict(s, p); const t = VERDICT_TEXT[v]; return <tr key={s.id}><td>{fmtDT(s.submitted_at)}</td><td><Pill tone={t.tone}>{v === "first" ? "First questionnaire" : t.short}</Pill></td><td className="text-slate-500">{s.filled_by_name}</td></tr>; })}
        </tbody></table></Card>
      </> : <Card title="How you answered"><p className="text-sm text-slate-500">After your first questionnaire this page shows your answers in plain words and how they change visit by visit.</p></Card>}
    </div>
    <div className="space-y-4">
      <Card title="Next appointments">{upcoming.length === 0 && <p className="text-sm text-slate-500">No upcoming appointment.</p>}{upcoming.map((a) => <div key={a.id} className="flex items-center gap-2 text-sm py-2 border-b border-slate-100 last:border-0"><div className="flex-1"><div className="font-semibold">{fmtDT(a.scheduled_at)}</div><div className="text-xs text-slate-500">{a.kind} · {a.physio_name ?? "physiotherapist to be confirmed"}</div></div>{a.survey_id ? <Pill ok>Questionnaire received</Pill> : <a href={`/survey?appt=${a.id}`} className="px-3 py-1.5 rounded-lg bg-cgh-blue text-white text-xs font-bold">Fill in now</a>}</div>)}</Card>
      {b.referrals[0] && <Card title="My condition"><div className="font-semibold">{b.referrals[0].diagnosis}</div><div className="text-sm text-slate-600 mt-1">{b.referrals[0].region} · referred by {b.referrals[0].doctor_name}</div><div className="text-sm text-slate-600">Physiotherapist: {b.referrals[0].physio_name ?? "to be assigned"}</div></Card>}
    </div>
  </div>;
}
