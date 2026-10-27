import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { db } from "@/lib/db";
import { clinicList } from "@/lib/data";
import { DIMS, DIM_LABEL } from "@/lib/eq5d";
import { VERDICT_TEXT, verdict } from "@/lib/plain";
import { Card, Pill, age, fmtD, fmtDT, fmtT } from "@/components/ui";

export default async function Physio({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const s = await session(); if (!s || s.user.role !== "physio") redirect("/login");
  const { day } = await searchParams;
  const date = day ? new Date(day + "T00:00:00+08:00") : new Date();
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
    <Card tight title={`Clinic list · ${fmtD(date)}`} right={<span className="flex items-center gap-2">{nSub}/{list.length} questionnaires in before visit <form className="inline"><input type="date" name="day" defaultValue={date.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" })} className="border border-slate-300 rounded px-1 text-xs" /></form></span>}>
      <table className="tbl"><thead><tr><th>Time</th><th>Status</th><th>Patient</th><th>Age · Sex</th><th>Region / diagnosis</th><th>Change since last visit</th></tr></thead><tbody>
        {list.map((r) => <tr key={r.appt_id} ><td className="font-bold tabular-nums whitespace-nowrap">{fmtT(r.scheduled_at)}</td>
          <td>{r.cur ? <><Pill ok>Submitted</Pill><div className="text-xs text-slate-500">{fmtDT(r.cur.submitted_at)}</div></> : <Pill ok={false}>Not submitted</Pill>}</td>
          <td><a href={`/patients/${r.patient_id}`} className="font-semibold text-cgh-blue hover:underline">{r.name}</a><div className="text-xs text-slate-500">{r.kind} · {r.nPrev} prior</div></td>
          <td>{age(r.birthday) ?? "-"} · {(r.gender ?? "-")[0]}</td><td>{r.region}<div className="text-xs text-slate-500 max-w-[220px] truncate">{r.diagnosis}</div></td>
          <td className="min-w-[260px]">{r.cur ? (() => { const v = verdict(r.cur, r.prev); const t = VERDICT_TEXT[v]; const why: string[] = [];
              if (r.prev) { if (r.cur.pain !== r.prev.pain) why.push(`pain ${r.prev.pain}→${r.cur.pain}`); for (const d of DIMS) if (r.cur[d] !== r.prev[d]) why.push(`${DIM_LABEL[d].toLowerCase()} ${r.prev[d]}→${r.cur[d]}`); if (r.cur.eq_vas !== r.prev.eq_vas) why.push(`health ${r.prev.eq_vas}→${r.cur.eq_vas}`); if (!why.length) why.push("all answers the same"); }
              else why.push(`pain ${r.cur.pain}/10`, `health ${r.cur.eq_vas}/100`);
              return <><Pill tone={t.tone}>{v === "first" ? "First visit" : v === "better" ? "Improved" : v === "same" ? "Stable" : "Worse"}</Pill><div className="text-xs text-slate-500 mt-1">{why.slice(0, 4).join(" · ")}</div></>; })() : <span className="text-slate-300">awaiting questionnaire</span>}</td>
          </tr>)}
        {list.length === 0 && <tr><td colSpan={10} className="py-3 text-slate-400">No appointments on this day.</td></tr>}
      </tbody></table>
      <div className="text-xs text-slate-500 mt-2 px-4 pb-2">Improved / Stable / Worse compares today's answers with the previous questionnaire · click a name for the full EQ-5D-5L profile, scores and the clinical-document note</div>
    </Card>
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      <Card title="My patients" right={`${mine.length} active referrals`}>
        <table className="tbl"><thead><tr><th>Patient</th><th>Diagnosis</th><th className="num">PROMs</th><th>Last PROM</th><th>Next appointment</th></tr></thead><tbody>
          {mine.map((p) => <tr key={p.id} ><td><a href={`/patients/${p.id}`} className="font-semibold text-cgh-blue hover:underline">{p.name}</a></td><td>{p.diagnosis}<div className="text-xs text-slate-500">{p.region}</div></td><td className="num">{p.n}</td><td className="text-slate-500">{fmtD(p.last)}</td><td>{p.next ? fmtDT(p.next) : <span className="text-warn">none scheduled</span>}</td></tr>)}
        </tbody></table>
      </Card>
      <Card title="Notifications">{notes.map((n, i) => <div key={i} className="text-sm py-1.5 border-b border-slate-100 last:border-0"><span className="text-xs text-slate-400 mr-1">{fmtDT(n.send_at)}</span>{n.message}</div>)}{notes.length === 0 && <p className="text-slate-400 text-sm">None.</p>}</Card>
    </div>
  </div>;
}
