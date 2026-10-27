"use client";
import { useState } from "react";
export function CopyButton({ text, label = "Copy to clinical document" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { alert(text); } }}
    className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-sm hover:bg-teal-800">{done ? "Copied ✓" : label}</button>;
}
