import referrals from "./referrals.json";
import { hashPassword } from "./auth";
import { indexValue, regionFromDiagnosis, type Dim } from "./eq5d";
import { scheduleReminders } from "./notify";

type Q = (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

const FIRST = ["Wei Ming", "Siew Hoon", "Boon Keng", "Mei Ling", "Jun Hao", "Hui Ling", "Kok Wai", "Li Na", "Ahmad", "Nurul", "Rajesh", "Priya", "Kumar", "Aisyah", "Farhan", "Devi", "Zhi Hao", "Xin Yi", "Jia Wei", "Shu Fen"];
const LAST = ["Tan", "Lim", "Lee", "Ng", "Ong", "Wong", "Goh", "Chua", "Koh", "Teo", "Bin Abdullah", "Binte Rahman", "Nair", "Pillai", "Chen", "Low", "Yeo", "Sim", "Toh", "Heng"];

function mulberry(seed: number) { return () => { let t = (seed += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export const DEMO_PASSWORD = "demo1234";

export async function seedIfEmpty(q: Q) {
  const n = await q("SELECT COUNT(*)::int AS n FROM users");
  if ((n[0].n as number) > 0) return;
  const rnd = mulberry(42);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const ph = hashPassword(DEMO_PASSWORD);
  const ins = async (role: string, login: string, name: string, extra: Partial<{ phone: string; gender: string; birthday: string; address: string }> = {}) =>
    (await q(`INSERT INTO users(role, login_id, password_hash, name, phone, gender, birthday, address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [role, login, ph, name, extra.phone ?? null, extra.gender ?? null, extra.birthday ?? null, extra.address ?? null]))[0].id as number;

  // staff
  const doctor = await ins("doctor", "D001", "Dr Koh Jun Wei", { phone: "+6590000001" });
  const physios = [await ins("physio", "P001", "Sheik Ashiddiq", { phone: "+6590000002" }), await ins("physio", "P002", "Charmaine Oh", { phone: "+6590000003" }), await ins("physio", "P003", "Leow Jo Lene", { phone: "+6590000004" })];
  await ins("hod", "H001", "Dr Lim Hwee Boon (HOD)", { phone: "+6590000005" });

  // named demo family
  const dad = await ins("patient", "S1234567A", "Tan Wei Ming", { phone: "+6591234567", gender: "MALE", birthday: "1962-03-14", address: "Blk 123 Tampines St 11 #05-123" });
  const mum = await ins("patient", "S2345678B", "Lim Siew Hoon", { phone: "+6592345678", gender: "FEMALE", birthday: "1958-11-02", address: "Blk 45 Bedok North Ave 3 #08-456" });
  const daughter = await ins("caregiver", "S3456789C", "Tan Mei Ling", { phone: "+6593456789", gender: "FEMALE", birthday: "1990-07-21", address: "Blk 123 Tampines St 11 #05-123" });
  await q("INSERT INTO care_links(caregiver_id, patient_id, relationship, status, responded_at) VALUES ($1,$2,'daughter','accepted',now())", [daughter, mum]);
  // the link to the father is still waiting for his Allow (demo: he taps Allow on his phone)
  const [pend] = await q("INSERT INTO care_links(caregiver_id, patient_id, relationship, status) VALUES ($1,$2,'daughter','pending') RETURNING id", [daughter, dad]);
  await q(`INSERT INTO notifications(user_id, channel, kind, message, send_at, sent_at, link_id) VALUES ($1,'app','link_request',$2,now(),now(),$3)`,
    [dad, "Tan Mei Ling says she is your daughter and wants to help with your questionnaires. Allow?", pend.id]);

  // referrals from the CGH extract -> synthetic identities
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = (off: number, h = 9) => { const d = new Date(today); d.setDate(d.getDate() + off); d.setHours(h, 0, 0, 0); return d.toISOString(); };
  const patients: { id: number; dx: string; region: string }[] = [
    { id: dad, dx: "359420013 : Osteoarthritis of knee", region: "Knee" },
    { id: mum, dx: "416140012 : LBP - Low back pain", region: "Lower back" },
  ];
  let i = 0;
  for (const r of (referrals as { ext_id: string; age_band: string; gender: string; diagnosis: string }[]).slice(0, 40)) {
    i++;
    const yr = 2026 - ((parseInt(r.age_band) || 40) + 5);
    const nric = `S${String(1000000 + i * 7919 % 9000000).padStart(7, "0")}${"ABCDEFGHJKLMNPQRSTUVWXYZ"[i % 24]}`;
    const id = await ins("patient", nric, `${pick(LAST)} ${pick(FIRST)}`, { phone: `+659${String(1000000 + i * 1237).slice(0, 7)}`, gender: r.gender, birthday: `${yr}-${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}` });
    patients.push({ id, dx: r.diagnosis, region: regionFromDiagnosis(r.diagnosis) });
  }

  // each patient: a referral, 1-4 past appointments with surveys, and (for some) an upcoming one
  for (const [k, p] of patients.entries()) {
    const physio = k < 2 ? physios[0] : pick(physios);
    const ref = (await q(`INSERT INTO referrals(patient_id, doctor_id, physio_id, diagnosis, region, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [p.id, doctor, physio, p.dx, p.region, "Referred for outpatient physiotherapy."]))[0].id as number;
    const nPast = k < 2 ? 4 : Math.floor(rnd() * 4);
    let sev = 0.45 + rnd() * 0.45;
    const offsets: number[] = [];
    let off = -14 - Math.floor(rnd() * 10);
    for (let j = 0; j < nPast; j++) { offsets.unshift(off); off -= 14 + Math.floor(rnd() * 10); }
    for (const [j, o] of offsets.entries()) {
      const appt = (await q(`INSERT INTO appointments(referral_id, patient_id, physio_id, scheduled_at, kind, status) VALUES ($1,$2,$3,$4,$5,'done') RETURNING id`,
        [ref, p.id, physio, day(o), j === 0 ? "initial" : "follow-up"]))[0].id as number;
      const lv = {} as Record<Dim, number>;
      const bias: Record<Dim, number> = { mo: 0.9, sc: 0.5, ua: 0.9, pd: 1.2, ad: 0.6 };
      for (const d of Object.keys(bias) as Dim[]) lv[d] = Math.min(5, Math.max(1, 1 + Math.round(Math.min(4, Math.max(0, sev * bias[d] * 4 + (rnd() - 0.5) * 1.2)))));
      const vas = Math.round(Math.min(100, Math.max(5, 90 - sev * 70 + (rnd() - 0.5) * 16)));
      const pain = Math.round(Math.min(10, Math.max(0, sev * 9 + (rnd() - 0.5) * 2.4)));
      await q(`INSERT INTO surveys(appointment_id, patient_id, filled_by, mo, sc, ua, pd, ad, eq_vas, pain, index_value, submitted_at) VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [appt, p.id, lv.mo, lv.sc, lv.ua, lv.pd, lv.ad, vas, pain, indexValue(lv), day(o - 2, 20)]);
      sev = Math.max(0.05, sev - 0.08 - rnd() * 0.14);
    }
    // upcoming appointment: today for the demo family + ~10 others, else within 2 weeks for some
    const upcoming = k < 2 ? 0 : k < 12 ? 0 : rnd() < 0.5 ? 1 + Math.floor(rnd() * 14) : null;
    if (upcoming !== null) {
      const hour = k < 2 ? 14 + k : 9 + (k % 7);
      const appt = (await q(`INSERT INTO appointments(referral_id, patient_id, physio_id, scheduled_at, kind) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [ref, p.id, physio, day(upcoming, hour), nPast === 0 ? "initial" : "follow-up"]))[0].id as number;
      await scheduleReminders(q, appt, p.id, day(upcoming, hour));
      // some of today's patients have already submitted (so the physio list shows both states)
      if (upcoming === 0 && k % 3 !== 0 && k !== 1) {  // demo family (k=0,1) stays pending so the live demo can fill them
        sev = Math.min(0.9, sev + 0.18);
        const lv: Record<Dim, number> = { mo: 1 + Math.round(sev * 3), sc: 1 + Math.round(sev * 2), ua: 1 + Math.round(sev * 3), pd: 1 + Math.round(sev * 4), ad: 1 + Math.round(sev * 2) };
        await q(`INSERT INTO surveys(appointment_id, patient_id, filled_by, mo, sc, ua, pd, ad, eq_vas, pain, index_value, submitted_at) VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [appt, p.id, lv.mo, lv.sc, lv.ua, lv.pd, lv.ad, Math.round(90 - sev * 70), Math.round(sev * 9), indexValue(lv), day(-1, 21)]);
      }
    }
  }
}
