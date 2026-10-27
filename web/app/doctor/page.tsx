import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, Pill, fmtD } from "@/components/ui";
import { ActionForm, Field, inputCls } from "@/components/Form";
import { createReferralAction } from "../actions";
import { PatientSearch } from "@/components/PatientSearch";

export default async function Doctor({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await session(); if (!s || s.user.role !== "doctor") redirect("/login");
  const sp = await searchParams; const search = "";
  const q = await db();
  const physios = await q<{ id: number; name: string }>("SELECT id, name FROM users WHERE role='physio' ORDER BY name");
  const rows = await q<{ id: number; name: string; login_id: string; diagnosis: string | null; region: string | null; physio: string | null; status: string | null; referred: string | null; n: number; last: string | null }>(
    `SELECT u.id, u.name, u.login_id, r.diagnosis, r.region, p.name AS physio, r.status, r.created_at::text AS referred,
       (SELECT COUNT(*)::int FROM surveys s WHERE s.patient_id = u.id) AS n, (SELECT MAX(s.submitted_at)::text FROM surveys s WHERE s.patient_id = u.id) AS last
     FROM users u LEFT JOIN LATERAL (SELECT * FROM referrals r WHERE r.patient_id = u.id ORDER BY r.created_at DESC LIMIT 1) r ON true LEFT JOIN users p ON p.id = r.physio_id
     WHERE u.role='patient' AND ($1 = '' OR u.name ILIKE '%' || $1 || '%' OR u.login_id ILIKE '%' || $1 || '%' OR r.diagnosis ILIKE '%' || $1 || '%') ORDER BY r.created_at DESC NULLS LAST, u.name LIMIT 100`, [search]);
  return <div className="space-y-4"><PatientSearch sp={sp} scope="all" action="/doctor" /><div className="grid lg:grid-cols-[1fr_380px] gap-4">
    <Card title="Patients" right={`${rows.length} registered`}>
      <table className="tbl"><thead><tr><th>Patient</th><th>Latest referral</th><th>Physio</th><th>PROMs</th><th>Last PROM</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.id} ><td><a href={`/patients/${r.id}`} className="font-semibold text-cgh-blue hover:underline">{r.name}</a><div className="text-xs text-slate-500">{r.login_id.slice(0, 1)}****{r.login_id.slice(-4)}</div></td><td>{r.diagnosis ? <>{r.diagnosis}<div className="text-xs text-slate-500">{r.region} · {fmtD(r.referred)}</div></> : <span className="text-slate-400">no referral</span>}</td><td>{r.physio ?? <span className="text-warn">—</span>}</td><td>{r.n}</td><td className="text-slate-500">{fmtD(r.last)}</td></tr>)}
      </tbody></table>
    </Card>
    <Card title="New referral to physiotherapy">
      <ActionForm action={createReferralAction} submit="Create referral">
        <Field label="Patient NRIC (must be registered)"><input name="nric" className={inputCls} placeholder="S1234567A" required /></Field>
        <Field label="Diagnosis"><input name="diagnosis" className={inputCls} placeholder="e.g. Osteoarthritis of knee" required /></Field>
        <Field label="Body region"><select name="region" className={inputCls}><option value="">auto from diagnosis</option>{["Knee", "Shoulder", "Lower back", "Neck", "Hip", "Ankle / foot", "Hand / wrist", "Elbow", "Other"].map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="Assign physiotherapist"><select name="physio_id" className={inputCls}><option value="">unassigned</option>{physios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="First appointment (optional, queues SMS reminders)"><input type="datetime-local" name="first_appt" className={inputCls} /></Field>
        <Field label="Notes for the physiotherapist"><textarea name="notes" className={inputCls} rows={2} /></Field>
      </ActionForm>
    </Card>
  </div></div>;
}
