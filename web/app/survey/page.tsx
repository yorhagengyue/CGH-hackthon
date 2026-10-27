import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { one } from "@/lib/db";
import { DIMS, QUESTIONS } from "@/lib/eq5d";
import { ActionForm } from "@/components/Form";
import { fmtDT } from "@/components/ui";
import { SurveyProgress } from "@/components/SurveyProgress";
import { submitSurveyAction } from "../actions";
import { VasSlider } from "./VasSlider";

export default async function SurveyPage({ searchParams }: { searchParams: Promise<{ appt?: string }> }) {
  const s = await session(); if (!s) redirect("/login?next=/survey");
  const { appt } = await searchParams;
  const patientId = s.user.role === "caregiver" ? s.actingPatientId : s.user.id;
  if (s.user.role === "caregiver" && !patientId) redirect("/caregiver");
  const a = appt ? await one<{ id: number; scheduled_at: string; name: string; done: number | null }>(`SELECT a.id, a.scheduled_at::text, u.name, s.id AS done FROM appointments a JOIN users u ON u.id = a.patient_id LEFT JOIN surveys s ON s.appointment_id = a.id WHERE a.id = $1 AND a.patient_id = $2`, [Number(appt), patientId]) : null;
  if (appt && !a) return <p>Appointment not found.</p>;
  if (a?.done) return <div className="max-w-lg mx-auto text-center mt-12 bg-white rounded-2xl shadow-card p-8"><div className="w-14 h-14 rounded-full bg-ok-bg text-ok text-2xl font-black leading-[56px] mx-auto">OK</div><h1 className="text-xl mt-3">Already received</h1><p className="text-slate-600 mt-1">The questionnaire for {fmtDT(a.scheduled_at)} has been sent to the physiotherapist.</p><a href="/patient?tab=progress" className="inline-block mt-4 text-cgh-blue font-bold">See progress</a></div>;
  const opt = "flex items-center gap-3 min-h-12 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer text-[15px] transition has-[:checked]:border-cgh-blue has-[:checked]:bg-cgh-blue has-[:checked]:text-white";
  return <div className="max-w-lg mx-auto">
    <h1 className="text-[28px] leading-tight">Before your physiotherapy visit</h1>
    <p className="text-slate-600 mt-2 mb-3">{s.user.role === "caregiver" ? `Answering on behalf of ${a?.name ?? "your parent"}. ` : ""}{a ? `For the appointment on ${fmtDT(a.scheduled_at)}. ` : ""}Seven short questions. Think about <b>today</b>.</p>
    <ActionForm action={submitSurveyAction} submit="Send to my physiotherapist" stickySubmit>
      <SurveyProgress />
      {appt && <input type="hidden" name="appt" value={appt} />}
      {DIMS.map((d, i) => <fieldset key={d} className="bg-white rounded-2xl shadow-card p-5"><legend className="sr-only">{QUESTIONS[d].q}</legend><div className="text-[11px] font-bold uppercase tracking-wide text-cgh-blue">Question {i + 1} of 7</div><div className="font-bold text-lg mt-1 mb-3">{QUESTIONS[d].q}</div><div className="space-y-2">{QUESTIONS[d].opts.map((o, j) => <label key={j} className={opt}><input type="radio" name={d} value={j + 1} required className="accent-white w-4 h-4" />{o}</label>)}</div></fieldset>)}
      <fieldset className="bg-white rounded-2xl shadow-card p-5"><div className="text-[11px] font-bold uppercase tracking-wide text-cgh-blue">Question 6 of 7</div><div className="font-bold text-lg mt-1">Your pain today</div><p className="text-xs text-slate-500 mb-3">0 means no pain, 10 means the worst pain imaginable</p><div className="grid grid-cols-11 gap-1">{Array.from({ length: 11 }, (_, i) => <label key={i} className="text-center min-h-12 leading-12 rounded-lg border border-slate-200 font-bold cursor-pointer transition has-[:checked]:bg-cgh-blue has-[:checked]:text-white has-[:checked]:border-cgh-blue"><input type="radio" name="pain" value={i} required className="hidden" />{i}</label>)}</div><div className="flex justify-between text-[11px] text-slate-400 mt-1"><span>No pain</span><span>Worst pain</span></div></fieldset>
      <fieldset className="bg-white rounded-2xl shadow-card p-5"><div className="text-[11px] font-bold uppercase tracking-wide text-cgh-blue">Question 7 of 7</div><div className="font-bold text-lg mt-1">Your health today</div><p className="text-xs text-slate-500">0 is the worst health you can imagine, 100 the best</p><VasSlider /></fieldset>
    </ActionForm>
  </div>;
}
