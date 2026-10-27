import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { session } from "@/lib/auth";
import { one } from "@/lib/db";
import { logoutAction } from "./actions";
import { Nav } from "@/components/Nav";
import { MobileNav } from "@/components/MobileNav";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = { title: "CGH Physio PROMs", description: "Digital patient-reported outcomes for physiotherapy at Changi General Hospital" };
const NAV: Record<string, [string, string][]> = {
  patient: [["/patient", "Overview"], ["/patient?tab=survey", "Survey"], ["/patient?tab=progress", "Progress"], ["/patient?tab=ask", "Ask"], ["/patient?tab=notifications", "Notifications"], ["/patient?tab=profile", "Profile"]],
  caregiver: [["/caregiver", "My parents"], ["/patient", "Parent's page"]],
  doctor: [["/doctor", "Patients & referrals"], ["/sms", "SMS outbox"]],
  physio: [["/physio", "My clinic"], ["/sms", "SMS outbox"]],
  hod: [["/hod", "Department"], ["/sms", "SMS outbox"]],
};
const ROLE_LABEL: Record<string, string> = { patient: "Patient", caregiver: "Caregiver", doctor: "Doctor", physio: "Physiotherapist", hod: "Head of Department" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await session();
  const staff = s && ["physio", "doctor", "hod"].includes(s.user.role);
  const unread = staff ? Number((await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND channel='app' AND read_at IS NULL", [s!.user.id]))?.n ?? 0) : 0;
  return <html lang="en" className={manrope.variable}><body className="min-h-screen font-sans antialiased flex flex-col">
    <header className="bg-white border-b border-slate-200"><div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
      <Link href="/" className="flex items-center gap-3"><Image src="/brand/cgh-logo.png" alt="Changi General Hospital · SingHealth" width={114} height={36} priority /><span className="h-7 w-px bg-slate-200 hidden lg:block" /><span className="font-bold text-cgh-ink tracking-tight hidden lg:inline whitespace-nowrap">Physio PROMs</span></Link>
      {s && <div className="ml-2 hidden md:block"><Suspense><Nav items={NAV[s.user.role]} /></Suspense></div>}
      <div className="ml-auto flex items-center gap-3 text-sm">{s ? <>{staff && <Link href="/inbox" aria-label="Notifications" className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-cgh-mist text-slate-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>{unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[11px] font-bold leading-[18px] text-center">{unread}</span>}</Link>}<span className="text-slate-700 font-semibold hidden lg:inline whitespace-nowrap">{s.user.name}</span><span className="text-[11px] uppercase tracking-wide bg-cgh-mist text-cgh-blue font-bold rounded-md px-2 py-1 whitespace-nowrap">{ROLE_LABEL[s.user.role]}</span><form action={logoutAction}><button className="text-slate-500 hover:text-cgh-blue font-medium">Log out</button></form></> : <><Link href="/login" className="font-semibold text-slate-700 hover:text-cgh-blue">Log in</Link><Link href="/register" className="px-4 py-2 rounded-lg bg-cgh-blue text-white font-semibold hover:bg-cgh-blue-dark">Register</Link></>}</div>
    </div>{s && <Suspense><MobileNav items={NAV[s.user.role]} /></Suspense>}</header>
    <main className="max-w-7xl w-full mx-auto px-4 py-6 flex-1">{children}</main>
    <footer className="border-t border-slate-200 bg-white"><div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3 text-xs text-slate-500"><Image src="/brand/cgh-logo.png" alt="" width={76} height={24} /><span className="italic">Patients. At the heart of all we do.</span><span className="ml-auto">H.A.T. Incubator 2026 · Team 1B · proof of concept, not for clinical use</span></div></footer>
  </body></html>;
}
