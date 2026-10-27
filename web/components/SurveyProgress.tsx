"use client";
import { useEffect, useState } from "react";
const NAMES = ["mo", "sc", "ua", "pd", "ad", "pain"];
/** Sits inside the survey form; counts answered questions from the form's own inputs. */
export function SurveyProgress() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const form = document.querySelector("form");
    if (!form) return;
    const count = () => setN(NAMES.filter((k) => form.querySelector(`input[name="${k}"]:checked`)).length);
    count(); form.addEventListener("change", count); return () => form.removeEventListener("change", count);
  }, []);
  return <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-[#f4f7fb]/95 backdrop-blur"><div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1"><span>Progress</span><span className="text-cgh-blue tabular-nums">{n} / 6</span></div><div className="h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-cgh-blue transition-all" style={{ width: `${(n / 6) * 100}%` }} /></div></div>;
}
