import type { Role } from "./auth";
export const HOME: Record<Role, string> = { patient: "/patient", caregiver: "/caregiver", doctor: "/doctor", physio: "/physio", hod: "/hod" };
