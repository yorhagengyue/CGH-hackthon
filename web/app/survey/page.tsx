import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { one } from "@/lib/db";
import { DIMS, QUESTIONS } from "@/lib/eq5d";
import { ActionForm } from "@/components/Form";
import { fmtDT } from "@/components/ui";
import { submitSurveyAction } from "../actions";
import { VasSlider } from "./VasSlider";

export default async function SurveyPage({ searchParams }: { searchParams: Promise<{ appt?: string }> }) {
  const s = await session(); if (!s) redirect("/login?next=/survey");
  const { appt } = await searchParams;
  const patientId = s.user.role === "caregiver" ? s.actingPatientId : s.user.id;
  if (s.user.role === "caregiver" && !patientId) redirect("/caregiver");
  const a = appt ? await one<{ id: number; scheduled_at: string; name: string; done: number | null }>(`SELECT a.id, a.scheduled_at::text, u.name, s.id AS done FROM appointments a JOIN users u ON u.id = a.patient_id LEFT JOIN surveys s ON s.appointment_id = a.id WHERE a.id = $1 AND a.patient_id = $2`, [Number(appt), patientId]) : null;
  if (appt && !a) return <p>Appointment not found.</p>;
  if (a?.done) return <div className="max-w-lg mx-auto text-center mt-12"><div className="text-5xl">✓</div><h1 className="text-xl font-bold mt-2">Already submitted</h1><p className="text-gray-600">The questionnaire for {fmtDT(a.scheduled_at)} has been received.</p><a href="/patient?tab=progress" className="underline text-teal-700">See progress</a></div>;
  return <div className="max-w-lg mx-auto">
    <h1 className="text-2xl font-bold">Before your physiotherapy visit</h1>
    <p className="text-gray-600 mt-1 mb-4">{s.user.role === "caregiver" ? `Answering on behalf of ${a?.name ?? "your parent"}. ` : ""}{a ? `For the appointment on ${fmtDT(a.scheduled_at)}. ` : ""}7 short questions, about 2 minutes. Think about <b>today</b>.</p>
    <ActionForm action={submitSurveyAction} submit="Send to my physiotherapist">
      {appt && <input type="hidden" name="appt" value={appt} />}
      {DIMS.map((d, i) => <fieldset key={d} className="bg-white border border-gray-200 rounded-xl p-4"><legend className="font-semibold px-1">{i + 1}. {QUESTIONS[d].q}</legend><div className="space-y-2 mt-2">{QUESTIONS[d].opts.map((o, j) => <label key={j} className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5 cursor-pointer has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50"><input type="radio" name={d} value={j + 1} required className="accent-teal-700 w-4 h-4" />{o}</label>)}</div></fieldset>)}
      <fieldset className="bg-white border border-gray-200 rounded-xl p-4"><legend className="font-semibold px-1">6. Your pain today</legend><p className="text-xs text-gray-500">0 = no pain · 10 = worst pain imaginable</p><div className="grid grid-cols-11 gap-1 mt-2">{Array.from({ length: 11 }, (_, i) => <label key={i} className="text-center border border-gray-200 rounded-lg py-2.5 font-semibold cursor-pointer has-[:checked]:bg-teal-700 has-[:checked]:text-white"><input type="radio" name="pain" value={i} required className="hidden" />{i}</label>)}</div></fieldset>
      <fieldset className="bg-white border border-gray-200 rounded-xl p-4"><legend className="font-semibold px-1">7. Your health today</legend><p className="text-xs text-gray-500">0 = the worst health you can imagine · 100 = the best health you can imagine</p><VasSlider /></fieldset>
    </ActionForm>
  </div>;
}
