export const DIMS = ["mo", "sc", "ua", "pd", "ad"] as const;
export type Dim = (typeof DIMS)[number];
export const DIM_LABEL: Record<Dim, string> = { mo: "Mobility", sc: "Self-care", ua: "Usual activities", pd: "Pain / discomfort", ad: "Anxiety / depression" };
export const LEVEL_LABEL = ["", "No problems", "Slight", "Moderate", "Severe", "Extreme / unable"];
// Decrements for levels 2..5. England 2018 (Devlin et al.) as placeholder; swap for Singapore value set.
const VS: Record<Dim, number[]> = {
  mo: [0.058, 0.076, 0.207, 0.274], sc: [0.050, 0.080, 0.164, 0.203], ua: [0.050, 0.063, 0.162, 0.184],
  pd: [0.063, 0.084, 0.276, 0.335], ad: [0.078, 0.128, 0.285, 0.289],
};
export const VALUE_SET = "England_2018";
export function indexValue(l: Record<Dim, number>): number {
  let dec = 0;
  for (const d of DIMS) if (l[d] > 1) dec += VS[d][l[d] - 2];
  return Math.round((1 - dec) * 1000) / 1000;
}
export const profile = (l: Record<Dim, number>) => DIMS.map((d) => l[d]).join("");
export const MCID = { index: 0.07, vas: 7, pain: 2 };
export function flag(prev: number | null | undefined, cur: number | null | undefined, kind: keyof typeof MCID, higherBetter = true) {
  if (prev == null || cur == null) return "";
  const d = (cur - prev) * (higherBetter ? 1 : -1);
  return d >= MCID[kind] ? "improved" : d <= -MCID[kind] ? "worsened" : "stable";
}
export const QUESTIONS: Record<Dim, { q: string; opts: string[] }> = {
  mo: { q: "Your mobility today", opts: ["I have no problems walking about", "I have slight problems walking about", "I have moderate problems walking about", "I have severe problems walking about", "I am unable to walk about"] },
  sc: { q: "Washing or dressing yourself", opts: ["No problems washing or dressing myself", "Slight problems", "Moderate problems", "Severe problems", "I am unable to wash or dress myself"] },
  ua: { q: "Usual activities (work, study, housework, family or leisure)", opts: ["No problems doing my usual activities", "Slight problems", "Moderate problems", "Severe problems", "I am unable to do my usual activities"] },
  pd: { q: "Pain or discomfort today", opts: ["No pain or discomfort", "Slight pain or discomfort", "Moderate pain or discomfort", "Severe pain or discomfort", "Extreme pain or discomfort"] },
  ad: { q: "Anxiety or depression today", opts: ["Not anxious or depressed", "Slightly anxious or depressed", "Moderately anxious or depressed", "Severely anxious or depressed", "Extremely anxious or depressed"] },
};
export function regionFromDiagnosis(dx: string): string {
  const d = dx.toLowerCase();
  const map: [string, string[]][] = [
    ["Knee", ["knee", "patell", "meniscus", "acl"]], ["Shoulder", ["shoulder", "rotator", "clavic"]], ["Neck", ["neck", "cervical"]],
    ["Lower back", ["back", "lbp", "lumbar", "disc", "sciatic", "spond", "radicul"]], ["Hip", ["hip", "femur", "femoral", "groin"]],
    ["Ankle / foot", ["ankle", "foot", "plantar", "metatars", "achilles", "heel", "toe"]], ["Hand / wrist", ["hand", "wrist", "finger", "thumb", "scaphoid", "carpal"]], ["Elbow", ["elbow", "epicondyl"]],
  ];
  for (const [r, ks] of map) if (ks.some((k) => d.includes(k))) return r;
  return "Other";
}
