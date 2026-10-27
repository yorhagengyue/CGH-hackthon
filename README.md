# CGH Physio PROMs — H.A.T. Incubator 2026, Project #1, Team 1B

**Live web app:** https://cgh-physio-proms.vercel.app · **iOS app:** https://github.com/yorhagengyue/CGH-ios (private) · same backend, same accounts

Digital patient-reported outcomes (EQ-5D-5L) for outpatient physiotherapy at Changi General Hospital.
Patients, or their children on their behalf, answer the questionnaire on their phone before each visit.
The physiotherapist opens the clinic list and sees today's answers next to last visit's. No paper form,
no manual transcription, and the data is there for longitudinal tracking and research.

## What it does

- **Five roles, one account system.** Patient and caregiver (NRIC + password), doctor, physiotherapist and
  head of department (staff ID + password). The iOS app and the web app share the same accounts and database.
- **EQ-5D-5L questionnaire** on the phone: five questions, pain 0–10, overall health 0–100. About two minutes.
  One submission per appointment; a caregiver can answer for a parent.
- **Plain-language results for the patient.** One sentence ("You are doing better than last visit"), a trend chart
  with the numbers on it (overall health, the five questions, pain; higher on the chart is always better), and a
  record browser to look back at every questionnaire. No index values, no arrows.
- **Reminders only for a questionnaire that is still not done**: SMS the day before at 09:00 and 2 hours before the
  visit, to the patient and to approved caregivers. Nothing is sent once the questionnaire is in. The Twilio channel is
  wired up (merged from Dylan's branch); a Twilio trial account can only send its preset templates, so the live demo runs
  in simulated mode (outbox at `/sms`). Upgrading the Twilio account is all that is needed for real delivery.
- **Web Push on the phone.** On the patient overview, **Turn on reminders** asks for notification permission once
  (works on Android Chrome and on iPhone when the site is added to the Home Screen). After that the questionnaire
  reminders, family requests and other notices also arrive as push notifications; physiotherapists and doctors who turn
  it on get the "Needs attention" alerts. Keys: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; subscriptions live in `push_subscriptions`; the service worker is `public/sw.js`.
- **Parents approve their children.** A caregiver link is pending until the parent taps Allow; until then the
  caregiver sees nothing.
- **Clinician search**: NRIC or name, diagnosis keyword or code (typed, with suggestions), age range, months
  post-op. Physiotherapists see their own patients, doctors and the HOD see everybody. Click a patient → the trend
  first, then the EQ-5D-5L profile, scores with explanations, and **Copy note for clinical document** (Citrix).
- **Doctor referral** in one step: diagnosis, body region, assigned therapist, first appointment.
- **HOD/admin view**: how many of today's patients have answered, outcomes by body region, workload by therapist, and department-wide patient browsing. The HOD can download all patient, referral, appointment and questionnaire records as CSV, or export the patients matching the shared search filters.

## Demo accounts (password `demo1234`)

| Role | Account | Notes |
|---|---|---|
| Patient (father) | S1234567A | Tan Wei Ming, knee OA, 4 months post-op; questionnaire for today's 2 pm visit pending; one caregiver request waiting for Allow |
| Patient (mother) | S2345678B | Lim Siew Hoon, low back pain; questionnaire for today's 3 pm visit pending |
| Caregiver (daughter) | S3456789C | Tan Mei Ling; approved for the mother, pending for the father |
| Doctor | D001 | Dr Koh Jun Wei |
| Physiotherapist | P001 · P002 · P003 | Sheik Ashiddiq (the demo family's therapist), Charmaine Oh, Leow Jo Lene |
| Head of Department | H001 | Dr Lim Hwee Boon |

Forty more patients are synthesised from the CGH referral extract (real age bands, sex, diagnoses; names and
NRICs invented). Search `knee`, `osteo`, `3594`, or post-op 3–6 months to find them.

## Demo reset

The database is shared by local dev, production and the iOS app, so a rehearsal uses up the demo state.
One command puts the demo family back without touching any other patient:

```bash
cd web && npm run demo:reset
```

Afterwards: the daughter is accepted for the mother and **pending** for the father (fresh Allow card), both
parents' questionnaires for today are cleared, the daughter is not acting as anyone. Surgery dates and the
other patients are untouched.

## Run locally

```bash
cd web
cp .env.example .env.local      # DATABASE_URL (Neon); leave it empty to use a local PGlite database
npm install
npm run dev                     # http://localhost:3000
```

First start creates the tables (idempotent `CREATE/ALTER … IF NOT EXISTS`) and seeds the demo data if the
database is empty. In development `/api/dev-login?as=P001&next=/physio` switches role in one click.

## Deploy (Vercel + Neon)

Deployed from `web/` with the Vercel CLI: `vercel link --project cgh-physio-proms`, then `vercel --prod`.
Environment variables: `DATABASE_URL` (Neon), `APP_URL` (used in SMS links), `CRON_SECRET`; optional
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` to send real SMS (otherwise the outbox at `/sms`
simulates them). `vercel.json` runs the SMS dispatcher (`GET /api/sms`) daily at 09:00 SGT.

## API for the iOS app (`/api/v1`)

Bearer token from `POST /api/v1/auth/login` (same `sessions` table as the web cookie). Endpoints: `me`,
`patient/bundle`, `survey`, `notifications`, `patient/link-requests` (+ `POST …/:id {accept}`),
`caregiver/parents`, `caregiver/act-as`, `physio/clinic`, `physio/patients`, `patients/:id`,
`patients/search` (`q`, `diagnosis`, `min_age`, `max_age`, `postop=3-6` or `postop_min_months`/`postop_max_months`),
`referral`, `appointment`, `doctor/patients`, `hod/overview`.

## Stack and layout

Next.js 16 (App Router, server actions) · React 19 · Tailwind 4 · Postgres on Neon via `pg` (PGlite locally) ·
cookie sessions, scrypt password hashes · no UI or chart library (inline SVG).

```
web/app                pages: / login register patient survey caregiver doctor physio hod patients/[id] sms
web/app/actions.ts     server actions (login, register, link + approve parent, survey, referral, appointment, SMS)
web/app/api/v1         JSON API for iOS
web/lib/schema.ts      users, care_links (status), referrals (surgery_date), appointments, surveys, notifications, sessions
web/lib/eq5d.ts        EQ-5D-5L scoring (value set table, MCID flags), questionnaire wording
web/lib/plain.ts       plain-language verdicts and wording for patients
web/lib/search.ts      clinician search
web/lib/notify.ts      questionnaire reminders (7d / 1d / 2h), Twilio dispatcher
web/lib/seed.ts        demo data from lib/referrals.json (the CGH extract)
web/components         ProgressTrend (interactive chart), RecordsBrowser, PatientSearch, PatientDetail, LinkRequestCard …
web/scripts            demo-reset.mjs, backfill-surgery.mjs, requeue-reminders.mjs
docs/                  screenshots, SUBMISSION_DRAFT.md
```

Index values use the England 2018 EQ-5D-5L value set as a placeholder; swap in the Singapore value set in
`web/lib/eq5d.ts` before clinical use.
