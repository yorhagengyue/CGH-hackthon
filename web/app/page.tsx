import Link from "next/link";
import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { HOME } from "@/lib/roles";
import { DEMO_PASSWORD } from "@/lib/seed";
export default async function Home() {
  const s = await session(); if (s) redirect(HOME[s.user.role]);
  const demo: [string, string, string][] = [["Patient (father)", "S1234567A", "/patient"], ["Patient (mother)", "S2345678B", "/patient"], ["Caregiver (daughter)", "S3456789C", "/caregiver"], ["Doctor", "D001", "/doctor"], ["Physiotherapist", "P001", "/physio"], ["Head of Department", "H001", "/hod"]];
  return <div className="max-w-3xl mx-auto">
    <h1 className="text-3xl font-bold mt-8">Your physiotherapy questionnaire, before the visit.</h1>
    <p className="text-gray-600 mt-3 text-lg">Patients (or their children) complete the EQ-5D-5L online. Therapists see results and progress in real time. Doctors refer with one click. No paper, no transcription.</p>
    <div className="flex gap-3 mt-6"><Link href="/register" className="px-5 py-2.5 rounded-lg bg-teal-700 text-white font-semibold">Register</Link><Link href="/login" className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white">Log in</Link></div>
    <div className="mt-10 bg-white border border-gray-200 rounded-xl p-4"><h2 className="font-semibold mb-2">Demo accounts (password <code className="bg-gray-100 px-1 rounded">{DEMO_PASSWORD}</code>)</h2>
      <table className="w-full text-sm"><tbody>{demo.map(([r, id]) => <tr key={id} className="border-t border-gray-100"><td className="py-1.5">{r}</td><td className="font-mono">{id}</td></tr>)}</tbody></table></div>
  </div>;
}
