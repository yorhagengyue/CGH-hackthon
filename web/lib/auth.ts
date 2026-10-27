import "server-only";
import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db, one } from "./db";

export type Role = "patient" | "caregiver" | "doctor" | "physio" | "hod";
export type User = { id: number; role: Role; login_id: string; name: string; phone: string | null; gender: string | null; birthday: string | null; address: string | null };
export type Session = { user: User; actingPatientId: number | null };

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 32).toString("hex")}`;
}
export function checkPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const h = scryptSync(pw, salt, 32);
  return timingSafeEqual(h, Buffer.from(hash, "hex"));
}

export const COOKIE = "cgh_session";

export async function login(login_id: string, password: string): Promise<User | null> {
  const u = await one<User & { password_hash: string }>("SELECT * FROM users WHERE login_id = $1", [login_id.trim().toUpperCase()]);
  if (!u || !checkPassword(password.trim(), u.password_hash)) return null;
  const q = await db();
  const token = randomBytes(24).toString("base64url");
  await q("INSERT INTO sessions(token, user_id) VALUES ($1, $2)", [token, u.id]);
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  const { password_hash: _ph, ...user } = u;
  return user;
}

export async function logout() {
  const c = await cookies();
  const t = c.get(COOKIE)?.value;
  if (t) { const q = await db(); await q("DELETE FROM sessions WHERE token = $1", [t]); }
  c.delete(COOKIE);
}

export async function session(): Promise<Session | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  const row = await one<User & { acting_patient_id: number | null }>(
    `SELECT u.id, u.role, u.login_id, u.name, u.phone, u.gender, u.birthday::text AS birthday, u.address, s.acting_patient_id
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1`, [t]);
  if (!row) return null;
  const { acting_patient_id, ...user } = row;
  return { user, actingPatientId: acting_patient_id };
}

export async function requireRole(...roles: Role[]): Promise<Session> {
  const s = await session();
  if (!s || !roles.includes(s.user.role)) throw new Response("Forbidden", { status: 403 });
  return s;
}

export async function setActingPatient(patientId: number | null) {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return;
  const q = await db();
  await q("UPDATE sessions SET acting_patient_id = $1 WHERE token = $2", [patientId, t]);
}
