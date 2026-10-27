# CGH Physio PROMs — H.A.T. Incubator 2026, Project #1 (Team 1B)

**Live:** https://cgh-physio-proms.vercel.app · demo accounts on the landing page, password `demo1234`

Digital patient-reported outcomes (EQ-5D-5L) for outpatient physiotherapy. Patients, or their
children on their behalf, answer the questionnaire online before each visit; the physiotherapist
sees scores and progress in real time; doctors refer with one click; the head of department sees
the whole service. No paper form, no manual transcription.

## Five portals

| Role | Logs in with | Sees / does |
|---|---|---|
| **Patient** (parent) | NRIC + password | Profile, calendar, survey, notifications; own previous answers and progress charts |
| **Caregiver** (child) | NRIC + password, linked to one or more parents by relationship | Opens the parent's page, fills the survey on their behalf, gets the same SMS reminders |
| **Doctor** | Staff ID + password | Creates referrals (diagnosis, region, assign physio, first appointment); full data of every patient |
| **Physiotherapist** | Staff ID + password | Today's clinic list (submitted / pending, pain, EQ-5D profile, index, EQ-VAS, change vs last visit), only their own referred patients, one-click clinical-document note, schedule next visit |
| **HOD / clinician** | Staff ID + password | All patients, outcomes by body region, workload by physio, department-wide clinic list |

SMS reminders go out **7 days and 3 days** before every appointment (simulated outbox at `/sms`;
set `TWILIO_*` to send for real; `GET /api/sms` is the cron dispatcher).

## Run locally

```bash
cd web
cp .env.example .env.local      # put the Neon DATABASE_URL in; without it a local PGlite DB is used
npm install
npm run dev                     # http://localhost:3000
```

First start creates the tables and seeds demo data (the CGH referral extract + synthetic
identities and EQ-5D history). Demo accounts are listed on the landing page, password `demo1234`.

## Demo reset

The database is shared by local dev, production and the iOS app, so a rehearsal uses up the demo state.
One command puts the demo family back, without touching any other patient:

```bash
cd web && npm run demo:reset
```

Afterwards: the daughter (S3456789C) is accepted for the mother (S2345678B) and **pending** for the
father (S1234567A), who has a fresh "Allow?" card; both parents' questionnaires for today are cleared
so "Fill in questionnaire" shows again; the daughter is not acting as anyone.

## Deploy (Vercel + Neon)

Deployed with the Vercel CLI from `web/` (`vercel link --project cgh-physio-proms`, `vercel --prod`). To redeploy after a push: `cd web && vercel --prod`.

1. Project root directory is `web`.
2. Environment variables: `DATABASE_URL` (Neon), `APP_URL` (the Vercel URL, used in SMS links),
   optionally `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, `CRON_SECRET`.
3. `vercel.json` schedules the SMS dispatcher daily at 09:00 SGT.

## Stack

Next.js 16 (App Router, server actions) · React 19 · Tailwind 4 · Postgres on Neon (`pg`),
PGlite for local dev · cookie sessions, scrypt password hashes · no external UI or chart libraries.

```
web/app         pages: /login /register /patient /survey /caregiver /doctor /physio /hod /patients/[id] /sms
web/app/actions.ts   all server actions (login, register, link parent, submit survey, referral, appointment, SMS)
web/lib/schema.ts    tables: users, care_links, referrals, appointments, surveys, notifications, sessions
web/lib/eq5d.ts      EQ-5D-5L scoring (value set table, MCID flags), questionnaire wording
web/lib/seed.ts      demo data from inputs/referrals.json (CGH extract)
web/lib/notify.ts    SMS/app notifications, Twilio dispatcher
web/components       UI, trend charts (inline SVG), patient detail, copy-to-clinical-document
```

Index values use the England 2018 EQ-5D-5L value set as a placeholder; swap in the Singapore
value set in `web/lib/eq5d.ts` before clinical use.
