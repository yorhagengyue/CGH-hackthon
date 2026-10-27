import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { db } from "@/lib/db";
import { maybeDispatch } from "@/lib/notify";
import { clinicList } from "@/lib/data";
import { DIMS, DIM_LABEL } from "@/lib/eq5d";
import { VERDICT_TEXT, verdict } from "@/lib/plain";
import { PatientSearch } from "@/components/PatientSearch";
import { hasFilters, parseSearch } from "@/lib/search";
import { Card, Pill, age, fmtD, fmtDT, fmtT } from "@/components/ui";

export default async function Physio({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await session(); if (!s || s.user.role !== "physio") redirect("/login");
  const sp = await searchParams; const { day } = sp;
  const searching = hasFilters(parseSearch(sp, "mine", s.user.id));
  const date = day ? new Date(day + "T00:00:00+08:00") : new Date();
  await maybeDispatch(await db());
  const list = await clinicList(s.user.id, date);
  const q = await db();
  const mine = await q<{ id: number; name: string; login_id: string; diagnosis: string; region: string; n: number; last: string | null; next: string | null }>(
    `SELECT u.id, u.name, u.login_id, r.diagnosis, r.region, (SELECT COUNT(*)::int FROM surveys s WHERE s.patient_id = u.id) AS n,
       (SELECT MAX(s.submitted_at)::text FROM surveys s WHERE s.patient_id = u.id) AS last,
       (SELECT MIN(a.scheduled_at)::text FROM appointments a WHERE a.patient_id = u.id AND a.status='scheduled' AND a.scheduled_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore') AS next
     FROM referrals r JOIN users u ON u.id = r.patient_id WHERE r.physio_id = $1 AND r.status='active' ORDER BY u.name`, [s.user.id]);
  const notes = await q<{ message: string; send_at: string }>(`SELECT message, send_at::text FROM notifications WHERE user_id = $1 AND channel='app' ORDER BY send_at DESC LIMIT 5`, [s.user.id]);
  const nSub = list.filter((r) => r.cur).length;
  return <div className="space-y-4">
    <PatientSearch sp={sp} scope="mine" physioId={s.user.id} action="/physio" />
    {!searching && <>
    <Card tight title={`Clinic list · ${fmtD(date)}`} right={<form className="inline"><input type="date" name="day" defaultValue={date.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" })} className="border border-slate-300 rounded px-1 text-xs" /></form>}>
      <table className="tbl"><thead><tr><th>Time</th><th>Patient</th><th>Since last visit</th><th></th></tr></thead><tbody>
        {list.map((r) => { const v = r.cur ? verdict(r.cur, r.prev) : null; const t = v ? VERDICT_TEXT[v] : null; const why: string[] = [];
          if (r.cur && r.prev) { if (r.cur.pain !== r.prev.pain) why.push(`pain ${r.prev.pain}→${r.cur.pain}`); for (const d of DIMS) if (r.cur[d] !== r.prev[d]) why.push(`${DIM_LABEL[d].toLowerCase()} ${r.prev[d]}→${r.cur[d]}`); if (r.cur.eq_vas !== r.prev.eq_vas) why.push(`health ${r.prev.eq_vas}→${r.cur.eq_vas}`); if (!why.length) why.push("all answers the same"); }
          else if (r.cur) why.push(`pain ${r.cur.pain}/10`, `health ${r.cur.eq_vas}/100`);
          const flagged = !!r.cur?.flagged;
          return <tr key={r.appt_id} className={flagged ? "shadow-[inset_3px_0_0_0_#b91c1c]" : ""}><td className="font-bold tabular-nums whitespace-nowrap text-base">{fmtT(r.scheduled_at)}</td>
            <td className="text-base"><a href={`/patients/${r.patient_id}`} className="font-bold text-cgh-blue hover:underline">{r.name}</a></td>
            <td>{flagged ? <Pill tone="danger">Needs attention</Pill> : t ? <Pill tone={t.tone}>{v === "first" ? "First visit" : v === "better" ? "Improved" : v === "same" ? "Stable" : "Worse"}</Pill> : <Pill tone="neutral">Awaiting</Pill>}{flagged && <div className="text-xs text-danger mt-0.5">{r.cur?.flag_reason}</div>}</td>
            <td className="text-right"><details><summary className="cursor-pointer text-xs text-slate-400 hover:text-cgh-blue list-none">Details</summary><div className="text-left text-xs text-slate-600 mt-1 max-w-xs ml-auto">{r.kind} · {age(r.birthday) ?? "-"} y {(r.gender ?? "-")[0]} · {r.region} · {r.diagnosis}{why.length > 0 && <div className="mt-0.5">{why.slice(0, 4).join(" · ")}</div>}{r.cur && <div className="mt-0.5 text-slate-400">submitted {fmtDT(r.cur.submitted_at)}</div>}</div></details></td></tr>; })}
        {list.length === 0 && <tr><td colSpan={4} className="py-3 text-slate-400">No appointments on this day.</td></tr>}
      </tbody></table>
    </Card>
    <details className="group"><summary className="cursor-pointer text-cgh-blue font-bold list-none">My patients ({mine.length})</summary>
      <div className="mt-3 grid lg:grid-cols-[1fr_320px] gap-4">
        <Card tight title="Active referrals"><table className="tbl"><thead><tr><th>Patient</th><th>Diagnosis</th><th className="num">PROMs</th><th>Next appointment</th></tr></thead><tbody>
          {mine.map((p) => <tr key={p.id}><td><a href={`/patients/${p.id}`} className="font-semibold text-cgh-blue hover:underline">{p.name}</a></td><td>{p.diagnosis}</td><td className="num">{p.n}</td><td>{p.next ? fmtDT(p.next) : <span className="text-warn">none scheduled</span>}</td></tr>)}
        </tbody></table></Card>
        <Card title="Notifications">{notes.map((n, i) => <div key={i} className="text-sm py-1.5 border-b border-slate-100 last:border-0"><span className="text-xs text-slate-400 mr-1">{fmtDT(n.send_at)}</span>{n.message}</div>)}{notes.length === 0 && <p className="text-slate-400 text-sm">None.</p>}</Card>
      </div></details>
    </>}
  </div>;
}
