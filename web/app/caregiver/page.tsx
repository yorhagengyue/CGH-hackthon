import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDT } from "@/components/ui";
import { ActionForm, Field, inputCls } from "@/components/Form";
import { actAsAction, linkParentAction } from "../actions";

export default async function Caregiver() {
  const s = await session(); if (!s || s.user.role !== "caregiver") redirect("/login");
  const q = await db();
  const parents = await q<{ id: number; name: string; relationship: string; status: string; next_at: string | null; next_id: number | null; next_done: number | null; n_surveys: number }>(
    `SELECT u.id, u.name, c.relationship, c.status,
       (SELECT a.scheduled_at::text FROM appointments a WHERE a.patient_id = u.id AND a.status='scheduled' AND a.scheduled_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore' ORDER BY a.scheduled_at LIMIT 1) AS next_at,
       (SELECT a.id FROM appointments a WHERE a.patient_id = u.id AND a.status='scheduled' AND a.scheduled_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore' ORDER BY a.scheduled_at LIMIT 1) AS next_id,
       (SELECT s.id FROM appointments a JOIN surveys s ON s.appointment_id = a.id WHERE a.patient_id = u.id AND a.status='scheduled' AND a.scheduled_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Singapore') AT TIME ZONE 'Asia/Singapore' ORDER BY a.scheduled_at LIMIT 1) AS next_done,
       (SELECT COUNT(*)::int FROM surveys s WHERE s.patient_id = u.id) AS n_surveys
     FROM care_links c JOIN users u ON u.id = c.patient_id WHERE c.caregiver_id = $1 ORDER BY u.name`, [s.user.id]);
  return <div className="max-w-3xl mx-auto"><h1 className="text-[30px] mb-1">My parents</h1><p className="text-slate-600 mb-4">You can help more than one parent. Each parent has to allow it once.</p>
    <div className="grid md:grid-cols-2 gap-4">
      {parents.map((p) => <div key={p.id} className="bg-white rounded-2xl shadow-card p-6">
        <div className="text-[22px] font-extrabold text-cgh-ink leading-tight">{p.name}</div>
        <div className="text-lg text-slate-700 mt-1">{p.status !== "accepted" ? (p.status === "pending" ? `Waiting for ${p.name.split(" ")[0]} to approve` : `${p.name.split(" ")[0]} did not allow this`) : p.next_at ? `Next visit ${fmtDT(p.next_at)}` : "No visit booked"}</div>
        <div className="mt-5">{p.status !== "accepted" ? <button disabled className="px-6 py-3 rounded-xl bg-slate-200 text-slate-400 font-bold cursor-not-allowed">{p.status === "pending" ? "Waiting for approval" : "Not allowed"}</button> : p.next_id && !p.next_done
          ? <form action={actAsAction}><input type="hidden" name="patient_id" value={p.id} /><input type="hidden" name="appt" value={p.next_id} /><button className="px-6 py-3 rounded-xl bg-cgh-blue text-white font-bold hover:bg-cgh-blue-dark">Fill questionnaire for {p.name.split(" ")[0]}</button></form>
          : <form action={actAsAction}><input type="hidden" name="patient_id" value={p.id} /><button className="px-6 py-3 rounded-xl bg-cgh-blue text-white font-bold hover:bg-cgh-blue-dark">See how {p.name.split(" ")[0]} is doing</button></form>}</div>
      </div>)}
    </div>
    <details className="mt-6"><summary className="list-none cursor-pointer inline-block px-5 py-2.5 rounded-xl bg-cgh-blue text-white font-bold hover:bg-cgh-blue-dark">Add another parent</summary><div className="mt-3 max-w-sm"><ActionForm action={linkParentAction} submit="Link"><Field label="Parent's NRIC"><input name="parent_nric" className={inputCls} placeholder="S1234567A" required /></Field><Field label="Relationship"><select name="relationship" className={inputCls}><option>son</option><option>daughter</option><option>spouse</option><option>grandchild</option><option>caregiver</option></select></Field></ActionForm></div></details>
  </div>;
}
