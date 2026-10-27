import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { session } from "@/lib/auth";
import { logoutAction } from "./actions";
import { NavLink } from "@/components/ui";

export const metadata: Metadata = { title: "CGH Physio PROMs", description: "Digital patient-reported outcomes for physiotherapy" };
const NAV: Record<string, [string, string][]> = {
  patient: [["/patient", "My page"], ["/patient?tab=survey", "Survey"], ["/patient?tab=progress", "Progress"], ["/patient?tab=calendar", "Calendar"], ["/patient?tab=profile", "Profile"]],
  caregiver: [["/caregiver", "My parents"], ["/patient", "Parent's page"]],
  doctor: [["/doctor", "Patients & referrals"], ["/sms", "SMS outbox"]],
  physio: [["/physio", "My clinic"], ["/sms", "SMS outbox"]],
  hod: [["/hod", "All patients"], ["/sms", "SMS outbox"]],
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await session();
  return <html lang="en"><body className="bg-gray-50 text-gray-900 min-h-screen">
    <header className="bg-white border-b border-gray-200"><div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
      <Link href="/" className="font-bold text-teal-800">CGH Physio · PROMs</Link>
      {s && <nav className="flex gap-1 ml-4">{NAV[s.user.role].map(([h, l]) => <NavLink key={h} href={h}>{l}</NavLink>)}</nav>}
      <div className="ml-auto flex items-center gap-3 text-sm">{s ? <><span className="text-gray-600">{s.user.name} <span className="text-xs uppercase bg-gray-100 rounded px-1.5 py-0.5 ml-1">{s.user.role}</span></span><form action={logoutAction}><button className="text-gray-500 hover:text-gray-900">Log out</button></form></> : <><Link href="/login" className="hover:underline">Log in</Link><Link href="/register" className="px-3 py-1.5 rounded-lg bg-teal-700 text-white">Register</Link></>}</div>
    </div></header>
    <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
  </body></html>;
}
