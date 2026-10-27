"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, one } from "@/lib/db";
import { hashPassword, login, logout, session, setActingPatient } from "@/lib/auth";
import { HOME } from "@/lib/roles";
import { indexValue, regionFromDiagnosis, type Dim } from "@/lib/eq5d";
import { dispatchDue, notifyApp, scheduleReminders } from "@/lib/notify";
import { linkAccepted, requestLink, respondLink } from "@/lib/care";


export async function loginAction(_: unknown, fd: FormData) {
  const u = await login(String(fd.get("login_id") ?? ""), String(fd.get("password") ?? ""));
  if (!u) return { error: "Wrong NRIC / staff ID or password." };
  redirect(HOME[u.role]);
}

export async function logoutAction() { await logout(); redirect("/"); }

export async function registerAction(_: unknown, fd: FormData) {
  const role = String(fd.get("role")) === "caregiver" ? "caregiver" : "patient";
  const nric = String(fd.get("nric") ?? "").trim().toUpperCase();
  const pw = String(fd.get("password") ?? "");
  if (!/^[STFGM]\d{7}[A-Z]$/.test(nric)) return { error: "NRIC must look like S1234567A." };
  if (pw.length < 6) return { error: "Password needs at least 6 characters." };
  const q = await db();
  if (await one("SELECT 1 FROM users WHERE login_id = $1", [nric])) return { error: "This NRIC is already registered. Please log in." };
  const [u] = await q(`INSERT INTO users(role, login_id, password_hash, name, phone, gender, birthday, address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [role, nric, hashPassword(pw), String(fd.get("name")), String(fd.get("phone") || ""), String(fd.get("gender") || ""), String(fd.get("birthday") || "") || null, String(fd.get("address") || "")]);
  if (role === "caregiver") {
    const parent = await one<{ id: number }>("SELECT id FROM users WHERE login_id = $1 AND role = 'patient'", [String(fd.get("parent_nric") ?? "").trim().toUpperCase()]);
    if (!parent) return { error: "Registered, but the patient NRIC was not found. Log in and link your parent from your page." };
    await requestLink(q, { id: u.id as number, name: String(fd.get("name")) }, parent.id, String(fd.get("relationship") || "child"));
  }
  await login(nric, pw);
  redirect(HOME[role]);
}

export async function linkParentAction(_: unknown, fd: FormData) {
  const s = await session(); if (!s || s.user.role !== "caregiver") return { error: "Not allowed" };
  const parent = await one<{ id: number; name: string }>("SELECT id, name FROM users WHERE login_id = $1 AND role = 'patient'", [String(fd.get("parent_nric") ?? "").trim().toUpperCase()]);
  if (!parent) return { error: "No patient with that NRIC." };
  const q = await db();
  const link = await requestLink(q, { id: s.user.id, name: s.user.name }, parent.id, String(fd.get("relationship") || "child"));
  revalidatePath("/caregiver");
  return { ok: link.status === "accepted" ? `Already linked to ${parent.name}` : `Request sent. ${parent.name} has to allow it first.` };
}

export async function actAsAction(fd: FormData) {
  const s = await session(); if (!s || s.user.role !== "caregiver") return;
  const pid = Number(fd.get("patient_id"));
  if (!(await linkAccepted(s.user.id, pid))) redirect("/caregiver");
  await setActingPatient(pid);
  const appt = fd.get("appt");
  redirect(appt ? `/survey?appt=${appt}` : "/patient");
}

export async function submitSurveyAction(_: unknown, fd: FormData) {
  const s = await session(); if (!s) return { error: "Please log in." };
  const patientId = s.user.role === "caregiver" ? s.actingPatientId : s.user.id;
  if (!patientId || !["patient", "caregiver"].includes(s.user.role)) return { error: "Not allowed." };
  if (s.user.role === "caregiver" && !(await linkAccepted(s.user.id, patientId))) return { error: "Your parent has not allowed you to help yet." };
  const lv = {} as Record<Dim, number>;
  for (const d of ["mo", "sc", "ua", "pd", "ad"] as Dim[]) { lv[d] = Number(fd.get(d)); if (!(lv[d] >= 1 && lv[d] <= 5)) return { error: "Please answer every question." }; }
  const vas = Number(fd.get("eq_vas")), pain = Number(fd.get("pain"));
  if (!(pain >= 0 && pain <= 10)) return { error: "Please rate your pain." };
  const apptId = Number(fd.get("appt")) || null;
  const q = await db();
  if (apptId) {
    const a = await one("SELECT 1 FROM appointments WHERE id = $1 AND patient_id = $2", [apptId, patientId]);
    if (!a) return { error: "Appointment not found." };
    if (await one("SELECT 1 FROM surveys WHERE appointment_id = $1", [apptId])) return { error: "Already submitted for this appointment." };
  }
  await q(`INSERT INTO surveys(appointment_id, patient_id, filled_by, mo, sc, ua, pd, ad, eq_vas, pain, index_value) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [apptId, patientId, s.user.id, lv.mo, lv.sc, lv.ua, lv.pd, lv.ad, vas, pain, indexValue(lv)]);
  if (apptId) {
    const a = await one<{ physio_id: number | null }>("SELECT physio_id FROM appointments WHERE id = $1", [apptId]);
    if (a?.physio_id) await notifyApp(q, a.physio_id, "survey", `A patient submitted their pre-visit questionnaire.`, apptId);
  }
  revalidatePath("/patient");
  redirect("/patient?tab=progress&done=1");
}

export async function createReferralAction(_: unknown, fd: FormData) {
  const s = await session(); if (!s || s.user.role !== "doctor") return { error: "Doctors only." };
  const p = await one<{ id: number; name: string }>("SELECT id, name FROM users WHERE login_id = $1 AND role='patient'", [String(fd.get("nric") ?? "").trim().toUpperCase()]);
  if (!p) return { error: "No registered patient with that NRIC. Ask them to register first." };
  const dx = String(fd.get("diagnosis") ?? "").trim(); if (!dx) return { error: "Diagnosis is required." };
  const physio = Number(fd.get("physio_id")) || null;
  const q = await db();
  const [r] = await q(`INSERT INTO referrals(patient_id, doctor_id, physio_id, diagnosis, region, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [p.id, s.user.id, physio, dx, String(fd.get("region") || "") || regionFromDiagnosis(dx), String(fd.get("notes") || "")]);
  const first = String(fd.get("first_appt") || "");
  if (first) {
    const [a] = await q(`INSERT INTO appointments(referral_id, patient_id, physio_id, scheduled_at, kind) VALUES ($1,$2,$3,$4,'initial') RETURNING id`, [r.id, p.id, physio, new Date(first).toISOString()]);
    await scheduleReminders(q, a.id as number, p.id, new Date(first).toISOString());
  }
  await notifyApp(q, p.id, "referral", `Dr ${s.user.name} referred you to physiotherapy for: ${dx}.`);
  if (physio) await notifyApp(q, physio, "referral", `New referral: ${p.name} – ${dx}.`);
  revalidatePath("/doctor");
  return { ok: `Referral created for ${p.name}.` };
}

export async function createAppointmentAction(_: unknown, fd: FormData) {
  const s = await session(); if (!s || !["physio", "doctor", "hod"].includes(s.user.role)) return { error: "Staff only." };
  const referralId = Number(fd.get("referral_id")); const when = String(fd.get("scheduled_at") || "");
  if (!referralId || !when) return { error: "Pick a date and time." };
  const r = await one<{ id: number; patient_id: number; physio_id: number | null }>("SELECT id, patient_id, physio_id FROM referrals WHERE id = $1", [referralId]);
  if (!r) return { error: "Referral not found." };
  const q = await db();
  const n = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM appointments WHERE referral_id = $1", [referralId]);
  const [a] = await q(`INSERT INTO appointments(referral_id, patient_id, physio_id, scheduled_at, kind) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [referralId, r.patient_id, r.physio_id ?? (s.user.role === "physio" ? s.user.id : null), new Date(when).toISOString(), n && n.n > 0 ? "follow-up" : "initial"]);
  await scheduleReminders(q, a.id as number, r.patient_id, new Date(when).toISOString());
  revalidatePath(`/patients/${r.patient_id}`); revalidatePath("/physio");
  return { ok: "Appointment scheduled. SMS reminders queued for 7 and 3 days before." };
}

export async function dispatchSmsAction() {
  const s = await session(); if (!s || s.user.role === "patient" || s.user.role === "caregiver") return;
  await dispatchDue(await db());
  revalidatePath("/sms");
}

export async function markReadAction() {
  const s = await session(); if (!s) return;
  const q = await db(); await q("UPDATE notifications SET read_at = now() WHERE user_id = $1 AND channel='app' AND read_at IS NULL", [s.user.id]);
  revalidatePath("/patient");
}

export async function respondLinkAction(fd: FormData) {
  const s = await session(); if (!s || s.user.role !== "patient") return;
  await respondLink(Number(fd.get("link_id")), s.user.id, String(fd.get("accept")) === "1");
  revalidatePath("/patient");
  redirect("/patient?tab=notifications");
}
