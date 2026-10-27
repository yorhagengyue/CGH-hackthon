export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('patient','caregiver','doctor','physio','hod')),
  login_id TEXT NOT NULL UNIQUE,        -- NRIC for patient/caregiver, staff ID for staff
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  gender TEXT,
  birthday DATE,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS care_links (             -- caregiver (child) -> patient (parent)
  id SERIAL PRIMARY KEY,
  caregiver_id INT NOT NULL REFERENCES users(id),
  patient_id INT NOT NULL REFERENCES users(id),
  relationship TEXT NOT NULL,                        -- son, daughter, spouse ...
  status TEXT NOT NULL DEFAULT 'accepted',           -- pending | accepted | declined (parent must allow)
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (caregiver_id, patient_id)
);
CREATE TABLE IF NOT EXISTS referrals (              -- doctor -> physio
  id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES users(id),
  doctor_id INT NOT NULL REFERENCES users(id),
  physio_id INT REFERENCES users(id),
  diagnosis TEXT NOT NULL,
  region TEXT NOT NULL,                              -- Knee, Shoulder, Lower back ...
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',             -- active | discharged
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  referral_id INT NOT NULL REFERENCES referrals(id),
  patient_id INT NOT NULL REFERENCES users(id),
  physio_id INT REFERENCES users(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  kind TEXT NOT NULL DEFAULT 'follow-up',            -- initial | follow-up
  status TEXT NOT NULL DEFAULT 'scheduled',          -- scheduled | done | cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS surveys (                -- one EQ-5D-5L submission
  id SERIAL PRIMARY KEY,
  appointment_id INT REFERENCES appointments(id),
  patient_id INT NOT NULL REFERENCES users(id),
  filled_by INT NOT NULL REFERENCES users(id),       -- patient or caregiver
  mo INT NOT NULL, sc INT NOT NULL, ua INT NOT NULL, pd INT NOT NULL, ad INT NOT NULL,
  eq_vas INT NOT NULL,
  pain INT NOT NULL,
  index_value REAL NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notifications (          -- in-app bell + SMS outbox
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  appointment_id INT REFERENCES appointments(id),
  channel TEXT NOT NULL DEFAULT 'sms',               -- sms | app
  kind TEXT NOT NULL,                                -- reminder_7d | reminder_3d | referral | result
  message TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  link_id INT,                                       -- for kind='link_request': the care_links row to answer
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  acting_patient_id INT REFERENCES users(id),        -- caregiver currently viewing this parent
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE care_links ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'accepted';
ALTER TABLE care_links ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE care_links ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link_id INT;
CREATE INDEX IF NOT EXISTS idx_surveys_patient ON surveys(patient_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_appts_patient ON appointments(patient_id, scheduled_at);
`;
