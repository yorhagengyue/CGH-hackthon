import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { db } from "@/lib/db";
import { clinicList, levels } from "@/lib/data";
import { Arrow, Card, Pill, ProfileBadge, fmtD, fmtDT } from "@/components/ui";

export default async function Hod({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const s = await session(); if (!s || s.user.role !== "hod") redirect("/login");
  const { q: search = "" } = await searchParams;
  const q = await db();
  const kpi = (await q<{ patients: number; surveys: number; today: number; today_done: number; physios: number }>(`SELECT (SELECT COUNT(*)::int FROM users WHERE role='patient') AS patients, (SELECT COUNT(*)::int FROM surveys) AS surveys,
    (SELECT COUNT(*)::int FROM appointments WHERE scheduled_at::date = (now() AT TIME ZONE 'Asia/Singapore')::date AND status='scheduled') AS today,
    (SELECT COUNT(*)::int FROM appointments a JOIN surveys s ON s.appointment_id = a.id WHERE a.scheduled_at::date = (now() AT TIME ZONE 'Asia/Singapore')::date) AS today_done,
    (SELECT COUNT(*)::int FROM users WHERE role='physio') AS physios`))[0];
  const cohort = await q<{ region: string; n: number; d_index: number; d_vas: number; d_pain: number }>(`WITH fl AS (SELECT s.patient_id, r.region, FIRST_VALUE(s.index_value) OVER w AS i0, LAST_VALUE(s.index_value) OVER w AS i1, FIRST_VALUE(s.eq_vas) OVER w AS v0, LAST_VALUE(s.eq_vas) OVER w AS v1, FIRST_VALUE(s.pain) OVER w AS p0, LAST_VALUE(s.pain) OVER w AS p1, COUNT(*) OVER (PARTITION BY s.patient_id) AS n
      FROM surveys s JOIN LATERAL (SELECT region FROM referrals r WHERE r.patient_id = s.patient_id ORDER BY created_at DESC LIMIT 1) r ON true
      WINDOW w AS (PARTITION BY s.patient_id ORDER BY s.submitted_at ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING))
    SELECT region, COUNT(DISTINCT patient_id)::int AS n, ROUND(AVG(i1 - i0)::numeric, 3)::float AS d_index, ROUND(AVG(v1 - v0)::numeric, 1)::float AS d_vas, ROUND(AVG(p1 - p0)::numeric, 1)::float AS d_pain FROM fl WHERE n >= 2 GROUP BY region ORDER BY n DESC`);
  const byPhysio = await q<{ name: string; patients: number; surveys: number }>(`SELECT p.name, COUNT(DISTINCT r.patient_id)::int AS patients, (SELECT COUNT(*)::int FROM surveys s JOIN referrals rr ON rr.patient_id = s.patient_id AND rr.physio_id = p.id) AS surveys FROM users p LEFT JOIN referrals r ON r.physio_id = p.id WHERE p.role='physio' GROUP BY p.id, p.name ORDER BY p.name`);
  const list = await clinicList(null);
  const all = await q<{ id: number; name: string; login_id: string; diagnosis: string | null; region: string | null; physio: string | null; n: number; last: string | null }>(
    `SELECT u.id, u.name, u.login_id, r.diagnosis, r.region, p.name AS physio, (SELECT COUNT(*)::int FROM surveys s WHERE s.patient_id = u.id) AS n, (SELECT MAX(s.submitted_at)::text FROM surveys s WHERE s.patient_id = u.id) AS last
     FROM users u LEFT JOIN LATERAL (SELECT * FROM referrals r WHERE r.patient_id = u.id ORDER BY r.created_at DESC LIMIT 1) r ON true LEFT JOIN users p ON p.id = r.physio_id
     WHERE u.role='patient' AND ($1 = '' OR u.name ILIKE '%' || $1 || '%' OR r.diagnosis ILIKE '%' || $1 || '%' OR p.name ILIKE '%' || $1 || '%') ORDER BY u.name`, [search]);
  return <div className="space-y-4">
    <div className="grid grid-cols-5 gap-3">{[[kpi.patients, "Patients"], [kpi.surveys, "PROM records"], [kpi.today, "Appointments today"], [kpi.today_done, "Questionnaires in for today"], [kpi.physios, "Physiotherapists"]].map(([n, l]) => <div key={l} className="bg-white border border-gray-200 rounded-xl px-4 py-3"><div className="text-2xl font-bold">{n}</div><div className="text-xs text-gray-500">{l}</div></div>)}</div>
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="Outcomes by body region" right="first → latest PROM, patients with ≥2"><table className="w-full text-sm"><thead><tr className="text-xs text-gray-500 text-left"><th className="py-1">Region</th><th>Patients</th><th>Δ index</th><th>Δ EQ-VAS</th><th>Δ pain</th></tr></thead><tbody>{cohort.map((c) => <tr key={c.region} className="border-t border-gray-100"><td className="py-1.5 font-semibold">{c.region}</td><td>{c.n}</td><td className={c.d_index > 0 ? "text-emerald-700" : "text-red-700"}>{c.d_index > 0 ? "+" : ""}{c.d_index}</td><td className={c.d_vas > 0 ? "text-emerald-700" : "text-red-700"}>{c.d_vas > 0 ? "+" : ""}{c.d_vas}</td><td className={c.d_pain < 0 ? "text-emerald-700" : "text-red-700"}>{c.d_pain > 0 ? "+" : ""}{c.d_pain}</td></tr>)}</tbody></table></Card>
      <Card title="By physiotherapist"><table className="w-full text-sm"><thead><tr className="text-xs text-gray-500 text-left"><th className="py-1">Physiotherapist</th><th>Active patients</th><th>PROM records</th></tr></thead><tbody>{byPhysio.map((p) => <tr key={p.name} className="border-t border-gray-100"><td className="py-1.5">{p.name}</td><td>{p.patients}</td><td>{p.surveys}</td></tr>)}</tbody></table>
        <h3 className="text-sm font-semibold mt-4 mb-1">Today across the department</h3>
        <table className="w-full text-sm"><tbody>{list.map((r) => <tr key={r.appt_id} className="border-t border-gray-100"><td className="py-1">{new Date(r.scheduled_at).toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" })}</td><td><a href={`/patients/${r.patient_id}`} className="text-teal-800 hover:underline">{r.name}</a></td><td className="text-gray-500">{r.physio_name}</td><td>{r.cur ? <><ProfileBadge s={levels(r.cur)} /> {r.cur.index_value.toFixed(2)} <Arrow f={r.flags.index} /></> : <Pill ok={false}>pending</Pill>}</td></tr>)}</tbody></table></Card>
    </div>
    <Card title="All patients" right={<form className="inline"><input name="q" defaultValue={search} placeholder="Search" className="border border-gray-300 rounded-lg px-2 py-1 text-sm" /></form>}>
      <table className="w-full text-sm"><thead><tr className="text-xs text-gray-500 text-left"><th className="py-1">Patient</th><th>Diagnosis</th><th>Physio</th><th>PROMs</th><th>Last PROM</th></tr></thead><tbody>{all.map((r) => <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50"><td className="py-1.5"><a href={`/patients/${r.id}`} className="font-semibold text-teal-800 hover:underline">{r.name}</a></td><td>{r.diagnosis ?? "—"}<div className="text-xs text-gray-500">{r.region}</div></td><td>{r.physio ?? "—"}</td><td>{r.n}</td><td className="text-gray-500">{fmtD(r.last)}</td></tr>)}</tbody></table>
    </Card>
  </div>;
}
