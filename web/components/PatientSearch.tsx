import { diagnosisOptions, hasFilters, parseSearch, searchPatients } from "@/lib/search";
import { VERDICT_TEXT } from "@/lib/plain";
import { Card, Pill, fmtD } from "./ui";

const inp = "border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cgh-sky/50";

/** Search bar + filter chips + results. Renders only the bar when there are no filters (the page then shows its default content). */
export async function PatientSearch({ sp, scope, physioId, action }: { sp: Record<string, string | undefined>; scope: "mine" | "all"; physioId?: number | null; action: string }) {
  const params = parseSearch(sp, scope, physioId);
  const active = hasFilters(params);
  const rows = active ? await searchPatients(params) : [];
  const dx = await diagnosisOptions();
  return <div className="space-y-3">
    <form action={action} className="bg-white rounded-2xl shadow-card p-4 flex flex-wrap gap-2 items-end">
      <label className="flex-1 min-w-[260px] text-xs font-bold uppercase tracking-wide text-slate-500">Search<input name="q" defaultValue={sp.q ?? ""} placeholder="NRIC or patient name" className={`${inp} w-full mt-1 normal-case tracking-normal font-normal text-base`} /></label>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Diagnosis<input name="diagnosis" list="dx-options" defaultValue={sp.diagnosis ?? ""} placeholder="e.g. knee, osteoarthritis, 110" autoComplete="off" className={`${inp} block mt-1 w-56 font-normal normal-case tracking-normal`} /><datalist id="dx-options">{dx.flatMap((g) => g.items.map((d) => <option key={`${g.region}-${d.name}`} value={d.name}>{g.region}</option>))}</datalist></label>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Age<div className="flex gap-1 mt-1"><input name="min_age" type="number" min={0} max={120} defaultValue={sp.min_age ?? ""} placeholder="from" className={`${inp} w-20 font-normal`} /><input name="max_age" type="number" min={0} max={120} defaultValue={sp.max_age ?? ""} placeholder="to" className={`${inp} w-20 font-normal`} /></div></label>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Post-op<select name="postop" defaultValue={sp.postop ?? ""} className={`${inp} block mt-1 font-normal normal-case tracking-normal`}><option value="">Any</option><option value="0-3">0–3 months</option><option value="3-6">3–6 months</option><option value="6-12">6–12 months</option><option value="12+">12+ months</option><option value="none">No surgery</option></select></label>
      <button className="px-4 py-2 rounded-lg bg-cgh-blue text-white text-sm font-bold hover:bg-cgh-blue-dark">Search</button>
      {active && <a href={action} className="px-3 py-2 text-sm font-bold text-slate-500 hover:text-cgh-blue">Clear</a>}
    </form>
    {active && <Card tight title="Results" right={`${rows.length} patient${rows.length === 1 ? "" : "s"}${scope === "mine" ? " of yours" : ""}`}>
      <table className="tbl"><thead><tr><th>Patient</th><th>Age · Sex</th><th>Diagnosis</th><th>Post-op</th><th>Last questionnaire</th><th>Since last visit</th></tr></thead><tbody>
        {rows.map((r) => { const t = VERDICT_TEXT[r.verdict]; return <tr key={r.id} className={r.flagged ? "shadow-[inset_3px_0_0_0_#b91c1c]" : ""}><td><a href={`/patients/${r.id}`} className="font-bold text-cgh-blue hover:underline">{r.name}</a><div className="text-xs text-slate-500">{r.login_id_masked}{r.physio_name && scope === "all" ? ` · ${r.physio_name}` : ""}</div></td><td className="whitespace-nowrap">{r.age ?? "-"} · {(r.gender ?? "-")[0]}</td><td>{r.diagnosis.replace(/^\s*\d+\s*:\s*/, "")}<div className="text-xs text-slate-500">{r.diagnosis.match(/^\s*(\d+)\s*:/)?.[1] ?? ""}{r.diagnosis.match(/^\s*\d+\s*:/) ? " · " : ""}{r.region}</div></td><td className="whitespace-nowrap">{r.months_post_op != null ? `${r.months_post_op} months` : <span className="text-slate-400">No surgery</span>}</td><td className="whitespace-nowrap">{r.last_prom_at ? fmtD(r.last_prom_at) : <span className="text-slate-400">none</span>}<div className="text-xs text-slate-500">{r.n_proms} on record</div></td><td>{r.flagged ? <><Pill tone="danger">Needs attention</Pill><div className="text-xs text-danger mt-0.5">{r.flag_reason}</div></> : r.n_proms ? <Pill tone={t.tone}>{r.verdict === "first" ? "First visit" : r.verdict === "better" ? "Improved" : r.verdict === "same" ? "Stable" : "Worse"}</Pill> : <Pill tone="neutral">No questionnaire</Pill>}</td></tr>; })}
        {rows.length === 0 && <tr><td colSpan={6} className="py-3 text-slate-400">No patient matches. Try a keyword like knee or hip, or clear a filter.</td></tr>}
      </tbody></table></Card>}
  </div>;
}
