import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, fmtDT, Pill } from "@/components/ui";
import { ActionForm, Field, inputCls } from "@/components/Form";
import { actAsAction, linkParentAction } from "../actions";

export default async function Caregiver() {
  const s = await session(); if (!s || s.user.role !== "caregiver") redirect("/login");
  const q = await db();
  const parents = await q<{ id: number; name: string; relationship: string; next_at: string | null; next_id: number | null; next_done: number | null; n_surveys: number }>(
    `SELECT u.id, u.name, c.relationship,
       (SELECT a.scheduled_at::text FROM appointments a WHERE a.patient_id = u.id AND a.status='scheduled' AND a.scheduled_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore' ORDER BY a.scheduled_at LIMIT 1) AS next_at,
       (SELECT a.id FROM appointments a WHERE a.patient_id = u.id AND a.status='scheduled' AND a.scheduled_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore' ORDER BY a.scheduled_at LIMIT 1) AS next_id,
       (SELECT s.id FROM appointments a JOIN surveys s ON s.appointment_id = a.id WHERE a.patient_id = u.id AND a.status='scheduled' AND a.scheduled_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore' ORDER BY a.scheduled_at LIMIT 1) AS next_done,
       (SELECT COUNT(*)::int FROM surveys s WHERE s.patient_id = u.id) AS n_surveys
     FROM care_links c JOIN users u ON u.id = c.patient_id WHERE c.caregiver_id = $1 ORDER BY u.name`, [s.user.id]);
  return <div className="max-w-3xl mx-auto"><h1 className="text-2xl font-bold mb-4">My parents</h1>
    <div className="grid md:grid-cols-2 gap-4">
      {parents.map((p) => <Card key={p.id} title={p.name} right={`your ${p.relationship}`}>
        <div className="text-sm text-gray-600">Next appointment: {p.next_at ? fmtDT(p.next_at) : "none"}</div>
        <div className="text-sm text-gray-600 mt-1">{p.n_surveys} questionnaires on record</div>
        <div className="mt-3 flex gap-2 items-center">
          <form action={actAsAction}><input type="hidden" name="patient_id" value={p.id} /><button className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm">Open {p.name.split(" ")[0]}'s page</button></form>
          {p.next_id && (p.next_done ? <Pill ok>questionnaire done</Pill> : <form action={actAsAction}><input type="hidden" name="patient_id" value={p.id} /><input type="hidden" name="appt" value={p.next_id} /><button className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-sm font-semibold">Fill questionnaire for {p.name.split(" ")[0]}</button></form>)}
        </div>
      </Card>)}
      <Card title="Link another parent"><ActionForm action={linkParentAction} submit="Link"><Field label="Parent's NRIC"><input name="parent_nric" className={inputCls} placeholder="S1234567A" required /></Field><Field label="Relationship"><select name="relationship" className={inputCls}><option>son</option><option>daughter</option><option>spouse</option><option>grandchild</option><option>caregiver</option></select></Field></ActionForm></Card>
    </div>
  </div>;
}
