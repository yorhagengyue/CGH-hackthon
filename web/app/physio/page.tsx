import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { db } from "@/lib/db";
import { clinicList, levels, profileStr } from "@/lib/data";
import { Arrow, Card, Pill, ProfileBadge, age, fmtD, fmtDT, fmtT } from "@/components/ui";

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
      <table className="tbl"><thead><tr><th>Time</th><th>Status</th><th>Patient</th><th>Age · Sex</th><th>Region / diagnosis</th><th className="num">Pain</th><th>EQ-5D-5L</th><th className="num">Index</th><th className="num">EQ-VAS</th><th>Previous</th></tr></thead><tbody>
        {list.map((r) => <tr key={r.appt_id} ><td className="font-bold tabular-nums whitespace-nowrap">{fmtT(r.scheduled_at)}</td>
          <td>{r.cur ? <><Pill ok>Submitted</Pill><div className="text-xs text-slate-500">{fmtDT(r.cur.submitted_at)}</div></> : <Pill ok={false}>Not submitted</Pill>}</td>
          <td><a href={`/patients/${r.patient_id}`} className="font-semibold text-cgh-blue hover:underline">{r.name}</a><div className="text-xs text-slate-500">{r.kind} · {r.nPrev} prior</div></td>
          <td>{age(r.birthday) ?? "-"} · {(r.gender ?? "-")[0]}</td><td>{r.region}<div className="text-xs text-slate-500 max-w-[220px] truncate">{r.diagnosis}</div></td>
          <td className="num">{r.cur ? <><b>{r.cur.pain}</b><span className="text-slate-400">/10</span> <Arrow f={r.flags.pain} /></> : <span className="text-slate-300">—</span>}</td><td>{r.cur ? <ProfileBadge s={levels(r.cur)} /> : <span className="text-slate-300">—</span>}</td>
          <td className="num">{r.cur ? <><b>{r.cur.index_value.toFixed(3)}</b> <Arrow f={r.flags.index} /></> : <span className="text-slate-300">—</span>}</td><td className="num">{r.cur ? <><b>{r.cur.eq_vas}</b> <Arrow f={r.flags.vas} /></> : <span className="text-slate-300">—</span>}</td>
          <td className="min-w-[150px]">{r.prev ? <><span className="font-mono font-bold text-slate-700">{profileStr(r.prev)}</span> <span className="text-xs text-slate-400">{fmtD(r.prev.submitted_at)}</span><div className="text-xs text-slate-500 tabular-nums mt-0.5">index {r.prev.index_value.toFixed(2)} · VAS {r.prev.eq_vas} · pain {r.prev.pain}/10</div></> : <span className="text-slate-400">first visit</span>}</td></tr>)}
        {list.length === 0 && <tr><td colSpan={10} className="py-3 text-slate-400">No appointments on this day.</td></tr>}
      </tbody></table>
      <div className="text-xs text-slate-500 mt-2 px-4 pb-2"><Arrow f="improved" /> <Arrow f="worsened" /> change of at least the MCID versus the previous questionnaire · click a name for full history and the clinical-document note</div>
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
