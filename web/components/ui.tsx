import Link from "next/link";
import { DIMS, DIM_LABEL, LEVEL_LABEL, type Dim } from "@/lib/eq5d";

export const LV_BG = ["", "bg-emerald-100 text-emerald-900", "bg-lime-100 text-lime-900", "bg-amber-100 text-amber-900", "bg-orange-200 text-orange-900", "bg-red-200 text-red-900"];

export function ProfileBadge({ s }: { s: Record<Dim, number> | null | undefined }) {
  if (!s) return <span className="text-gray-400">—</span>;
  return <span className="inline-flex gap-0.5 font-mono">{DIMS.map((d) => <span key={d} title={`${DIM_LABEL[d]}: ${LEVEL_LABEL[s[d]]}`} className={`w-5 text-center rounded ${LV_BG[s[d]]}`}>{s[d]}</span>)}</span>;
}

export const Arrow = ({ f }: { f: string }) => f === "improved" ? <span className="text-emerald-700 text-xs font-bold">▲</span> : f === "worsened" ? <span className="text-red-700 text-xs font-bold">▼</span> : f === "stable" ? <span className="text-gray-400 text-xs">•</span> : null;

export function Card({ title, right, children, className = "" }: { title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`bg-white border border-gray-200 rounded-xl ${className}`}>{title && <h2 className="px-4 py-2.5 border-b border-gray-200 text-sm font-semibold flex items-center gap-2">{title}<span className="ml-auto font-normal text-gray-500 text-xs">{right}</span></h2>}<div className="p-4">{children}</div></section>;
}

export const Pill = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{children}</span>;

export const fmtDT = (v: string | Date | null | undefined) => v ? new Date(v).toLocaleString("en-SG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" }) : "—";
export const fmtD = (v: string | Date | null | undefined) => v ? new Date(v).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" }) : "—";
export const age = (b: string | null | undefined) => b ? Math.floor((Date.now() - new Date(b).getTime()) / 31557600000) : null;

export function TrendChart({ points, max, min, color, label, fmt = (v: number) => String(v) }: { points: { x: string; y: number }[]; max: number; min: number; color: string; label: string; fmt?: (v: number) => string }) {
  if (!points.length) return <div className="text-gray-400 text-sm">{label}: no data yet</div>;
  const W = 420, H = 150, pl = 34, pr = 12, pt = 20, pb = 26;
  const xs = (i: number) => points.length === 1 ? W / 2 : pl + (i * (W - pl - pr)) / (points.length - 1);
  const ys = (y: number) => pt + (1 - (y - min) / (max - min)) * (H - pt - pb);
  const path = points.map((p, i) => `${i ? "L" : "M"}${xs(i)},${ys(p.y)}`).join(" ");
  return <div><div className="text-xs font-semibold" style={{ color }}>{label}</div><svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40">
    <line x1={pl} x2={W - pr} y1={ys(max)} y2={ys(max)} stroke="#eee" /><line x1={pl} x2={W - pr} y1={ys(min)} y2={ys(min)} stroke="#eee" />
    <text x={pl - 4} y={ys(max) + 4} fontSize="10" textAnchor="end" fill="#888">{max}</text><text x={pl - 4} y={ys(min) + 4} fontSize="10" textAnchor="end" fill="#888">{min}</text>
    <path d={path} fill="none" stroke={color} strokeWidth="2.5" />
    {points.map((p, i) => <g key={i}><circle cx={xs(i)} cy={ys(p.y)} r="4" fill={color} /><text x={xs(i)} y={ys(p.y) - 8} fontSize="11" textAnchor="middle" fill="#333">{fmt(p.y)}</text><text x={xs(i)} y={H - 8} fontSize="10" textAnchor="middle" fill="#888">{p.x}</text></g>)}
  </svg></div>;
}

export function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return <Link href={href} className={`px-3 py-1.5 rounded-lg text-sm ${active ? "bg-teal-700 text-white" : "hover:bg-gray-100"}`}>{children}</Link>;
}

/** Start of today in Singapore time, as a Date. Appointments from this moment on count as upcoming. */
export function startOfTodaySG(): Date { const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Singapore" })); d.setHours(0, 0, 0, 0); return new Date(d.getTime() - (d.getTimezoneOffset() - (-480)) * 60000); }
