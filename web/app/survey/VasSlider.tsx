"use client";
import { useState } from "react";
export function VasSlider() {
  const [v, setV] = useState(50);
  return <div><div className="text-4xl font-bold text-center text-teal-700 my-2">{v}</div><input type="range" name="eq_vas" min={0} max={100} value={v} onChange={(e) => setV(+e.target.value)} className="w-full accent-teal-700" /><div className="flex justify-between text-xs text-gray-500"><span>Worst</span><span>Best</span></div></div>;
}
