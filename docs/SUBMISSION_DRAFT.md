# Incubator POC Submission — Team 1B (draft, follows Incubator_Submission_Template.docx)

> Email to hat@cgh.com.sg by **30 Oct 2026**, 1 submission per team. Copy each section into the docx.
> Items in [brackets] need the team to fill in.
>
> **Live demo:** https://cgh-physio-proms.vercel.app (password `demo1234`, accounts on the landing page) · **Code:** https://github.com/yorhagengyue/CGH-hackthon (branch `gengyue`)

## 1. Problem Statement

**Project:** #1 — Digital Patient-Reported Outcomes for Real-Time Clinical Use (Rehab Services, Physiotherapy; project lead Sheik Ashiddiq)

**Describe the problem.** Outpatient physiotherapy at CGH collects the EQ-5D on paper during each 30-minute session: the patient fills in the form, the therapist computes the score and transcribes it into the clinical document (Citrix), and at the next visit has to trace the previous document to compare. This costs session time, risks transcription errors, gives no real-time view of who has responded, and makes longitudinal tracking of patient outcomes or cohort research impractical. Patients and therapists both lose part of every visit to administration rather than care.

## 2. Team

- Team name: **1B**
- Mentor(s): [Sheik Ashiddiq Bin Sheik Alauddin / Lydia Sim — confirm]

## 3. Team Members

Dylan Yeo, Geng Yue, Charmaine Oh (CGH), Heng Lexuan Lovelle, Raelene Foo Shu Ya, Vinusri Mondae Sethilkumar, Leow Jo Lene (SingHealth)

## 4. Data Sets and Rationale

| Data set | Source / provided by | Why we used it | Limitations or prep done |
|---|---|---|---|
| `Patient DATA` sheet — 72 de-identified outpatient physiotherapy referrals (hashed Patient ID, age band, gender, Casemix diagnosis, referral date) | CGH, "Incubator proj1_data and template.xlsx" | Real patient cohort to populate the system and to derive the "condition / joint referred for" field | No PROM scores included. 2 duplicate IDs de-duplicated. Body region derived from diagnosis text by keyword mapping (Knee, Shoulder, Lower back, Neck, Hip, Ankle/foot, Hand/wrist, Elbow, Other). |
| `EQ5D mock Data` sheet — hospital's EQ-5D entry template (date, ID, pain 0-10, 5 domains, EQ-VAS) | CGH, same workbook | Defines the record format our database stores (one row per session) and the import path for legacy paper entries | Only 2 example rows; synthetic sessions were generated for the demo (clearly flagged, never presented as real) |
| EQ-5D-5L value set (England 2018, Devlin et al.) | Published literature | To convert the 5-digit profile into an index value 0-1 for trending | Placeholder: to be replaced by the Singapore EQ-5D-5L value set before clinical use; coefficients are a single table in `eq5d.py` |

## 5. Methodology

**Framing.** We treated the problem as a workflow redesign with three touchpoints, matching the envisioned process map in the briefing: (1) patient completes PROMs off-site, (2) response captured instantly in a central database tagged to the patient, (3) therapist views current + previous scores on a dashboard and transfers a structured block into the clinical document.

**Steps.**
1. Modelled the data as `patients → visits → responses`. Every scheduled visit gets an opaque token; the patient link/QR carries only that token (no NRIC or name), answering the PDPA consideration in the brief.
2. Built a mobile-first EQ-5D-5L questionnaire (5 domains × 5 levels, EQ-VAS 0-100 slider, pain NRS 0-10). One submission per visit; resubmission is rejected.
3. Built a therapist dashboard: today's clinic list with submission status and submitted time, patient ID, age band, sex, region/diagnosis, pain score, colour-coded EQ-5D profile, index and EQ-VAS, each with ▲/▼ flags when the change versus the previous visit exceeds a minimal clinically important difference (configurable). Patient detail shows the domain-by-domain comparison with the previous visit and trend lines of index, EQ-VAS and pain across all visits.
4. "Copy to clinical document" generates a structured text block (profile, per-domain levels, index, VAS, pain, change since last and since initial visit) for one-click paste into Citrix — the transcription step, automated. EMR integration itself is out of POC scope per the brief.
5. Loaded the 72 referrals, and importer for the hospital's EQ-5D template, plus a de-identified CSV extract and a cohort view (mean change by body region) for research use.

**Validation.** Unit checks on scoring (profile 11111 → 1.000, 55555 → -0.285). End-to-end test: a pending visit on the dashboard was completed from the phone form, appeared as submitted within the 5-second refresh, and the generated clinical note reflected the new scores and change versus prior visits. [Add: feedback from the physiotherapists in the room on 27 Oct.]

**Key outcomes.** Working end-to-end POC: patient form → central database → live dashboard → clinical-document text → research extract. Expected impact: removes form-filling and transcription time from the 30-minute session, eliminates transcription errors, gives real-time visibility of submission status, and makes longitudinal outcome tracking a by-product of routine care.

## 6. Tools Used

- Next.js 16 (App Router, server actions) + React 19 + TypeScript — the web app: five role portals, patient questionnaire, server-side API
- Tailwind CSS 4 — styling with the CGH brand palette; inline SVG for trend charts (no chart library)
- PostgreSQL on Neon (cloud) via `pg`; PGlite (Postgres in WASM) for local development with identical SQL
- Vercel — hosting; Vercel Cron hits `/api/sms` daily to dispatch reminders
- Twilio REST API (optional) — real SMS when keys are set; otherwise a simulated outbox
- Node `crypto` scrypt — password hashing; cookie sessions stored in Postgres
- Python 3.12 + openpyxl — converting the hospital xlsx extract into `lib/referrals.json` for seeding
- [Add whatever the team used for slides]

## 7. Working Script

| File name | Brief description | Language / version |
|---|---|---|
| `web/app/**/page.tsx` | Pages: landing, login, register, patient, survey, caregiver, doctor, physio, HOD, patient detail, SMS outbox | TypeScript / React 19 |
| `web/app/actions.ts` | All server actions: login, register, link parent, submit survey, referral, appointment, SMS dispatch | TypeScript |
| `web/lib/schema.ts`, `web/lib/db.ts` | Postgres schema (users, care_links, referrals, appointments, surveys, notifications, sessions) and the Neon/PGlite query layer | TypeScript |
| `web/lib/eq5d.ts` | EQ-5D-5L scoring, value set table, MCID flags, questionnaire wording | TypeScript |
| `web/lib/seed.ts`, `web/lib/referrals.json` | Demo data from the CGH referral extract | TypeScript / JSON |
| `web/lib/notify.ts`, `web/app/api/sms/route.ts` | SMS/app notifications, Twilio dispatcher, cron endpoint | TypeScript |
| `README.md` | Run and deploy instructions | — |

**How to run.**
```
cd web
cp .env.example .env.local     # DATABASE_URL (Neon) or leave empty for local PGlite
npm install && npm run dev     # http://localhost:3000 ; tables + demo data are created on first start
```
Or use the live deployment: https://cgh-physio-proms.vercel.app
Attached: ☐ Yes, all files listed above are attached to this submission

## 8. What I Learnt from the Incubator

[Team to write — prompts: what surprised you about the physio workflow; why the profile (e.g. 32342) matters more to clinicians than the index; PDPA trade-off of tokens vs names; what you would do differently (e.g. start from the therapist's 30-minute session rather than the form); next steps — Singapore value set, therapist login + audit log, SMS delivery of links with expiry, FHIR push into EPIC, pilot in one physio clinic.]
