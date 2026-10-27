import Image from "next/image";
import { ActionForm, Field, inputCls } from "@/components/Form";
import { loginAction } from "../actions";
export default function Login() {
  return <div className="grid lg:grid-cols-2 gap-10 items-center min-h-[60vh] max-w-5xl mx-auto py-6">
    <div className="hidden lg:block">
      <Image src="/brand/cgh-logo.png" alt="Changi General Hospital · SingHealth" width={288} height={91} priority />
      <h1 className="text-[34px] leading-tight mt-8 text-cgh-ink">The questionnaire is done before the visit.<br /><span className="text-cgh-blue">The session is for therapy.</span></h1>
      <p className="text-slate-600 mt-4 max-w-md">Patients and their families answer the EQ-5D-5L online. Physiotherapists see today's scores next to last visit's. Doctors refer in one step.</p>
      <p className="text-sm italic text-slate-500 mt-8">Patients. At the heart of all we do.</p>
    </div>
    <div className="bg-white rounded-2xl shadow-card p-7 w-full max-w-[420px] mx-auto lg:mx-0 lg:ml-auto">
      <Image src="/brand/cgh-logo.png" alt="" width={120} height={38} className="lg:hidden mb-5" />
      <h1 className="text-2xl">Log in</h1>
      <p className="text-sm text-slate-500 mt-1 mb-5">Patients and caregivers use their NRIC. Staff use their staff ID.</p>
      <ActionForm action={loginAction} submit="Log in" wide>
        <Field label="NRIC or staff ID"><input name="login_id" className={`${inputCls} h-11`} placeholder="S1234567A" required autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} /></Field>
        <Field label="Password"><input name="password" type="password" className={`${inputCls} h-11`} required autoCapitalize="none" autoCorrect="off" spellCheck={false} /></Field>
      </ActionForm>
      <p className="text-sm text-slate-500 mt-5">New patient or caregiver? <a href="/register" className="text-cgh-blue font-semibold">Register</a></p>
    </div>
  </div>;
}
