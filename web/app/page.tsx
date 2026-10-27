import Link from "next/link";
import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { HOME } from "@/lib/roles";
import { DEMO_PASSWORD } from "@/lib/seed";

const DIMS = [["Mobility", 2], ["Self-care", 1], ["Usual activities", 2], ["Pain / discomfort", 3], ["Anxiety / depression", 1]] as const;
const LV = ["", "lv1", "lv2", "lv3", "lv4", "lv5"];

export default async function Home() {
  const s = await session(); if (s) redirect(HOME[s.user.role]);
  const groups: [string, [string, string][]][] = [
    ["Patients & family", [["Patient (father)", "S1234567A"], ["Patient (mother)", "S2345678B"], ["Caregiver (daughter)", "S3456789C"]]],
    ["Clinic staff", [["Doctor", "D001"], ["Physiotherapist", "P001"], ["Head of Department", "H001"]]],
  ];
  return <div className="max-w-6xl mx-auto">
    <section className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center py-8 lg:py-14">
      <div>
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-cgh-blue bg-cgh-mist rounded-full px-3 py-1">Rehab Services · Physiotherapy</div>
        <h1 className="text-4xl lg:text-[44px] leading-[1.08] mt-4 text-cgh-ink">The questionnaire is done before the visit.<br /><span className="text-cgh-blue">The session is for therapy.</span></h1>
        <p className="text-lg text-slate-600 mt-5 max-w-xl">Patients, or their children on their behalf, answer the EQ-5D-5L on their phone a few days before each appointment. Physiotherapists open the clinic list and see today's scores next to last visit's. Nothing is transcribed by hand.</p>
        <div className="flex flex-wrap gap-3 mt-7"><Link href="/register" className="px-6 py-3 rounded-xl bg-cgh-blue text-white font-bold hover:bg-cgh-blue-dark transition">Register as a patient or caregiver</Link><Link href="/login" className="px-6 py-3 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 hover:border-cgh-blue hover:text-cgh-blue transition">Staff log in</Link></div>
        <dl className="grid grid-cols-3 gap-4 mt-10 max-w-lg">{[["2 min", "to answer, on any phone"], ["7 + 3 days", "SMS reminders before the visit"], ["0", "paper forms to transcribe"]].map(([v, l]) => <div key={l}><dt className="text-2xl font-extrabold text-cgh-ink tabular-nums">{v}</dt><dd className="text-xs text-slate-500 mt-1">{l}</dd></div>)}</dl>
      </div>
      <div className="relative">
        <div className="absolute -inset-6 bg-gradient-to-br from-cgh-mist to-transparent rounded-[32px] -z-10" />
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between"><div><div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Clinic list · today</div><div className="font-bold text-cgh-ink">Tan Wei Ming · Knee · follow-up, 2:00 pm</div></div><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-ok-bg text-ok">Submitted last night</span></div>
          <div className="grid grid-cols-3 gap-3 mt-4">{[["3", "/10", "Pain", "less than last visit"], ["Improved", "", "Since last visit", "pain 5→3, mobility 3→2"], ["72", "/100", "Overall health score", "up from 60"]].map(([v, u, l, d]) => <div key={l} className="rounded-xl bg-cgh-mist/60 px-3 py-2.5"><div className="text-xl font-extrabold tabular-nums">{v}<span className="text-xs text-slate-400 font-semibold">{u}</span></div><div className="text-[11px] text-slate-500">{l}</div><div className="text-[11px] font-bold text-ok mt-0.5">{d}</div></div>)}</div>
          <div className="mt-4 space-y-1.5">{DIMS.map(([d, l]) => <div key={d} className="flex items-center gap-3 text-sm"><span className="w-40 text-slate-600">{d}</span><span className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <span key={n} className={`w-7 h-6 rounded text-xs font-bold leading-6 text-center ${n === l ? LV[n] : "bg-slate-100 text-slate-300"}`}>{n}</span>)}</span></div>)}</div>
          <div className="mt-4 flex items-center gap-2"><span className="px-3 py-1.5 rounded-lg bg-cgh-blue text-white text-xs font-bold">Copy note for clinical document</span><span className="text-xs text-slate-400">EQ-5D-5L profile 21231 · England 2018 value set</span></div>
        </div>
      </div>
    </section>

    <section className="grid md:grid-cols-3 gap-4 py-6">
      {[["Patient or caregiver", "Gets an SMS 7 and 3 days before the visit, answers five EQ-5D-5L questions plus pain, and sees their own progress charts. A son or daughter can answer on a parent's behalf."], ["Physiotherapist", "Today's list shows who has submitted, the profile, score and pain, and whether each changed by more than the minimal clinically important difference. One click copies the note into the clinical document."], ["Doctor and HOD", "Doctors refer with diagnosis, body region and the assigned therapist. The head of department sees the whole service: outcomes by region, workload by therapist, today's clinic across the department."]].map(([t, b]) => <div key={t} className="bg-white rounded-2xl shadow-card p-5"><div className="font-bold text-cgh-ink">{t}</div><p className="text-sm text-slate-600 mt-2 leading-relaxed">{b}</p></div>)}
    </section>

    <section className="py-6"><h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 mb-3">Demo accounts · password <code className="bg-slate-100 rounded px-1.5 py-0.5 text-cgh-ink normal-case tracking-normal">{DEMO_PASSWORD}</code></h2>
      <div className="grid md:grid-cols-2 gap-4">{groups.map(([g, rows]) => <div key={g} className="bg-white rounded-2xl shadow-card p-5"><div className="font-bold text-cgh-ink mb-2">{g}</div>{rows.map(([r, id]) => <div key={id} className="flex items-center justify-between py-2 border-t border-slate-100 text-sm"><span className="text-slate-600">{r}</span><code className="font-mono font-bold text-cgh-blue">{id}</code></div>)}</div>)}</div>
    </section>
  </div>;
}
