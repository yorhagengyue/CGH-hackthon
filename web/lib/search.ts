// Patient search for clinicians: NRIC, diagnosis code or keyword, body region, age, months post-op.
import "server-only";
import { db } from "./db";
import { flagsFor, type Survey } from "./data";
import { verdict, type Verdict } from "./plain";

export type SearchParams = { q?: string; region?: string; diagnosis?: string; min_age?: number | null; max_age?: number | null; postop_min_months?: number | null; postop_max_months?: number | null; postop_none?: boolean; scope: "mine" | "all"; physioId?: number | null };
export type SearchRow = { id: number; name: string; login_id_masked: string; age: number | null; gender: string | null; diagnosis: string; region: string; physio_name: string | null; surgery_date: string | null; months_post_op: number | null; last_prom_at: string | null; n_proms: number; verdict: Verdict; flagged: boolean; flag_reason: string | null };

export const REGIONS = ["Knee", "Shoulder", "Lower back", "Neck", "Hip", "Ankle / foot", "Hand / wrist", "Elbow", "Other"];
export const hasFilters = (p: Partial<SearchParams>) => !!(p.q?.trim() || p.region || p.diagnosis || p.min_age != null || p.max_age != null || p.postop_min_months != null || p.postop_max_months != null || p.postop_none);

/** Shared predicates; r is the latest referral. Export may include un-referred patients when unfiltered. */
export function patientSearchWhere(p: SearchParams, requireReferral = true) {
  const where: string[] = ["u.role = 'patient'"]; const args: unknown[] = [];
  const add = (v: unknown) => { args.push(v); return `$${args.length}`; };
  if (requireReferral) where.push("r.id IS NOT NULL");
  const term = (p.q ?? "").trim();
  if (term) {
    const nric = add(term.toUpperCase().replace(/\s+/g, "")), like = add(`%${term}%`);
    const code = /^\d+$/.test(term) ? add(`${term}%`) : null;
    where.push(`(u.login_id = ${nric} OR r.diagnosis ILIKE ${like} OR r.region ILIKE ${like} OR u.name ILIKE ${like}${code ? ` OR r.diagnosis LIKE ${code}` : ""})`);
  }
  if (p.region) where.push(`r.region = ${add(p.region)}`);
  if (p.diagnosis) { const d = p.diagnosis.trim(); const like = add(`%${d}%`); const code = /^\d+$/.test(d) ? add(`${d}%`) : null;
    where.push(`(r.diagnosis ILIKE ${like} OR r.region ILIKE ${like}${code ? ` OR r.diagnosis LIKE ${code}` : ""})`); }
  if (p.min_age != null) where.push(`u.birthday <= (now() - (${add(p.min_age)} || ' years')::interval)`);
  if (p.max_age != null) where.push(`u.birthday > (now() - (${add(p.max_age + 1)} || ' years')::interval)`);
  if (p.postop_min_months != null) where.push(`r.surgery_date IS NOT NULL AND r.surgery_date <= (now() - (${add(p.postop_min_months)} || ' months')::interval)`);
  if (p.postop_max_months != null) where.push(`r.surgery_date IS NOT NULL AND r.surgery_date > (now() - (${add(p.postop_max_months)} || ' months')::interval)`);
  if (p.postop_none) where.push("r.surgery_date IS NULL");
  if (p.scope === "mine") where.push(`r.physio_id = ${add(p.physioId ?? -1)}`);
  return { where, args };
}

export async function searchPatients(p: SearchParams): Promise<SearchRow[]> {
  const q = await db();
  const { where, args } = patientSearchWhere(p);
  const rows = await q<{ id: number; name: string; login_id: string; birthday: string | null; gender: string | null; diagnosis: string; region: string; physio_name: string | null; surgery_date: string | null; last_prom_at: string | null; n_proms: number }>(
    `SELECT u.id, u.name, u.login_id, u.birthday::text AS birthday, u.gender, r.diagnosis, r.region, ph.name AS physio_name, r.surgery_date::text AS surgery_date,
            (SELECT MAX(s.submitted_at)::text FROM surveys s WHERE s.patient_id = u.id) AS last_prom_at, (SELECT COUNT(*)::int FROM surveys s WHERE s.patient_id = u.id) AS n_proms
     FROM users u LEFT JOIN LATERAL (SELECT * FROM referrals r WHERE r.patient_id = u.id ORDER BY r.created_at DESC LIMIT 1) r ON true LEFT JOIN users ph ON ph.id = r.physio_id
     WHERE ${where.join(" AND ")} ORDER BY u.name LIMIT 200`, args);
  if (!rows.length) return [];
  const last = await q<Survey & { patient_id: number; rn: number }>(
    `SELECT * FROM (SELECT s.*, s.submitted_at::text AS submitted_at, '' AS filled_by_name, ROW_NUMBER() OVER (PARTITION BY s.patient_id ORDER BY s.submitted_at DESC) AS rn FROM surveys s WHERE s.patient_id = ANY($1)) t WHERE rn <= 2`, [rows.map((r) => r.id)]);
  const by = new Map<number, Survey[]>();
  for (const s of last) { const a = by.get(s.patient_id) ?? []; a[s.rn - 1] = s; by.set(s.patient_id, a); }
  const now = Date.now();
  return rows.map((r) => {
    const pair = by.get(r.id) ?? []; const cur = pair[0] ?? null, prev = pair[1] ?? null;
    const months = r.surgery_date ? Math.floor((now - new Date(r.surgery_date).getTime()) / (30.44 * 86400000)) : null;
    return { id: r.id, name: r.name, login_id_masked: `${r.login_id.slice(0, 1)}****${r.login_id.slice(-4)}`, age: r.birthday ? Math.floor((now - new Date(r.birthday).getTime()) / 31557600000) : null,
      gender: r.gender, diagnosis: r.diagnosis, region: r.region, physio_name: r.physio_name, surgery_date: r.surgery_date, months_post_op: months, last_prom_at: r.last_prom_at, n_proms: r.n_proms,
      verdict: cur ? verdict(cur, prev) : "first" as Verdict, flagged: !!cur?.flagged, flag_reason: cur?.flag_reason ?? null, _flags: cur ? flagsFor(cur, prev) : null } as SearchRow;
  });
}

/** Parse the shared query-string shape used by the pages and the API. */
export function parseSearch(sp: Record<string, string | undefined>, scope: "mine" | "all", physioId?: number | null): SearchParams {
  const num = (v: string | undefined) => v != null && v !== "" && !isNaN(Number(v)) ? Number(v) : null;
  const postop = sp.postop ?? "";
  const [pmin, pmax] = postop === "0-3" ? [0, 3] : postop === "3-6" ? [3, 6] : postop === "6-12" ? [6, 12] : postop === "12+" ? [12, null] : [null, null];
  return { q: sp.q ?? "", region: sp.region || undefined, diagnosis: sp.diagnosis || undefined, min_age: num(sp.min_age), max_age: num(sp.max_age), postop_min_months: num(sp.postop_min_months) ?? num(sp.postop_min) ?? pmin, postop_max_months: num(sp.postop_max_months) ?? num(sp.postop_max) ?? pmax, postop_none: postop === "none", scope, physioId };
}

/** Distinct diagnoses in the data, most common first, grouped by body region, for the Diagnosis dropdown. */
export async function diagnosisOptions(): Promise<{ region: string; items: { name: string; n: number }[] }[]> {
  const q = await db();
  const rows = await q<{ region: string; diagnosis: string; n: number }>("SELECT region, diagnosis, COUNT(*)::int AS n FROM referrals GROUP BY region, diagnosis ORDER BY n DESC, diagnosis");
  const by = new Map<string, { name: string; n: number }[]>();
  for (const r of rows) { const name = r.diagnosis.replace(/^\s*\d+\s*:\s*/, "").trim(); const a = by.get(r.region) ?? []; if (!a.some((x) => x.name === name)) a.push({ name, n: r.n }); else a.find((x) => x.name === name)!.n += r.n; by.set(r.region, a); }
  return [...by.entries()].map(([region, items]) => ({ region, items, total: items.reduce((t, x) => t + x.n, 0) })).sort((a, b) => b.total - a.total).map(({ region, items }) => ({ region, items }));
}
