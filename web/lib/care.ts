// Caregiver ↔ patient links need the patient's consent. A link is 'pending' until the parent taps Allow.
import "server-only";
import { db, one } from "./db";
import { notifyApp } from "./notify";

type Q = (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

const pronoun = (rel: string) => /daughter|mother|wife|grandmother|sister/i.test(rel) ? "she" : /son|father|husband|grandson|brother/i.test(rel) ? "he" : "they";
const possessive = (gender: string | null | undefined) => gender === "MALE" ? "his" : gender === "FEMALE" ? "her" : "their";

/** Create a pending link and ask the parent. Returns the link id (existing one if already there). */
export async function requestLink(q: Q, caregiver: { id: number; name: string }, parentId: number, relationship: string): Promise<{ id: number; status: string }> {
  const existing = await one<{ id: number; status: string }>("SELECT id, status FROM care_links WHERE caregiver_id = $1 AND patient_id = $2", [caregiver.id, parentId]);
  if (existing) return existing;
  const [row] = await q("INSERT INTO care_links(caregiver_id, patient_id, relationship, status) VALUES ($1,$2,$3,'pending') RETURNING id", [caregiver.id, parentId, relationship]);
  const id = row.id as number;
  const verb = pronoun(relationship) === "they" ? "says they are" : `says ${pronoun(relationship)} is`;
  await q(`INSERT INTO notifications(user_id, channel, kind, message, send_at, sent_at, link_id) VALUES ($1,'app','link_request',$2,now(),now(),$3)`,
    [parentId, `${caregiver.name} ${verb} your ${relationship} and wants to help with your questionnaires. Allow?`, id]);
  return { id, status: "pending" };
}

export async function linkAccepted(caregiverId: number, patientId: number): Promise<boolean> {
  return !!(await one("SELECT 1 FROM care_links WHERE caregiver_id = $1 AND patient_id = $2 AND status = 'accepted'", [caregiverId, patientId]));
}

export async function pendingRequests(patientId: number) {
  const q = await db();
  return q<{ id: number; caregiver_id: number; name: string; relationship: string; created: string }>(
    `SELECT c.id, c.caregiver_id, u.name, c.relationship FROM care_links c JOIN users u ON u.id = c.caregiver_id WHERE c.patient_id = $1 AND c.status = 'pending' ORDER BY c.id`, [patientId]);
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
