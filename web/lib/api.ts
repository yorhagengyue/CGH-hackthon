// Shared helpers for the JSON API used by the iOS client (app/api/v1/**).
// Same `sessions` table and token format as the cookie-based web session, so one account works on both clients.
import "server-only";
import { randomBytes } from "node:crypto";
import { db, one } from "./db";
import { checkPassword, type Role, type Session, type User } from "./auth";
import { clinicalNote, flagsFor, patientBundle, type Survey } from "./data";

export const json = (data: unknown, status = 200) => Response.json(normalize(data), { status });
export const error = (message: string, status = 400) => Response.json({ error: message }, { status });
export const unauthorized = () => error("Please log in again.", 401);
export const forbidden = () => error("Not allowed.", 403);

/** Resolve `Authorization: Bearer <token>` against `sessions`, exactly like `session()` does with the cookie. */
export async function apiSession(req: Request): Promise<Session | null> {
  const t = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!t) return null;
  const row = await one<User & { acting_patient_id: number | null }>(
    `SELECT u.id, u.role, u.login_id, u.name, u.phone, u.gender, u.birthday::text AS birthday, u.address, s.acting_patient_id
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1`, [t]);
  if (!row) return null;
  const { acting_patient_id, ...user } = row;
  return { user, actingPatientId: acting_patient_id };
}

export async function requireApi(req: Request, ...roles: Role[]): Promise<Session | Response> {
  const s = await apiSession(req);
  if (!s) return unauthorized();
  if (roles.length && !roles.includes(s.user.role)) return forbidden();
  return s;
}
export const isResponse = (x: unknown): x is Response => x instanceof Response;

export const bearer = (req: Request) => req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try { return (await req.json()) as T; } catch { return {} as T; }
}

/** Password check + new session row; returns the token the client must send as Bearer. */
export async function apiLogin(login_id: string, password: string): Promise<{ token: string; user: User } | null> {
  const u = await one<User & { password_hash: string }>(
    "SELECT id, role, login_id, name, phone, gender, birthday::text AS birthday, address, password_hash FROM users WHERE login_id = $1", [login_id.trim().toUpperCase()]);
  if (!u || !checkPassword(password, u.password_hash)) return null;
  const q = await db();
  const token = randomBytes(24).toString("base64url");
  await q("INSERT INTO sessions(token, user_id) VALUES ($1, $2)", [token, u.id]);
  const { password_hash: _ph, ...user } = u;
  return { token, user };
}

/** The patient a session is looking at: own id for patients, the acting parent for caregivers. */
export function viewedPatientId(s: Session): number | null {
  if (s.user.role === "patient") return s.user.id;
  if (s.user.role === "caregiver") return s.actingPatientId;
  return null;
}

/** patientBundle + the derived numbers every client screen needs, so iOS never recomputes clinical values. */
export async function patientDetail(patientId: number, staff: boolean) {
  const b = await patientBundle(patientId);
  if (!b) return null;
  const cur: Survey | null = b.surveys.at(-1) ?? null, prev: Survey | null = b.surveys.at(-2) ?? null, first: Survey | null = b.surveys[0] ?? null;
  return {
    ...b,
    patient: { ...b.patient, masked_id: mask(b.patient.login_id), age: age(b.patient.birthday) },
    latest: cur, previous: prev, flags: flagsFor(cur, prev),
    clinical_note: staff && cur ? clinicalNote(b.patient, b.referrals[0]?.diagnosis, cur, prev, first) : null,
  };
}

/** Caregivers may only see a parent who has accepted the link. Returns a 403 Response when not. */
export async function requireViewedPatient(s: Session): Promise<number | Response> {
  const pid = viewedPatientId(s);
  if (!pid) return error("Choose which parent you are helping first.", 409);
  if (s.user.role === "caregiver" && !(await one("SELECT 1 FROM care_links WHERE caregiver_id = $1 AND patient_id = $2 AND status = 'accepted'", [s.user.id, pid])))
    return Response.json({ error: "Waiting for approval", message: "Waiting for approval", status: "pending" }, { status: 403 });
  return pid;
}

export const mask = (id: string) => `${id.slice(0, 1)}****${id.slice(-4)}`;
export const age = (b: string | null | undefined) => b ? Math.floor((Date.now() - new Date(b).getTime()) / 31557600000) : null;

/** Postgres `::text` timestamps ("2026-10-27 06:00:00+00") → ISO 8601 so Swift's JSONDecoder can parse them. */
const TS = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/;
function normalize(v: unknown): unknown {
  if (v == null) return v;
  if (typeof v === "string") return TS.test(v) ? new Date(v).toISOString() : v;
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(normalize);
  if (typeof v === "object") { const o: Record<string, unknown> = {}; for (const [k, x] of Object.entries(v as object)) o[k] = normalize(x); return o; }
  return v;
}
