"use client";
import { useState } from "react";
import type { SurveyPoint } from "./ProgressTrend";

const ROWS: { key: "mo" | "sc" | "ua" | "pd" | "ad"; name: string }[] = [
  { key: "mo", name: "Walking" }, { key: "sc", name: "Washing and dressing" }, { key: "ua", name: "Usual activities" }, { key: "pd", name: "Pain or discomfort" }, { key: "ad", name: "Mood" },
];
const LEVEL = ["", "No problems", "Slight problems", "Moderate problems", "Severe problems", "Unable / extreme"];
const cmp = (cur: number, prev: number | undefined, lowerBetter = true) => prev === undefined ? "" : cur === prev ? "same" : (lowerBetter ? cur < prev : cur > prev) ? "better" : "worse";
const Mark = ({ v }: { v: string }) => v ? <span className={`text-xs font-bold ${v === "better" ? "text-ok" : v === "worse" ? "text-danger" : "text-slate-400"}`}>{v}</span> : null;

/** Evolt-style record browser: a date strip with arrows, then the six answers of the selected questionnaire. */
export function RecordsBrowser({ points }: { points: SurveyPoint[] }) {
  const [i, setI] = useState(Math.max(0, points.length - 1));
  if (!points.length) return null;
  const p = points[i], prev = points[i - 1];
  const btn = "w-10 h-10 rounded-full bg-white border border-slate-300 text-cgh-blue font-bold disabled:opacity-30";
  return <div className="bg-white rounded-2xl shadow-card p-5">
    <div className="flex items-center gap-3">
      <button type="button" className={btn} onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} aria-label="Earlier">‹</button>
      <div className="flex-1 overflow-x-auto"><div className="flex gap-2">{points.map((x, k) => <button key={x.id} type="button" onClick={() => setI(k)} className={`px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap ${k === i ? "bg-cgh-blue text-white" : "bg-slate-100 text-slate-600"}`}>{x.label}</button>)}</div></div>
      <button type="button" className={btn} onClick={() => setI(Math.min(points.length - 1, i + 1))} disabled={i === points.length - 1} aria-label="Later">›</button>
    </div>
    <div className="text-[26px] font-extrabold text-cgh-ink mt-4">{p.date}</div>
    <div className="text-sm text-slate-500">Questionnaire {i + 1} of {points.length} · filled in by {p.filled_by}{prev ? ` · compared with ${prev.date}` : ""}</div>
    <div className="divide-y divide-slate-100 mt-3">
      {ROWS.map((r) => <div key={r.key} className="py-2.5">
        <div className="flex items-center justify-between"><span className="text-slate-600">{r.name}</span><Mark v={cmp(p[r.key], prev?.[r.key])} /></div>
        <div className="font-semibold text-cgh-ink">{LEVEL[p[r.key]]}</div>
      </div>)}
      <div className="py-2.5 flex items-center justify-between"><span className="font-semibold text-cgh-ink whitespace-nowrap">Pain <span className="text-slate-400 font-normal">·</span> {p.pain} out of 10</span><Mark v={cmp(p.pain, prev?.pain)} /></div>
    </div>
  </div>;
}
