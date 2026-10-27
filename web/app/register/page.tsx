import { ActionForm, Field, inputCls } from "@/components/Form";
import { registerAction } from "../actions";
export default async function Register({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role = "patient" } = await searchParams;
  const cg = role === "caregiver";
  return <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-card p-6 mt-4"><h1 className="text-xl font-bold mb-1">Register</h1>
    <div className="flex gap-2 mb-4 text-sm"><a href="/register" className={`px-3 py-1.5 rounded-lg border ${!cg ? "bg-cgh-blue text-white border-cgh-blue" : "border-slate-300"}`}>I am the patient</a><a href="/register?role=caregiver" className={`px-3 py-1.5 rounded-lg border ${cg ? "bg-cgh-blue text-white border-cgh-blue" : "border-slate-300"}`}>I am a son / daughter / caregiver</a></div>
    <ActionForm action={registerAction} submit="Create account"><input type="hidden" name="role" value={role} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name"><input name="name" className={inputCls} required /></Field>
        <Field label="NRIC"><input name="nric" className={inputCls} placeholder="S1234567A" required /></Field>
        <Field label="Password"><input name="password" type="password" className={inputCls} required minLength={6} /></Field>
        <Field label="Mobile (for SMS reminders)"><input name="phone" className={inputCls} placeholder="+65 9123 4567" /></Field>
        <Field label="Birthday"><input name="birthday" type="date" className={inputCls} /></Field>
        <Field label="Gender"><select name="gender" className={inputCls}><option value="">—</option><option>MALE</option><option>FEMALE</option></select></Field>
      </div>
      <Field label="Address"><input name="address" className={inputCls} /></Field>
      {cg && <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3">
        <Field label="Your parent's NRIC (must be registered)"><input name="parent_nric" className={inputCls} placeholder="S1234567A" required /></Field>
        <Field label="Relationship with the patient"><select name="relationship" className={inputCls}><option>son</option><option>daughter</option><option>spouse</option><option>grandchild</option><option>caregiver</option></select></Field>
      </div>}
    </ActionForm></div>;
}
