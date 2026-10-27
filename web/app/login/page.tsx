import { ActionForm, Field, inputCls } from "@/components/Form";
import { loginAction } from "../actions";
export default function Login() {
  return <div className="max-w-sm mx-auto bg-white border border-gray-200 rounded-xl p-6 mt-8"><h1 className="text-xl font-bold mb-4">Log in</h1>
    <ActionForm action={loginAction} submit="Log in">
      <Field label="NRIC (patients & caregivers) or Staff ID"><input name="login_id" className={inputCls} placeholder="S1234567A" required autoFocus /></Field>
      <Field label="Password"><input name="password" type="password" className={inputCls} required /></Field>
    </ActionForm><p className="text-sm text-gray-500 mt-4">New patient or caregiver? <a href="/register" className="text-teal-700 underline">Register</a></p></div>;
}
