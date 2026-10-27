import "server-only";
import { db } from "./db";
import { hasFilters, patientSearchWhere, type SearchParams } from "./search";
import { csv } from "./csv";

// Explicit allowlist: no full NRIC, contact details, free-text notes or caregiver identities.
export const EXPORT_COLUMNS = [
  "patient_id", "patient_name", "masked_nric", "age_years", "gender", "record_type",
  "referral_id", "diagnosis", "body_region", "referral_status", "referral_created_at_utc", "surgery_date", "physiotherapist",
  "appointment_id", "appointment_at_utc", "appointment_kind", "appointment_status",
  "survey_id", "submitted_at_utc", "respondent_role", "eq5d_mobility", "eq5d_self_care", "eq5d_usual_activities",
  "eq5d_pain_discomfort", "eq5d_anxiety_depression", "eq_vas", "pain_score", "eq5d_index",
] as const;

export async function exportPatients(params: SearchParams) {
  const q = await db();
  const { where, args } = patientSearchWhere(params, hasFilters(params));
  // Select the cohort once, without the search screen's 200-row display limit.
  // Separate record types avoid multiplying appointments by questionnaires/referrals.
  const rows = await q(`WITH cohort AS (
    SELECT u.id, u.name, substring(u.login_id, 1, 1) || '****' || right(u.login_id, 4) AS masked_nric,
      CASE WHEN u.birthday IS NULL THEN NULL ELSE extract(year FROM age(current_date, u.birthday))::int END AS age_years, u.gender
    FROM users u LEFT JOIN LATERAL
      (SELECT * FROM referrals WHERE patient_id = u.id ORDER BY created_at DESC LIMIT 1) r ON true
    WHERE ${where.join(" AND ")}
  ), records AS (
    SELECT c.id AS patient_id, 'patient'::text AS record_type, NULL::int AS referral_id,
      NULL::text AS diagnosis, NULL::text AS body_region, NULL::text AS referral_status,
      NULL::text AS referral_created_at_utc, NULL::text AS surgery_date, NULL::text AS physiotherapist,
      NULL::int AS appointment_id, NULL::text AS appointment_at_utc, NULL::text AS appointment_kind, NULL::text AS appointment_status,
      NULL::int AS survey_id, NULL::text AS submitted_at_utc, NULL::text AS respondent_role,
      NULL::int AS eq5d_mobility, NULL::int AS eq5d_self_care, NULL::int AS eq5d_usual_activities,
      NULL::int AS eq5d_pain_discomfort, NULL::int AS eq5d_anxiety_depression, NULL::int AS eq_vas,
      NULL::int AS pain_score, NULL::real AS eq5d_index FROM cohort c
    UNION ALL
    SELECT r.patient_id, 'referral', r.id, r.diagnosis, r.region, r.status,
      to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), r.surgery_date::text, ph.name,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    FROM referrals r JOIN cohort c ON c.id = r.patient_id LEFT JOIN users ph ON ph.id = r.physio_id
    UNION ALL
    SELECT a.patient_id, 'appointment', a.referral_id, NULL, NULL, NULL, NULL, NULL, ph.name,
      a.id, to_char(a.scheduled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), a.kind, a.status,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    FROM appointments a JOIN cohort c ON c.id = a.patient_id LEFT JOIN users ph ON ph.id = a.physio_id
    UNION ALL
    SELECT s.patient_id, 'survey', a.referral_id, NULL, NULL, NULL, NULL, NULL, NULL,
      s.appointment_id, NULL, NULL, NULL, s.id,
      to_char(s.submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), respondent.role,
      s.mo, s.sc, s.ua, s.pd, s.ad, s.eq_vas, s.pain, s.index_value
    FROM surveys s JOIN cohort c ON c.id = s.patient_id
      LEFT JOIN appointments a ON a.id = s.appointment_id LEFT JOIN users respondent ON respondent.id = s.filled_by
  ) SELECT c.id AS patient_id, c.name AS patient_name, c.masked_nric, c.age_years, c.gender,
    ${EXPORT_COLUMNS.slice(5).map((name) => `e.${name}`).join(", ")}
    FROM cohort c JOIN records e ON e.patient_id = c.id
    ORDER BY c.name, c.id, e.record_type, e.referral_id, e.appointment_id, e.survey_id`, args);
  return csv(EXPORT_COLUMNS, rows);
}
