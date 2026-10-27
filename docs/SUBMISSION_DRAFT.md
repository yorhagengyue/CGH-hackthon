# Incubator POC Submission — Team 1B (draft, follows Incubator_Submission_Template.docx)

> Email to hat@cgh.com.sg by **30 Oct 2026**, 1 submission per team. Copy each section into the docx.
> Items in [brackets] need the team to fill in.
>
> **Live demo:** https://cgh-physio-proms.vercel.app (password `demo1234`, accounts on the landing page) · **Web code:** https://github.com/yorhagengyue/CGH-hackthon (branch `gengyue`) · **iOS app:** https://github.com/yorhagengyue/CGH-ios (private; same backend and accounts)

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
1. Modelled the data as `patients → referrals → appointments → surveys`, with `care_links` for caregivers (a link is *pending* until the parent taps Allow). Patients and caregivers log in with NRIC + password, staff with a staff ID. One backend serves the web app and the iOS app (JSON API under `/api/v1`, same sessions table).
2. Built the mobile-first EQ-5D-5L questionnaire (five questions plus pain 0–10, six in all; the EQ-VAS self-rating page was removed after patient feedback and the overall health score is computed from the five answers). One submission per appointment; a caregiver can answer for a parent once approved.
3. Rewrote the patient side in plain language after two rounds of feedback (see below): one card on the overview (next visit + button + one-sentence verdict), a trend chart with the numbers on it (overall health score, the five questions, pain; higher on the chart is always better), and a record browser for every previous questionnaire. No index values, no profile strings, no arrows.
4. Built the clinician side: today's clinic list (time · name · Improved / Stable / Worse / Awaiting), **search** by NRIC or name, diagnosis keyword or code (typed, with suggestions), age range and months post-op; patient detail with the trend first, then the EQ-5D-5L profile, the scores with explanations, and one-click **Copy note for clinical document** (Citrix). Doctor referral in one step; HOD view with outcomes by region and workload by therapist.
5. Reminders only for a questionnaire that is still not done: SMS 7 days, 1 day and 2 hours before the visit, to the patient and approved caregivers (simulated outbox; Twilio-ready). Dispatched by a daily cron on Vercel.
6. Loaded the 72 CGH referrals (synthetic identities), added a demo-reset script, deployed to Vercel with Neon Postgres.

**User feedback and what changed.** We showed the patient side to a physiotherapist and to lay testers during the day.
- *"When you say walking a little better, what does it mean? I need the matrix, I need a graphic. I want trend, I want both"* → the progress page now has a trend chart with the values written on each point, switchable between overall health, the five questions and pain, plus a record browser for every questionnaire.
- *"Like stock-market arrows, numbers nobody understands"* → index values, profile strings and ▲▼ arrows were removed from everything the patient sees; one sentence, words, and the chart.
- *"I don't need a reminder for my appointment, the hospital already has that. I need a reminder when I haven't done the questionnaire"* → reminders are now only for an undone questionnaire, 7 days / 1 day / 2 hours before.
- *"As a patient I only need to know the condition is osteoarthritis, without the number"* → diagnosis shown as one sentence, codes and clinician names moved to the health profile.
- *"Search is the most needed thing: by NRIC, by diagnosis code or keyword, by age, by time since surgery"* → the clinician search above.
- *"One page, one question; simple, patient, one by one"* → every patient screen shows one thing; everything else is one tap away.

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

[Team to write — prompts: what surprised you about the physio workflow; how fast the "clinical" first version failed with real patients and why plain language won; the PDPA trade-off of consent-based caregiver links; what you would do differently (start from the therapist's 30-minute session rather than the form).]

**Next steps for this POC**
- First-visit branch: a different flow for the initial consultation, and the ordinary outpatient-doctor step that precedes the referral.
- The "Today" card: **Begin session** opens the therapist's view of this patient on the clinic tablet.
- Visit records: the therapist's notes per visit alongside the patient's "My records".
- Real SMS delivery (Twilio keys) with link expiry; push notifications in the iOS app.
- Singapore EQ-5D-5L value set in place of the England 2018 placeholder.
- Audit log and staff login hardening before any pilot.
- Session recording with sentence-by-sentence confirmation of what the therapist said, so the patient keeps the advice (the pattern from our earlier Ripple project).
