import { DIMS, DIM_LABEL, LEVEL_LABEL, type Dim } from "@/lib/eq5d";

export const LV_BG = ["", "lv1", "lv2", "lv3", "lv4", "lv5"];

export function ProfileBadge({ s }: { s: Record<Dim, number> | null | undefined }) {
  if (!s) return <span className="text-slate-300">—</span>;
  return <span className="inline-flex gap-0.5 font-mono text-[13px]">{DIMS.map((d) => <span key={d} title={`${DIM_LABEL[d]}: ${LEVEL_LABEL[s[d]]}`} className={`w-5 h-5 leading-5 text-center rounded font-bold ${LV_BG[s[d]]}`}>{s[d]}</span>)}</span>;
}

const ICON = { improved: "M4 12 L12 4 M6 4 H12 V10", worsened: "M4 4 L12 12 M12 6 V12 H6" };
export const Arrow = ({ f }: { f: string }) => f === "improved" || f === "worsened"
  ? <svg width="12" height="12" viewBox="0 0 16 16" className={`inline-block align-[-1px] ${f === "improved" ? "text-ok" : "text-danger"}`} aria-label={f === "improved" ? "Improved by at least the MCID" : "Worsened by at least the MCID"}><path d={ICON[f]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  : f === "stable" ? <svg width="12" height="12" viewBox="0 0 16 16" className="inline-block align-[-1px] text-slate-300" aria-label="No clinically important change"><path d="M3 8 H13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg> : null;

export function Card({ title, right, children, className = "", tight = false }: { title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string; tight?: boolean }) {
  return <section className={`bg-white rounded-2xl shadow-card ${className}`}>{title && <h2 className="px-5 pt-4 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 flex items-center gap-2">{title}<span className="ml-auto font-medium normal-case tracking-normal text-slate-400 text-xs">{right}</span></h2>}<div className={tight ? "px-1 pb-2" : "px-5 pb-5 pt-1"}>{children}</div></section>;
}

export const Pill = ({ ok, children, tone }: { ok?: boolean; children: React.ReactNode; tone?: "ok" | "warn" | "danger" | "neutral" }) => {
  const t = tone ?? (ok ? "ok" : "warn");
  const cls = { ok: "bg-ok-bg text-ok", warn: "bg-warn-bg text-warn", danger: "bg-danger-bg text-danger", neutral: "bg-slate-100 text-slate-600" }[t];
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{children}</span>;
};

const CHANGE_TEXT: Record<string, [string, string]> = { improved: ["Improved", "text-ok"], worsened: ["Worse", "text-danger"], stable: ["No change", "text-slate-400"] };
export const Stat = ({ value, unit, label, change }: { value: React.ReactNode; unit?: string; label: React.ReactNode; change?: string }) =>
  <div className="rounded-xl bg-cgh-mist/60 px-4 py-3"><div className="text-[26px] font-extrabold tabular-nums leading-none text-cgh-ink">{value}{unit && <span className="text-sm font-semibold text-slate-400 ml-0.5">{unit}</span>}</div><div className="text-xs text-slate-500 mt-1.5">{label}{change && CHANGE_TEXT[change] && <span className={`ml-1.5 font-bold ${CHANGE_TEXT[change][1]}`}>{CHANGE_TEXT[change][0]}</span>}</div></div>;

export const Btn = ({ children, primary = false, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) =>
  <button {...rest} className={`px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${primary ? "bg-cgh-blue text-white hover:bg-cgh-blue-dark" : "bg-white border border-slate-300 text-slate-700 hover:border-cgh-blue hover:text-cgh-blue"} ${className}`}>{children}</button>;

export const fmtDT = (v: string | Date | null | undefined) => v ? new Date(v).toLocaleString("en-SG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" }) : "—";
export const fmtD = (v: string | Date | null | undefined) => v ? new Date(v).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" }) : "—";
export const fmtT = (v: string | Date) => new Date(v).toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" });
export const age = (b: string | null | undefined) => b ? Math.floor((Date.now() - new Date(b).getTime()) / 31557600000) : null;
/** Start of today in Singapore time, as a Date. Appointments from this moment on count as upcoming. */
export function startOfTodaySG(): Date { const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Singapore" })); d.setHours(0, 0, 0, 0); return new Date(d.getTime() - (d.getTimezoneOffset() - (-480)) * 60000); }

export function TrendChart({ points, max, min, color = "#0070b8", label, fmt = (v: number) => String(v) }: { points: { x: string; y: number }[]; max: number; min: number; color?: string; label: string; fmt?: (v: number) => string }) {
  const W = 420, H = 150, pl = 34, pr = 14, pt = 22, pb = 26;
  const id = `g${label.replace(/[^a-z]/gi, "")}`;
  const xs = (i: number) => points.length === 1 ? W / 2 : pl + (i * (W - pl - pr)) / (points.length - 1);
  const ys = (y: number) => pt + (1 - (y - min) / (max - min)) * (H - pt - pb);
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => min + f * (max - min));
  const path = points.map((p, i) => `${i ? "L" : "M"}${xs(i)},${ys(p.y)}`).join(" ");
  const area = points.length > 1 ? `${path} L${xs(points.length - 1)},${ys(min)} L${xs(0)},${ys(min)} Z` : "";
  return <div><div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div><svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40">
    <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.22" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
    {grid.map((g) => <g key={g}><line x1={pl} x2={W - pr} y1={ys(g)} y2={ys(g)} stroke="#e2e8f0" strokeDasharray={g === min || g === max ? undefined : "2 4"} /><text x={pl - 6} y={ys(g) + 3.5} fontSize="9" textAnchor="end" fill="#94a3b8">{fmt(g)}</text></g>)}
    {points.length === 0 ? <><line x1={pl} x2={W - pr} y1={H / 2} y2={H / 2} stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 6" /><text x={W / 2} y={H / 2 - 10} fontSize="11" textAnchor="middle" fill="#94a3b8">First questionnaire will appear here</text></> : <>
      {area && <path d={area} fill={`url(#${id})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => { const last = i === points.length - 1; return <g key={i}><circle cx={xs(i)} cy={ys(p.y)} r={last ? 5.5 : 3} fill={last ? color : "#fff"} stroke={color} strokeWidth="2" />{(last || points.length <= 6) && <text x={xs(i)} y={ys(p.y) - 10} fontSize={last ? 12 : 10} fontWeight={last ? 800 : 500} textAnchor="middle" fill={last ? color : "#475569"}>{fmt(p.y)}</text>}<text x={xs(i)} y={H - 8} fontSize="9.5" textAnchor="middle" fill="#94a3b8">{p.x}</text></g>; })}
    </>}
  </svg></div>;
}
