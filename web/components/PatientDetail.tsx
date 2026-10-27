import { clinicalNote, levels, profileStr, patientBundle, flagsFor } from "@/lib/data";
import { DIMS, DIM_LABEL, LEVEL_LABEL } from "@/lib/eq5d";
import { Arrow, Card, LV_BG, Pill, ProfileBadge, Stat, TrendChart, age, fmtD, fmtDT, startOfTodaySG } from "./ui";
import { CopyButton } from "./CopyButton";
import { ActionForm, Field, inputCls } from "./Form";
import { createAppointmentAction } from "@/app/actions";

const dLabel = (iso: string) => new Date(iso).toLocaleDateString("en-SG", { day: "numeric", month: "short", timeZone: "Asia/Singapore" });

/** Full patient view. `staff` adds the clinical note + scheduling; `self` hides identifiers the patient already knows. */
export async function PatientDetail({ patientId, staff = false, self = false }: { patientId: number; staff?: boolean; self?: boolean }) {
  const b = await patientBundle(patientId);
  if (!b) return <p>Patient not found.</p>;
  const { patient, referrals, appointments, surveys, caregivers } = b;
  const cur = surveys.at(-1) ?? null, prev = surveys.at(-2) ?? null, first = surveys[0] ?? null;
  const fl = flagsFor(cur, prev);
  const upcoming = appointments.filter((a) => a.status === "scheduled" && new Date(a.scheduled_at) >= startOfTodaySG());
  return <div className="grid lg:grid-cols-[1fr_420px] gap-4">
    <div className="space-y-4">
      <Card title={self ? "My progress" : "Patient"} right={staff ? `${referrals.length} referral(s) · ${surveys.length} PROMs` : ""}>
        {!self && <div className="mb-3"><div className="text-lg font-bold">{patient.name}</div><div className="text-slate-600 text-sm">{patient.login_id.slice(0, 1)}****{patient.login_id.slice(-4)} · {patient.gender ?? "-"} · {age(patient.birthday) ?? "-"} y · {patient.phone ?? "no phone"}{caregivers.length > 0 && <> · caregivers: {caregivers.map((c) => `${c.name} (${c.relationship})`).join(", ")}</>}</div></div>}
        {cur ? <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat value={cur.pain} unit="/10" label={<>Pain {prev && `(was ${prev.pain})`}</>} arrow={fl.pain} />
            <Stat value={cur.index_value.toFixed(3)} label={<>EQ-5D index {prev && `(was ${prev.index_value.toFixed(3)})`}</>} arrow={fl.index} />
            <Stat value={cur.eq_vas} label={<>EQ-VAS {prev && `(was ${prev.eq_vas})`}</>} arrow={fl.vas} />
          </div>
          <table className="tbl mb-2"><thead><tr><th>Dimension</th><th>Latest · {fmtD(cur.submitted_at)}</th><th>{prev ? <>Previous · {fmtD(prev.submitted_at)}</> : "Previous"}</th></tr></thead><tbody>
            {DIMS.map((d) => <tr key={d} ><td>{DIM_LABEL[d]}</td><td><span className={`inline-block w-6 text-center rounded font-bold ${LV_BG[cur[d]]}`}>{cur[d]}</span> <span className="text-slate-500">{LEVEL_LABEL[cur[d]]}</span></td><td>{prev ? <span className={`inline-block w-6 text-center rounded font-bold ${LV_BG[prev[d]]}`}>{prev[d]}</span> : "—"}</td></tr>)}
          </tbody></table>
        </> : <p className="text-slate-500 text-sm">No questionnaire submitted yet.</p>}
        <div className="grid md:grid-cols-3 gap-3">
          <TrendChart points={surveys.map((s) => ({ x: dLabel(s.submitted_at), y: s.index_value }))} max={1} min={0} label="EQ-5D-5L index (0–1)" fmt={(v) => v.toFixed(2)} />
          <TrendChart points={surveys.map((s) => ({ x: dLabel(s.submitted_at), y: s.eq_vas }))} max={100} min={0} color="#28a8e0" label="EQ-VAS (0–100)" />
          <TrendChart points={surveys.map((s) => ({ x: dLabel(s.submitted_at), y: s.pain }))} max={10} min={0} color="#b91c1c" label="Pain (0–10)" />
        </div>
        {staff && cur && <div className="mt-3 flex gap-2 items-start"><CopyButton text={clinicalNote(patient, referrals[0]?.diagnosis, cur, prev, first)} /><details className="text-xs"><summary className="cursor-pointer text-slate-500 py-1.5">preview note</summary><pre className="bg-cgh-ink text-slate-100 p-3 rounded-lg whitespace-pre-wrap">{clinicalNote(patient, referrals[0]?.diagnosis, cur, prev, first)}</pre></details></div>}
      </Card>
      <Card title={self ? "My previous answers" : "All questionnaires"}>
        <table className="tbl"><thead><tr><th>Submitted</th><th>Profile</th><th>Index</th><th>EQ-VAS</th><th>Pain</th><th>Filled by</th></tr></thead><tbody>
          {[...surveys].reverse().map((s) => <tr key={s.id} ><td>{fmtDT(s.submitted_at)}</td><td><ProfileBadge s={levels(s)} /></td><td>{s.index_value.toFixed(3)}</td><td>{s.eq_vas}</td><td>{s.pain}/10</td><td className="text-slate-500">{s.filled_by_name}</td></tr>)}
          {surveys.length === 0 && <tr><td colSpan={6} className="text-slate-400 py-2">None yet</td></tr>}
        </tbody></table>
      </Card>
    </div>
    <div className="space-y-4">
      <Card title="Referrals">{referrals.map((r) => <div key={r.id} className="text-sm border-b border-slate-100 last:border-0 py-2"><div className="font-semibold">{r.diagnosis}</div><div className="text-slate-600">{r.region} · by {r.doctor_name} · {fmtD(r.created_at)}</div><div className="text-slate-600">Physio: {r.physio_name ?? <span className="text-warn">unassigned</span>} · <Pill ok={r.status === "active"}>{r.status}</Pill></div>{r.notes && <div className="text-slate-500 text-xs mt-1">{r.notes}</div>}</div>)}{referrals.length === 0 && <p className="text-slate-400 text-sm">No referral yet.</p>}</Card>
      <Card title="Appointments">
        {appointments.length === 0 && <p className="text-slate-400 text-sm">None.</p>}
        {[...appointments].reverse().map((a) => <div key={a.id} className="flex items-center gap-2 text-sm border-b border-slate-100 last:border-0 py-2"><div className="flex-1"><div>{fmtDT(a.scheduled_at)} <span className="text-slate-500">· {a.kind}</span></div><div className="text-slate-500 text-xs">{a.physio_name ?? "physio TBC"}</div></div>{a.status === "scheduled" ? <Pill ok={!!a.survey_id}>{a.survey_id ? "PROM submitted" : "PROM pending"}</Pill> : <span className="text-xs text-slate-400">{a.status}</span>}{self && a.status === "scheduled" && !a.survey_id && <a href={`/survey?appt=${a.id}`} className="px-2 py-1 rounded bg-cgh-blue text-white text-xs">Fill now</a>}</div>)}
        {staff && referrals[0] && <ActionForm action={createAppointmentAction} submit="Schedule" className="mt-3 border-t border-slate-200 pt-3"><input type="hidden" name="referral_id" value={referrals[0].id} /><Field label="Next appointment (SMS reminders go out 7 and 3 days before)"><input type="datetime-local" name="scheduled_at" className={inputCls} required /></Field></ActionForm>}
        {self && upcoming.length === 0 && <p className="text-xs text-slate-500 mt-2">No upcoming appointment.</p>}
      </Card>
    </div>
  </div>;
}
