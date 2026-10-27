"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export type SurveyPoint = { id: number; date: string; label: string; mo: number; sc: number; ua: number; pd: number; ad: number; pain: number; health: number; filled_by: string };
type Series = "pain" | "health" | "dims";
type DimKey = "mo" | "sc" | "ua" | "pd" | "ad";
const DIM: { key: DimKey; name: string; color: string }[] = [
  { key: "mo", name: "Walking", color: "#0070b8" }, { key: "sc", name: "Washing and dressing", color: "#28a8e0" }, { key: "ua", name: "Usual activities", color: "#7c3aed" },
  { key: "pd", name: "Pain or discomfort", color: "#b91c1c" }, { key: "ad", name: "Mood", color: "#b45309" },
];
const LEVEL = ["", "No problems", "Slight problems", "Moderate problems", "Severe problems", "Unable / extreme"];
const LEVEL_SHORT = ["", "None", "Slight", "Moderate", "Severe", "Extreme"];
const EXPLAIN: Record<Series, string> = {
  pain: "Each time you answered, you rated your pain from 0 (no pain) to 10 (the worst pain you can imagine). Lower is better.",
  health: "Each time you answered, you rated your overall health from 0 (worst) to 100 (best). Higher is better.",
  dims: "For each of the five questions you chose from 'no problems' to 'unable / extreme'. Lower on the chart is better. Tap a question in the list to look at it on its own.",
};

export function ProgressTrend({ points, clinical = false }: { points: SurveyPoint[]; clinical?: boolean }) {
  const [series, setSeries] = useState<Series>("health");
  const [focus, setFocus] = useState<DimKey | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => { const el = box.current; if (!el) return; const set = () => setW(Math.max(300, Math.floor(el.clientWidth))); const ro = new ResizeObserver(set); ro.observe(el); set(); return () => ro.disconnect(); }, []);
  useEffect(() => { setHover(null); }, [series, focus]);

  const H = W < 640 ? 240 : 280, pl = series === "dims" ? (clinical ? 92 : 72) : 48, pr = 16, pt = 44, pb = 34;
  const yTitle = series === "pain" ? "Pain, 0–10" : series === "health" ? "Overall health, 0–100" : "Level, 1 = no problems";
  const showX = (i: number) => points.length < 4 || W >= 640 || i === points.length - 1 || (points.length - 1 - i) % 2 === 0;
  const max = series === "pain" ? 10 : series === "health" ? 100 : 5, min = series === "dims" ? 1 : 0;
  const ticks = series === "pain" ? [0, 2, 4, 6, 8, 10] : series === "health" ? [0, 25, 50, 75, 100] : [1, 2, 3, 4, 5];
  const xs = (i: number) => points.length === 1 ? (pl + W - pr) / 2 : pl + (i * (W - pl - pr)) / (points.length - 1);
  const upIsBetter = series === "health";          // health: high = good. pain / five questions: low = good, so the axis is flipped
  const ys = (y: number) => upIsBetter ? pt + (1 - (y - min) / (max - min)) * (H - pt - pb) : pt + ((y - min) / (max - min)) * (H - pt - pb);
  const worst = upIsBetter ? min : max;             // the axis value at the bottom of the chart
  const lines = useMemo(() => series === "pain" ? [{ key: "pain" as const, name: "Pain", color: "#b91c1c", vals: points.map((p) => p.pain) }]
    : series === "health" ? [{ key: "health" as const, name: "Overall health", color: "#0070b8", vals: points.map((p) => p.health) }]
    : DIM.map((d) => ({ key: d.key, name: d.name, color: d.color, vals: points.map((p) => p[d.key]) })), [series, points]);
  const main = lines.length === 1 ? lines[0] : lines.find((l) => l.key === focus) ?? null; // the line that gets labels + area
  const lowerBetter = series !== "health";
  const first = main?.vals[0], last = main?.vals.at(-1);
  const delta = main && first !== undefined && last !== undefined && points.length > 1 ? last - first : null;
  const trendWord = delta == null ? "" : delta === 0 ? "No change" : (lowerBetter ? delta < 0 : delta > 0) ? "Better" : "Worse";
  const fmtVal = (v: number) => series === "dims" ? LEVEL[v] : series === "pain" ? `${v} out of 10` : `${v} out of 100`;
  const gid = `area-${series}-${focus ?? "all"}`;
  const tab = (k: Series, label: string) => <button type="button" onClick={() => { setSeries(k); setFocus(null); }} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${series === k ? "bg-cgh-blue text-white" : "bg-white border border-slate-300 text-slate-700 hover:border-cgh-blue"}`}>{label}</button>;

  // nearest point to the pointer (for touch + mouse)
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => { if (!points.length) return; const r = e.currentTarget.getBoundingClientRect(); const x = e.clientX - r.left; let best = 0; for (let i = 1; i < points.length; i++) if (Math.abs(xs(i) - x) < Math.abs(xs(best) - x)) best = i; setHover(best); };

  return <div className="bg-white rounded-2xl shadow-card p-5">
    <div className="flex flex-wrap items-center gap-2">{tab("health", "Overall health (0–100)")}{tab("dims", "The five questions (1–5)")}{tab("pain", "Pain (0–10)")}
      <details className="ml-auto text-sm"><summary className="cursor-pointer text-cgh-blue font-bold list-none">What is this?</summary><p className="text-slate-600 mt-1 max-w-sm">{EXPLAIN[series]}</p></details></div>
    {main && delta != null && <div className="mt-3 flex items-center gap-2 text-sm"><span className={`px-2.5 py-1 rounded-full font-bold ${trendWord === "Better" ? "bg-ok-bg text-ok" : trendWord === "Worse" ? "bg-warn-bg text-warn" : "bg-slate-100 text-slate-600"}`}>{trendWord}</span><span className="text-slate-600">{main.name}: {series === "dims" ? `${LEVEL[first!]} → ${LEVEL[last!]}` : `${first} → ${last}`} since {points[0].label}</span></div>}
    <div ref={box} className="w-full relative">{points.length === 0 ? <p className="text-slate-500 mt-4">Your first questionnaire will appear here.</p> : <>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="mt-3 block max-w-full touch-none select-none" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={main?.color ?? "#0070b8"} stopOpacity="0.18" /><stop offset="100%" stopColor={main?.color ?? "#0070b8"} stopOpacity="0" /></linearGradient></defs>
        {ticks.map((t) => <g key={t}><line x1={pl} x2={W - pr} y1={ys(t)} y2={ys(t)} stroke="#e2e8f0" /><text x={pl - 8} y={ys(t) + 4} fontSize="11" fontWeight="600" textAnchor="end" fill="#334155">{series === "dims" ? (clinical ? `${t} · ${LEVEL_SHORT[t]}` : LEVEL_SHORT[t]) : t}</text></g>)}
        <text x={pl} y={16} fontSize="11" fontWeight="700" fill="#334155">{yTitle}</text>
        {hover != null && <line x1={xs(hover)} x2={xs(hover)} y1={pt - 6} y2={H - pb} stroke="#94a3b8" strokeDasharray="3 3" />}
        {main && points.length > 1 && <path d={`${main.vals.map((v, i) => `${i ? "L" : "M"}${xs(i)},${ys(v)}`).join(" ")} L${xs(points.length - 1)},${ys(worst)} L${xs(0)},${ys(worst)} Z`} fill={`url(#${gid})`} />}
        {lines.map((l) => { const dim = main && l !== main; const d = l.vals.map((v, i) => `${i ? "L" : "M"}${xs(i)},${ys(v)}`).join(" "); return <g key={l.key} opacity={dim ? 0.15 : 1} style={{ transition: "opacity .2s" }}>
          <path d={d} fill="none" stroke={l.color} strokeWidth={lines.length > 1 && l === main ? 3.5 : 2.5} strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="trend-draw" />
          {l.vals.map((v, i) => { const on = hover === i; return <g key={i}><circle cx={xs(i)} cy={ys(v)} r={on ? 7 : lines.length > 1 && !main ? 4 : 5} fill={on ? l.color : "#fff"} stroke={l.color} strokeWidth="2.5" style={{ transition: "r .15s" }} />
            {(series !== "dims" || clinical) && l === main && hover !== i && <text x={xs(i)} y={ys(v) - 11} fontSize="13" fontWeight="800" textAnchor="middle" fill={l.color}>{v}</text>}</g>; })}
        </g>; })}
        {points.map((p, i) => (showX(i) || hover === i) && <text key={p.id} x={xs(i)} y={H - 12} fontSize="11" fontWeight={hover === i ? 800 : 500} textAnchor="middle" fill={hover === i ? "#14263a" : "#475569"}>{p.label}</text>)}
        {lines.map((l) => <rect key={`hit-${l.key}`} x={pl} y={pt - 10} width={W - pl - pr} height={H - pt - pb + 10} fill="transparent" />)}
      </svg>
      {hover != null && <div className="pointer-events-none absolute -translate-x-1/2 bg-cgh-ink text-white text-xs rounded-lg px-3 py-2 shadow-lg" style={{ left: Math.min(Math.max(xs(hover), 70), W - 70), top: 0 }}>
        <div className="font-bold">{points[hover].date}</div>
        {lines.filter((l) => !main || l === main).map((l) => <div key={l.key}>{lines.length > 1 ? `${l.name}: ` : ""}{fmtVal(l.vals[hover])}{hover > 0 && (() => { const d = l.vals[hover] - l.vals[hover - 1]; return d === 0 ? " · same as before" : (lowerBetter ? d < 0 : d > 0) ? " · better than before" : " · worse than before"; })()}</div>)}
        {!main && lines.length > 1 && <div className="text-slate-300 mt-0.5">Tap a question below to see it alone</div>}
      </div>}
    </>}</div>
    {points.length > 0 && <div className="text-[11px] text-slate-500 mt-1">{series === "pain" ? "top = no pain · bottom = worst pain" : series === "dims" ? "top = no problems · bottom = unable / extreme" : "top = best health · bottom = worst health"} · higher on the chart is always better</div>}
    {lines.length > 1 && <div className="flex flex-wrap gap-2 mt-3">{lines.map((l) => <button type="button" key={l.key} onClick={() => setFocus(focus === l.key ? null : (l.key as DimKey))} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition ${focus === l.key ? "border-transparent text-white" : "border-slate-200 text-slate-700 bg-white"}`} style={focus === l.key ? { background: l.color } : undefined}><i className="w-2.5 h-2.5 rounded-full" style={{ background: focus === l.key ? "#fff" : l.color }} />{l.name}</button>)}{focus && <button type="button" onClick={() => setFocus(null)} className="text-xs text-cgh-blue font-bold px-2">Show all</button>}</div>}
    <style>{`.trend-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:trend-draw .8s ease-out forwards}@keyframes trend-draw{to{stroke-dashoffset:0}}@media (prefers-reduced-motion:reduce){.trend-draw{animation:none;stroke-dashoffset:0}}`}</style>
  </div>;
}
