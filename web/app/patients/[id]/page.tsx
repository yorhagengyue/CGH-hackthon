import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { one } from "@/lib/db";
import { PatientDetail } from "@/components/PatientDetail";
import { HOME } from "@/lib/roles";

export default async function PatientById({ params }: { params: Promise<{ id: string }> }) {
  const s = await session(); if (!s) redirect("/login");
  const id = Number((await params).id);
  if (s.user.role === "patient" && s.user.id !== id) redirect("/patient");
  if (s.user.role === "caregiver") { const ok = await one("SELECT 1 FROM care_links WHERE caregiver_id = $1 AND patient_id = $2", [s.user.id, id]); if (!ok) redirect("/caregiver"); }
  if (s.user.role === "physio") { const ok = await one("SELECT 1 FROM referrals WHERE physio_id = $1 AND patient_id = $2", [s.user.id, id]); if (!ok) return <p className="text-red-700">This patient is not referred to you.</p>; }
  return <div><a href={HOME[s.user.role]} className="text-sm text-gray-500 hover:underline">← back</a><div className="mt-2"><PatientDetail patientId={id} staff={["doctor", "physio", "hod"].includes(s.user.role)} /></div></div>;
}
