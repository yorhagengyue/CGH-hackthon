import { patientBundle, type Survey } from "@/lib/data";
import { DIMS, DIM_ICON, VERDICT_TEXT, dimChange, dimName, dimPhrase, verdict } from "@/lib/plain";
import { Card, LV_BG, Pill, TrendChart, fmtD, fmtDT } from "./ui";
import { ProgressTrend } from "./ProgressTrend";
import { RecordsBrowser } from "./RecordsBrowser";

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

/** Everything below the first screen: five rows with dots, pain and health bars, visit strip, previous answers. */
export function AnswersDetail({ surveys, caregiver = false }: { surveys: Survey[]; caregiver?: boolean }) {
  const cur = surveys.at(-1) ?? null, prev = surveys.at(-2) ?? null;
  if (!cur) return null;
  return <div className="space-y-4">
    <Card title="How you answered" right={`on ${fmtD(cur.submitted_at)}`}>
      <div className="divide-y divide-slate-100">{DIMS.map((d) => <div key={d} className="py-3 flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-cgh-mist text-cgh-blue flex items-center justify-center shrink-0"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={DIM_ICON[d]} /></svg></span>
        <div className="flex-1 min-w-0"><div className="text-xs font-bold uppercase tracking-wide text-slate-500">{dimName(d)}</div><div className="font-semibold text-cgh-ink">{dimPhrase(d, cur[d])}</div>{prev && <div className="text-xs text-slate-500 mt-0.5">{dimChange(cur[d], prev[d])}</div>}</div>
        <Dots level={cur[d]} />
      </div>)}</div>
      <div className="pt-4 mt-1 border-t border-slate-100">
        <div className="font-semibold">Pain today: <span className="text-cgh-ink font-extrabold">{cur.pain} out of 10</span></div>
        <div className="grid grid-cols-10 gap-1 mt-2">{Array.from({ length: 10 }, (_, i) => <div key={i} className={`h-3 rounded ${i < cur.pain ? (cur.pain >= 7 ? "bg-danger" : cur.pain >= 4 ? "bg-warn" : "bg-ok") : "bg-slate-200"}`} />)}</div>
      </div>
      <div className="pt-4 mt-3 border-t border-slate-100">
        <div className="font-semibold">You rated your health <span className="text-cgh-ink font-extrabold">{cur.eq_vas} out of 100</span></div>
        <Bar value={cur.eq_vas} max={100} prev={prev?.eq_vas ?? null} label="health rating" />
        <div className="h-4" />
      </div>
    </Card>
    <Card title="Your visits"><VisitStrip surveys={surveys} /></Card>
    {caregiver && <Card title="Pain over visits"><TrendChart points={surveys.map((s) => ({ x: dLabel(s.submitted_at), y: s.pain }))} max={10} min={0} color="#b91c1c" label="" /></Card>}
    <Card title="Previous answers" tight><table className="tbl"><thead><tr><th>Date</th><th>How it went</th><th>Filled by</th></tr></thead><tbody>
      {[...surveys].reverse().map((s, i, arr) => { const p = arr[i + 1] ?? null; const v = verdict(s, p); const t = VERDICT_TEXT[v]; return <tr key={s.id}><td>{fmtDT(s.submitted_at)}</td><td><Pill tone={t.tone}>{v === "first" ? "First questionnaire" : t.short}</Pill></td><td className="text-slate-500">{s.filled_by_name}</td></tr>; })}
    </tbody></table></Card>
  </div>;
}

/** Progress tab: the verdict as the headline, then the trend (with numbers) and the record browser. */
export async function PlainProgress({ patientId }: { patientId: number; caregiver?: boolean }) {
  const b = await patientBundle(patientId);
  if (!b) return <p>Patient not found.</p>;
  const { surveys } = b;
  const cur = surveys.at(-1) ?? null, prev = surveys.at(-2) ?? null;
  if (!cur) return <div className="max-w-xl"><h1 className="text-[30px]">No questionnaire yet</h1><p className="text-slate-600 mt-2">After your first questionnaire, this page shows your trend and your records.</p></div>;
  const v = verdict(cur, prev); const t = VERDICT_TEXT[v];
  const points = surveys.map((s) => ({ id: s.id, date: fmtD(s.submitted_at), label: dLabel(s.submitted_at), mo: s.mo, sc: s.sc, ua: s.ua, pd: s.pd, ad: s.ad, pain: s.pain, health: s.eq_vas, filled_by: s.filled_by_name }));
  return <div className="max-w-3xl space-y-5">
    <h1 className={`text-[32px] ${t.tone === "ok" ? "text-ok" : t.tone === "warn" ? "text-warn" : "text-cgh-ink"}`}>{t.title}</h1>
    <section><h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 mb-2">Trend</h2><ProgressTrend points={points} /></section>
    <section><h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 mb-2">My records</h2><RecordsBrowser points={points} /></section>
  </div>;
}
