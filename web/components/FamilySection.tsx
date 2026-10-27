import { familyOf } from "@/lib/care";
import { addFamilyAction, removeFamilyAction } from "@/app/actions";
import { ActionForm, Field, inputCls } from "./Form";
import { Pill } from "./ui";

/** Profile > Family: everyone who may help this patient, with Remove, plus Add a family member. */
export async function FamilySection({ patientId }: { patientId: number }) {
  const fam = await familyOf(patientId);
  return <section className="bg-white rounded-2xl shadow-card">
    <h2 className="px-5 pt-4 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Family</h2>
    <div className="px-5 pb-5">
      {fam.length === 0 && <p className="text-sm text-slate-500">Nobody yet. Add a family member who may see your answers and fill in questionnaires for you.</p>}
      <div className="divide-y divide-slate-100">{fam.map((m) => <div key={m.id} className="py-3 flex items-center gap-3">
        <div className="flex-1"><div className="font-semibold text-cgh-ink">{m.name} <span className="text-slate-500 font-normal">· your {m.relationship}</span></div>{m.status === "pending" && <div className="text-xs text-slate-500">Asked to help · <a href="/patient?tab=notifications" className="text-cgh-blue font-bold">answer in Notifications</a></div>}</div>
        {m.status === "accepted" ? <Pill ok>Can help</Pill> : <Pill tone="warn">Waiting for you</Pill>}
        <form action={removeFamilyAction}><input type="hidden" name="link_id" value={m.id} /><button className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:border-danger hover:text-danger">{m.status === "accepted" ? "Remove" : "Decline"}</button></form>
      </div>)}</div>
      <details className="mt-4 group">
        <summary className="list-none cursor-pointer inline-block px-5 py-2.5 rounded-xl bg-cgh-blue text-white font-bold hover:bg-cgh-blue-dark">Add a family member</summary>
        <div className="mt-3 max-w-sm"><p className="text-sm text-slate-600 mb-2">They need to have registered as a family member / caregiver first. You add them with their NRIC; no further approval is needed.</p>
          <ActionForm action={addFamilyAction} submit="Add">
            <Field label="Their NRIC"><input name="nric" className={inputCls} placeholder="S4567890D" required autoCapitalize="characters" autoCorrect="off" /></Field>
            <Field label="They are your"><select name="relationship" className={inputCls}><option>son</option><option>daughter</option><option>spouse</option><option>grandchild</option><option>caregiver</option></select></Field>
          </ActionForm></div>
      </details>
    </div>
  </section>;
}
