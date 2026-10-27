// Plain-language helpers for patient-facing views. No index values, no profiles, no arrows.
import { DIMS, DIM_LABEL, QUESTIONS, type Dim } from "./eq5d";
import { flagsFor, type Survey } from "./data";

export type Verdict = "better" | "same" | "worse" | "first";

export function verdict(cur: Survey | null, prev: Survey | null): Verdict {
  if (!cur) return "first";
  if (!prev) return "first";
  const f = flagsFor(cur, prev);
  const score = [f.index, f.vas, f.pain].reduce((n, x) => n + (x === "improved" ? 1 : x === "worsened" ? -1 : 0), 0);
  return score > 0 ? "better" : score < 0 ? "worse" : "same";
}

export const VERDICT_TEXT: Record<Verdict, { title: string; short: string; tone: "ok" | "neutral" | "warn" }> = {
  better: { title: "You are doing better than last visit", short: "Better", tone: "ok" },
  same: { title: "About the same as last visit", short: "Same", tone: "neutral" },
  worse: { title: "Not as good as last visit", short: "Worse", tone: "warn" },
  first: { title: "This is your first questionnaire", short: "First", tone: "neutral" },
};

/** Per-dimension comparison in words. Lower level = better. */
export function dimChange(cur: number, prev: number | null): string {
  if (prev == null) return "";
  const d = prev - cur;
  if (d === 0) return "same as last time";
  if (d === 1) return "a little better than last time";
  if (d > 1) return "better than last time";
  if (d === -1) return "a little worse than last time";
  return "worse than last time";
}

export const DIM_ICON: Record<Dim, string> = {
  mo: "M9 4a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0zM8 21l2-6 2 2v4h2v-5l-2-2 1-3 2 2h3v-2h-2l-3-3h-3L6 11v4h2v-3l1.5-1L8 21z",
  sc: "M6 3h12v2H6zM7 6h10l-1 13H8zM10 10v5M14 10v5",
  ua: "M3 20h18M5 20V9l7-5 7 5v11M10 20v-6h4v6",
  pd: "M13 2 4 14h6l-1 8 9-12h-6z",
  ad: "M7 17a5 5 0 0 1 0-10 6 6 0 0 1 11 2 4 4 0 0 1-1 8z",
};
export const dimPhrase = (d: Dim, level: number) => QUESTIONS[d].opts[level - 1];
export const dimName = (d: Dim) => DIM_LABEL[d];
export { DIMS };

export const DIM_SHORT: Record<Dim, string> = { mo: "Walking", sc: "Washing and dressing", ua: "Usual activities", pd: "Pain or discomfort", ad: "Mood" };
/** One line per dimension that changed since last time, biggest change first, at most `max`. */
export function changedLines(cur: Survey, prev: Survey | null, max = 3): string[] {
  if (!prev) return [];
  return DIMS.map((d) => ({ d, diff: prev[d] - cur[d] })).filter((x) => x.diff !== 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, max)
    .map(({ d, diff }) => `${DIM_SHORT[d]}: ${diff === 1 ? "a little better" : diff > 1 ? "better" : diff === -1 ? "a little worse" : "worse"}`);
}
export function painLine(cur: Survey, prev: Survey | null): string {
  const cmp = prev ? (cur.pain < prev.pain ? ", less than last time" : cur.pain > prev.pain ? ", more than last time" : ", same as last time") : "";
  return `Pain ${cur.pain} out of 10${cmp}`;
}

/** "359420013 : Osteoarthritis of knee" -> "Osteoarthritis of knee" */
export const plainDiagnosis = (d: string | null | undefined) => (d ?? "").replace(/^\s*\d+\s*:\s*/, "").trim() || "—";
