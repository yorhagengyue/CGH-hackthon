// Caregiver ↔ patient links need the patient's consent. A link is 'pending' until the parent taps Allow.
import "server-only";
import { db, one } from "./db";
import { notifyApp } from "./notify";

type Q = (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

const possessive = (gender: string | null | undefined) => gender === "MALE" ? "his" : gender === "FEMALE" ? "her" : "their";

/** Create a pending link and ask the parent. Returns the link id (existing one if already there). */
export async function requestLink(q: Q, caregiver: { id: number; name: string }, parentId: number, relationship: string): Promise<{ id: number; status: string }> {
  const existing = await one<{ id: number; status: string }>("SELECT id, status FROM care_links WHERE caregiver_id = $1 AND patient_id = $2", [caregiver.id, parentId]);
  if (existing) return existing;
  const [row] = await q("INSERT INTO care_links(caregiver_id, patient_id, relationship, status) VALUES ($1,$2,$3,'pending') RETURNING id", [caregiver.id, parentId, relationship]);
  const id = row.id as number;
  await q(`INSERT INTO notifications(user_id, channel, kind, message, send_at, sent_at, link_id) VALUES ($1,'app','link_request',$2,now(),now(),$3)`,
    [parentId, `${caregiver.name} (your ${relationship}) asks to help with your questionnaires. Allow?`, id]);
  return { id, status: "pending" };
}

export async function linkAccepted(caregiverId: number, patientId: number): Promise<boolean> {
  return !!(await one("SELECT 1 FROM care_links WHERE caregiver_id = $1 AND patient_id = $2 AND status = 'accepted'", [caregiverId, patientId]));
}

export async function pendingRequests(patientId: number) {
  const q = await db();
  return q<{ id: number; caregiver_id: number; name: string; caregiver_name: string; relationship: string; created_at: string }>(
    `SELECT c.id, c.caregiver_id, u.name, u.name AS caregiver_name, c.relationship, c.created_at::text FROM care_links c JOIN users u ON u.id = c.caregiver_id WHERE c.patient_id = $1 AND c.status = 'pending' ORDER BY c.id`, [patientId]);
}

/** The parent answers. Only the patient the link points at may do this. */
export async function respondLink(linkId: number, patientId: number, accept: boolean): Promise<{ ok: boolean; caregiverName?: string }> {
  const q = await db();
  const link = await one<{ id: number; caregiver_id: number; status: string; name: string; pname: string; pgender: string | null }>(
    `SELECT c.id, c.caregiver_id, c.status, u.name, p.name AS pname, p.gender AS pgender FROM care_links c JOIN users u ON u.id = c.caregiver_id JOIN users p ON p.id = c.patient_id WHERE c.id = $1 AND c.patient_id = $2`, [linkId, patientId]);
  if (!link) return { ok: false };
  await q("UPDATE care_links SET status = $1, responded_at = now() WHERE id = $2", [accept ? "accepted" : "declined", linkId]);
  await q("UPDATE notifications SET read_at = now() WHERE link_id = $1 AND user_id = $2 AND read_at IS NULL", [linkId, patientId]);
  if (!accept) await q("UPDATE sessions SET acting_patient_id = NULL WHERE user_id = $1 AND acting_patient_id = $2", [link.caregiver_id, patientId]);
  await notifyApp(q, link.caregiver_id, accept ? "link_accepted" : "link_declined",
    accept ? `${link.pname} allowed you to help with ${possessive(link.pgender)} questionnaires.` : `${link.pname} did not allow you to help with ${possessive(link.pgender)} questionnaires.`);
  return { ok: true, caregiverName: link.name };
}

export type FamilyMember = { id: number; caregiver_id: number; name: string; relationship: string; status: string; created_at: string; responded_at: string | null };

/** All of a patient's family links: accepted first, then pending. */
export async function familyOf(patientId: number): Promise<FamilyMember[]> {
  const q = await db();
  return q<FamilyMember>(`SELECT c.id, c.caregiver_id, u.name, c.relationship, c.status, c.created_at::text, c.responded_at::text
    FROM care_links c JOIN users u ON u.id = c.caregiver_id WHERE c.patient_id = $1 AND c.status IN ('accepted','pending')
    ORDER BY (c.status = 'accepted') DESC, u.name`, [patientId]);
}

/** The patient adds a family member by NRIC. No approval needed because the patient initiates it. */
export async function addFamilyByPatient(patient: { id: number; name: string; gender: string | null }, nric: string, relationship: string): Promise<{ ok: true; name: string } | { error: string }> {
  const id = nric.trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[STFGM]\d{7}[A-Z]$/.test(id)) return { error: "NRIC must look like S1234567A." };
  const cg = await one<{ id: number; name: string; role: string }>("SELECT id, name, role FROM users WHERE login_id = $1", [id]);
  if (!cg) return { error: `Ask them to register with NRIC ${id} first, then add again.` };
  if (cg.role !== "caregiver") return { error: `${id} is registered as a ${cg.role}, not as a family member or caregiver.` };
  if (cg.id === patient.id) return { error: "That is your own NRIC." };
  const q = await db();
  await q(`INSERT INTO care_links(caregiver_id, patient_id, relationship, status, responded_at) VALUES ($1,$2,$3,'accepted',now())
    ON CONFLICT (caregiver_id, patient_id) DO UPDATE SET relationship = EXCLUDED.relationship, status = 'accepted', responded_at = now()`, [cg.id, patient.id, relationship]);
  await q("UPDATE notifications SET read_at = now() WHERE kind = 'link_request' AND user_id = $1 AND link_id IN (SELECT id FROM care_links WHERE caregiver_id = $2 AND patient_id = $1)", [patient.id, cg.id]);
  await notifyApp(q, cg.id, "link_accepted", `${patient.name} added you as ${possessive(patient.gender)} ${relationship}. You can now see ${possessive(patient.gender)} answers and fill in questionnaires for ${patient.gender === "MALE" ? "him" : patient.gender === "FEMALE" ? "her" : "them"}.`);
  return { ok: true, name: cg.name };
}

/** The patient removes a family member (or withdraws a pending request). */
export async function removeFamily(patientId: number, linkId: number): Promise<boolean> {
  const q = await db();
  const link = await one<{ caregiver_id: number; pname: string }>("SELECT c.caregiver_id, p.name AS pname FROM care_links c JOIN users p ON p.id = c.patient_id WHERE c.id = $1 AND c.patient_id = $2", [linkId, patientId]);
  if (!link) return false;
  await q("DELETE FROM notifications WHERE link_id = $1", [linkId]);
  await q("DELETE FROM care_links WHERE id = $1", [linkId]);
  await q("UPDATE sessions SET acting_patient_id = NULL WHERE user_id = $1 AND acting_patient_id = $2", [link.caregiver_id, patientId]);
  await notifyApp(q, link.caregiver_id, "link_removed", `${link.pname} removed you from their family list.`);
  return true;
}
