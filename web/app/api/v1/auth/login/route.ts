import { apiLogin, body, error, json } from "@/lib/api";
export async function POST(req: Request) {
  const { login_id = "", password = "" } = await body<{ login_id?: string; password?: string }>(req);
  const r = await apiLogin(String(login_id), String(password));
  if (!r) return error("Wrong NRIC / staff ID or password.", 401);
  return json({ token: r.token, user: r.user, acting_patient_id: null });
}
