"use client";
import { useState } from "react";
export function VasSlider() {
  const [v, setV] = useState(50);
  return <div><div className="text-5xl font-extrabold text-center text-cgh-blue tabular-nums my-3">{v}</div><input type="range" name="eq_vas" min={0} max={100} value={v} onChange={(e) => setV(+e.target.value)} className="w-full accent-cgh-blue h-2" /><div className="flex justify-between text-[11px] text-slate-400 mt-1"><span>Worst</span><span>Best</span></div></div>;
}
