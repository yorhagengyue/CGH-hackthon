"use client";
import { useState } from "react";

export type SurveyPoint = { id: number; date: string; label: string; mo: number; sc: number; ua: number; pd: number; ad: number; pain: number; health: number; filled_by: string };
type Series = "pain" | "health" | "dims";
const DIM: { key: "mo" | "sc" | "ua" | "pd" | "ad"; name: string; color: string }[] = [
  { key: "mo", name: "Walking", color: "#0070b8" }, { key: "sc", name: "Washing and dressing", color: "#28a8e0" }, { key: "ua", name: "Usual activities", color: "#7c3aed" },
  { key: "pd", name: "Pain or discomfort", color: "#b91c1c" }, { key: "ad", name: "Mood", color: "#b45309" },
];
const EXPLAIN: Record<Series, string> = {
  pain: "Each time you answered, you rated your pain from 0 (no pain) to 10 (the worst pain you can imagine). Lower is better.",
  health: "Each time you answered, you rated your overall health from 0 (worst) to 100 (best). Higher is better.",
  dims: "For each of the five questions you chose a level from 1 (no problems) to 5 (unable / extreme problems). Lower is better.",
};

export function ProgressTrend({ points }: { points: SurveyPoint[] }) {
  const [series, setSeries] = useState<Series>("pain");
  const W = 640, H = 260, pl = 40, pr = 16, pt = 28, pb = 34;
  const max = series === "pain" ? 10 : series === "health" ? 100 : 5, min = series === "dims" ? 1 : 0;
  const ticks = series === "pain" ? [0, 2, 4, 6, 8, 10] : series === "health" ? [0, 25, 50, 75, 100] : [1, 2, 3, 4, 5];
  const xs = (i: number) => points.length === 1 ? (pl + W - pr) / 2 : pl + (i * (W - pl - pr)) / (points.length - 1);
  const ys = (y: number) => pt + (1 - (y - min) / (max - min)) * (H - pt - pb);
  const lines: { name: string; color: string; vals: number[] }[] = series === "pain" ? [{ name: "Pain", color: "#b91c1c", vals: points.map((p) => p.pain) }]
    : series === "health" ? [{ name: "Health today", color: "#0070b8", vals: points.map((p) => p.health) }]
    : DIM.map((d) => ({ name: d.name, color: d.color, vals: points.map((p) => p[d.key]) }));
  const tab = (k: Series, label: string) => <button type="button" onClick={() => setSeries(k)} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${series === k ? "bg-cgh-blue text-white" : "bg-white border border-slate-300 text-slate-700"}`}>{label}</button>;
  return <div className="bg-white rounded-2xl shadow-card p-5">
    <div className="flex flex-wrap items-center gap-2">{tab("pain", "Pain (0–10)")}{tab("health", "Health today (0–100)")}{tab("dims", "The five questions (1–5)")}
      <details className="ml-auto text-sm"><summary className="cursor-pointer text-cgh-blue font-bold list-none">What is this?</summary><p className="text-slate-600 mt-1 max-w-sm">{EXPLAIN[series]}</p></details></div>
    {points.length === 0 ? <p className="text-slate-500 mt-4">Your first questionnaire will appear here.</p> : <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-3">
      {ticks.map((t) => <g key={t}><line x1={pl} x2={W - pr} y1={ys(t)} y2={ys(t)} stroke="#e2e8f0" /><text x={pl - 8} y={ys(t) + 4} fontSize="11" textAnchor="end" fill="#64748b">{t}</text></g>)}
      {lines.map((l) => <g key={l.name}>
        <path d={l.vals.map((v, i) => `${i ? "L" : "M"}${xs(i)},${ys(v)}`).join(" ")} fill="none" stroke={l.color} strokeWidth={lines.length > 1 ? 2 : 3} strokeLinejoin="round" />
        {l.vals.map((v, i) => <g key={i}><circle cx={xs(i)} cy={ys(v)} r={lines.length > 1 ? 3.5 : 5} fill="#fff" stroke={l.color} strokeWidth="2.5" />{(lines.length === 1 || i === l.vals.length - 1) && <text x={xs(i)} y={ys(v) - 11} fontSize={lines.length > 1 ? 11 : 14} fontWeight="800" textAnchor="middle" fill={l.color}>{v}</text>}</g>)}
      </g>)}
      {points.map((p, i) => <text key={p.id} x={xs(i)} y={H - 12} fontSize="11" textAnchor="middle" fill="#64748b">{p.label}</text>)}
    </svg>}
    {lines.length > 1 && <div className="flex flex-wrap gap-3 mt-2 text-xs">{lines.map((l) => <span key={l.name} className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-full" style={{ background: l.color }} />{l.name}</span>)}</div>}
  </div>;
}
