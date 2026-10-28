// Record the web scenes with Playwright (repeatable, 1440×900, 30 fps webm -> mp4 with ffmpeg).
//   npx playwright install chromium   (once)
//   node record/web.mjs 01-landing 02-register 11-referral 12-hod     (or no args = all)
// Base URL: WEB_BASE (default https://cgh-physio-proms.vercel.app). Demo accounts: password demo1234.
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";

const BASE = process.env.WEB_BASE ?? "https://cgh-physio-proms.vercel.app";
const PW = "demo1234";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page, id) {
  await page.goto(`${BASE}/login`); await pause(800);
  await page.fill('input[name="login_id"]', id); await pause(400);
  await page.fill('input[name="password"]', PW); await pause(400);
  await page.keyboard.press("Enter"); await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 }); await page.waitForLoadState("networkidle"); await pause(1500);
}

const scenes = {
  "01-landing": async (page) => { await page.goto(BASE); await pause(3000); await page.mouse.wheel(0, 500); await pause(3000); },
  "02-register": async (page) => {
    await page.goto(`${BASE}/register`); await pause(1500);
    await page.click('text=Caregiver').catch(() => {}); await pause(600);
    for (const [sel, val] of [['input[name="nric"]', "S9876543Z"], ['input[name="name"]', "Tan Mei Ling"], ['input[name="phone"]', "91234567"], ['input[name="password"]', "demo1234"], ['input[name="parent_nric"]', "S1234567A"]]) {
      const el = page.locator(sel); if (await el.count()) { await el.fill(val); await pause(500); }
    }
    await pause(2500);   // do not submit: the demo data stays clean
  },
  "11-referral": async (page) => { await login(page, "D001"); await page.goto(`${BASE}/doctor`); await pause(2500); await page.locator('input[name="diagnosis"]').fill("Osteoarthritis of knee").catch(() => {}); await pause(3000); },
  "15-sms": async (page) => { await login(page, "H001"); await pause(1500); await page.goto(`${BASE}/sms`, { waitUntil: "networkidle" }); console.log("sms url:", page.url()); await pause(3500); await page.mouse.wheel(0, 200); await pause(2500); },
  "12-hod": async (page) => { await login(page, "H001"); await page.goto(`${BASE}/hod`); await pause(3500); await page.mouse.wheel(0, 400); await pause(3000); },
};

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(scenes);
mkdirSync("media/web", { recursive: true });
const browser = await chromium.launch();
for (const name of wanted) {
  rmSync("media/_tmp", { recursive: true, force: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, recordVideo: { dir: "media/_tmp", size: { width: 1440, height: 900 } } });
  const page = await ctx.newPage();
  try { await scenes[name](page); } finally { await ctx.close(); }
  const webm = readdirSync("media/_tmp").find((f) => f.endsWith(".webm"));
  execSync(`ffmpeg -y -loglevel error -i media/_tmp/${webm} -r 30 -c:v libx264 -crf 17 -pix_fmt yuv420p media/web/${name}.mp4`);
  console.log("wrote media/web/" + name + ".mp4");
}
await browser.close();
