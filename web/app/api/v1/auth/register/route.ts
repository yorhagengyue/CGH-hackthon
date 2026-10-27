// Same validation as registerAction in app/actions.ts, but returns {token, user} instead of setting a cookie.
import { db, one } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { apiLogin, body, error, json } from "@/lib/api";
type Body = { role?: string; nric?: string; password?: string; name?: string; phone?: string; gender?: string; birthday?: string; address?: string; parent_nric?: string; relationship?: string };
export async function POST(req: Request) {
  const b = await body<Body>(req);
  const role = b.role === "caregiver" ? "caregiver" : "patient";
  const nric = String(b.nric ?? "").trim().toUpperCase();
  const pw = String(b.password ?? "");
  if (!/^[STFGM]\d{7}[A-Z]$/.test(nric)) return error("NRIC must look like S1234567A.");
  if (pw.length < 6) return error("Password needs at least 6 characters.");
  if (!String(b.name ?? "").trim()) return error("Please enter your name.");
  const q = await db();
  if (await one("SELECT 1 FROM users WHERE login_id = $1", [nric])) return error("This NRIC is already registered. Please log in.", 409);
  const [u] = await q(`INSERT INTO users(role, login_id, password_hash, name, phone, gender, birthday, address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [role, nric, hashPassword(pw), String(b.name).trim(), String(b.phone || ""), String(b.gender || ""), String(b.birthday || "") || null, String(b.address || "")]);
  let warning: string | null = null;
  if (role === "caregiver") {
    const parent = await one<{ id: number }>("SELECT id FROM users WHERE login_id = $1 AND role = 'patient'", [String(b.parent_nric ?? "").trim().toUpperCase()]);
    if (parent) await q("INSERT INTO care_links(caregiver_id, patient_id, relationship) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [u.id, parent.id, String(b.relationship || "child")]);
    else warning = "Registered, but the patient NRIC was not found. You can link your parent later.";
  }
  const r = await apiLogin(nric, pw);
  return json({ token: r!.token, user: r!.user, acting_patient_id: null, warning }, 201);
}
